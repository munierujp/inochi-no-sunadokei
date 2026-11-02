import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../dist/time.mjs';

test('remaining days, weeks, months and years express the same deadline',()=>{
  const result=calculate('2000-02-28',30,new Date(2029,1,28));
  assert.equal(result.days,365);
  assert.equal(result.weeks,52);
  assert.equal(result.months,12);
  assert.equal(result.years,1);
});

test('calendar month and year counts handle month ends, leap days and time of day',()=>{
  assert.equal(calculate('2000-02-28',30,new Date(2030,0,31)).months,1);
  assert.equal(calculate('2000-02-28',30,new Date(2030,0,31,12)).months,0);
  const leap=calculate('2000-02-29',25,new Date(2024,1,29));
  assert.equal(leap.months,12);
  assert.equal(leap.years,1);
  assert.equal(calculate('2000-03-01',24,new Date(2024,1,29)).days,1);
});

test('deadline and past deadlines have zero remaining units',()=>{
  for(const now of [new Date(2020,0,1),new Date(2021,0,1)]){
    const result=calculate('2000-01-01',20,now);
    for(const unit of ['days','weeks','months','years'])assert.equal(result[unit],0);
    assert.deepEqual(result.duration,{years:0,months:0,days:0,hours:0,minutes:0,seconds:0});
  }
});

test('compound countdown separates calendar years and months from the remaining time',()=>{
  const result=calculate('2000-01-01',30,new Date(2028,10,3,14,25,36));
  assert.deepEqual(result.duration,{years:1,months:1,days:28,hours:9,minutes:34,seconds:24});
  assert.ok(result.days>result.duration.days);
});

test('compound countdown handles month ends and the last second',()=>{
  assert.deepEqual(calculate('2000-02-28',30,new Date(2030,0,31)).duration,{years:0,months:1,days:0,hours:0,minutes:0,seconds:0});
  assert.deepEqual(calculate('2000-02-28',30,new Date(2030,0,31,12)).duration,{years:0,months:0,days:27,hours:12,minutes:0,seconds:0});
  assert.deepEqual(calculate('2000-01-01',30,new Date(2029,11,31,23,59,59)).duration,{years:0,months:0,days:0,hours:0,minutes:0,seconds:1});
});
