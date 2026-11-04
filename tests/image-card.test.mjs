import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import vm from 'node:vm';
import {buildCardSVG} from '../dist/image-card.mjs';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const glass=html.match(/<svg class="hourglass"[\s\S]*?<\/svg>/)[0];
const logo='data:image/png;base64,'+(await readFile(new URL('../dist/assets/logo-wordmark-a.png',import.meta.url))).toString('base64');
const result={remaining:100,fraction:.405,duration:{years:48,months:7,days:27,hours:17,minutes:15,seconds:26},birth:new Date(1994,1,24)};
test('share card renders a real self-contained PNG with approved dimensions and complete URL',async()=>{
 const svg=buildCardSVG({glass,logo,years:81.35,result});
 assert.ok(svg.includes('https://inochi-no-sunadokei.munieru.app/'));
 assert.ok(svg.includes('私の人生の残り時間'));
 assert.ok(svg.includes('1994年2月24日生まれ・想定寿命 81.35歳で計算'));
 assert.ok(!svg.includes('undefined'));
 assert.ok(!svg.includes('male'));
 assert.ok(svg.includes('>48<tspan'));
 const png=await sharp(Buffer.from(svg)).png().toBuffer();
 const meta=await sharp(png).metadata();
 assert.equal(meta.width,1080);assert.equal(meta.height,1350);
});
test('reached lifespan replaces countdown and removes falling sand for both SVG serializations',async()=>{
 for(const value of [glass,glass.replace(/(<path class="sand-stream"[^>]*?)\/>/,'$1></path>')]){
  const svg=buildCardSVG({glass:value,logo,years:81.35,result:{...result,remaining:0,fraction:1,duration:{years:0,months:0,days:0,hours:0,minutes:0,seconds:0}},birthdayToday:true});
  assert.ok(!svg.includes('私の人生の残り時間'));
  assert.ok(!svg.includes('sand-stream'));
  assert.ok(svg.includes('お誕生日おめでとう'));
  assert.ok(svg.includes('想定寿命を超えて'));
  await sharp(Buffer.from(svg)).png().toBuffer();
 }
});
test('birthday card retains the countdown and adds its greeting',()=>{
 const svg=buildCardSVG({glass,logo,years:81.35,result,birthdayToday:true});
 assert.ok(svg.includes('私の人生の残り時間'));
 assert.ok(svg.includes('お誕生日おめでとう'));
});

