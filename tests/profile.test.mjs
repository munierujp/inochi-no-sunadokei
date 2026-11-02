import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {calculate,AVERAGE_LIFESPAN} from '../dist/time.mjs';
import {buildXShareURL} from '../dist/share.mjs';

const source=(await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
function app(profile){
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',hidden:false,checked:false,open:false,style:{},firstChild:{},events:{},classList:{toggle(){},remove(){}},setAttribute(){},append(){},prepend(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this.events[name]=fn;}});
    return elements.get(id);
  };
  let saved=profile?JSON.stringify({profile}):null;
  vm.runInNewContext(source,{
    document:{getElementById:element,querySelector:element,querySelectorAll(){return [];},body:element('body'),addEventListener(){}},
    localStorage:{getItem(){return saved;},setItem(key,value){saved=value;},removeItem(){saved=null;}},
    calculate,AVERAGE_LIFESPAN,buildXShareURL,Intl,Date,Set,Number,Math,JSON,String,confirm:()=>true,setInterval(){}
  });
  return {element,saved:()=>JSON.parse(saved)};
}

test('sex selection fills exact average and decimal settings survive saving and reload',()=>{
  const current=app();
  current.element('gender-male').checked=true;
  current.element('gender-male').events.change();
  assert.equal(current.element('lifespan').value,81.35);
  current.element('birth-year').value='1990';
  current.element('birth-month').value='1';
  current.element('birth-day').value='1';
  current.element('settings-form').events.submit({preventDefault(){}});
  assert.equal(current.saved().profile.years,81.35);
  assert.ok(app(current.saved().profile).element('basis').textContent.includes('81.35'));
  current.element('gender-male').checked=false;
  current.element('gender-female').checked=true;
  current.element('gender-female').events.change();
  assert.equal(current.element('lifespan').value,87.33);
});

test('previously saved integer lifespan stays unchanged',()=>{
  const current=app({birthday:'1990-01-01',gender:'male',years:81});
  assert.equal(current.element('settings').open,false);
  assert.ok(current.element('basis').textContent.includes('想定寿命 81歳'));
});

test('birthday fields reject invalid and future dates and preserve leap days',()=>{
  const current=app();
  current.element('gender-male').checked=true;
  current.element('lifespan').value='81.35';
  const submit=(year,month,day)=>{
    current.element('birth-year').value=year;
    current.element('birth-month').value=month;
    current.element('birth-day').value=day;
    current.element('settings-form').events.submit({preventDefault(){}});
  };
  for(const date of [['1990','2','30'],['2999','1','1'],['','1','1'],['1899','1','1'],['1990','','1']]){
    submit(...date);
    assert.equal(current.saved(),null);
    assert.match(current.element('form-error').textContent,/生年月日/);
  }
  submit('2000','2','29');
  assert.equal(current.saved().profile.birthday,'2000-02-29');
});
