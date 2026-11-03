export function buildXShareURL(duration, publicUrl, {reached=false,birthdayToday=false}={}){
  const {years,months,days,hours,minutes,seconds}=duration;
  const intent=new URL('https://x.com/intent/tweet');
  const lines=[];
  if(birthdayToday)lines.push('本日、誕生日を迎えました。');
  if(reached){
    lines.push('想定寿命を超えて、今日を迎えました。','これからも健やかな日々を過ごせますように。');
  }else{
    lines.push(`私の人生の残り時間：${years}年 ${months}ヶ月 ${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`);
  }
  lines.push('#命の砂時計');
  intent.searchParams.set('text',lines.join('\n'));
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
