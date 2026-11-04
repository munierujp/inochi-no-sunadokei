const PUBLIC_URL='https://inochi-no-sunadokei.munieru.app/';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
export function buildCardSVG({glass,logo,result,years,birthdayToday=false}){
  const reached=result.remaining===0;
  const birth=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'long',day:'numeric'}).format(result.birth);
  const basis=`${birth}生まれ・想定寿命 ${years}歳で計算`;
  let hourglass=glass.replace(/<svg\b[^>]*>/,'<svg x="340" y="210" width="400" height="567" viewBox="0 0 360 510">');
  const fraction=result.fraction,upper=75+fraction*173,lower=446-fraction*134;
  hourglass=hourglass.replace(/(<rect id="upper-sand"[^>]*?y=")[^"]+/,`$1${upper}`).replace(/(<rect id="upper-sand"[^>]*?height=")[^"]+/,`$1${Math.max(0,252-upper)}`).replace(/(<path id="lower-sand" d=")[^"]+/,`$1M86 446V${lower+24}Q180 ${lower-24} 274 ${lower+24}V446Z`);
  if(reached)hourglass=hourglass.replace(/<path class="sand-stream"[^>]*(?:\/>|>[\s\S]*?<\/path>)/,'');
  const d=result.duration;
  const rows=[[230,946,d.years,'年'],[540,946,d.months,'ヶ月'],[850,946,d.days,'日'],[230,1042,d.hours,'時間'],[540,1042,d.minutes,'分'],[850,1042,d.seconds,'秒']];
  const numbers=rows.map(([x,y,n,unit])=>`<text x="${x}" y="${y}">${escape(n)}<tspan font-family="Hiragino Sans, sans-serif" font-size="28" fill="#6d7266"> ${unit}</tspan></text>`).join('');
  const message=reached
    ? '<text x="540" y="914" font-size="33">想定寿命を超えて、今日を迎えました。</text><text x="540" y="981" font-size="28">これからも健やかな日々が</text><text x="540" y="1028" font-size="28">続きますように。</text>'
    : `<text x="540" y="838" font-size="30">私の人生の残り時間</text><g font-family="Hiragino Mincho ProN, Yu Mincho, serif" font-size="74">${numbers}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#f5f2eb"/><image x="290" y="48" width="500" height="167" xlink:href="${escape(logo)}"/><circle cx="540" cy="492" r="266" fill="none" stroke="#ded9cb" opacity=".6"/><circle cx="540" cy="492" r="302" fill="none" stroke="#e1dccf" stroke-dasharray="3 6" opacity=".65"/>${hourglass}<g text-anchor="middle" fill="#343a33" font-family="Hiragino Sans, Yu Gothic, sans-serif">${birthdayToday?'<text x="540" y="790" font-size="26" fill="#9c6739">お誕生日おめでとうございます</text>':''}${message}<text x="540" y="1096" font-size="22" fill="#6d7266">${escape(basis)}</text><text x="540" y="1140" font-size="22" fill="#6d7266">設定した想定寿命に基づく表示です</text><path d="M120 1173H960" stroke="#deddd2"/><text x="540" y="1226" font-size="28" fill="#9c6739">#命の砂時計</text><text x="540" y="1278" font-size="24" fill="#6d7266">${PUBLIC_URL}</text></g></svg>`;
}
function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('画像を読み込めませんでした。'));img.src=url;});}
async function logoData(){
  const response=await fetch('./assets/logo-wordmark-a.png');
  if(!response.ok)throw new Error('ロゴを読み込めませんでした。');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('ロゴを読み込めませんでした。'));reader.readAsDataURL(blob);});
}
export async function createCardPNG(snapshot){
  await document.fonts?.ready;
  const svg=buildCardSVG({...snapshot,logo:await logoData()});
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=await loadImage(url);
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('このブラウザでは画像を作成できません。');
    context.drawImage(img,0,0);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を作成できませんでした。')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
}
export function supportsImageSharing(){
  try{
    return typeof navigator!=='undefined'&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&typeof File==='function'&&navigator.canShare({files:[new File([],'inochi-no-sunadokei.png',{type:'image/png'})]});
  }catch{return false;}
}
export function setupImageExport(getSnapshot,{create=createCardPNG}={}){
  const saveButton=document.getElementById('image-save');
  const shareButton=document.getElementById('image-share');
  const status=document.getElementById('image-status');
  let prepared=null;
  let saving=false;
  async function exportImage(sharing){
    if(saving)return;
    const snapshot=getSnapshot();if(!snapshot)return;
    const key=JSON.stringify([snapshot.result?.birth,snapshot.years]);
    const retry=sharing&&prepared?.key===key;
    if(!retry)prepared=null;
    const trigger=sharing?shareButton:saveButton;
    saving=true;saveButton.disabled=true;shareButton.disabled=true;trigger.setAttribute('aria-busy','true');
    status.textContent='画像を作成しています…';
    let url;
    try{
      const blob=retry?prepared.blob:await create(snapshot);
      const file=sharing?(retry?prepared.file:new File([blob],'inochi-no-sunadokei.png',{type:'image/png'})):null;
      let canShare=false;
      try{canShare=sharing&&navigator.canShare({files:[file]});}catch{}
      if(canShare){
        const requestRetry=()=>{
          prepared={blob,file,key};
          shareButton.textContent='もう一度押して共有';
          status.textContent='画像を用意しました。「もう一度押して共有」を押してください。';
        };
        // Image generation can outlast the browser's user-activation window.
        if(!retry&&navigator.userActivation?.isActive===false){requestRetry();return;}
        try{
          await navigator.share({files:[file]});
          prepared=null;status.textContent='';return;
        }catch(error){
          if(error.name==='AbortError'){prepared=null;status.textContent='';return;}
          if(error.name==='NotAllowedError'&&!retry){requestRetry();return;}
          throw error;
        }
      }
      if(sharing)throw new Error('画像を共有できません。「画像を保存」をお試しください。');
      prepared=null;
      url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download='inochi-no-sunadokei.png';
      document.body.append(link);
      try{link.click();}finally{link.remove();}
      status.textContent='';
    }catch(error){prepared=null;status.textContent=sharing?'画像を共有できません。「画像を保存」をお試しください。':error.message||'画像を保存できませんでした。もう一度お試しください。';}
    finally{
      // Keep the blob available while the browser starts its download.
      if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);
      saving=false;saveButton.disabled=false;shareButton.disabled=false;trigger.setAttribute('aria-busy','false');
      if(!prepared)shareButton.textContent='画像を共有';
    }
  }
  saveButton.addEventListener('click',()=>exportImage(false));
  shareButton.addEventListener('click',()=>exportImage(true));
}
