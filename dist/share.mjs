export function buildXShareURL(duration, publicUrl){
  const {years,months,days,hours,minutes,seconds}=duration;
  const intent=new URL('https://x.com/intent/tweet');
  intent.searchParams.set('text',`人生の残り時間：${years}年${months}ヶ月${days}日 ${hours}時間${minutes}分${seconds}秒\n#命の砂時計`);
  if(publicUrl){
    try{
      const page=new URL(publicUrl);
      const local=page.hostname==='localhost'||page.hostname.endsWith('.localhost')||page.hostname==='[::1]'||/^127\./.test(page.hostname);
      if(page.protocol==='https:'&&!local&&!page.username&&!page.password){
        page.search='';page.hash='';
        intent.searchParams.set('url',page.href);
      }
    }catch{}
  }
  return intent.href;
}
