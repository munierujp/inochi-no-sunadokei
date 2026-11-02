export const DAY = 86400000;
export const AVERAGE_LIFESPAN = Object.freeze({male:81.35,female:87.33});
export function parseBirthday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(y, m-1, d);
  return date.getFullYear() === y && date.getMonth() === m-1 && date.getDate() === d ? date : null;
}
export function deadline(birth, years) {
  const whole=Math.floor(years);
  const anniversary=age=>{
    const y=birth.getFullYear()+age;
    const last=new Date(y,birth.getMonth()+1,0).getDate();
    return new Date(y,birth.getMonth(),Math.min(birth.getDate(),last));
  };
  const start=anniversary(whole);
  const next=anniversary(whole+1);
  return new Date(start.getTime()+(next-start)*(years-whole));
}
function addCalendarMonths(date, months){
  const first=new Date(date.getFullYear(),date.getMonth()+months,1);
  const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  return new Date(first.getFullYear(),first.getMonth(),Math.min(date.getDate(),last),date.getHours(),date.getMinutes(),date.getSeconds(),date.getMilliseconds());
}
export function calculate(birthday, years, now = new Date()) {
  const birth = parseBirthday(birthday);
  if (!birth || birth > now || !Number.isFinite(years) || years < 1 || years > 120) return null;
  const end = deadline(birth, years);
  const remaining = Math.max(0, end - now);
  const fraction = Math.min(1,Math.max(0,(now-birth)/(end-birth)));
  let months=0;
  if(remaining>0){
    months=(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth();
    if(addCalendarMonths(now,months)>end)months--;
    months=Math.max(0,months);
  }
  const rest=remaining>0?Math.max(0,end-addCalendarMonths(now,months)):0;
  const duration={years:Math.floor(months/12),months:months%12,days:Math.floor(rest/DAY),hours:Math.floor(rest/3600000)%24,minutes:Math.floor(rest/60000)%60,seconds:Math.floor(rest/1000)%60};
  return {birth,end,remaining,fraction,duration,days:Math.floor(remaining/DAY),weeks:Math.floor(remaining/DAY/7),months,years:Math.floor(months/12)};
}
