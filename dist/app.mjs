import {calculate,AVERAGE_LIFESPAN} from './time.mjs';
import {buildXShareURL} from './share.mjs';
const $ = id => document.getElementById(id);
const KEY='inochi-hourglass-v1';
const genders=new Set(['male','female']);
function selectedGender(){return [...genders].find(gender=>$(`gender-${gender}`).checked)||'';}
let state={profile:null};
let storageWorks=true;
try { const raw=JSON.parse(localStorage.getItem(KEY)); if(raw && typeof raw==='object'){if(raw.profile&&typeof raw.profile.years==='number'){const profile={...raw.profile,years:raw.profile.years};if(calculate(profile.birthday,profile.years))state.profile=profile;}} } catch { storageWorks=false; }
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageWorks=true;return true;}catch{storageWorks=false;return false;}}
const nf = new Intl.NumberFormat('ja-JP');
const dateFormat=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric'});
function render(){
  const profile=state.profile;
  if(!profile){
    $('share-x').hidden=true;
    $('milestone-message').textContent='';
    $('days').textContent='—';
    $('upper-sand').setAttribute('y',130);
    $('upper-sand').setAttribute('height',122);
    $('lower-sand').setAttribute('d','M86 446V408Q180 355 274 408V446Z');
    document.querySelector('.sand-stream').style.display='';
    return;
  }
  const result=calculate(profile.birthday,profile.years);
  if(!result)return;
  $('share-x').href=buildXShareURL(result.duration,document.querySelector('link[rel="canonical"]')?.href);
  $('share-x').hidden=false;
  $('countdown-years').textContent=nf.format(result.duration.years);
  $('countdown-months').textContent=nf.format(result.duration.months);
  $('days').textContent=nf.format(result.duration.days);
  ['hours','minutes','seconds'].forEach(key=>$(key).textContent=String(result.duration[key]).padStart(2,'0'));
  $('demo-badge').hidden=!!state.profile;
  $('main-setup').firstChild.textContent=state.profile?'設定変更 ':'設定 ';
  $('basis').textContent=`${dateFormat.format(result.birth)}生まれ・想定寿命 ${profile.years}歳で計算`;
  const milestone=result.remaining===0?'想定寿命を超えて、今日を迎えました。\nこれからも健やかな日々が続きますように。':'';
  if($('milestone-message').textContent!==milestone)$('milestone-message').textContent=milestone;
  const percent=(result.fraction*100).toFixed(1);
  $('progress-fill').style.width=percent+'%';
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',percent);
  $('elapsed-percent').textContent=percent+'%';
  $('remaining-days').textContent=nf.format(result.days);
  $('months').textContent=nf.format(result.months);
  $('years').textContent=nf.format(result.years);
  const upper=75+result.fraction*173;
  $('upper-sand').setAttribute('y',upper);
  $('upper-sand').setAttribute('height',Math.max(0,252-upper));
  const lower=446-result.fraction*134;
  $('lower-sand').setAttribute('d',`M86 446V${lower+24}Q180 ${lower-24} 274 ${lower+24}V446Z`);
  document.querySelector('.sand-stream').style.display=result.remaining>0?'':'none';

}
const birthIds=['birth-year','birth-month','birth-day'];
const birthLabels=['年','月','日'];
function birthdayValues(){return birthIds.map(id=>$(id).value.normalize('NFKC').trim());}
function clearBirthdayErrors(){
  birthIds.forEach(id=>{$(id).setAttribute('aria-invalid','false');});
  $('birthday-error').textContent='';
}
function validateBirthday(){
  const values=birthdayValues();
  const [year,month,day]=values;
  let message='';
  let invalid=[];
  const missing=values.map((value,i)=>value?'':birthLabels[i]).filter(Boolean);
  if(missing.length){
    message=missing.length===3?'生年月日を入力してください。':`生年月日の${missing.join('・')}を入力してください。`;
    invalid=values.map((value,i)=>value?-1:i).filter(i=>i>=0);
  }else if(!/^[0-9]{4}$/.test(year)||Number(year)<1900){
    message='生年は1900年以降の西暦4桁で入力してください。';invalid=[0];
  }else if(!/^[0-9]{1,2}$/.test(month)||Number(month)<1||Number(month)>12){
    message='月は1〜12の数字で入力してください。';invalid=[1];
  }else if(!/^[0-9]{1,2}$/.test(day)||Number(day)<1||Number(day)>31){
    message='日は1〜31の数字で入力してください。';invalid=[2];
  }else{
    const birthday=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
    const date=new Date(Number(year),Number(month)-1,Number(day));
    if(date.getFullYear()!==Number(year)||date.getMonth()!==Number(month)-1||date.getDate()!==Number(day)){
      message='生年月日は実在する日付を入力してください。';invalid=[0,1,2];
    }else if(date>new Date()){
      message='生年月日は今日以前の日付を入力してください。';invalid=[0,1,2];
    }
  }
  birthIds.forEach((id,i)=>$(id).setAttribute('aria-invalid',String(invalid.includes(i))));
  $('birthday-error').textContent=message;
  return !message;
}
birthIds.forEach(id=>$(id).addEventListener('input',()=>{
  const [year,month,day]=birthdayValues();
  if(year.length>=4&&month&&day&&month!=='0'&&day!=='0')validateBirthday();
  else clearBirthdayErrors();
  $('form-error').textContent='';
}));
birthIds.forEach((id,index)=>$(id).addEventListener('keydown',event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
  const input=$(id);
  const value=input.value.normalize('NFKC').trim();
  if(!/^[0-9]+$/.test(value))return;
  event.preventDefault();
  const minimum=index===0?1900:1;
  const maximum=index===0?new Date().getFullYear():index===1?12:31;
  input.value=String(Math.min(maximum,Math.max(minimum,Number(value)+(event.key==='ArrowUp'?1:-1))));
  input.dispatchEvent(new Event('input',{bubbles:true}));
}));
const settings=$('settings');
function needsSetup(){return !state.profile||!genders.has(state.profile.gender);}
function openSettings(){
  const initial=needsSetup();
  document.body.classList.toggle('onboarding',initial);
  $('onboarding-scene').hidden=!initial;
  $('onboarding-footer').hidden=!initial;
  if(initial){
    $('onboarding-scene').append(document.querySelector('.hourglass-scene'));
    $('onboarding-footer').append(document.querySelector('footer'));
  }
  $('settings-title').textContent=initial?'初期設定':'設定';
  $('settings-submit').firstChild.textContent=initial?'はじめる ':'保存 ';
  const [year='',month='',day='']=(state.profile?.birthday||'').split('-');
  $('birth-year').value=year;
  $('birth-month').value=month;
  $('birth-day').value=day;
  clearBirthdayErrors();
  genders.forEach(gender=>{$(`gender-${gender}`).checked=state.profile?.gender===gender;});
  $('lifespan').value=state.profile?.years??'';
  $('lifespan-help').textContent=state.profile
    ? '保存した想定寿命です。性別を選び直すと自動入力されます。'
    : '性別を選んで自動入力するか、想定寿命を直接入力してください。';
  $('form-error').textContent='';
  $('reset').hidden=!state.profile;
  settings.showModal();
}
settings.addEventListener('cancel',event=>{if(needsSetup())event.preventDefault();});
genders.forEach(gender=>$(`gender-${gender}`).addEventListener('change',()=>{
  const average=AVERAGE_LIFESPAN[selectedGender()];
  const years=average;
  $('lifespan').value=years??'';
  $('lifespan-help').textContent=years
    ? `平均寿命の${years}歳を入力しました。変更できます。`
    : '性別を選ぶと平均寿命を自動入力します。';
  $('form-error').textContent='';
}));
document.querySelectorAll('[data-settings]').forEach(button=>button.addEventListener('click',openSettings));
$('share-x').addEventListener('click',render);
document.querySelectorAll('dialog .close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('[data-about]').forEach(button=>button.addEventListener('click',()=>$('about').showModal()));
const about=$('about');
if(!('closedBy' in about)){
  let startedOutside=false;
  const outside=event=>{
    if(event.target!==about)return false;
    const rect=about.getBoundingClientRect();
    return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
  };
  about.addEventListener('pointerdown',event=>{startedOutside=outside(event);});
  about.addEventListener('pointercancel',()=>{startedOutside=false;});
  about.addEventListener('click',event=>{
    if(startedOutside&&outside(event))about.close();
    startedOutside=false;
  });
  about.addEventListener('close',()=>{startedOutside=false;});
}

$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();
  const [year,month,day]=birthdayValues();
  const birthday=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  const years=Number($('lifespan').value),gender=selectedGender();
  if(!validateBirthday()){
    $('form-error').textContent=$('birthday-error').textContent;
    $('form-error').focus();
    return;
  }
  if(!calculate(birthday,years)){$('form-error').textContent='想定寿命は1〜120歳の数字で入力してください。';$('form-error').focus();return;}
  if(!genders.has(gender)){$('form-error').textContent='性別を選択してください。';$('form-error').focus();return;}
  state.profile={birthday,gender,years};const saved=save();render();
  document.querySelector('.hero').prepend(document.querySelector('.hourglass-scene'));
  document.body.append(document.querySelector('footer'));
  $('onboarding-scene').hidden=true;
  $('onboarding-footer').hidden=true;
  document.body.classList.remove('onboarding');settings.close();
  $('main-setup').focus();
  $('settings-status').textContent=saved?'設定を保存しました':'このブラウザでは保存できません。開いている間のみ保持します。';
});
$('settings-status').textContent=storageWorks?'':'このブラウザでは設定を保存できません。開いている間のみ保持します。';
$('reset').addEventListener('click',()=>{
  if(!confirm('生年月日・性別・想定寿命の設定を削除しますか？'))return;
  state={profile:null};
  try{localStorage.removeItem(KEY);}catch{}
  $('settings-status').textContent='保存したデータを削除しました';settings.close();render();openSettings();
});
render();setInterval(()=>{if(!document.hidden)render();},1000);
if(needsSetup())openSettings();else document.body.classList.remove('onboarding');
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
