
(function(){
  const existing=window.AdminAuth.getSession(); if(existing) location.replace('index.html');
  function enter(){ window.AdminAuth.loginDemo(); const q=new URLSearchParams(location.search); let target='index.html'; const r=q.get('retorno'); if(r){try{const u=new URL(r,location.href); if(u.origin===location.origin) target=u.href;}catch(_){}} location.assign(target); }
  document.querySelector('#entrar-demo')?.addEventListener('click',enter);
  document.querySelector('#admin-login-form')?.addEventListener('submit',e=>{e.preventDefault(); enter();});
})();
