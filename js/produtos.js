(function () {
  let pagina = 1;
  const porPagina = 10;
  const $ = seletor => document.querySelector(seletor);

  function categorias() {
    const lista = [...new Set(AdminStore.produtos().map(p => p.categoria).filter(Boolean))].sort();
    $('#produto-categoria').innerHTML = '<option value="">Todas as categorias</option>' + lista.map(x => `<option>${AdminUI.esc(x)}</option>`).join('');
  }

  function menuAcoes(produto) {
    const hrefEditar = produto.categoria === 'Notebook' ? `notebook.html?id=${produto.id}` : `produto.html?id=${produto.id}`;
    return `<div class="admin-row-actions"><a class="admin-action-button" href="${hrefEditar}">Editar</a><details class="admin-actions-menu"><summary class="admin-action-button" aria-label="Mais ações">⋮</summary><div class="admin-actions-menu-panel"><a href="oferta.html?produtoId=${produto.id}">Cadastrar oferta</a><button type="button" data-duplicar="${produto.id}">Duplicar como rascunho</button><button type="button" class="acao-perigosa" data-excluir="${produto.id}">Excluir produto</button></div></details></div>`;
  }

  function render() {
    const todos = AdminStore.produtos();
    const ofertas = AdminStore.ofertas();
    const busca = $('#produto-busca').value.trim().toLowerCase();
    const categoria = $('#produto-categoria').value;
    const status = $('#produto-status').value;
    let itens = todos.filter(p => (!busca || [p.nome,p.mpn,p.gtin,p.fabricante,p.modelo].join(' ').toLowerCase().includes(busca)) && (!categoria || p.categoria === categoria) && (!status || p.status === status));
    const ordem = $('#produto-ordem').value;
    itens.sort((a,b) => ordem === 'nome' ? a.nome.localeCompare(b.nome) : ordem === 'id' ? a.id-b.id : new Date(b.atualizadoEm)-new Date(a.atualizadoEm));
    const paginas = Math.max(1, Math.ceil(itens.length / porPagina));
    pagina = Math.min(pagina, paginas);
    const linhas = itens.slice((pagina-1)*porPagina, pagina*porPagina);
    $('#produtos-tbody').innerHTML = linhas.map(p => {
      const totalOfertas = ofertas.filter(o => Number(o.produtoId) === Number(p.id)).length;
      return `<tr><td data-label="Produto"><div class="admin-product-cell"><img class="admin-product-thumb" src="${AdminUI.esc(p.imagemUrl || 'assets/placeholder-produto.svg')}" alt=""><span><strong>${AdminUI.esc(p.nome)}</strong><small>#${p.id} · ${AdminUI.esc(p.modelo || 'Sem modelo')}</small></span></div></td><td data-label="Categoria">${AdminUI.esc(p.categoria)}</td><td data-label="Fabricante">${AdminUI.esc(p.fabricante)}</td><td data-label="MPN">${AdminUI.esc(p.mpn || '—')}</td><td data-label="Ofertas">${totalOfertas}</td><td data-label="Status"><span class="admin-status ${AdminUI.statusClass(p.status)}">${AdminUI.statusLabel(p.status)}</span></td><td data-label="Atualização">${AdminUI.date(p.atualizadoEm)}</td><td data-label="Ações">${menuAcoes(p)}</td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="admin-empty">Nenhum produto encontrado.</div></td></tr>';
    $('#produtos-resumo').textContent = `${itens.length} produto(s) · página ${pagina} de ${paginas}`;
    $('#pagina-anterior').disabled = pagina <= 1;
    $('#proxima-pagina').disabled = pagina >= paginas;
    bindAcoes();
  }

  function bindAcoes() {
    document.querySelectorAll('[data-duplicar]').forEach(botao => botao.onclick = () => {
      AdminStore.duplicarProduto(botao.dataset.duplicar);
      AdminUI.toast('Produto duplicado como rascunho.');
      render();
    });
    document.querySelectorAll('[data-excluir]').forEach(botao => botao.onclick = async () => {
      if (await AdminUI.confirmAction('Excluir produto', 'A exclusão também removerá ofertas e modelos 3D vinculados. Essa ação não pode ser desfeita.')) {
        AdminStore.excluirProduto(botao.dataset.excluir);
        AdminUI.toast('Produto excluído.');
        categorias();
        render();
      }
    });
  }

  ['#produto-busca','#produto-categoria','#produto-status','#produto-ordem'].forEach(seletor => $(seletor).addEventListener('input', () => { pagina = 1; render(); }));
  $('#pagina-anterior').onclick = () => { pagina--; render(); };
  $('#proxima-pagina').onclick = () => { pagina++; render(); };
  $('#resetar-dados').onclick = async () => {
    if (await AdminUI.confirmAction('Restaurar demonstração', 'Todos os dados locais cadastrados serão substituídos pelos exemplos iniciais.')) {
      AdminStore.resetar(); categorias(); render(); AdminUI.toast('Dados de demonstração restaurados.');
    }
  };
  document.querySelector('.admin-table-card')?.classList.add('mobile-cards');
  categorias();
  render();
})();