test('image export downloads directly, prevents duplicate saves and releases its URL',async()=>{
 const source=(await readFile(new URL('../dist/image-card.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
 const trigger={events:{},disabled:false,addEventListener(type,fn){this.events[type]=fn;},setAttribute(name,value){this[name]=value;}};
 const status={textContent:''},revoked=[],timers=[];
 let clicks=0,removed=0,complete,calls=0;
 const link={click(){clicks++;},remove(){removed++;}};
 const setup=vm.runInNewContext(source+';setupImageExport',{
  document:{getElementById(id){assert.ok(['image-save','image-status'].includes(id));return id==='image-save'?trigger:status;},createElement(tag){assert.equal(tag,'a');return link;},body:{append(value){assert.equal(value,link);}}},
  URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(url){revoked.push(url);}},
  setTimeout(fn,delay){assert.equal(delay,60000);timers.push(fn);}
 });
 setup(()=>({}),{create:()=>{calls++;return new Promise(resolve=>{complete=resolve;});}});
 const pending=trigger.events.click();await trigger.events.click();
 assert.equal(calls,1);assert.equal(trigger.disabled,true);
 complete({});await pending;
 assert.equal(clicks,1);assert.equal(removed,1);
 assert.equal(link.download,'inochi-no-sunadokei.png');assert.equal(link.href,'blob:test');
 assert.equal(trigger.disabled,false);assert.equal(status.textContent,'');
 assert.deepEqual(revoked,[]);timers[0]();assert.deepEqual(revoked,['blob:test']);
});
test('image generation failure remains retryable and shows an error',async()=>{
 const source=(await readFile(new URL('../dist/image-card.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
 const trigger={events:{},addEventListener(type,fn){this.events[type]=fn;},setAttribute(){}},status={};
 const setup=vm.runInNewContext(source+';setupImageExport',{document:{getElementById(id){return id==='image-save'?trigger:status;}}});
 setup(()=>({}),{create:async()=>{throw Error('画像を作成できませんでした。');}});
 await trigger.events.click();
 assert.equal(status.textContent,'画像を作成できませんでした。');assert.equal(trigger.disabled,false);
});

async function sharingApp(nav){
 const source=(await readFile(new URL('../dist/image-card.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
 const trigger={textContent:'画像を保存',events:{},addEventListener(type,fn){this.events[type]=fn;},setAttribute(){}};
 const status={textContent:''};
 let downloads=0,created=0;
 const setup=vm.runInNewContext(source+';setupImageExport',{
  document:{getElementById(id){return id==='image-save'?trigger:status;},createElement(){return {click(){downloads++;},remove(){}};},body:{append(){}}},
  navigator:nav,File,URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},setTimeout(){}
 });
 let snapshot={years:80};
 setup(()=>snapshot,{create:async()=>{created++;return new Blob(['png'],{type:'image/png'});}});
 return {trigger,status,click:()=>trigger.events.click(),downloads:()=>downloads,created:()=>created,setSnapshot(value){snapshot=value;}};
}

test('supported image sharing passes a PNG file to the native menu without downloading',async()=>{
 let shared;
 const current=await sharingApp({canShare({files}){return files.length===1&&files[0].type==='image/png';},async share(data){shared=data;}});
 await current.click();
 assert.equal(shared.files[0].name,'inochi-no-sunadokei.png');
 assert.equal(await shared.files[0].text(),'png');
 assert.equal(current.downloads(),0);
 assert.equal(current.status.textContent,'');
 assert.equal(current.trigger.disabled,false);
});

test('text-only sharing or a failed capability check falls back to downloading',async()=>{
 for(const canShare of [()=>false,()=>{throw Error('unavailable');}]){
  const current=await sharingApp({canShare,share(){assert.fail('must not share unsupported files');}});
  await current.click();assert.equal(current.downloads(),1);
 }
});

test('canceling native sharing does not download or show an error',async()=>{
 const current=await sharingApp({canShare:()=>true,async share(){throw Object.assign(Error('canceled'),{name:'AbortError'});}});
 await current.click();
 assert.equal(current.downloads(),0);
 assert.equal(current.status.textContent,'');
 assert.equal(current.trigger.textContent,'画像を保存');
});

test('expired user activation asks for another tap and reuses the generated image',async()=>{
 let shares=0;
 const nav={userActivation:{isActive:false},canShare:()=>true,async share(){shares++;}};
 const current=await sharingApp(nav);
 await current.click();
 assert.equal(shares,0);assert.equal(current.downloads(),0);
 assert.equal(current.trigger.textContent,'画像を共有');
 assert.match(current.status.textContent,/画像を用意/);
 nav.userActivation.isActive=true;
 await current.click();
 assert.equal(shares,1);assert.equal(current.created(),1);
 assert.equal(current.trigger.textContent,'画像を保存');
});

test('blocked sharing retries on a fresh tap and falls back if it is still blocked',async()=>{
 let shares=0;
 const current=await sharingApp({canShare:()=>true,async share(){shares++;throw Object.assign(Error('blocked'),{name:'NotAllowedError'});}});
 await current.click();assert.equal(current.downloads(),0);
 await current.click();assert.equal(current.downloads(),1);
 assert.equal(shares,2);assert.equal(current.created(),1);
 assert.equal(current.trigger.textContent,'画像を保存');
});

test('other sharing failures fall back to a download',async()=>{
 const current=await sharingApp({canShare:()=>true,async share(){throw Object.assign(Error('failed'),{name:'DataError'});}});
 await current.click();assert.equal(current.downloads(),1);
});

test('a changed profile discards the image prepared for a sharing retry',async()=>{
 let shared;
 const nav={userActivation:{isActive:false},canShare:()=>true,async share(data){shared=data;}};
 const current=await sharingApp(nav);
 await current.click();
 current.setSnapshot({years:90});nav.userActivation.isActive=true;
 await current.click();
 assert.equal(current.created(),2);
 assert.ok(shared);assert.equal(current.downloads(),0);
});
