(function () {
  const sessao = AdminAuth.getSession();

  function administradoresAtivos(usuarios) {
    return usuarios.filter(usuario => usuario.ativo && usuario.papel === 'ADMIN');
  }

  function render() {
    const usuarios = AdminStore.usuarios();
    document.querySelector('#usuarios-tbody').innerHTML = usuarios.map(usuario => {
      const proprio = String(usuario.email).toLowerCase() === String(sessao?.email || '').toLowerCase();
      return `<tr><td data-label="Usuário"><div class="admin-product-cell"><span class="admin-avatar">${AdminUI.initials(usuario.nome)}</span><span><strong>${AdminUI.esc(usuario.nome)}${proprio ? ' (você)' : ''}</strong><small>${AdminUI.esc(usuario.email)}</small></span></div></td><td data-label="Papel"><select class="admin-select" data-role="${usuario.id}" data-anterior="${usuario.papel}"><option ${usuario.papel==='ADMIN'?'selected':''}>ADMIN</option><option ${usuario.papel==='EDITOR'?'selected':''}>EDITOR</option><option ${usuario.papel==='REVISOR'?'selected':''}>REVISOR</option><option ${usuario.papel==='USUARIO'?'selected':''}>USUARIO</option></select></td><td data-label="Status"><span class="admin-status ${usuario.ativo?'status-ativo':'status-desativado'}">${usuario.ativo?'Ativo':'Desativado'}</span></td><td data-label="Atualização">${AdminUI.date(usuario.atualizadoEm)}</td><td data-label="Ações"><button class="btn btn-secundario btn-pequeno" data-toggle="${usuario.id}">${usuario.ativo?'Desativar':'Ativar'}</button></td></tr>`;
    }).join('');

    document.querySelectorAll('[data-role]').forEach(select => select.onchange = async () => {
      const usuario = usuarios.find(item => item.id === Number(select.dataset.role));
      const anterior = select.dataset.anterior;
      const novo = select.value;
      if (usuario.papel === 'ADMIN' && novo !== 'ADMIN' && administradoresAtivos(usuarios).length <= 1) {
        AdminUI.toast('Não é possível remover o último administrador ativo.', 'erro');
        select.value = anterior;
        return;
      }
      const confirmar = await AdminUI.confirmAction('Alterar papel do usuário', `Alterar ${usuario.nome} de ${anterior} para ${novo}?`);
      if (!confirmar) { select.value = anterior; return; }
      usuario.papel = novo;
      AdminStore.salvarUsuario(usuario);
      AdminUI.toast('Papel atualizado.');
      render();
    });

    document.querySelectorAll('[data-toggle]').forEach(botao => botao.onclick = async () => {
      const usuario = usuarios.find(item => item.id === Number(botao.dataset.toggle));
      const proprio = String(usuario.email).toLowerCase() === String(sessao?.email || '').toLowerCase();
      if (usuario.ativo && usuario.papel === 'ADMIN' && administradoresAtivos(usuarios).length <= 1) {
        AdminUI.toast('Não é possível desativar o último administrador ativo.', 'erro');
        return;
      }
      const mensagem = proprio && usuario.ativo ? 'Você está prestes a desativar a própria conta nesta demonstração.' : `${usuario.ativo ? 'Desativar' : 'Ativar'} ${usuario.nome}?`;
      if (!await AdminUI.confirmAction('Alterar acesso', mensagem)) return;
      usuario.ativo = !usuario.ativo;
      AdminStore.salvarUsuario(usuario);
      AdminUI.toast(`Usuário ${usuario.ativo ? 'ativado' : 'desativado'}.`);
      render();
    });
  }

  document.querySelector('.admin-table-card')?.classList.add('mobile-cards');
  render();
})();
