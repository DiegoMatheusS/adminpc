(function () {
  const $ = seletor => document.querySelector(seletor);
  const produtos = AdminStore.produtos();
  $('#modelo-produto').innerHTML = '<option value="">Selecione</option>' + produtos.map(p => `<option value="${p.id}">${AdminUI.esc(p.nome)}</option>`).join('');

  function vetor(prefixo, padrao) {
    return ['x','y','z'].map((eixo, indice) => Number($(`#modelo-${prefixo}-${eixo}`).value || padrao[indice])).join(', ');
  }

  function resetarVetores() {
    ['x','y','z'].forEach(eixo => {
      $(`#modelo-escala-${eixo}`).value = '1';
      $(`#modelo-rotacao-${eixo}`).value = '0';
      $(`#modelo-posicao-${eixo}`).value = '0';
    });
  }

  function atualizarArquivo() {
    const arquivo = $('#modelo-arquivo').files[0];
    if (!arquivo) { $('#modelo-arquivo-resumo').textContent = 'Nenhum arquivo selecionado.'; return; }
    const tamanhoMb = arquivo.size / 1024 / 1024;
    $('#modelo-arquivo-resumo').textContent = `${arquivo.name} · ${tamanhoMb.toFixed(2)} MB`;
    if (!arquivo.name.toLowerCase().endsWith('.glb')) AdminUI.toast('Selecione um arquivo com extensão .glb.', 'erro');
    else if (tamanhoMb > 25) AdminUI.toast('Arquivo acima de 25 MB. Considere compactar com Draco ou Meshopt.', 'erro');
  }

  function render() {
    const modelos = AdminStore.modelos();
    $('#modelos-tbody').innerHTML = modelos.map(modelo => {
      const produto = produtos.find(p => Number(p.id) === Number(modelo.produtoId));
      const tamanho = modelo.tamanhoBytes ? `${(modelo.tamanhoBytes/1024/1024).toFixed(2)} MB` : '—';
      return `<tr><td data-label="Produto"><div class="admin-product-cell"><span><strong>${AdminUI.esc(produto?.nome || 'Produto removido')}</strong><small>${AdminUI.esc(modelo.arquivo)}</small></span></div></td><td data-label="Tamanho">${tamanho}</td><td data-label="Escala">${AdminUI.esc(modelo.escala || '1, 1, 1')}</td><td data-label="Rotação">${AdminUI.esc(modelo.rotacao || '0, 0, 0')}</td><td data-label="Posição">${AdminUI.esc(modelo.posicao || '0, 0, 0')}</td><td data-label="Status"><span class="admin-status ${AdminUI.statusClass(modelo.status)}">${AdminUI.statusLabel(modelo.status)}</span></td><td data-label="Atualização">${AdminUI.date(modelo.atualizadoEm)}</td><td data-label="Ações"><button class="admin-action-button" data-excluir="${modelo.id}">Excluir</button></td></tr>`;
    }).join('') || '<tr><td colspan="8"><div class="admin-empty">Nenhum modelo cadastrado.</div></td></tr>';
    document.querySelectorAll('[data-excluir]').forEach(botao => botao.onclick = async () => {
      if (!await AdminUI.confirmAction('Excluir modelo 3D', 'Os metadados do modelo serão removidos.')) return;
      AdminStore.excluirModelo(botao.dataset.excluir);
      AdminUI.toast('Modelo removido.');
      render();
    });
  }

  $('#modelo-arquivo').addEventListener('change', atualizarArquivo);
  $('#centralizar-modelo').addEventListener('click', () => { resetarVetores(); AdminUI.toast('Transformação centralizada.'); });
  $('#modelo-form').onsubmit = evento => {
    evento.preventDefault();
    const arquivo = $('#modelo-arquivo').files[0];
    if (!arquivo) { AdminUI.toast('Selecione um arquivo GLB.', 'erro'); return; }
    if (!arquivo.name.toLowerCase().endsWith('.glb')) { AdminUI.toast('O arquivo precisa ter extensão .glb.', 'erro'); return; }
    AdminStore.salvarModelo({
      produtoId: Number($('#modelo-produto').value),
      arquivo: arquivo.name,
      tamanhoBytes: arquivo.size,
      escala: vetor('escala', [1,1,1]),
      rotacao: vetor('rotacao', [0,0,0]),
      posicao: vetor('posicao', [0,0,0]),
      status: $('#modelo-status').value,
    });
    AdminUI.toast('Metadados do modelo salvos.');
    evento.target.reset();
    resetarVetores();
    atualizarArquivo();
    render();
  };
  document.querySelector('.admin-table-card')?.classList.add('mobile-cards');
  render();
})();
