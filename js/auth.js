(function () {
  const cfg = window.AdminConfig;
  function parse(chave, storage) { try { return JSON.parse(storage.getItem(chave) || 'null'); } catch (_) { return null; } }
  function papel(sessao) { return String(sessao?.papel || sessao?.role || '').toUpperCase(); }
  function valida(sessao) {
    const role = papel(sessao);
    const validade = sessao?.expiraEm ? Date.parse(sessao.expiraEm) : Date.now() + 1;
    return Boolean(sessao?.email && cfg.papeisPermitidos.includes(role) && Number.isFinite(validade) && validade > Date.now());
  }
  function getSession() {
    const publica = parse(cfg.chaveSessaoPublica, sessionStorage);
    if (valida(publica)) return publica;
    const demo = parse(cfg.chaveSessaoDemo, sessionStorage);
    return valida(demo) ? demo : null;
  }
  function podeAcessar(pagina, sessao = getSession()) {
    if (!pagina || !sessao) return false;
    const permitidos = cfg.permissoesPagina?.[pagina] || cfg.papeisPermitidos;
    return permitidos.includes(papel(sessao));
  }
  function loginDemo(nome = 'Administrador', email = 'admin@pcbuilder.local') {
    const sessao = { id:'demo-admin', nome, email, papel:'ADMIN', modo:'demonstracao-local', inicioEm:new Date().toISOString(), expiraEm:new Date(Date.now()+8*60*60*1000).toISOString() };
    sessionStorage.setItem(cfg.chaveSessaoDemo, JSON.stringify(sessao));
    return sessao;
  }
  function logout() {
    sessionStorage.removeItem(cfg.chaveSessaoDemo);
    sessionStorage.removeItem(cfg.chaveSessaoPublica);
    location.href = 'login.html';
  }
  function ensure() {
    if (document.body?.dataset.adminLogin === 'true') return;
    const sessao = getSession();
    if (!sessao) { location.replace('login.html?retorno=' + encodeURIComponent(location.href)); return; }
    const pagina = document.body?.dataset.adminPage;
    if (pagina && !podeAcessar(pagina, sessao)) location.replace('index.html?acesso=negado');
  }
  window.AdminAuth = { getSession, loginDemo, logout, ensure, podeAcessar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure, { once:true }); else ensure();
})();
