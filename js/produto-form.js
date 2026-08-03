(function () {
  const $ = seletor => document.querySelector(seletor);
  const form = $('#produto-form');
  const id = Number(new URLSearchParams(location.search).get('id')) || null;
  const produto = id ? AdminStore.produto(id) : null;
  const chaveOfertaImportada = 'pcBuilderOfertaImportada';
  const chaveRascunho = `pcBuilderProdutoRascunhoAuto:${id || 'novo'}`;
  const camposImportaveis = ['nome', 'categoria', 'fabricante', 'modelo', 'mpn', 'gtin', 'descricao', 'consumoWatts', 'larguraMm', 'alturaMm', 'profundidadeMm', 'imagemUrl'];
  let dadosImportados = null;
  let alterado = false;
  let salvando = false;
  let timerRascunho = null;

  const especificacoes = {
    'Processador': [
      ['socket', 'Socket', 'text', 'Ex.: AM5'], ['nucleos', 'Núcleos', 'number'], ['threads', 'Threads', 'number'],
      ['tdpWatts', 'TDP (W)', 'number'], ['videoIntegrado', 'Vídeo integrado', 'select', ['Não informado', 'Sim', 'Não']],
      ['geracao', 'Geração / arquitetura', 'text', 'Ex.: Zen 5'], ['memoriaSuportada', 'Memória suportada', 'text', 'Ex.: DDR5-5600']
    ],
    'Placa de vídeo': [
      ['vramGb', 'VRAM (GB)', 'number'], ['comprimentoGpuMm', 'Comprimento (mm)', 'number'], ['alturaGpuMm', 'Altura (mm)', 'number'],
      ['slotsGpu', 'Espessura em slots', 'number'], ['tdpWatts', 'Consumo/TBP (W)', 'number'],
      ['conectoresEnergia', 'Conectores de energia', 'text', 'Ex.: 1x 16 pinos'], ['pciExpress', 'PCI Express', 'text', 'Ex.: 5.0 x16']
    ],
    'Placa-mãe': [
      ['socket', 'Socket', 'text', 'Ex.: AM5'], ['chipset', 'Chipset', 'text', 'Ex.: B650'],
      ['tipoMemoria', 'Tipo de memória', 'select', ['Não informado', 'DDR4', 'DDR5']], ['formato', 'Formato', 'select', ['Não informado', 'ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX']],
      ['slotsMemoria', 'Slots de memória', 'number'], ['slotsM2', 'Slots M.2', 'number'], ['biosMinima', 'BIOS mínima', 'text', 'Ex.: 1811']
    ],
    'Memória': [
      ['tipoMemoria', 'Tipo', 'select', ['Não informado', 'DDR4', 'DDR5']], ['capacidadeGb', 'Capacidade total (GB)', 'number'],
      ['frequenciaMhz', 'Frequência (MHz)', 'number'], ['modulos', 'Quantidade de módulos', 'number'], ['tensaoV', 'Tensão (V)', 'number']
    ],
    'Armazenamento': [
      ['tipoArmazenamento', 'Tipo', 'select', ['Não informado', 'SSD', 'HDD']], ['interfaceArmazenamento', 'Interface', 'select', ['Não informado', 'NVMe PCIe 5.0', 'NVMe PCIe 4.0', 'NVMe PCIe 3.0', 'SATA']],
      ['capacidadeGb', 'Capacidade (GB)', 'number'], ['formatoArmazenamento', 'Formato', 'select', ['Não informado', 'M.2 2280', '2,5 pol.', '3,5 pol.']]
    ],
    'Fonte': [
      ['potenciaWatts', 'Potência (W)', 'number'], ['certificacao', 'Certificação', 'text', 'Ex.: 80 Plus Gold'],
      ['padraoAtx', 'Padrão ATX', 'text', 'Ex.: ATX 3.1'], ['conectoresPcie', 'Conectores PCIe', 'text', 'Ex.: 4x 8 pinos'],
      ['conector12vhpwr', '12VHPWR / 12V-2x6', 'select', ['Não informado', 'Sim', 'Não']], ['modularidade', 'Modularidade', 'select', ['Não informado', 'Modular', 'Semi-modular', 'Não modular']]
    ],
    'Gabinete': [
      ['formatosPlacaMae', 'Formatos de placa-mãe', 'text', 'Ex.: ATX, mATX, ITX'], ['gpuMaxMm', 'GPU máxima (mm)', 'number'],
      ['coolerMaxMm', 'Cooler máximo (mm)', 'number'], ['radiadores', 'Radiadores suportados', 'text', 'Ex.: frontal 360 mm'], ['fansSuportados', 'Fans suportados', 'text', 'Ex.: 6x 120 mm']
    ],
    'Cooler': [
      ['socketsSuportados', 'Sockets suportados', 'text', 'Ex.: AM5, LGA1700'], ['tipoCooler', 'Tipo', 'select', ['Não informado', 'Air cooler', 'Water cooler']],
      ['alturaCoolerMm', 'Altura (mm)', 'number'], ['tamanhoRadiadorMm', 'Radiador (mm)', 'number'], ['tdpSuportadoWatts', 'TDP suportado (W)', 'number']
    ],
    'Notebook': [
      ['processadorResumo', 'Processador', 'text'], ['gpuResumo', 'GPU', 'text'], ['ramResumo', 'Memória RAM', 'text'], ['armazenamentoResumo', 'Armazenamento', 'text'], ['telaResumo', 'Tela', 'text']
    ],
    'PC montado': [
      ['processadorResumo', 'Processador', 'text'], ['gpuResumo', 'GPU', 'text'], ['ramResumo', 'Memória RAM', 'text'], ['armazenamentoResumo', 'Armazenamento', 'text'], ['fonteResumo', 'Fonte', 'text']
    ],
    'Monitor': [
      ['tamanhoPolegadas', 'Tamanho (pol.)', 'number'], ['resolucao', 'Resolução', 'text', 'Ex.: 2560x1440'], ['taxaHz', 'Taxa de atualização (Hz)', 'number'], ['tipoPainel', 'Painel', 'text', 'Ex.: IPS']
    ],
    'Periférico': [['tipoPeriferico', 'Tipo de periférico', 'text'], ['conexao', 'Conexão', 'text', 'Ex.: USB, Bluetooth'], ['compatibilidadeSistema', 'Sistemas compatíveis', 'text']],
  };

  function escAttr(valor = '') { return AdminUI.esc(valor).replace(/`/g, '&#96;'); }

  function campoHtml(def, valor = '') {
    const [nome, rotulo, tipo, extra] = def;
    if (tipo === 'select') {
      return `<div class="admin-field"><label for="tecnico-${nome}">${AdminUI.esc(rotulo)}</label><select class="admin-select" id="tecnico-${nome}" name="tecnico.${nome}">${extra.map(opcao => `<option value="${opcao === 'Não informado' ? '' : escAttr(opcao)}" ${String(valor) === String(opcao) ? 'selected' : ''}>${AdminUI.esc(opcao)}</option>`).join('')}</select></div>`;
    }
    const step = tipo === 'number' ? ' step="any" min="0"' : '';
    const placeholder = extra ? ` placeholder="${escAttr(extra)}"` : '';
    return `<div class="admin-field"><label for="tecnico-${nome}">${AdminUI.esc(rotulo)}</label><input class="admin-input" id="tecnico-${nome}" name="tecnico.${nome}" type="${tipo}"${step}${placeholder} value="${escAttr(valor)}"></div>`;
  }

  function renderCamposTecnicos(valores = null) {
    const categoria = $('#categoria').value;
    const defs = especificacoes[categoria] || [];
    const atuais = valores || coletarEspecificacoesTecnicas();
    $('#categoria-tecnica-badge').textContent = categoria || 'Selecione a categoria';
    $('#campos-tecnicos-categoria').innerHTML = defs.length
      ? defs.map(def => campoHtml(def, atuais?.[def[0]] ?? produto?.especificacoesTecnicas?.[def[0]] ?? '')).join('')
      : '<div class="admin-technical-empty">Esta categoria ainda não possui campos técnicos específicos.</div>';
  }

  function coletarEspecificacoesTecnicas() {
    const resultado = {};
    form.querySelectorAll('[name^="tecnico."]').forEach(campo => {
      const nome = campo.name.slice(8);
      const valor = campo.value.trim();
      if (valor !== '') resultado[nome] = campo.type === 'number' ? Number(valor) : valor;
    });
    return resultado;
  }

  function preencherProduto() {
    if (!produto) return;
    $('#produto-form-titulo').textContent = 'Editar produto';
    Object.entries(produto).forEach(([chave, valor]) => {
      if (chave === 'especificacoesTecnicas') return;
      const campo = form.elements.namedItem(chave);
      if (campo && valor !== null && valor !== undefined) campo.value = valor;
    });
    renderCamposTecnicos(produto.especificacoesTecnicas || {});
  }

  function preview() {
    $('#preview-imagem').src = $('#imagemUrl').value || 'assets/placeholder-produto.svg';
    $('#preview-nome').textContent = $('#nome').value || 'Nome do produto';
    $('#preview-descricao').textContent = $('#descricao').value || 'A descrição aparecerá aqui.';
    const status = $('#status').value;
    const badge = $('#preview-status');
    badge.textContent = AdminUI.statusLabel(status);
    badge.className = `admin-status ${AdminUI.statusClass(status)}`;
  }

  function normalizarCodigo(valor) { return String(valor || '').replace(/[^a-z0-9]/gi, '').toUpperCase(); }

  function gtinValido(valor) {
    const digitos = String(valor || '').replace(/\D/g, '');
    if (!digitos) return true;
    if (![8, 12, 13, 14].includes(digitos.length)) return false;
    const corpo = digitos.slice(0, -1).split('').reverse();
    const soma = corpo.reduce((total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 3 : 1), 0);
    return (10 - (soma % 10)) % 10 === Number(digitos.at(-1));
  }

  function validarIdentificadores(mostrar = true) {
    const mpn = normalizarCodigo($('#mpn').value);
    const gtin = String($('#gtin').value || '').replace(/\D/g, '');
    $('#gtin').value = gtin;
    const outros = AdminStore.produtos().filter(item => Number(item.id) !== Number(id));
    const duplicadoMpn = mpn && outros.find(item => normalizarCodigo(item.mpn) === mpn);
    const duplicadoGtin = gtin && outros.find(item => String(item.gtin || '').replace(/\D/g, '') === gtin);
    const status = $('#validacao-identificadores');
    const mensagens = [];
    if (gtin && !gtinValido(gtin)) mensagens.push('O GTIN/EAN não passou na validação do dígito verificador.');
    if (duplicadoMpn) mensagens.push(`MPN já usado em “${duplicadoMpn.nome}”.`);
    if (duplicadoGtin) mensagens.push(`GTIN/EAN já usado em “${duplicadoGtin.nome}”.`);
    const invalido = mensagens.length > 0;
    $('#gtin').setAttribute('aria-invalid', String(Boolean(gtin && !gtinValido(gtin))));
    $('#mpn').setAttribute('aria-invalid', String(Boolean(duplicadoMpn)));
    if (mostrar) {
      status.hidden = !invalido;
      status.className = `admin-import-status ${invalido ? 'erro' : 'sucesso'}`;
      status.innerHTML = invalido ? `<strong>Revise os identificadores.</strong><span>${AdminUI.esc(mensagens.join(' '))}</span>` : '';
    }
    return !invalido;
  }

  function valorPreenchivel(valor) { return valor !== null && valor !== undefined && valor !== ''; }

  async function aplicarDados(dados) {
    const conflitos = camposImportaveis.filter(nome => {
      const campo = form.elements.namedItem(nome);
      return campo && campo.value.trim() && valorPreenchivel(dados[nome]) && String(campo.value) !== String(dados[nome]);
    });
    let sobrescrever = false;
    if (conflitos.length) {
      sobrescrever = await AdminUI.confirmAction('Substituir campos preenchidos?', `A importação encontrou valores diferentes em ${conflitos.length} campo(s). Confirme para substituir; caso contrário, somente campos vazios serão preenchidos.`);
    }
    camposImportaveis.forEach(nome => {
      if (!valorPreenchivel(dados[nome])) return;
      const campo = form.elements.namedItem(nome);
      if (!campo || (campo.value.trim() && !sobrescrever)) return;
      campo.value = dados[nome];
      campo.closest('.admin-field')?.classList.add('foi-importado');
    });
    renderCamposTecnicos(dados.especificacoesTecnicas && typeof dados.especificacoesTecnicas === 'object' ? dados.especificacoesTecnicas : {});
    preview();
    validarIdentificadores();
  }

  function resumoImportacao(dados) {
    const rotulos = { nome:'nome', fabricante:'fabricante', modelo:'modelo', mpn:'MPN', gtin:'GTIN/EAN', categoria:'categoria', descricao:'descrição', imagemUrl:'imagem', preco:'preço', codigoExterno:'código externo' };
    const encontrados = Object.entries(rotulos).filter(([chave]) => valorPreenchivel(dados[chave])).map(([, rotulo]) => rotulo);
    const faltantes = ['nome','fabricante','modelo','mpn','gtin','categoria','descricao','imagemUrl'].filter(chave => !valorPreenchivel(dados[chave])).map(chave => rotulos[chave]);
    const status = $('#importacao-status');
    status.hidden = false;
    status.className = 'admin-import-status sucesso';
    status.innerHTML = `<strong>${encontrados.length} dado(s) encontrado(s).</strong><span><b>Fonte:</b> ${AdminUI.esc(dados.origem === 'api' ? 'backend/API' : 'dados estruturados da página')}.</span><span><b>Revise ou preencha:</b> ${AdminUI.esc(faltantes.join(', ') || 'nenhum campo essencial')}.</span>`;
  }

  function validarLink(campo, obrigatorio = true) {
    const valor = campo.value.trim();
    if (!valor && !obrigatorio) return '';
    try { return new URL(valor).href; } catch (_) { AdminUI.toast(`Revise o endereço em “${campo.labels?.[0]?.textContent || 'link'}”.`, 'erro'); campo.focus(); return null; }
  }

  async function buscarDados() {
    const urlOriginal = validarLink($('#urlOriginalImportacao'));
    if (!urlOriginal) return;
    const botao = $('#buscar-dados-produto');
    botao.disabled = true; botao.classList.add('carregando'); botao.textContent = 'Buscando...';
    const status = $('#importacao-status');
    status.hidden = false; status.className = 'admin-import-status'; status.innerHTML = '<strong>Consultando a página do produto...</strong>';
    try {
      dadosImportados = await AdminProdutoImportador.importar(urlOriginal);
      await aplicarDados(dadosImportados);
      resumoImportacao(dadosImportados);
    } catch (erro) {
      status.className = 'admin-import-status erro';
      status.innerHTML = `<strong>Não foi possível buscar automaticamente.</strong><span>${AdminUI.esc(erro.message || 'Preencha os campos manualmente.')}</span>`;
    } finally {
      botao.disabled = false; botao.classList.remove('carregando'); botao.textContent = 'Buscar dados';
    }
  }

  function limparImportacao() {
    $('#urlOriginalImportacao').value = '';
    $('#urlAfiliadoImportacao').value = '';
    $('#importacao-status').hidden = true;
    dadosImportados = null;
    form.querySelectorAll('.foi-importado').forEach(el => el.classList.remove('foi-importado'));
  }

  function collect(forceDraft = false) {
    const fd = new FormData(form);
    const item = {};
    for (const [chave, valor] of fd.entries()) {
      if (chave.startsWith('tecnico.')) continue;
      item[chave] = valor;
    }
    item.id = id || undefined;
    ['consumoWatts','larguraMm','alturaMm','profundidadeMm'].forEach(nome => item[nome] = item[nome] === '' ? null : Number(item[nome]));
    item.especificacoesTecnicas = coletarEspecificacoesTecnicas();
    if (forceDraft) item.status = 'RASCUNHO';
    return item;
  }

  function prepararOferta(produtoSalvo) {
    const urlOriginal = validarLink($('#urlOriginalImportacao'), false);
    const urlAfiliado = validarLink($('#urlAfiliadoImportacao'), false);
    if (!$('#abrir-oferta-apos-salvar').checked || !urlOriginal || urlAfiliado === null) return false;
    sessionStorage.setItem(chaveOfertaImportada, JSON.stringify({
      produtoId: produtoSalvo.id, titulo: dadosImportados?.nome || produtoSalvo.nome, urlOriginal,
      urlAfiliado: urlAfiliado || '', preco: dadosImportados?.preco ?? '', precoAnterior: dadosImportados?.precoAnterior ?? '',
      emEstoque: dadosImportados?.emEstoque, codigoExterno: dadosImportados?.codigoExterno || '', verificadoEm: new Date().toISOString().slice(0,16),
    }));
    setTimeout(() => { location.href = `oferta.html?produtoId=${produtoSalvo.id}&importacao=1`; }, 350);
    return true;
  }

  function salvarRascunhoAutomatico() {
    if (!alterado || salvando) return;
    localStorage.setItem(chaveRascunho, JSON.stringify({ salvoEm: new Date().toISOString(), dados: collect(true) }));
    $('#status-rascunho-automatico').textContent = `Rascunho automático salvo às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  }

  async function restaurarRascunho() {
    if (produto) return;
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(chaveRascunho) || 'null'); } catch (_) {}
    if (!salvo?.dados?.nome) return;
    const restaurar = await AdminUI.confirmAction('Restaurar rascunho automático?', `Há um rascunho salvo em ${AdminUI.date(salvo.salvoEm)}.`);
    if (!restaurar) return;
    Object.entries(salvo.dados).forEach(([chave, valor]) => {
      if (chave === 'especificacoesTecnicas') return;
      const campo = form.elements.namedItem(chave);
      if (campo && valor !== null && valor !== undefined) campo.value = valor;
    });
    renderCamposTecnicos(salvo.dados.especificacoesTecnicas || {});
    preview();
  }

  function marcarAlteracao() {
    alterado = true;
    clearTimeout(timerRascunho);
    timerRascunho = setTimeout(salvarRascunhoAutomatico, 800);
  }

  function salvar(forceDraft) {
    if (!forceDraft && !form.reportValidity()) return;
    if (!$('#nome').value.trim()) { AdminUI.toast('Informe ao menos o nome do produto.', 'erro'); return; }
    if (!validarIdentificadores()) { AdminUI.toast('Corrija o MPN ou GTIN/EAN antes de salvar.', 'erro'); return; }
    salvando = true;
    const salvo = AdminStore.salvarProduto(collect(forceDraft));
    localStorage.removeItem(chaveRascunho);
    alterado = false;
    AdminUI.toast(forceDraft ? 'Rascunho salvo.' : 'Produto salvo com sucesso.');
    if (prepararOferta(salvo)) return;
    setTimeout(() => { location.href = `produto.html?id=${salvo.id}`; }, 350);
  }

  preencherProduto();
  if (!$('#campos-tecnicos-categoria').children.length) renderCamposTecnicos();
  $('#categoria').addEventListener('change', () => { renderCamposTecnicos(); marcarAlteracao(); });
  form.addEventListener('input', () => { preview(); marcarAlteracao(); });
  form.addEventListener('submit', evento => { evento.preventDefault(); salvar(false); });
  $('#salvar-rascunho').addEventListener('click', () => salvar(true));
  $('#buscar-dados-produto').addEventListener('click', buscarDados);
  $('#limpar-importacao').addEventListener('click', limparImportacao);
  $('#mpn').addEventListener('blur', () => validarIdentificadores());
  $('#gtin').addEventListener('blur', () => validarIdentificadores());
  $('#preview-imagem').addEventListener('error', () => { $('#preview-imagem').src = 'assets/placeholder-produto.svg'; });
  window.addEventListener('beforeunload', evento => { if (!alterado || salvando) return; evento.preventDefault(); evento.returnValue = ''; });
  preview();
  restaurarRascunho();
})();
