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
  current.element('birthday').value='19900101';
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

test('birthday rejects invalid, incomplete and future dates and saves a real leap day',()=>{
  const current=app();
  current.element('gender-male').checked=true;
  current.element('lifespan').value='81.35';
  const submit=value=>{
    current.element('birthday').value=value;
    current.element('settings-form').events.submit({preventDefault(){}});
  };
  for(const value of ['19900230','20010229','19900431','29990101','','199001','18990101','19901301','19900001','19900100','1990abcd']){
    submit(value);
    assert.equal(current.saved(),null);
    assert.ok(current.element('birthday-error').textContent);
    assert.equal(current.element('birthday')['aria-invalid'],'true');
    assert.equal(current.element('birthday').value,value);
  }
  submit('20000229');
  assert.equal(current.saved().profile.birthday,'2000-02-29');
});

test('single birthday field accepts pasted formats, fullwidth digits and autofill dates',()=>{
  for(const value of [' ２００００２２９ ','2000/02/29','2000-02-29','2000/2/29','２０００／０２／２９']){
    const current=app();
    current.element('birthday').value=value;
    current.element('gender-male').checked=true;
    current.element('lifespan').value='81.35';
    current.element('settings-form').events.submit({preventDefault(){}});
    assert.equal(current.saved().profile.birthday,'2000-02-29');
  }
});

test('birthday validation waits for submission and clears feedback when editing',()=>{
  const current=app();
  current.element('birthday').value='20000230';
  current.element('birthday').events.input();
  assert.equal(current.element('birthday-error').textContent,'');
  current.element('settings-form').events.submit({preventDefault(){}});
  assert.match(current.element('birthday-error').textContent,/実在/);
  current.element('birthday').value='20000229';
  current.element('birthday').events.input();
  assert.equal(current.element('birthday-error').textContent,'');
  assert.equal(current.element('birthday')['aria-invalid'],'false');
});
