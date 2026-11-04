import {calculate,parseBirthday,AVERAGE_LIFESPAN} from './time.mjs?v=ad-years-2';
import {buildXShareURL} from './share.mjs';
import {setupImageExport,supportsImageSharing} from './image-card.mjs';
const $ = id => document.getElementById(id);
const KEY='inochi-hourglass-v1';
const genders=new Set(['male','female','none']);
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
    $('countdown-display').hidden=false;
    $('remaining-conversions').hidden=false;
    $('hero-title').textContent='人生の残り時間';
    $('share-x').hidden=true;
    $('image-save').hidden=true;
    $('image-share').hidden=true;
    $('milestone-message').textContent='';
    $('days').textContent='—';
    $('upper-sand').setAttribute('y',130);
    $('upper-sand').setAttribute('height',122);
    $('lower-sand').setAttribute('d','M86 446V408Q180 355 274 408V446Z');
    document.querySelector('.sand-stream').style.display='';
    return;
  }
  const now=new Date();
  const result=calculate(profile.birthday,profile.years,now);
  if(!result)return;
  const reached=result.remaining===0;
  const birthdayToday=result.birth.getMonth()===now.getMonth()&&result.birth.getDate()===now.getDate();
  $('countdown-display').hidden=reached;
  $('remaining-conversions').hidden=reached;
  $('hero-title').textContent=reached?'想定寿命に達しました':'人生の残り時間';
  $('share-x').href=buildXShareURL(result.duration,document.querySelector('link[rel="canonical"]')?.href,{reached,birthdayToday});
  $('share-x').hidden=false;
  $('image-save').hidden=false;
  $('image-share').hidden=!supportsImageSharing();
  $('countdown-years').textContent=nf.format(result.duration.years);
  $('countdown-months').textContent=nf.format(result.duration.months);
  $('days').textContent=nf.format(result.duration.days);
  ['hours','minutes','seconds'].forEach(key=>$(key).textContent=String(result.duration[key]).padStart(2,'0'));
  $('demo-badge').hidden=!!state.profile;
  $('basis').textContent=`${dateFormat.format(result.birth)}生まれ・想定寿命 ${profile.years}歳で計算`;
  const messages=[];
  if(birthdayToday)messages.push('お誕生日おめでとうございます。\n新しい一年が、健やかで実りある日々になりますように。');
  if(reached)messages.push('想定寿命を超えて、今日を迎えました。\nこれからも健やかな日々が続きますように。');
  const milestone=messages.join('\n\n');
  if($('milestone-message').textContent!==milestone)$('milestone-message').textContent=milestone;
  const percent=(result.fraction*100).toFixed(1);
  $('progress-fill').style.width=percent+'%';
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',percent);
  $('elapsed-percent').textContent=percent+'%';
  $('remaining-days').textContent=nf.format(result.days);
  $('months').textContent=nf.format(result.months);
  $('years').textContent=nf.format(result.years);
  updateSand(result);
}
function updateSand(result){
  const upper=75+result.fraction*173;
  $('upper-sand').setAttribute('y',upper);
  $('upper-sand').setAttribute('height',Math.max(0,252-upper));
  const lower=446-result.fraction*134;
  $('lower-sand').setAttribute('d',`M86 446V${lower+24}Q180 ${lower-24} 274 ${lower+24}V446Z`);
  document.querySelector('.sand-stream').style.display=result.remaining>0?'':'none';
}
function renderPreview(){
  if(!settings.open)return;
  if(!needsSetup()){
    $('onboarding-summary').hidden=true;
    return;
  }
  const [year,month,day]=birthdayValues();
  const birthday=`${year.padStart(4,'0')}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  const valid=/^[0-9]{1,4}$/.test(year)&&/^[0-9]{1,2}$/.test(month)&&/^[0-9]{1,2}$/.test(day);
  const result=valid?calculate(birthday,Number($('lifespan').value)):null;
  $('onboarding-summary').hidden=!result;
  if(!result){
    $('onboarding-duration').textContent='';
    render();
    return;
  }
  const d=result.duration;
  $('onboarding-duration').textContent=result.remaining===0
    ? '想定寿命に達しています。'
    : `${d.years}年 ${d.months}ヶ月 ${d.days}日 ${d.hours}時間 ${d.minutes}分 ${d.seconds}秒`;
  $('onboarding-summary-label').hidden=result.remaining===0;
  updateSand(result);
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
  }else if(!/^[0-9]{1,4}$/.test(year)||Number(year)<1){
    message='生年は1〜4桁の西暦（1年以降）で入力してください。';invalid=[0];
  }else if(!/^[0-9]{1,2}$/.test(month)||Number(month)<1||Number(month)>12){
    message='月は1〜12の数字で入力してください。';invalid=[1];
  }else if(!/^[0-9]{1,2}$/.test(day)||Number(day)<1||Number(day)>31){
    message='日は1〜31の数字で入力してください。';invalid=[2];
  }else{
    const birthday=`${year.padStart(4,'0')}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
    const date=parseBirthday(birthday);
    if(!date){
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
  if(year&&month&&day&&month!=='0'&&day!=='0')validateBirthday();
  else clearBirthdayErrors();
  $('form-error').textContent='';
  renderPreview();
}));
birthIds.forEach((id,index)=>$(id).addEventListener('keydown',event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
  const input=$(id);
  const value=input.value.normalize('NFKC').trim();
  if(!/^[0-9]+$/.test(value))return;
  event.preventDefault();
  const minimum=1;
  const maximum=index===0?new Date().getFullYear():index===1?12:31;
  input.value=String(Math.min(maximum,Math.max(minimum,Number(value)+(event.key==='ArrowUp'?1:-1))));
  input.dispatchEvent(new Event('input',{bubbles:true}));
}));
const settings=$('settings');
function needsSetup(){return !state.profile;}
function openSettings(){
  const initial=needsSetup();
  document.body.classList.toggle('onboarding',initial);
  $('onboarding-scene').hidden=!initial;
  $('onboarding-footer').hidden=!initial;
  if(initial){
    $('onboarding-scene').prepend(document.querySelector('.hourglass-scene'));
    $('onboarding-footer').append(document.querySelector('footer'));
  }
  $('settings-title').textContent=initial?'初期設定':'設定';
  $('settings-submit').firstChild.textContent=initial?'はじめる':'保存';
  const [year='',month='',day='']=(state.profile?.birthday||'').split('-');
  $('birth-year').value=year;
  $('birth-month').value=month;
  $('birth-day').value=day;
  clearBirthdayErrors();
  const gender=genders.has(state.profile?.gender)?state.profile.gender:'none';
  genders.forEach(value=>{$(`gender-${value}`).checked=value===gender;});
  $('lifespan').value=state.profile?.years??'';
  $('form-error').textContent='';
  $('reset').hidden=!state.profile;
  // Initial setup scrolls with the document, avoiding fixed-dialog caret offsets on iOS.
  settings.setAttribute('closedby',initial?'none':'any');
  if(initial)settings.show();
  else settings.showModal();
  renderPreview();
}
settings.addEventListener('cancel',event=>{if(needsSetup())event.preventDefault();});
genders.forEach(gender=>$(`gender-${gender}`).addEventListener('change',()=>{
  const average=AVERAGE_LIFESPAN[selectedGender()];
  if(average!==undefined)$('lifespan').value=average;
  $('form-error').textContent='';
  renderPreview();
}));
$('lifespan').addEventListener('input',renderPreview);
document.querySelectorAll('[data-settings]').forEach(button=>button.addEventListener('click',openSettings));
$('share-x').addEventListener('click',render);
document.querySelectorAll('dialog .close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('[data-about]').forEach(button=>button.addEventListener('click',()=>$('about').showModal()));
function enableLightDismiss(dialog,canClose=()=>true){
  if('closedBy' in dialog)return;
  let startedOutside=false;
  const outside=event=>{
    if(event.target!==dialog)return false;
    const rect=dialog.getBoundingClientRect();
    return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
  };
  dialog.addEventListener('pointerdown',event=>{startedOutside=outside(event);});
  dialog.addEventListener('pointercancel',()=>{startedOutside=false;});
  dialog.addEventListener('click',event=>{
    if(startedOutside&&outside(event)&&canClose())dialog.close();
    startedOutside=false;
  });
  dialog.addEventListener('close',()=>{startedOutside=false;});
}
enableLightDismiss($('about'));
enableLightDismiss(settings,()=>!needsSetup());
setupImageExport(()=>{
  if(!state.profile)return null;
  const now=new Date();
  const result=calculate(state.profile.birthday,state.profile.years,now);
  if(!result)return null;
  return {result,years:state.profile.years,glass:document.querySelector('.hourglass').outerHTML,birthdayToday:result.birth.getMonth()===now.getMonth()&&result.birth.getDate()===now.getDate()};
});

$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();
  const [year,month,day]=birthdayValues();
  const birthday=`${year.padStart(4,'0')}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  const years=Number($('lifespan').value),gender=selectedGender();
  if(!validateBirthday()){
    $('form-error').textContent=$('birthday-error').textContent;
    $('form-error').focus();
    return;
  }
  if(!calculate(birthday,years)){$('form-error').textContent='想定寿命は1〜120歳の数字で入力してください。';$('form-error').focus();return;}
  state.profile={birthday,gender:gender||'none',years};const saved=save();render();
  document.querySelector('.hero').prepend(document.querySelector('.hourglass-scene'));
  document.body.append(document.querySelector('footer'));
  $('onboarding-scene').hidden=true;
  $('onboarding-footer').hidden=true;
  document.body.classList.remove('onboarding');settings.close();
  $('header-settings').focus();
  $('settings-status').textContent=saved?'':'このブラウザでは保存できません。開いている間のみ保持します。';
});
$('settings-status').textContent=storageWorks?'':'このブラウザでは設定を保存できません。開いている間のみ保持します。';
$('reset').addEventListener('click',()=>{
  if(!confirm('生年月日・性別・想定寿命の設定を削除しますか？'))return;
  state={profile:null};
  try{localStorage.removeItem(KEY);}catch{}
  $('settings-status').textContent='';settings.close();render();openSettings();
});
render();setInterval(()=>{if(!document.hidden){render();renderPreview();}},1000);
if(needsSetup())openSettings();else document.body.classList.remove('onboarding');
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();renderPreview();}});
