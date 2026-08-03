(function () {
  const $ = seletor => document.querySelector(seletor);
  const form = $('#oferta-form');
  const produtos = AdminStore.produtos();
  const parceiros = AdminStore.parceiros().filter(parceiro => parceiro.ativo);
  const params = new URLSearchParams(location.search);
  const chaveOfertaImportada = 'pcBuilderOfertaImportada';
  const id = Number(params.get('id')) || null;
  const item = id ? AdminStore.oferta(id) : null;
  let alterado = false;
  let salvando = false;

  $('#produtoId').innerHTML = '<option value="">Selecione o produto</option>' + produtos.map(produto => `<option value="${produto.id}">${AdminUI.esc(produto.nome)}</option>`).join('');
  $('#parceiroId').innerHTML = '<option value="">Selecione o parceiro</option>' + parceiros.map(parceiro => `<option value="${parceiro.id}">${AdminUI.esc(parceiro.nome)}</option>`).join('');

  function isoLocal(valor) {
    if (!valor) return '';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  }

  if (item) {
    $('#oferta-form-titulo').textContent = 'Editar oferta';
    Object.entries(item).forEach(([chave, valor]) => {
      const campo = form.elements.namedItem(chave);
      if (!campo || valor === null || valor === undefined) return;
      campo.value = campo.type === 'datetime-local' ? isoLocal(valor) : String(valor);
    });
  } else if (params.get('produtoId')) $('#produtoId').value = params.get('produtoId');

  function normalizar(valor) { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function selecionarParceiro(urlOriginal) {
    if (!urlOriginal) return;
    let host = '';
    try { host = normalizar(new URL(urlOriginal).hostname); } catch (_) { return; }
    const parceiro = parceiros.find(p => {
      const nome = normalizar(p.nome);
      return ['mercadolivre','kabum','terabyte','amazon','pichau','hp'].some(chave => nome.includes(chave) && host.includes(chave)) || host.includes(nome);
    });
    if (parceiro) $('#parceiroId').value = String(parceiro.id);
  }

  function aplicarImportacao() {
    if (item || params.get('importacao') !== '1') return;
    let dados = null;
    try { dados = JSON.parse(sessionStorage.getItem(chaveOfertaImportada) || 'null'); } catch (_) {}
    sessionStorage.removeItem(chaveOfertaImportada);
    if (!dados) return;
    Object.entries(dados).forEach(([chave, valor]) => {
      const campo = form.elements.namedItem(chave);
      if (!campo || valor === null || valor === undefined || valor === '') return;
      campo.value = campo.type === 'datetime-local' ? isoLocal(valor) : String(valor);
    });
    selecionarParceiro(dados.urlOriginal);
    AdminUI.toast('Links e dados encontrados foram aplicados à oferta.');
  }

  function validarLinks(mostrar = true) {
    const status = $('#oferta-validacao-status');
    const original = $('#urlOriginal').value.trim();
    const afiliado = $('#urlAfiliado').value.trim();
    const mensagens = [];
    let originalUrl = null; let afiliadoUrl = null;
    try { if (original) { originalUrl = new URL(original); if (!['http:','https:'].includes(originalUrl.protocol)) throw new Error(); } } catch (_) { mensagens.push('O link original é inválido.'); originalUrl = null; }
    try { if (afiliado) { afiliadoUrl = new URL(afiliado); if (!['http:','https:'].includes(afiliadoUrl.protocol)) throw new Error(); } } catch (_) { mensagens.push('O link de afiliado é inválido.'); afiliadoUrl = null; }
    if (originalUrl && afiliadoUrl && originalUrl.href === afiliadoUrl.href) mensagens.push('O link afiliado está igual ao link original. Confirme se o rastreamento foi aplicado.');
    $('#urlOriginal').setAttribute('aria-invalid', String(Boolean(original && !originalUrl)));
    $('#urlAfiliado').setAttribute('aria-invalid', String(Boolean(afiliado && !afiliadoUrl)));
    if (mostrar) {
      status.hidden = false;
      status.className = `admin-import-status ${mensagens.length ? 'erro' : 'sucesso'}`;
      status.innerHTML = mensagens.length ? `<strong>Links precisam de atenção.</strong><span>${AdminUI.esc(mensagens.join(' '))}</span>` : '<strong>Formato dos links válido.</strong><span>A disponibilidade final só poderá ser confirmada pelo backend.</span>';
    }
    return !mensagens.some(m => m.includes('inválido'));
  }

  function preview() {
    const produto = produtos.find(valor => String(valor.id) === $('#produtoId').value);
    const parceiro = parceiros.find(valor => String(valor.id) === $('#parceiroId').value);
    $('#oferta-preview-imagem').src = produto?.imagemUrl || 'assets/placeholder-produto.svg';
    $('#oferta-preview-titulo').textContent = $('#titulo').value || produto?.nome || 'Título da oferta';
    $('#oferta-preview-parceiro').textContent = parceiro?.nome || 'Parceiro';
    $('#oferta-preview-estoque').textContent = $('#emEstoque').value === 'true' ? 'Disponível' : 'Indisponível';
    $('#oferta-preview-preco').textContent = AdminUI.money($('#preco').value);
    const atual = Number($('#preco').value); const anterior = Number($('#precoAnterior').value);
    $('#oferta-preview-desconto').textContent = anterior > atual && atual > 0 ? `${Math.round((1-atual/anterior)*100)}% abaixo do preço anterior` : '';
    $('#oferta-preview-verificacao').textContent = $('#verificadoEm').value ? `Verificada em ${new Date($('#verificadoEm').value).toLocaleString('pt-BR')}` : 'Ainda não verificada';
  }

  function collect(rascunho = false) {
    const fd = new FormData(form);
    const oferta = Object.fromEntries(fd.entries());
    oferta.id = id || undefined;
    oferta.produtoId = Number(oferta.produtoId);
    oferta.parceiroId = Number(oferta.parceiroId);
    oferta.preco = Number(oferta.preco);
    oferta.precoAnterior = oferta.precoAnterior === '' ? null : Number(oferta.precoAnterior);
    oferta.emEstoque = oferta.emEstoque === 'true';
    oferta.validadeAte = oferta.validadeAte ? new Date(oferta.validadeAte).toISOString() : null;
    oferta.verificadoEm = oferta.verificadoEm ? new Date(oferta.verificadoEm).toISOString() : null;
    if (rascunho) oferta.status = 'RASCUNHO';
    return oferta;
  }

  function salvar(rascunho = false) {
    if (!rascunho && (!form.reportValidity() || !validarLinks())) return;
    if (!$('#produtoId').value || !$('#titulo').value.trim()) { AdminUI.toast('Selecione o produto e informe o título.', 'erro'); return; }
    salvando = true;
    const salva = AdminStore.salvarOferta(collect(rascunho));
    alterado = false;
    AdminUI.toast(rascunho ? 'Rascunho salvo.' : 'Oferta salva.');
    setTimeout(() => { location.href = `oferta.html?id=${salva.id}`; }, 350);
  }

  form.addEventListener('input', () => { alterado = true; preview(); });
  form.addEventListener('submit', evento => { evento.preventDefault(); salvar(false); });
  $('#salvar-oferta-rascunho').addEventListener('click', () => salvar(true));
  $('#validar-links-oferta').addEventListener('click', () => { if (validarLinks(true)) { const agora = new Date(); agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset()); $('#verificadoEm').value = agora.toISOString().slice(0,16); preview(); } });
  window.addEventListener('beforeunload', evento => { if (!alterado || salvando) return; evento.preventDefault(); evento.returnValue = ''; });
  aplicarImportacao();
  preview();
})();
