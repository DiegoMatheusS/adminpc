(function () {
  const $ = seletor => document.querySelector(seletor);
  const parceiros = AdminStore.parceiros();
  const produtos = AdminStore.produtos();
  $('#oferta-parceiro').innerHTML = '<option value="">Todos os parceiros</option>' + parceiros.map(p => `<option value="${p.id}">${AdminUI.esc(p.nome)}</option>`).join('');

  function urlSegura(valor) { try { const url = new URL(valor); return ['http:','https:'].includes(url.protocol) ? url.href : '#'; } catch (_) { return '#'; } }

  function desconto(oferta) {
    if (!oferta.precoAnterior || Number(oferta.precoAnterior) <= Number(oferta.preco)) return '';
    return `${Math.round((1 - Number(oferta.preco) / Number(oferta.precoAnterior)) * 100)}% abaixo`;
  }

  function render() {
    const busca = $('#oferta-busca').value.trim().toLowerCase();
    const parceiroId = Number($('#oferta-parceiro').value) || null;
    const status = $('#oferta-status').value;
    const estoque = $('#oferta-estoque').value;
    const itens = AdminStore.ofertas().filter(oferta => {
      const produto = produtos.find(p => Number(p.id) === Number(oferta.produtoId));
      const parceiro = parceiros.find(p => Number(p.id) === Number(oferta.parceiroId));
      const texto = [oferta.titulo, oferta.codigoExterno, produto?.nome, parceiro?.nome].join(' ').toLowerCase();
      return (!busca || texto.includes(busca)) && (!parceiroId || Number(oferta.parceiroId) === parceiroId) && (!status || oferta.status === status) && (!estoque || (estoque === 'sim' ? oferta.emEstoque : !oferta.emEstoque));
    }).sort((a,b) => new Date(b.atualizadoEm)-new Date(a.atualizadoEm));

    $('#ofertas-tbody').innerHTML = itens.map(oferta => {
      const produto = produtos.find(p => Number(p.id) === Number(oferta.produtoId));
      const parceiro = parceiros.find(p => Number(p.id) === Number(oferta.parceiroId));
      const expirou = oferta.validadeAte && new Date(oferta.validadeAte) < new Date();
      const statusFinal = expirou ? 'DESATIVADO' : oferta.status;
      return `<tr><td data-label="Oferta"><div class="admin-product-cell"><img class="admin-product-thumb" src="${AdminUI.esc(produto?.imagemUrl || 'assets/placeholder-produto.svg')}" alt=""><span><strong>${AdminUI.esc(oferta.titulo)}</strong><small>${AdminUI.esc(produto?.nome || 'Produto removido')} · ${AdminUI.esc(oferta.codigoExterno || 'sem código')}</small></span></div></td><td data-label="Parceiro">${AdminUI.esc(parceiro?.nome || 'Parceiro removido')}</td><td data-label="Preço"><strong>${AdminUI.money(oferta.preco)}</strong><small>${desconto(oferta)}</small></td><td data-label="Estoque"><span class="admin-status ${oferta.emEstoque ? 'status-disponivel' : 'status-indisponivel'}">${oferta.emEstoque ? 'Disponível' : 'Indisponível'}</span></td><td data-label="Status"><span class="admin-status ${AdminUI.statusClass(statusFinal)}">${AdminUI.statusLabel(statusFinal)}</span></td><td data-label="Verificação">${oferta.verificadoEm ? AdminUI.date(oferta.verificadoEm) : AdminUI.date(oferta.atualizadoEm)}</td><td data-label="Ações"><div class="admin-row-actions"><a class="admin-action-button" href="oferta.html?id=${oferta.id}">Editar</a><details class="admin-actions-menu"><summary class="admin-action-button" aria-label="Mais ações">⋮</summary><div class="admin-actions-menu-panel"><a href="${AdminUI.esc(urlSegura(oferta.urlOriginal))}" target="_blank" rel="noopener noreferrer">Abrir link original</a><button type="button" class="acao-perigosa" data-excluir-oferta="${oferta.id}">Excluir oferta</button></div></details></div></td></tr>`;
    }).join('') || '<tr><td colspan="7"><div class="admin-empty">Nenhuma oferta encontrada.</div></td></tr>';
    $('#ofertas-resumo').textContent = `${itens.length} oferta(s) encontrada(s)`;
    document.querySelectorAll('[data-excluir-oferta]').forEach(botao => botao.onclick = async () => {
      if (await AdminUI.confirmAction('Excluir oferta', 'A oferta será removida do catálogo local.')) {
        AdminStore.excluirOferta(botao.dataset.excluirOferta);
        AdminUI.toast('Oferta excluída.');
        render();
      }
    });
  }

  ['#oferta-busca','#oferta-parceiro','#oferta-status','#oferta-estoque'].forEach(seletor => $(seletor).addEventListener('input', render));
  document.querySelector('.admin-table-card')?.classList.add('mobile-cards');
  render();
})();
