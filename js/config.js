window.AdminConfig = Object.freeze({
  modo: 'mock',
  apiBaseUrl: 'http://localhost:3000/api',
  rotasApi: Object.freeze({
    importarProduto: '/admin/produtos/importar',
    iaAnalisarProduto: '/admin/ia/analisar-produto',
    iaNormalizarProduto: '/admin/ia/normalizar-produto',
    iaGerarDescricao: '/admin/ia/gerar-descricao',
  }),
  chaveSessaoDemo: 'pcBuilderAdminDemoSession',
  chaveSessaoPublica: 'pcBuilderSessao',
  chaveDados: 'pcBuilderAdminMockDataV2',
  papeisPermitidos: ['ADMIN', 'EDITOR', 'REVISOR'],
  permissoesPagina: Object.freeze({
    dashboard: ['ADMIN', 'EDITOR', 'REVISOR'],
    produtos: ['ADMIN', 'EDITOR', 'REVISOR'],
    ofertas: ['ADMIN', 'EDITOR', 'REVISOR'],
    parceiros: ['ADMIN', 'EDITOR'],
    modelos: ['ADMIN', 'EDITOR', 'REVISOR'],
    usuarios: ['ADMIN'],
  }),
});
