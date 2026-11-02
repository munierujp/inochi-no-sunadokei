export const DAY = 86400000;
export const AVERAGE_LIFESPAN = Object.freeze({male:81.35,female:87.33});
export function parseBirthday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(y, m-1, d);
  return date.getFullYear() === y && date.getMonth() === m-1 && date.getDate() === d ? date : null;
}
export function deadline(birth, years) {
  const y = birth.getFullYear() + years;
  const last = new Date(y, birth.getMonth()+1, 0).getDate();
  return new Date(y, birth.getMonth(), Math.min(birth.getDate(),last));
}
export function calculate(birthday, years, now = new Date()) {
  const birth = parseBirthday(birthday);
  if (!birth || birth > now || !Number.isInteger(years) || years < 1 || years > 120) return null;
  const end = deadline(birth, years);
  const remaining = Math.max(0, end - now);
  const fraction = Math.min(1,Math.max(0,(now-birth)/(end-birth)));
  let months=0;
  if(remaining>0){
    months=(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth();
    const first=new Date(now.getFullYear(),now.getMonth()+months,1);
    const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
    const anniversary=new Date(first.getFullYear(),first.getMonth(),Math.min(now.getDate(),last),now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());
    if(anniversary>end)months--;
    months=Math.max(0,months);
  }
  return {birth,end,remaining,fraction,days:Math.floor(remaining/DAY),weeks:Math.floor(remaining/DAY/7),months,years:Math.floor(months/12),hours:Math.floor(remaining/3600000)%24,minutes:Math.floor(remaining/60000)%60,seconds:Math.floor(remaining/1000)%60,totalWeeks:Math.ceil((end-birth)/DAY/7),elapsedWeeks:Math.floor((now-birth)/DAY/7)};
}
