
(function () {
  function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function initials(name='Administrador') { return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase() || 'AD'; }
  function statusClass(status='') { return 'status-'+String(status).toLowerCase().replaceAll('_','-'); }
  function statusLabel(status='') { return String(status).replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g, l=>l.toUpperCase()); }
  function money(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function date(v) { const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}); }
  function toast(message, type='sucesso') { const r=document.querySelector('.admin-toast-region'); if(!r) return; const el=document.createElement('div'); el.className=`admin-toast ${type}`; el.textContent=message; r.appendChild(el); setTimeout(()=>el.remove(),3800); }
  function confirmAction(title,message) { const d=document.querySelector('#admin-confirm-dialog'); if(!d || !d.showModal) return Promise.resolve(confirm(message)); d.querySelector('[data-dialog-title]').textContent=title; d.querySelector('[data-dialog-message]').textContent=message; d.showModal(); return new Promise(resolve=>d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true})); }
  function init() {
    const page=document.body.dataset.adminPage;
    document.querySelector(`[data-admin-nav="${page}"]`)?.classList.add('ativo');
    const session=window.AdminAuth.getSession();
    if(session){ document.body.dataset.adminRole=String(session.papel||session.role||'').toUpperCase(); document.querySelectorAll('[data-admin-nome]').forEach(e=>e.textContent=session.nome||'Administrador'); document.querySelectorAll('[data-admin-papel]').forEach(e=>e.textContent=session.papel||'ADMIN'); document.querySelectorAll('[data-admin-iniciais]').forEach(e=>e.textContent=initials(session.nome)); document.querySelectorAll('[data-admin-nav]').forEach(link=>{ if(!window.AdminAuth.podeAcessar(link.dataset.adminNav,session)) link.hidden=true; }); }
    const saved=localStorage.getItem('pcBuilderTema'); const dark=matchMedia?.('(prefers-color-scheme: dark)').matches; document.documentElement.dataset.tema=saved||(dark?'escuro':'claro');
    document.querySelectorAll('[data-alternar-tema]').forEach(b=>b.addEventListener('click',()=>{ const t=document.documentElement.dataset.tema==='escuro'?'claro':'escuro'; document.documentElement.dataset.tema=t; localStorage.setItem('pcBuilderTema',t); }));
    document.querySelectorAll('[data-abrir-menu]').forEach(b=>b.addEventListener('click',()=>document.body.classList.add('admin-menu-aberto')));
    document.querySelectorAll('[data-fechar-menu]').forEach(b=>b.addEventListener('click',()=>document.body.classList.remove('admin-menu-aberto')));
    const user=document.querySelector('.admin-user-menu'); const btn=document.querySelector('[data-user-menu]'); btn?.addEventListener('click',e=>{e.stopPropagation(); user?.classList.toggle('aberto'); btn.setAttribute('aria-expanded',String(user?.classList.contains('aberto')));}); document.addEventListener('click',e=>{if(user&&!user.contains(e.target)){user.classList.remove('aberto');btn?.setAttribute('aria-expanded','false');}});
    document.querySelectorAll('[data-admin-sair]').forEach(b=>b.addEventListener('click',window.AdminAuth.logout));
  }
  window.AdminUI={esc,initials,statusClass,statusLabel,money,date,toast,confirmAction,init};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
