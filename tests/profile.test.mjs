import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {calculate,parseBirthday,AVERAGE_LIFESPAN} from '../dist/time.mjs';
import {buildXShareURL} from '../dist/share.mjs';

const source=(await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
function app(profile,compute=calculate,Clock=Date){
  let tick;
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',hidden:false,checked:false,open:false,style:{},firstChild:{},events:{},classList:{toggle(){},remove(){}},setCustomValidity(message){this.validationMessage=message;},setAttribute(name,value){this[name]=value;},append(){},prepend(){},focus(){},show(){this.open=true;this.modal=false;},showModal(){this.open=true;this.modal=true;},close(){this.open=false;},dispatchEvent(event){this.events[event.type]?.(event);},addEventListener(name,fn){this.events[name]=fn;}});
    return elements.get(id);
  };
  let saved=profile?JSON.stringify({profile}):null;
  vm.runInNewContext(source,{
    document:{getElementById:element,querySelector:element,querySelectorAll(){return [];},body:element('body'),addEventListener(){}},
    localStorage:{getItem(){return saved;},setItem(key,value){saved=value;},removeItem(){saved=null;}},
    calculate:compute,parseBirthday,AVERAGE_LIFESPAN,buildXShareURL,Event,Intl,Date:Clock,Set,Number,Math,JSON,String,confirm:()=>true,setInterval(fn){tick=fn;}
  });
  return {element,saved:()=>JSON.parse(saved),tick:()=>tick()};
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
  for(const date of [['1990','2','30'],['2999','1','1'],['','1','1'],['1990','','1']]){
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

test('About fallback dismisses backdrop taps but preserves content clicks and drags',()=>{
  const {element}=app();
  const about=element('about');
  about.getBoundingClientRect=()=>({left:100,right:300,top:100,bottom:400});
  const event=(x,y,target=about)=>({target,clientX:x,clientY:y});
  about.showModal();
  about.events.pointerdown(event(110,110));about.events.click(event(110,110));
  assert.equal(about.open,true);
  about.events.pointerdown(event(120,120,{}));about.events.click(event(10,10));
  assert.equal(about.open,true);
  about.events.pointerdown(event(10,10));about.events.pointercancel();about.events.click(event(10,10));
  assert.equal(about.open,true);
  about.events.pointerdown(event(10,10));about.events.click(event(10,10));
  assert.equal(about.open,false);
});

test('birthday arrow keys step fields, respect limits and revalidate calendar dates',()=>{
  const {element}=app();
  element('birth-year').value='2000';element('birth-month').value='2';element('birth-day').value='29';
  const key=(id,key,extra={})=>{
    let prevented=false;
    element(id).events.keydown({key,preventDefault(){prevented=true;},...extra});
    return prevented;
  };
  assert.equal(key('birth-day','ArrowUp'),true);
  assert.equal(element('birth-day').value,'30');
  assert.match(element('birthday-error').textContent,/実在/);
  key('birth-day','ArrowDown');assert.equal(element('birthday-error').textContent,'');
  key('birth-year','ArrowUp');assert.match(element('birthday-error').textContent,/実在/);
  element('birth-month').value='12';key('birth-month','ArrowUp');assert.equal(element('birth-month').value,'12');
  element('birth-day').value='1';key('birth-day','ArrowDown');assert.equal(element('birth-day').value,'1');
  element('birth-year').value='1';key('birth-year','ArrowDown');assert.equal(element('birth-year').value,'1');
  element('birth-month').value='０２';key('birth-month','ArrowUp');assert.equal(element('birth-month').value,'3');
  assert.equal(key('birth-month','ArrowDown',{isComposing:true}),false);
  assert.equal(key('birth-month','ArrowDown',{ctrlKey:true}),false);
  element('birth-day').value='';assert.equal(key('birth-day','ArrowUp'),false);
});

test('milestone message appears at the deadline and clears when lifespan is extended',()=>{
  const profile={birthday:'1990-01-01',gender:'male',years:80};
  let reached=false;
  const current=app(profile,(...args)=>{
    const result=calculate(...args);
    return result&&reached?{...result,remaining:0}:result;
  });
  assert.equal(current.element('milestone-message').textContent,'');
  assert.equal(current.element('countdown-display').hidden,false);
  reached=true;current.tick();
  assert.equal(current.element('countdown-display').hidden,true);
  assert.equal(current.element('remaining-conversions').hidden,true);
  assert.equal(current.element('hero-title').textContent,'想定寿命に達しました');
  assert.match(current.element('milestone-message').textContent,/今日を迎えました/);
  assert.match(current.element('milestone-message').textContent,/健やかな日々/);
  reached=false;current.tick();
  assert.equal(current.element('countdown-display').hidden,false);
  assert.equal(current.element('remaining-conversions').hidden,false);
  assert.equal(current.element('hero-title').textContent,'人生の残り時間');
  assert.equal(current.element('milestone-message').textContent,'');
  const expired=app({birthday:'1900-01-01',gender:'female',years:80});
  assert.match(expired.element('milestone-message').textContent,/今日を迎えました/);
  assert.equal(app().element('milestone-message').textContent,'');
});

test('initial setup opens non-modally and closes after saving',()=>{
  const current=app();
  assert.equal(current.element('settings').open,true);
  assert.equal(current.element('settings').modal,false);
  current.element('birth-year').value='1990';
  current.element('birth-month').value='1';
  current.element('birth-day').value='1';
  current.element('gender-male').checked=true;
  current.element('lifespan').value='81.35';
  current.element('settings-form').events.submit({preventDefault(){}});
  assert.equal(current.element('settings').open,false);
});

test('birth years from one to four digits save without a 1900 cutoff',()=>{
  for(const year of ['1','99','999','1899']){
    const current=app();
    current.element('birth-year').value=year;
    current.element('birth-month').value='1';
    current.element('birth-day').value='1';
    current.element('gender-male').checked=true;
    current.element('lifespan').value='80';
    current.element('settings-form').events.submit({preventDefault(){}});
    assert.equal(current.saved().profile.birthday,`${year.padStart(4,'0')}-01-01`);
  }
});

test('99 February 24 is accepted during input and saved as AD 99',()=>{
  const current=app();
  for(const [id,value] of [['birth-year','99'],['birth-month','2'],['birth-day','24']]){
    current.element(id).value=value;
    current.element(id).events.input();
  }
  assert.equal(current.element('birthday-error').textContent,'');
  current.element('gender-male').checked=true;
  current.element('lifespan').value='80';
  current.element('settings-form').events.submit({preventDefault(){}});
  assert.equal(current.saved().profile.birthday,'0099-02-24');
  assert.equal(calculate(current.saved().profile.birthday,80).birth.getFullYear(),99);
});

test('year 100, 99 and 1 February 20 all validate while editing and save exactly',()=>{
  for(const year of ['100','99','1']){
    const current=app();
    for(const [id,value] of [['birth-year',year],['birth-month','2'],['birth-day','20']]){
      current.element(id).value=value;
      current.element(id).events.input();
    }
    assert.equal(current.element('birthday-error').textContent,'',year);
    current.element('gender-male').checked=true;
    current.element('lifespan').value='80';
    current.element('settings-form').events.submit({preventDefault(){}});
    assert.equal(current.saved().profile.birthday,`${year.padStart(4,'0')}-02-20`);
  }
});

test('settings backdrop dismisses without saving but initial setup stays open',()=>{
  const profile={birthday:'1990-01-01',gender:'male',years:80};
  for(const saved of [undefined,profile]){
    const current=app(saved);
    const settings=current.element('settings');
    settings.getBoundingClientRect=()=>({left:100,right:300,top:100,bottom:400});
    if(saved)settings.showModal();
    current.element('lifespan').value='90';
    const event={target:settings,clientX:10,clientY:10};
    settings.events.pointerdown(event);settings.events.click(event);
    assert.equal(settings.open,!saved);
    assert.deepEqual(current.saved(),saved?{profile}:null);
  }
});

test('birthday message follows the local calendar day and coexists with lifespan message',()=>{
  let now=new Date(2026,1,23,23,59,59).getTime();
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}}
  const current=app({birthday:'1994-02-24',gender:'male',years:81.35},calculate,Clock);
  assert.equal(current.element('milestone-message').textContent,'');
  now=new Date(2026,1,24,0,0,0).getTime();current.tick();
  assert.match(current.element('milestone-message').textContent,/お誕生日おめでとう/);
  now=new Date(2026,1,25,0,0,0).getTime();current.tick();
  assert.equal(current.element('milestone-message').textContent,'');
  now=new Date(2026,1,24).getTime();
  const expired=app({birthday:'1900-02-24',gender:'female',years:80},calculate,Clock);
  assert.match(expired.element('milestone-message').textContent,/お誕生日おめでとう/);
  assert.match(expired.element('milestone-message').textContent,/想定寿命を超えて/);
});

test('a February 29 birthday is celebrated only on February 29',()=>{
  let now=new Date(2024,1,29).getTime();
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}}
  const current=app({birthday:'2000-02-29',gender:'male',years:80},calculate,Clock);
  assert.match(current.element('milestone-message').textContent,/お誕生日おめでとう/);
  for(const value of [new Date(2025,1,28),new Date(2025,2,1)]){
    now=value.getTime();current.tick();
    assert.equal(current.element('milestone-message').textContent,'');
  }
});
