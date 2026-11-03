import test from 'node:test';
import assert from 'node:assert/strict';
import {buildXShareURL} from '../dist/share.mjs';

const duration={years:48,months:3,days:20,hours:23,minutes:51,seconds:58};
test('X intent contains the countdown and Japanese hashtag as encoded text',()=>{
  const url=new URL(buildXShareURL(duration));
  assert.equal(url.origin,'https://x.com');
  assert.equal(url.pathname,'/intent/tweet');
  assert.equal(url.hash,'');
  assert.equal(url.searchParams.get('text'),'私の人生の残り時間：48年 3ヶ月 20日 23時間 51分 58秒\n#命の砂時計');
});
test('published canonical is shared without query strings or fragments',()=>{
  const url=new URL(buildXShareURL(duration,'https://inochi-no-sunadokei.munieru.app/?from=preview#settings'));
  assert.equal(url.searchParams.get('url'),'https://inochi-no-sunadokei.munieru.app/');
  assert.equal(url.searchParams.size,2);
});
test('local and invalid URLs are omitted and expired countdown remains shareable',()=>{
  for(const page of ['http://127.0.0.1:4173/','https://localhost:4173/','https://127.0.0.1/','https://[::1]/','file:///local/index.html','invalid'])assert.equal(new URL(buildXShareURL(duration,page)).searchParams.has('url'),false);
  const zero={years:0,months:0,days:0,hours:0,minutes:0,seconds:0};
  assert.ok(new URL(buildXShareURL(zero)).searchParams.get('text').includes('0年 0ヶ月 0日 0時間 0分 0秒'));
});

test('birthday sharing includes a birthday greeting and the normal countdown',()=>{
  const url=new URL(buildXShareURL(duration,undefined,{birthdayToday:true}));
  const text=url.searchParams.get('text');
  assert.ok(text.startsWith('本日、誕生日を迎えました。\n私の人生の残り時間：48年'));
  assert.ok(text.endsWith('#命の砂時計'));
});
test('reached lifespan sharing replaces the zero countdown and preserves the public URL',()=>{
  const zero={years:0,months:0,days:0,hours:0,minutes:0,seconds:0};
  for(const birthdayToday of [false,true]){
    const url=new URL(buildXShareURL(zero,'https://inochi-no-sunadokei.munieru.app/',{reached:true,birthdayToday}));
    const text=url.searchParams.get('text');
    assert.ok(text.includes('想定寿命を超えて、今日を迎えました。'));
    assert.ok(!text.includes('私の人生の残り時間'));
    assert.ok(!text.includes('0年'));
    assert.equal(text.includes('誕生日'),birthdayToday);
    assert.ok(text.endsWith('#命の砂時計'));
    assert.equal(url.searchParams.get('url'),'https://inochi-no-sunadokei.munieru.app/');
  }
});
