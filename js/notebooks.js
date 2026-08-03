(function () {
  let pagina = 1;
  const porPagina = 10;
  const $ = seletor => document.querySelector(seletor);

  function specs(p) { return p?.especificacoesTecnicas || {}; }
  function resumoRam(p) {
    const s = specs(p); const gb = Number(s.ramInstaladaGb || 0); const tipo = s.tipoMemoria || '';
    return gb ? `${gb} GB${tipo ? ` ${tipo}` : ''}` : (s.ramResumo || '—');
  }
  function resumoTela(p) {
    const s = specs(p); const partes=[];
    if (s.telaPolegadas) partes.push(`${s.telaPolegadas}\"`);
    if (s.resolucao) partes.push(s.resolucao);
    if (s.taxaHz) partes.push(`${s.taxaHz} Hz`);
    return partes.join(' · ') || s.telaResumo || '—';
  }
  function menuAcoes(produto) {
    return `<div class="admin-row-actions"><a class="admin-action-button" href="notebook.html?id=${produto.id}">Editar</a><details class="admin-actions-menu"><summary class="admin-action-button" aria-label="Mais ações">⋮</summary><div class="admin-actions-menu-panel"><a href="oferta.html?produtoId=${produto.id}">Cadastrar oferta</a><button type="button" data-duplicar="${produto.id}">Duplicar como rascunho</button><button type="button" class="acao-perigosa" data-excluir="${produto.id}">Excluir notebook</button></div></details></div>`;
  }
  function render() {
    const todos = AdminStore.produtos().filter(p => p.categoria === 'Notebook');
    const ofertas = AdminStore.ofertas();
    const busca = $('#notebook-busca').value.trim().toLowerCase();
    const status = $('#notebook-status').value;
    const ordem = $('#notebook-ordem').value;
    let itens = todos.filter(p => (!busca || [p.nome,p.mpn,p.gtin,p.fabricante,p.modelo,specs(p).processadorResumo,specs(p).gpuResumo].join(' ').toLowerCase().includes(busca)) && (!status || p.status === status));
    itens.sort((a,b) => ordem === 'nome' ? a.nome.localeCompare(b.nome) : ordem === 'id' ? a.id-b.id : new Date(b.atualizadoEm)-new Date(a.atualizadoEm));
    const paginas = Math.max(1, Math.ceil(itens.length / porPagina)); pagina = Math.min(pagina, paginas);
    const linhas = itens.slice((pagina-1)*porPagina, pagina*porPagina);
    $('#notebooks-tbody').innerHTML = linhas.map(p => {
      const s=specs(p); const totalOfertas=ofertas.filter(o=>Number(o.produtoId)===Number(p.id)).length;
      return `<tr>
        <td data-label="Notebook"><div class="admin-product-cell"><img class="admin-product-thumb" src="${AdminUI.esc(p.imagemUrl || 'assets/placeholder-produto.svg')}" alt=""><span><strong>${AdminUI.esc(p.nome)}</strong><small>#${p.id} · ${AdminUI.esc(p.fabricante || '—')} · ${AdminUI.esc(p.modelo || 'Sem modelo')}</small></span></div></td>
        <td data-label="Processador">${AdminUI.esc(s.processadorResumo || '—')}</td>
        <td data-label="GPU">${AdminUI.esc(s.gpuResumo || '—')}</td>
        <td data-label="RAM">${AdminUI.esc(resumoRam(p))}</td>
        <td data-label="Tela">${AdminUI.esc(resumoTela(p))}</td>
        <td data-label="Ofertas">${totalOfertas}</td>
        <td data-label="Status"><span class="admin-status ${AdminUI.statusClass(p.status)}">${AdminUI.statusLabel(p.status)}</span></td>
        <td data-label="Atualização">${AdminUI.date(p.atualizadoEm)}</td>
        <td data-label="Ações">${menuAcoes(p)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="9"><div class="admin-empty">Nenhum notebook cadastrado.</div></td></tr>';
    $('#notebooks-resumo').textContent = `${itens.length} notebook(s) · página ${pagina} de ${paginas}`;
    $('#pagina-anterior').disabled = pagina <= 1; $('#proxima-pagina').disabled = pagina >= paginas;
    bindAcoes();
  }
  function bindAcoes() {
    document.querySelectorAll('[data-duplicar]').forEach(btn => btn.onclick = () => { const salvo=AdminStore.duplicarProduto(btn.dataset.duplicar); if (salvo) AdminUI.toast('Notebook duplicado como rascunho.'); render(); });
    document.querySelectorAll('[data-excluir]').forEach(btn => btn.onclick = async () => { if (await AdminUI.confirmAction('Excluir notebook', 'A exclusão também removerá ofertas vinculadas. Essa ação não pode ser desfeita.')) { AdminStore.excluirProduto(btn.dataset.excluir); AdminUI.toast('Notebook excluído.'); render(); } });
  }
  ['#notebook-busca','#notebook-status','#notebook-ordem'].forEach(sel => $(sel).addEventListener('input',()=>{pagina=1;render();}));
  $('#pagina-anterior').onclick=()=>{pagina--;render();}; $('#proxima-pagina').onclick=()=>{pagina++;render();};
  document.querySelector('.admin-table-card')?.classList.add('mobile-cards');
  render();
})();
