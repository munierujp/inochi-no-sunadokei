const installButtons=[...document.querySelectorAll('[data-pwa-install]')];
let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const showInstall=show=>installButtons.forEach(button=>{button.hidden=!show;});

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  showInstall(!standalone());
});
window.addEventListener('appinstalled',()=>{installPrompt=null;showInstall(false);});
installButtons.forEach(button=>button.addEventListener('click',async()=>{
  if(!installPrompt)return;
  const prompt=installPrompt;
  installPrompt=null;
  showInstall(false);
  try { await prompt.prompt();await prompt.userChoice; }
  catch { /* Browser-menu installation remains available. */ }
}));

if('serviceWorker' in navigator && window.isSecureContext && ['http:','https:'].includes(location.protocol)){
  try {
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const checkUpdate=()=>registration.update().catch(()=>{});
    window.addEventListener('online',checkUpdate);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});
  } catch(error) {
    console.warn('オフライン機能を有効にできませんでした。',error);
  }
}
