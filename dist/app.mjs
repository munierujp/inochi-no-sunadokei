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
  if(result.remaining===0)$('basis').textContent+=' — 想定寿命に達しました。';
  const percent=(result.fraction*100).toFixed(1);
  $('progress-label').textContent=`${dateFormat.format(result.end)}まで`;
  $('progress-fill').style.width=percent+'%';
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',percent);
  $('elapsed-percent').textContent=percent+'%';
  $('remaining-percent').textContent=(100-Number(percent)).toFixed(1)+'%';
  $('remaining-days').textContent=nf.format(result.days);
  $('weeks').textContent=nf.format(result.weeks);
  $('months').textContent=nf.format(result.months);
  $('years').textContent=nf.format(result.years);
  const upper=75+result.fraction*173;
  $('upper-sand').setAttribute('y',upper);
  $('upper-sand').setAttribute('height',Math.max(0,252-upper));
  const lower=446-result.fraction*134;
  $('lower-sand').setAttribute('d',`M86 446V${lower+24}Q180 ${lower-24} 274 ${lower+24}V446Z`);
  document.querySelector('.sand-stream').style.display=result.remaining>0?'':'none';

}
function birthdayValue(){
  const value=$('birthday').value.normalize('NFKC').trim();
  const match=value.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/)||value.match(/^([0-9]{4})[-/]([0-9]{1,2})[-/]([0-9]{1,2})$/);
  return match?`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`:'';
}
function clearBirthdayErrors(){
  $('birthday').setAttribute('aria-invalid','false');
  $('birthday-error').textContent='';
}
function validateBirthday(){
  const birthday=birthdayValue();
  let message='';
  if(!$('birthday').value.trim())message='生年月日を入力してください。';
  else if(!birthday)message='生年月日は西暦8桁で入力してください。例：19900123';
  else{
    const [year,month,day]=birthday.split('-').map(Number);
    const date=new Date(year,month-1,day);
    if(year<1900)message='生年月日は1900年以降の日付を入力してください。';
    else if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)message='生年月日は実在する日付を入力してください。';
    else if(date>new Date())message='生年月日は今日以前の日付を入力してください。';
  }
  $('birthday').setAttribute('aria-invalid',String(!!message));
  $('birthday-error').textContent=message;
  return !message;
}
$('birthday').addEventListener('input',()=>{
  clearBirthdayErrors();
  $('form-error').textContent='';
});
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
  $('birthday').value=state.profile?.birthday.replaceAll('-','')||'';
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
$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();
  const birthday=birthdayValue();
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
