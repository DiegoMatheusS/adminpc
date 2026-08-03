
(function () {
  const cfg = window.AdminConfig;
  const agora = () => new Date().toISOString();
  const diasAtras = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
  const seed = {
    produtos: [
      { id: 1, nome: 'ASUS TUF Gaming RTX 5070 12 GB', categoria: 'Placa de vídeo', fabricante: 'ASUS', modelo: 'TUF Gaming RTX 5070', mpn: 'TUF-RTX5070-O12G-GAMING', gtin: '', descricao: 'Placa de vídeo para jogos em alta resolução e produtividade.', consumoWatts: 250, larguraMm: 126, alturaMm: 62, profundidadeMm: 304, imagemUrl: 'assets/placeholder-produto.svg', urlOficial: '', status: 'PUBLICADO', criadoEm: diasAtras(18), atualizadoEm: diasAtras(1) },
      { id: 2, nome: 'AMD Ryzen 7 9700X', categoria: 'Processador', fabricante: 'AMD', modelo: 'Ryzen 7 9700X', mpn: '100-100001404WOF', gtin: '', descricao: 'Processador AM5 para jogos e produtividade.', consumoWatts: 65, imagemUrl: 'assets/placeholder-produto.svg', urlOficial: '', status: 'PUBLICADO', criadoEm: diasAtras(14), atualizadoEm: diasAtras(2) },
      { id: 3, nome: 'Corsair RM850x 850 W', categoria: 'Fonte', fabricante: 'Corsair', modelo: 'RM850x', mpn: 'CP-9020270-BR', gtin: '', descricao: 'Fonte modular de 850 W.', consumoWatts: 850, imagemUrl: 'assets/placeholder-produto.svg', urlOficial: '', status: 'AGUARDANDO_REVISAO', criadoEm: diasAtras(7), atualizadoEm: diasAtras(3) },
      { id: 4, nome: 'Gabinete NZXT H5 Flow', categoria: 'Gabinete', fabricante: 'NZXT', modelo: 'H5 Flow', mpn: 'CC-H51FB-01', gtin: '', descricao: 'Gabinete mid tower com foco em fluxo de ar.', consumoWatts: 0, imagemUrl: 'assets/placeholder-produto.svg', urlOficial: '', status: 'RASCUNHO', criadoEm: diasAtras(4), atualizadoEm: diasAtras(4) },
    ],
    parceiros: [
      { id: 1, nome: 'Mercado Livre', sigla: 'ML', modoAtualizacao: 'MANUAL', urlPrograma: '', ativo: true },
      { id: 2, nome: 'KaBuM!', sigla: 'KB', modoAtualizacao: 'MANUAL', urlPrograma: '', ativo: true },
      { id: 3, nome: 'TerabyteShop', sigla: 'TB', modoAtualizacao: 'MANUAL', urlPrograma: '', ativo: true },
      { id: 4, nome: 'HP Store', sigla: 'HP', modoAtualizacao: 'MANUAL', urlPrograma: '', ativo: true },
    ],
    ofertas: [
      { id: 1, produtoId: 1, parceiroId: 2, titulo: 'RTX 5070 ASUS TUF Gaming', preco: 4599.90, precoAnterior: 4899.90, emEstoque: true, urlOriginal: 'https://www.kabum.com.br/', urlAfiliado: 'https://www.kabum.com.br/', codigoExterno: 'KB-5070-TUF', status: 'PUBLICADO', atualizadoEm: diasAtras(1) },
      { id: 2, produtoId: 1, parceiroId: 1, titulo: 'RTX 5070 ASUS TUF 12 GB', preco: 4699.00, precoAnterior: null, emEstoque: true, urlOriginal: 'https://www.mercadolivre.com.br/', urlAfiliado: 'https://www.mercadolivre.com.br/', codigoExterno: 'MLB-DEMO', status: 'PUBLICADO', atualizadoEm: diasAtras(1) },
      { id: 3, produtoId: 2, parceiroId: 3, titulo: 'Ryzen 7 9700X', preco: 2299.90, precoAnterior: 2499.90, emEstoque: true, urlOriginal: 'https://www.terabyteshop.com.br/', urlAfiliado: 'https://www.terabyteshop.com.br/', codigoExterno: 'TB-9700X', status: 'RASCUNHO', atualizadoEm: diasAtras(2) },
    ],
    modelos: [
      { id: 1, produtoId: 1, arquivo: 'rtx5070-asus-tuf.glb', escala: '1, 1, 1', rotacao: '0, 90, 0', status: 'AGUARDANDO_REVISAO', atualizadoEm: diasAtras(2) },
    ],
    usuarios: [
      { id: 1, nome: 'Administrador', email: 'admin@pcbuilder.local', papel: 'ADMIN', ativo: true, atualizadoEm: diasAtras(0) },
      { id: 2, nome: 'Editor de catálogo', email: 'editor@pcbuilder.local', papel: 'EDITOR', ativo: true, atualizadoEm: diasAtras(5) },
    ],
    atividades: [
      { id: 1, texto: 'Oferta da RTX 5070 atualizada na KaBuM!.', data: diasAtras(1) },
      { id: 2, texto: 'Fonte Corsair RM850x enviada para revisão.', data: diasAtras(2) },
      { id: 3, texto: 'Parceiro HP Store adicionado.', data: diasAtras(4) },
    ],
  };
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function migrar(data) {
    data.produtos = (data.produtos || []).map(p => ({ especificacoesTecnicas: {}, ...p }));
    data.ofertas = (data.ofertas || []).map(o => ({ validadeAte: null, freteInfo: '', verificadoEm: o.atualizadoEm || null, ...o }));
    data.modelos = (data.modelos || []).map(m => ({ posicao: '0, 0, 0', tamanhoBytes: null, ...m }));
    data.parceiros ||= []; data.usuarios ||= []; data.atividades ||= [];
    return data;
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(cfg.chaveDados) || 'null');
      if (data && Array.isArray(data.produtos)) return migrar(data);
      const legado = JSON.parse(localStorage.getItem('pcBuilderAdminMockDataV1') || 'null');
      if (legado && Array.isArray(legado.produtos)) { const migrado = migrar(legado); save(migrado); return migrado; }
    } catch (_) {}
    const data = clone(seed);
    save(data);
    return data;
  }
  function save(data) { localStorage.setItem(cfg.chaveDados, JSON.stringify(data)); }
  function nextId(items) { return items.reduce((m, i) => Math.max(m, Number(i.id) || 0), 0) + 1; }
  function log(data, texto) { data.atividades.unshift({ id: nextId(data.atividades), texto, data: agora() }); data.atividades = data.atividades.slice(0, 50); }
  function upsert(collection, item, activity) {
    const data = load(); const items = data[collection]; const id = Number(item.id) || nextId(items); const idx = items.findIndex(x => Number(x.id) === id);
    const value = { ...(idx >= 0 ? items[idx] : {}), ...item, id, atualizadoEm: agora() };
    if (idx >= 0) items[idx] = value; else items.unshift(value);
    log(data, activity(value, idx >= 0)); save(data); return clone(value);
  }
  window.AdminStore = {
    carregar: load,
    resetar() { localStorage.removeItem(cfg.chaveDados); localStorage.removeItem('pcBuilderAdminMockDataV1'); return load(); },
    produtos() { return clone(load().produtos); },
    produto(id) { return clone(load().produtos.find(x => Number(x.id) === Number(id)) || null); },
    salvarProduto(item) { return upsert('produtos', item, (v, edit) => `${edit ? 'Produto atualizado' : 'Produto cadastrado'}: ${v.nome}.`); },
    excluirProduto(id) { const data=load(); const p=data.produtos.find(x=>Number(x.id)===Number(id)); data.produtos=data.produtos.filter(x=>Number(x.id)!==Number(id)); data.ofertas=data.ofertas.filter(x=>Number(x.produtoId)!==Number(id)); data.modelos=data.modelos.filter(x=>Number(x.produtoId)!==Number(id)); if(p) log(data,`Produto excluído: ${p.nome}.`); save(data); },
    duplicarProduto(id) { const p=this.produto(id); if(!p) return null; delete p.id; p.nome += ' (cópia)'; p.status='RASCUNHO'; return this.salvarProduto(p); },
    ofertas() { return clone(load().ofertas); },
    oferta(id) { return clone(load().ofertas.find(x=>Number(x.id)===Number(id)) || null); },
    salvarOferta(item) { return upsert('ofertas', item, (v, edit) => `${edit ? 'Oferta atualizada' : 'Oferta cadastrada'}: ${v.titulo}.`); },
    excluirOferta(id) { const data=load(); const o=data.ofertas.find(x=>Number(x.id)===Number(id)); data.ofertas=data.ofertas.filter(x=>Number(x.id)!==Number(id)); if(o) log(data,`Oferta excluída: ${o.titulo}.`); save(data); },
    parceiros() { return clone(load().parceiros); },
    parceiro(id) { return clone(load().parceiros.find(x=>Number(x.id)===Number(id)) || null); },
    salvarParceiro(item) { return upsert('parceiros', item, (v, edit) => `${edit ? 'Parceiro atualizado' : 'Parceiro cadastrado'}: ${v.nome}.`); },
    excluirParceiro(id) { const data=load(); const p=data.parceiros.find(x=>Number(x.id)===Number(id)); data.parceiros=data.parceiros.filter(x=>Number(x.id)!==Number(id)); if(p) log(data,`Parceiro removido: ${p.nome}.`); save(data); },
    modelos() { return clone(load().modelos); },
    salvarModelo(item) { return upsert('modelos', item, (v, edit) => `${edit ? 'Modelo 3D atualizado' : 'Modelo 3D cadastrado'}: ${v.arquivo}.`); },
    excluirModelo(id) { const data=load(); data.modelos=data.modelos.filter(x=>Number(x.id)!==Number(id)); save(data); },
    usuarios() { return clone(load().usuarios); },
    salvarUsuario(item) { return upsert('usuarios', item, (v, edit) => `${edit ? 'Usuário atualizado' : 'Usuário cadastrado'}: ${v.email}.`); },
    atividades() { return clone(load().atividades); },
  };
})();
