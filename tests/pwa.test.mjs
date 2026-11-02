import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,access} from 'node:fs/promises';

const dist=new URL('../dist/',import.meta.url);
const sw=await readFile(new URL('sw.js',dist),'utf8');
function worker(origin='https://example.test/app/'){
  const handlers=new Map(),store=new Map(),requests=[];
  let online=true,skipped=0,claimed=0;
  const caches={
    async open(name){if(!store.has(name))store.set(name,new Map());const map=store.get(name);return {
      async addAll(items){for(const req of items){requests.push(req);if(!online)throw new Error('offline');map.set(req.url,new Response(`saved:${new URL(req.url).pathname}`));}},
      async match(key){return map.get(key)?.clone();}
    };},
    async keys(){return [...store.keys()];},
    async delete(name){return store.delete(name);}
  };
  const self={registration:{scope:origin},location:new URL('sw.js',origin),clients:{async claim(){claimed++;}},async skipWaiting(){skipped++;},addEventListener(name,fn){handlers.set(name,fn);}};
  vm.runInNewContext(sw,{self,caches,URL,Request,Set,fetch:async request=>{if(!online)throw new Error('offline');return new Response(`live:${new URL(request.url).pathname}`);}});
  return {store,requests,get skipped(){return skipped;},get claimed(){return claimed;},set online(value){online=value;},
    async event(name,data={}){const pending=[];let response;handlers.get(name)({...data,waitUntil(p){pending.push(p);},respondWith(p){response=p;}});await Promise.all(pending);return response;},
    async get(path,mode='cors',method='GET'){return this.event('fetch',{request:{url:new URL(path,origin).href,mode,method}});}
  };
}

test('offline app shell, navigation query and assets use the versioned cache',async()=>{
  const w=worker();await w.event('install');assert.equal(w.requests.length,13);
  assert.ok(w.requests.every(request=>request.cache==='reload'));
  assert.equal(w.skipped,0);
  w.online=false;
  assert.equal(await (await w.get('./?from=home','navigate')).text(),'saved:/app/index.html');
  for(const file of ['style.css','app.mjs','time.mjs','pwa.mjs','assets/logo-wordmark-a.png','site.webmanifest'])assert.equal(await (await w.get(file)).text(),`saved:/app/${file}`);
  assert.equal(await w.get('https://x.com/munieru_jp'),undefined);
  assert.equal(await w.get('api/profile'),undefined);
  assert.equal(await w.get('app.mjs','cors','POST'),undefined);
});

test('activation deletes only old caches belonging to this app scope',async()=>{
  const w=worker();w.store.set('life-hourglass:https://example.test/app/:old',new Map());w.store.set('another-app',new Map());w.store.set('life-hourglass:https://example.test/other/:old',new Map());
  await w.event('install');await w.event('activate');
  assert.equal(w.store.has('life-hourglass:https://example.test/app/:old'),false);
  assert.ok(w.store.has('another-app'));assert.ok(w.store.has('life-hourglass:https://example.test/other/:old'));assert.equal(w.claimed,1);
});

test('failed install removes incomplete new cache and preserves the active one',async()=>{
  const w=worker();const old='life-hourglass:https://example.test/app/:old';w.store.set(old,new Map());w.online=false;
  await assert.rejects(w.event('install'),/offline/);assert.deepEqual([...w.store.keys()],[old]);
});

test('updates activate only on the expected explicit message',async()=>{
  const w=worker();await w.event('message',{data:{type:'other'}});assert.equal(w.skipped,0);
  await w.event('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.skipped,1);
});

test('local development prefers current network files and falls back offline',async()=>{
  const w=worker('http://127.0.0.1:4173/');await w.event('install');
  assert.equal(await (await w.get('style.css')).text(),'live:/style.css');
  w.online=false;assert.equal(await (await w.get('style.css')).text(),'saved:/style.css');
});

test('manifest and precache files exist with usable installation metadata',async()=>{
  const manifest=JSON.parse(await readFile(new URL('site.webmanifest',dist),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./');assert.equal(manifest.id,'./');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable'));
  const files=JSON.parse(sw.match(/const FILES = (\[.*?\]);/)[1]);
  for(const file of files)await access(new URL(file,dist));
  for(const icon of manifest.icons)await access(new URL(icon.src,dist));
});

test('browser controls offer install, accept updates and preserve state before reload',async()=>{
  const source=await readFile(new URL('pwa.mjs',dist),'utf8');
  const makeButton=()=>({hidden:true,disabled:false,events:{},addEventListener(name,fn){this.events[name]=fn;}});
  const install=makeButton(),update=makeButton(),windowEvents={},workerEvents={},registrationEvents={};
  let message,flushed=false,reloaded=false,prompted=false;
  const registration={waiting:{postMessage(value){message=value;}},addEventListener(name,fn){registrationEvents[name]=fn;},async update(){}};
  const document={querySelectorAll(selector){return selector==='[data-pwa-install]'?[install]:[update];},addEventListener(){},dispatchEvent(event){if(event.type==='pwa:before-reload')flushed=true;}};
  const window={isSecureContext:true,matchMedia(){return {matches:false};},addEventListener(name,fn){windowEvents[name]=fn;}};
  const navigator={serviceWorker:{controller:{},async register(url,options){assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');return registration;},addEventListener(name,fn){workerEvents[name]=fn;}}};
  const location={protocol:'https:',reload(){assert.equal(flushed,true);reloaded=true;}};
  await vm.runInNewContext(`(async()=>{${source}\n})()`,{document,window,navigator,location,Event,console});
  assert.equal(update.hidden,false);assert.equal(install.hidden,true);
  windowEvents.beforeinstallprompt({preventDefault(){},async prompt(){prompted=true;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert.equal(install.hidden,false);await install.events.click();assert.equal(prompted,true);assert.equal(install.hidden,true);
  update.events.click();assert.equal(message.type,'ACTIVATE_UPDATE');assert.equal(update.disabled,true);
  workerEvents.controllerchange();assert.equal(reloaded,true);
});

test('first service-worker claim does not reload the setup screen',async()=>{
  const source=await readFile(new URL('pwa.mjs',dist),'utf8');let controllerchange,reloaded=false;
  const registration={addEventListener(){},async update(){}};
  await vm.runInNewContext(`(async()=>{${source}\n})()`,{
    document:{querySelectorAll(){return [];},addEventListener(){},dispatchEvent(){}},
    window:{isSecureContext:true,addEventListener(){},matchMedia(){return {matches:false};}},
    navigator:{serviceWorker:{controller:null,async register(){return registration;},addEventListener(name,fn){controllerchange=fn;}}},
    location:{protocol:'https:',reload(){reloaded=true;}},Event,console
  });
  controllerchange();assert.equal(reloaded,false);
});
