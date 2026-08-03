/**
 * PC Builder Admin — Assistente de IA flutuante
 * Botão ✦ injetado no topbar (à esquerda do tema), painel lateral de chat.
 * Contexto automático por página: dashboard, produtos, produto, ofertas, etc.
 */
(function () {
  const cfg = window.AdminConfig;
  const BASE = String(cfg?.apiBaseUrl || 'http://localhost:3000/api').replace(/\/$/, '');
  const CHAVE_HIST = 'pcBuilderAdminIaHistorico';
  const LIMITE_HIST = 10;

  let _painel = null;
  let _msgs = null;
  let _textarea = null;
  let _enviar = null;
  let _aguardando = false;
  let _historico = [];

  /* ── Utilitários ── */

  function esc(v) { return AdminUI.esc(String(v ?? '')); }

  function carregarHist() {
    try { _historico = JSON.parse(sessionStorage.getItem(CHAVE_HIST) || '[]').slice(-LIMITE_HIST); }
    catch (_) { _historico = []; }
  }

  function salvarHist() {
    try { sessionStorage.setItem(CHAVE_HIST, JSON.stringify(_historico.slice(-LIMITE_HIST))); }
    catch (_) {}
  }

  /* ── Contexto automático por página ── */

  function obterContextoPagina() {
    const pagina = document.body.dataset.adminPage || '';
    const dados = {};
    try {
      const store = window.AdminStore?.carregar?.() || {};
      switch (pagina) {
        case 'dashboard':
          dados.totalProdutos = store.produtos?.length || 0;
          dados.totalOfertas = (store.ofertas || []).filter(o => o.status === 'PUBLICADO').length;
          dados.produtosSemMpn = (store.produtos || []).filter(p => !p.mpn).length;
          dados.semCompatibilidade = (store.produtos || []).filter(p => !p.especificacoesTecnicas || !Object.keys(p.especificacoesTecnicas).length).length;
          dados.aguardandoRevisao = (store.produtos || []).filter(p => p.status === 'AGUARDANDO_REVISAO').length;
          break;
        case 'produtos':
          dados.totalProdutos = store.produtos?.length || 0;
          dados.categorias = [...new Set((store.produtos || []).map(p => p.categoria).filter(Boolean))];
          dados.statusCounts = (store.produtos || []).reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
          break;
        case 'ofertas':
          dados.totalOfertas = store.ofertas?.length || 0;
          dados.parceiros = (store.parceiros || []).map(p => p.nome);
          break;
        case 'modelos':
          dados.totalModelos = store.modelos?.length || 0;
          dados.aguardandoRevisao = (store.modelos || []).filter(m => m.status === 'AGUARDANDO_REVISAO').length;
          break;
      }
      // Produto específico
      const idProduto = Number(new URLSearchParams(location.search).get('id')) || null;
      if (idProduto && store.produtos) {
        const produto = store.produtos.find(p => Number(p.id) === idProduto);
        if (produto) dados.produtoAtual = { id: produto.id, nome: produto.nome, categoria: produto.categoria, status: produto.status, mpn: produto.mpn };
      }
    } catch (_) {}
    return { pagina, ...dados };
  }

  /* ── API admin ── */

  async function chamarChat(mensagem) {
    const contexto = obterContextoPagina();
    const resp = await fetch(`${BASE}/admin/ia/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        mensagem,
        historico: _historico.slice(-LIMITE_HIST),
        contexto,
      }),
    });
    if (resp.status === 503) throw new Error('IA indisponível. Configure GEMINI_API_KEY no backend.');
    if (resp.status === 401 || resp.status === 403) throw new Error('Sem permissão. Faça login como administrador.');
    if (!resp.ok) {
      let msg = ''; try { msg = (await resp.json()).message || ''; } catch (_) {}
      throw new Error(msg || `Erro ${resp.status}.`);
    }
    return resp.json();
  }

  /* ── Renderização ── */

  function adicionarMsg(texto, papel) {
    if (!_msgs) return;
    const div = document.createElement('div');
    div.className = `admin-ia-chat-msg admin-ia-chat-msg--${papel}`;
    div.innerHTML = esc(texto)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    _msgs.appendChild(div);
    _msgs.scrollTop = _msgs.scrollHeight;
  }

  function mostrarDigitando() {
    const div = document.createElement('div');
    div.className = 'admin-ia-chat-digitando';
    div.innerHTML = '<span></span><span></span><span></span>';
    _msgs.appendChild(div);
    _msgs.scrollTop = _msgs.scrollHeight;
    return div;
  }

  function bloquear(sim) {
    _aguardando = sim;
    if (_textarea) _textarea.disabled = sim;
    if (_enviar) _enviar.disabled = sim;
  }

  /* ── Envio ── */

  async function enviar() {
    if (_aguardando || !_textarea) return;
    const texto = _textarea.value.trim();
    if (!texto) return;
    _textarea.value = '';
    _textarea.style.height = 'auto';
    bloquear(true);
    adicionarMsg(texto, 'usuario');
    _historico.push({ papel: 'usuario', conteudo: texto });
    const ind = mostrarDigitando();
    try {
      const res = await chamarChat(texto);
      ind.remove();
      adicionarMsg(res.resposta, 'assistente');
      _historico.push({ papel: 'assistente', conteudo: res.resposta });
      salvarHist();
    } catch (erro) {
      ind.remove();
      adicionarMsg('⚠ ' + erro.message, 'assistente');
    } finally {
      bloquear(false);
      _textarea.focus();
    }
  }

  /* ── Abrir / fechar ── */

  function abrir() {
    if (!_painel) return;
    _painel.dataset.aberto = 'true';
    _textarea?.focus();
    if (_msgs) _msgs.scrollTop = _msgs.scrollHeight;
  }

  function fechar() {
    if (_painel) _painel.dataset.aberto = 'false';
  }

  /* ── Mensagem inicial contextual ── */

  function mensagemBoasVindas() {
    const pagina = document.body.dataset.adminPage || '';
    const msgs = {
      dashboard: 'Olá! Posso analisar o catálogo, apontar pendências e sugerir o que priorizar. Como posso ajudar?',
      produtos: 'Posso ajudar a revisar produtos, apontar dados ausentes ou inconsistências. Qual produto quer analisar?',
      produto: 'Posso revisar este produto, gerar uma descrição ou normalizar as especificações. O que prefere?',
      ofertas: 'Posso analisar suas ofertas, verificar preços desatualizados ou apontar inconsistências.',
      oferta: 'Posso ajudar a verificar esta oferta, calcular desconto ou identificar problemas.',
      modelos: 'Posso ajudar a revisar modelos 3D, apontar os que estão pesados ou com problema.',
      parceiros: 'Posso ajudar a organizar informações dos parceiros.',
      usuarios: 'Posso responder dúvidas sobre permissões e papéis de usuários.',
    };
    return msgs[pagina] || 'Olá! Sou o assistente administrativo do PC Builder. Como posso ajudar?';
  }

  /* ── Construção do DOM ── */

  function construir() {
    // Painel lateral
    _painel = document.createElement('div');
    _painel.className = 'admin-ia-painel';
    _painel.dataset.aberto = 'false';
    _painel.setAttribute('role', 'dialog');
    _painel.setAttribute('aria-label', 'Assistente IA Admin');
    _painel.innerHTML = `
      <div class="admin-ia-cabecalho">
        <div class="admin-ia-cabecalho-info">
          <span class="admin-ia-cabecalho-icone" aria-hidden="true">✦</span>
          <div>
            <strong>Assistente Admin</strong>
            <small>PC Builder IA</small>
          </div>
        </div>
        <button class="admin-ia-fechar" type="button" aria-label="Fechar assistente">✕</button>
      </div>
      <div class="admin-ia-msgs" id="admin-ia-msgs" aria-live="polite"></div>
      <div class="admin-ia-entrada">
        <textarea class="admin-ia-textarea" placeholder="Pergunte sobre o catálogo, produtos, ofertas…" rows="1" maxlength="1000" aria-label="Mensagem"></textarea>
        <button class="admin-ia-enviar" type="button" aria-label="Enviar">➤</button>
      </div>
    `;
    document.body.appendChild(_painel);

    _msgs    = _painel.querySelector('#admin-ia-msgs');
    _textarea = _painel.querySelector('.admin-ia-textarea');
    _enviar  = _painel.querySelector('.admin-ia-enviar');

    _painel.querySelector('.admin-ia-fechar').addEventListener('click', fechar);
    _enviar.addEventListener('click', enviar);
    _textarea.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });
    _textarea.addEventListener('input', () => {
      _textarea.style.height = 'auto';
      _textarea.style.height = Math.min(_textarea.scrollHeight, 110) + 'px';
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && _painel.dataset.aberto === 'true') fechar(); });

    // Mensagem inicial
    carregarHist();
    if (_historico.length) {
      _historico.forEach(m => adicionarMsg(m.conteudo, m.papel));
    } else {
      adicionarMsg(mensagemBoasVindas(), 'assistente');
    }

    // Botão ✦ no topbar (à esquerda do ◐)
    injetarBotaoTopbar();
  }

  function injetarBotaoTopbar() {
    const actions = document.querySelector('.admin-topbar-actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'admin-icon-button admin-ia-btn-topbar';
    btn.title = 'Assistente IA';
    btn.setAttribute('aria-label', 'Abrir assistente de IA');
    btn.textContent = '✦';
    btn.addEventListener('click', () => {
      _painel.dataset.aberto === 'true' ? fechar() : abrir();
    });

    // Insere antes do botão de tema (◐)
    const btnTema = actions.querySelector('[data-alternar-tema]');
    if (btnTema) {
      actions.insertBefore(btn, btnTema);
    } else {
      actions.prepend(btn);
    }
  }

  /* ── Init ── */

  function init() {
    // Só inicializa se houver topbar (não na página de login)
    if (!document.querySelector('.admin-topbar-actions')) return;
    construir();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.AdminIaAssistente = { abrir, fechar };
})();
