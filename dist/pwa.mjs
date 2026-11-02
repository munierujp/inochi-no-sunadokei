const installButtons=[...document.querySelectorAll('[data-pwa-install]')];
const updateButtons=[...document.querySelectorAll('[data-pwa-update]')];
let installPrompt=null;
let registration=null;
let reloading=false;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const showInstall=show=>installButtons.forEach(button=>{button.hidden=!show;});
const showUpdate=()=>updateButtons.forEach(button=>{button.hidden=false;});

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

updateButtons.forEach(button=>button.addEventListener('click',()=>{
  if(!registration?.waiting)return;
  updateButtons.forEach(item=>{item.disabled=true;});
  registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}));

if('serviceWorker' in navigator && window.isSecureContext && ['http:','https:'].includes(location.protocol)){
  let controlled=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!controlled){controlled=true;return;}
    if(reloading)return;
    reloading=true;
    location.reload();
  });
  try {
    registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    if(registration.waiting)showUpdate();
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate();
      });
    });
    const checkUpdate=()=>registration.update().catch(()=>{});
    window.addEventListener('online',checkUpdate);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});
  } catch(error) {
    console.warn('オフライン機能を有効にできませんでした。',error);
  }
}
