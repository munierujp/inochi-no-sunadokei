import {calculate,DAY,AVERAGE_LIFESPAN} from './time.mjs';
const $ = id => document.getElementById(id);
const KEY='inochi-hourglass-v1';
const genders=new Set(['male','female']);
function selectedGender(){return [...genders].find(gender=>$(`gender-${gender}`).checked)||'';}
let state={profile:null};
let storageWorks=true;
try { const raw=JSON.parse(localStorage.getItem(KEY)); if(raw && typeof raw==='object'){if(raw.profile&&typeof raw.profile.years==='number'){const profile={...raw.profile,years:Math.round(raw.profile.years)};if(calculate(profile.birthday,profile.years))state.profile=profile;}} } catch { storageWorks=false; }
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageWorks=true;return true;}catch{storageWorks=false;return false;}}
let gridDirty=true;
const nf = new Intl.NumberFormat('ja-JP');
const dateFormat=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric'});
function render(){
  const profile=state.profile;
  if(!profile){
    $('days').textContent='—';
    $('upper-sand').setAttribute('y',130);
    $('upper-sand').setAttribute('height',122);
    $('lower-sand').setAttribute('d','M86 446V408Q180 355 274 408V446Z');
    document.querySelector('.sand-stream').style.display='';
    return;
  }
  const result=calculate(profile.birthday,profile.years);
  if(!result)return;
  $('days').textContent=nf.format(result.days);
  ['hours','minutes','seconds'].forEach(key=>$(key).textContent=String(result[key]).padStart(2,'0'));
  $('demo-badge').hidden=!!state.profile;
  $('main-setup').firstChild.textContent=state.profile?'設定を変更する ':'設定する ';
  $('basis').textContent=`${dateFormat.format(result.birth)}生まれ・寿命 ${profile.years}歳で計算`;
  if(result.remaining===0)$('basis').textContent+=' — 設定した寿命に達しました。';
  const percent=(result.fraction*100).toFixed(1);
  $('progress-label').textContent=`${dateFormat.format(result.end)}まで`;
  $('progress-fill').style.width=percent+'%';
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',percent);
  $('elapsed-percent').textContent=percent+'%';
  $('remaining-percent').textContent=(100-Number(percent)).toFixed(1)+'%';
  $('weeks').textContent=nf.format(Math.floor(result.remaining/DAY/7));
  $('seasons').textContent=nf.format(Math.floor(result.remaining/DAY/365.2425*4));
  const upper=75+result.fraction*173;
  $('upper-sand').setAttribute('y',upper);
  $('upper-sand').setAttribute('height',Math.max(0,252-upper));
  const lower=446-result.fraction*134;
  $('lower-sand').setAttribute('d',`M86 446V${lower+24}Q180 ${lower-24} 274 ${lower+24}V446Z`);
  document.querySelector('.sand-stream').style.display=result.remaining>0?'':'none';
  if(gridDirty&&document.querySelector('.life-map').open){
    const fragment=document.createDocumentFragment();
    for(let i=0;i<result.totalWeeks;i++){const dot=document.createElement('i');if(i<result.elapsedWeeks)dot.className='past';fragment.append(dot);}
    $('week-grid').replaceChildren(fragment);
    $('week-description').textContent=`全${nf.format(result.totalWeeks)}週のうち、${nf.format(Math.min(result.totalWeeks,result.elapsedWeeks))}週を過ごしました。最後の粒には端数の日を含みます。`;
    gridDirty=false;
  }
}
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
  $('birthday').value=state.profile?.birthday||'';
  genders.forEach(gender=>{$(`gender-${gender}`).checked=state.profile?.gender===gender;});
  $('lifespan').value=state.profile?.years??'';
  $('lifespan-help').textContent=state.profile
    ? '保存した寿命です。性別を選び直すと自動入力されます。'
    : '性別を選んで自動入力するか、寿命を直接入力してください。';
  $('form-error').textContent='';
  $('reset').hidden=!state.profile;
  settings.showModal();
}
settings.addEventListener('cancel',event=>{if(needsSetup())event.preventDefault();});
genders.forEach(gender=>$(`gender-${gender}`).addEventListener('change',()=>{
  const average=AVERAGE_LIFESPAN[selectedGender()];
  const years=average===undefined?undefined:Math.round(average);
  $('lifespan').value=years??'';
  $('lifespan-help').textContent=years
    ? `平均寿命を四捨五入した${years}歳を入力しました。変更できます。`
    : '性別を選ぶと平均寿命を自動入力します。';
  $('form-error').textContent='';
}));
const today=new Date();
$('birthday').max=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
document.querySelectorAll('[data-settings]').forEach(button=>button.addEventListener('click',openSettings));
document.querySelectorAll('dialog .close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('[data-about]').forEach(button=>button.addEventListener('click',()=>$('about').showModal()));
$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();
  const birthday=$('birthday').value,years=Number($('lifespan').value),gender=selectedGender();
  if(!calculate(birthday,years)){$('form-error').textContent='今日以前の生年月日と、1〜120歳の整数の寿命を入力してください。';return;}
  if(!genders.has(gender)){$('form-error').textContent='性別を選択してください。';return;}
  state.profile={birthday,gender,years};const saved=save();gridDirty=true;render();
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
  if(!confirm('生年月日・性別・寿命の設定を削除しますか？'))return;
  state={profile:null};
  try{localStorage.removeItem(KEY);}catch{}
  $('settings-status').textContent='保存したデータを削除しました';gridDirty=true;settings.close();render();openSettings();
});
document.querySelector('.life-map').addEventListener('toggle',render);
render();setInterval(()=>{if(!document.hidden)render();},1000);
if(needsSetup())openSettings();else document.body.classList.remove('onboarding');
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});

