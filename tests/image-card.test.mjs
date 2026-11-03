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
