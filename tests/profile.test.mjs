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
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',hidden:false,checked:false,open:false,style:{},firstChild:{},events:{},classList:{toggle(){},remove(){}},setCustomValidity(message){this.validationMessage=message;},setAttribute(name,value){this[name]=value;},append(){},prepend(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this.events[name]=fn;}});
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
    assert.ok(current.element('form-error').textContent);
  }
  submit('2000','2','29');
  assert.equal(current.saved().profile.birthday,'2000-02-29');
});

test('complete birthday is validated during input and accepts fullwidth numbers',()=>{
  const current=app();
  const edit=(id,value)=>{current.element(id).value=value;current.element(id).events.input();};
  const submit=()=>current.element('settings-form').events.submit({preventDefault(){}});
  edit('birth-year','2000');edit('birth-month','13');
  assert.equal(current.element('birthday-error').textContent,'');
  edit('birth-day','30');
  assert.match(current.element('birthday-error').textContent,/月/);
  assert.equal(current.element('birth-month')['aria-invalid'],'true');
  assert.equal(current.element('birth-year')['aria-invalid'],'false');
  edit('birth-month','2');
  assert.match(current.element('birthday-error').textContent,/実在/);
  for(const part of ['year','month','day'])assert.equal(current.element('birth-'+part)['aria-invalid'],'true');
  edit('birth-day','29');
  assert.equal(current.element('birthday-error').textContent,'');
  edit('birth-year','2001');
  assert.match(current.element('birthday-error').textContent,/実在/);
  edit('birth-day','');
  assert.equal(current.element('birthday-error').textContent,'');
  submit();
  assert.match(current.element('birthday-error').textContent,/日を入力/);
  edit('birth-year','２９９９');edit('birth-month','１');edit('birth-day','１');submit();
  assert.match(current.element('birthday-error').textContent,/今日以前/);
  edit('birth-year',' ２０００ ');edit('birth-month','０２');edit('birth-day','２９');
  current.element('gender-male').checked=true;
  current.element('lifespan').value='81.35';
  submit();
  assert.equal(current.saved().profile.birthday,'2000-02-29');
});
