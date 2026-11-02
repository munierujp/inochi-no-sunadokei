import test from 'node:test';
import assert from 'node:assert/strict';
import {buildXShareURL} from '../dist/share.mjs';

const duration={years:48,months:3,days:20,hours:23,minutes:51,seconds:58};
test('X intent contains the countdown and Japanese hashtag as encoded text',()=>{
  const url=new URL(buildXShareURL(duration));
  assert.equal(url.origin,'https://x.com');
  assert.equal(url.pathname,'/intent/tweet');
  assert.equal(url.hash,'');
  assert.equal(url.searchParams.get('text'),'人生の残り時間：48年3ヶ月20日 23時間51分58秒\n#命の砂時計');
});
test('published canonical is shared without query strings or fragments',()=>{
  const url=new URL(buildXShareURL(duration,'https://inochi-no-sunadokei.munieru.app/?from=preview#settings'));
  assert.equal(url.searchParams.get('url'),'https://inochi-no-sunadokei.munieru.app/');
  assert.equal(url.searchParams.size,2);
});
test('local and invalid URLs are omitted and expired countdown remains shareable',()=>{
  for(const page of ['http://127.0.0.1:4173/','https://localhost:4173/','https://127.0.0.1/','https://[::1]/','file:///local/index.html','invalid'])assert.equal(new URL(buildXShareURL(duration,page)).searchParams.has('url'),false);
  const zero={years:0,months:0,days:0,hours:0,minutes:0,seconds:0};
  assert.ok(new URL(buildXShareURL(zero)).searchParams.get('text').includes('0年0ヶ月0日 0時間0分0秒'));
});
