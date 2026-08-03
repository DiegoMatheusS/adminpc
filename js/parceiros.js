(function () {
  const $ = seletor => document.querySelector(seletor);

  function limpar() {
    ['#parceiro-id','#parceiro-nome','#parceiro-sigla','#parceiro-url'].forEach(seletor => $(seletor).value = '');
    $('#parceiro-modo').value = 'MANUAL';
    $('#parceiro-form-titulo').textContent = 'Novo parceiro';
  }

  function render() {
    const ofertas = AdminStore.ofertas();
    const itens = AdminStore.parceiros();
    $('#parceiros-grid').innerHTML = itens.map(parceiro => {
      const vinculadas = ofertas.filter(oferta => Number(oferta.parceiroId) === Number(parceiro.id)).length;
      return `<article class="admin-partner-card"><div class="admin-partner-logo">${AdminUI.esc(parceiro.sigla || parceiro.nome.slice(0,2))}</div><h2>${AdminUI.esc(parceiro.nome)}</h2><div class="admin-partner-meta"><span class="admin-status ${parceiro.ativo ? 'status-ativo' : 'status-desativado'}">${parceiro.ativo ? 'Ativo' : 'Desativado'}</span><span>${vinculadas} oferta(s)</span></div><p>Atualização: <strong>${AdminUI.esc(parceiro.modoAtualizacao)}</strong></p><div class="admin-row-actions"><button class="btn btn-secundario btn-pequeno" data-editar="${parceiro.id}">Editar</button><button class="btn btn-secundario btn-pequeno" data-toggle="${parceiro.id}">${parceiro.ativo ? 'Desativar' : 'Ativar'}</button><button class="btn btn-secundario btn-pequeno" data-excluir="${parceiro.id}" ${vinculadas ? 'disabled title="Desative ou transfira as ofertas antes de remover"' : ''}>Remover</button></div></article>`;
    }).join('');

    document.querySelectorAll('[data-editar]').forEach(botao => botao.onclick = () => {
      const parceiro = AdminStore.parceiro(botao.dataset.editar);
      $('#parceiro-id').value = parceiro.id;
      $('#parceiro-nome').value = parceiro.nome;
      $('#parceiro-sigla').value = parceiro.sigla;
      $('#parceiro-modo').value = parceiro.modoAtualizacao;
      $('#parceiro-url').value = parceiro.urlPrograma || '';
      $('#parceiro-form-titulo').textContent = 'Editar parceiro';
      scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('[data-toggle]').forEach(botao => botao.onclick = async () => {
      const parceiro = AdminStore.parceiro(botao.dataset.toggle);
      const verbo = parceiro.ativo ? 'desativar' : 'ativar';
      if (!await AdminUI.confirmAction(`${verbo[0].toUpperCase()}${verbo.slice(1)} parceiro`, `Confirma ${verbo} “${parceiro.nome}”?`)) return;
      parceiro.ativo = !parceiro.ativo;
      AdminStore.salvarParceiro(parceiro);
      AdminUI.toast(`Parceiro ${parceiro.ativo ? 'ativado' : 'desativado'}.`);
      render();
    });

    document.querySelectorAll('[data-excluir]').forEach(botao => botao.onclick = async () => {
      if (await AdminUI.confirmAction('Remover parceiro', 'O parceiro será removido definitivamente desta demonstração.')) {
        AdminStore.excluirParceiro(botao.dataset.excluir);
        AdminUI.toast('Parceiro removido.');
        render();
      }
    });
  }

  $('#parceiro-form').onsubmit = evento => {
    evento.preventDefault();
    const existente = Number($('#parceiro-id').value) ? AdminStore.parceiro($('#parceiro-id').value) : null;
    AdminStore.salvarParceiro({
      id: Number($('#parceiro-id').value) || undefined,
      nome: $('#parceiro-nome').value.trim(),
      sigla: $('#parceiro-sigla').value.trim().toUpperCase(),
      modoAtualizacao: $('#parceiro-modo').value,
      urlPrograma: $('#parceiro-url').value.trim(),
      ativo: existente?.ativo ?? true,
    });
    AdminUI.toast('Parceiro salvo.');
    limpar();
    render();
  };
  $('#cancelar-parceiro').onclick = limpar;
  render();
})();
