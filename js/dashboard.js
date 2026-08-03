(function () {
  const dados = AdminStore.carregar();
  const definir = (chave, valor) => { const elemento = document.querySelector(`[data-stat="${chave}"]`); if (elemento) elemento.textContent = valor; };
  definir('produtos', dados.produtos.length);
  definir('ofertas', dados.ofertas.filter(o => o.status === 'PUBLICADO' && o.emEstoque).length);
  definir('revisao', dados.produtos.filter(p => p.status === 'AGUARDANDO_REVISAO').length + dados.modelos.filter(m => m.status === 'AGUARDANDO_REVISAO').length);
  definir('parceiros', dados.parceiros.filter(p => p.ativo).length);

  const atividades = document.querySelector('#atividades-recentes');
  atividades.innerHTML = dados.atividades.slice(0,8).map(a => `<div class="admin-activity-item"><span class="admin-activity-dot"></span><div><p>${AdminUI.esc(a.texto)}</p><time>${AdminUI.date(a.data)}</time></div></div>`).join('') || '<div class="admin-empty">Nenhuma atividade.</div>';

  const agora = Date.now();
  const pendencias = [
    { icone: 'MPN', titulo: 'Produtos sem MPN', detalhe: 'Dificulta agrupar ofertas do mesmo item.', total: dados.produtos.filter(p => !p.mpn).length, link: 'produtos.html' },
    { icone: 'IMG', titulo: 'Produtos sem imagem própria', detalhe: 'Ainda usam o placeholder do painel.', total: dados.produtos.filter(p => !p.imagemUrl || p.imagemUrl.includes('placeholder')).length, link: 'produtos.html' },
    { icone: 'TEC', titulo: 'Sem dados de compatibilidade', detalhe: 'Cadastre especificações específicas da categoria.', total: dados.produtos.filter(p => !p.especificacoesTecnicas || Object.keys(p.especificacoesTecnicas).length === 0).length, link: 'produtos.html' },
    { icone: 'R$', titulo: 'Ofertas sem verificação recente', detalhe: 'Mais de 48 horas ou nunca verificadas.', total: dados.ofertas.filter(o => !o.verificadoEm || agora - new Date(o.verificadoEm).getTime() > 48*60*60*1000).length, link: 'ofertas.html' },
    { icone: '3D', titulo: 'Modelos aguardando revisão', detalhe: 'Confira escala, rotação, posição e tamanho.', total: dados.modelos.filter(m => m.status === 'AGUARDANDO_REVISAO').length, link: 'modelos-3d.html' },
  ].filter(item => item.total > 0);

  const lista = document.querySelector('#pendencias-catalogo');
  lista.innerHTML = pendencias.length ? pendencias.map(item => `<a class="admin-pending-item" href="${item.link}"><span class="admin-pending-icon">${item.icone}</span><span><strong>${AdminUI.esc(item.titulo)}</strong><small>${AdminUI.esc(item.detalhe)}</small></span><span class="admin-pending-count">${item.total}</span></a>`).join('') : '<div class="admin-empty">Nenhuma pendência importante encontrada.</div>';
})();
