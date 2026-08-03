(function () {
  const cfg = window.AdminConfig;
  const endpoint = `${String(cfg.apiBaseUrl || '').replace(/\/$/, '')}${cfg.rotasApi?.importarProduto || '/admin/produtos/importar'}`;

  function texto(valor) {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'string' || typeof valor === 'number') return String(valor).trim();
    if (typeof valor === 'object') return texto(valor.name || valor.nome || valor.value);
    return '';
  }

  function primeiraImagem(valor) {
    if (Array.isArray(valor)) return primeiraImagem(valor[0]);
    if (typeof valor === 'object' && valor) return texto(valor.url || valor.contentUrl);
    return texto(valor);
  }

  function numero(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const limpo = String(valor).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(limpo);
    return Number.isFinite(n) ? n : null;
  }

  function normalizarCategoria(valor, nome) {
    const origem = `${texto(valor)} ${texto(nome)}`.toLowerCase();
    const regras = [
      ['PC montado', ['pc gamer', 'computador gamer', 'desktop gamer', 'pc montado']],
      ['Notebook', ['notebook', 'laptop']],
      ['Monitor', ['monitor']],
      ['Periférico', ['teclado', 'mouse', 'headset', 'periférico', 'periferico']],
      ['Placa de vídeo', ['placa de vídeo', 'placa de video', 'gpu', 'graphics card', 'geforce', 'radeon']],
      ['Placa-mãe', ['placa-mãe', 'placa mae', 'motherboard']],
      ['Processador', ['processador', 'processor', 'cpu', 'ryzen', 'intel core']],
      ['Memória', ['memória ram', 'memoria ram', 'memory', 'ddr4', 'ddr5']],
      ['Armazenamento', ['ssd', 'nvme', 'hd ', 'hdd', 'armazenamento', 'storage']],
      ['Fonte', ['fonte de alimentação', 'fonte atx', 'power supply', 'psu']],
      ['Gabinete', ['gabinete', 'computer case', 'pc case', 'mid tower', 'full tower']],
      ['Cooler', ['water cooler', 'air cooler', 'cooler', 'dissipador']],
    ];
    return regras.find(([, termos]) => termos.some(termo => origem.includes(termo)))?.[0] || '';
  }

  function obterMeta(doc, seletores) {
    for (const seletor of seletores) {
      const el = doc.querySelector(seletor);
      const valor = el?.getAttribute('content') || el?.getAttribute('value');
      if (valor) return valor.trim();
    }
    return '';
  }

  function tipos(item) {
    const tipo = item?.['@type'];
    return (Array.isArray(tipo) ? tipo : [tipo]).map(v => String(v || '').toLowerCase());
  }

  function coletarJsonLd(doc) {
    const itens = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const parsed = JSON.parse(script.textContent.trim());
        const fila = Array.isArray(parsed) ? parsed : [parsed];
        fila.forEach(item => {
          if (item?.['@graph'] && Array.isArray(item['@graph'])) itens.push(...item['@graph']);
          else itens.push(item);
        });
      } catch (_) {}
    });
    return itens.find(item => tipos(item).includes('product')) || {};
  }

  function ofertaDoProduto(produto) {
    const ofertas = Array.isArray(produto.offers) ? produto.offers : [produto.offers];
    return ofertas.find(Boolean) || {};
  }

  function disponibilidade(valor) {
    const v = texto(valor).toLowerCase();
    if (!v) return null;
    if (v.includes('outofstock') || v.includes('soldout') || v.includes('indispon')) return false;
    if (v.includes('instock') || v.includes('limitedavailability') || v.includes('dispon')) return true;
    return null;
  }

  function normalizar(payload) {
    const dados = payload?.dados || payload?.produto || payload || {};
    const nome = texto(dados.nome || dados.name || dados.titulo || dados.title);
    const fabricante = texto(dados.fabricante || dados.marca || dados.brand);
    const preco = numero(dados.preco ?? dados.price);
    const precoAnterior = numero(dados.precoAnterior ?? dados.oldPrice ?? dados.listPrice);
    return {
      nome,
      fabricante,
      modelo: texto(dados.modelo || dados.model),
      mpn: texto(dados.mpn || dados.manufacturerPartNumber || dados.skuFabricante),
      gtin: texto(dados.gtin || dados.gtin13 || dados.gtin12 || dados.gtin14 || dados.ean),
      categoria: normalizarCategoria(dados.categoria || dados.category, nome),
      descricao: texto(dados.descricao || dados.description),
      imagemUrl: primeiraImagem(dados.imagemUrl || dados.imagem || dados.image),
      preco,
      precoAnterior,
      moeda: texto(dados.moeda || dados.priceCurrency || 'BRL'),
      emEstoque: typeof dados.emEstoque === 'boolean' ? dados.emEstoque : disponibilidade(dados.disponibilidade || dados.availability),
      codigoExterno: texto(dados.codigoExterno || dados.sku || dados.productID),
      consumoWatts: numero(dados.consumoWatts),
      larguraMm: numero(dados.larguraMm),
      alturaMm: numero(dados.alturaMm),
      profundidadeMm: numero(dados.profundidadeMm),
    };
  }

  function extrairHtml(html, urlOriginal) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const produto = coletarJsonLd(doc);
    const oferta = ofertaDoProduto(produto);
    const nome = texto(produto.name) || obterMeta(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) || texto(doc.title);
    const fabricante = texto(produto.brand) || obterMeta(doc, ['meta[property="product:brand"]', 'meta[name="brand"]']);
    const descricao = texto(produto.description) || obterMeta(doc, ['meta[property="og:description"]', 'meta[name="description"]']);
    const imagemUrl = primeiraImagem(produto.image) || obterMeta(doc, ['meta[property="og:image"]', 'meta[name="twitter:image"]']);
    const preco = numero(oferta.price ?? oferta.lowPrice ?? obterMeta(doc, ['meta[property="product:price:amount"]', 'meta[itemprop="price"]']));
    const dados = normalizar({
      nome,
      fabricante,
      modelo: produto.model,
      mpn: produto.mpn,
      gtin: produto.gtin || produto.gtin13 || produto.gtin12 || produto.gtin14,
      categoria: produto.category,
      descricao,
      imagemUrl: imagemUrl ? new URL(imagemUrl, urlOriginal).href : '',
      preco,
      moeda: oferta.priceCurrency || obterMeta(doc, ['meta[property="product:price:currency"]']),
      emEstoque: disponibilidade(oferta.availability),
      codigoExterno: produto.sku || produto.productID,
    });
    if (!dados.nome && !dados.mpn && !dados.gtin) throw new Error('A página não forneceu dados estruturados reconhecíveis.');
    return dados;
  }

  async function importarPelaApi(urlOriginal) {
    const resposta = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ urlOriginal }),
    });
    if (!resposta.ok) {
      let mensagem = `Falha ao importar (${resposta.status}).`;
      try { mensagem = (await resposta.json()).message || mensagem; } catch (_) {}
      throw new Error(mensagem);
    }
    return { ...normalizar(await resposta.json()), origem: 'api' };
  }

  async function importarDireto(urlOriginal) {
    const resposta = await fetch(urlOriginal, { method: 'GET', mode: 'cors', credentials: 'omit', headers: { Accept: 'text/html,application/xhtml+xml' } });
    if (!resposta.ok) throw new Error(`A loja retornou o status ${resposta.status}.`);
    const tipo = resposta.headers.get('content-type') || '';
    if (!tipo.includes('text/html') && !tipo.includes('application/xhtml+xml')) throw new Error('O endereço não retornou uma página de produto.');
    return { ...extrairHtml(await resposta.text(), urlOriginal), origem: 'pagina' };
  }

  async function importar(urlOriginal) {
    const url = new URL(urlOriginal);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use um endereço iniciado por http:// ou https://.');
    if (cfg.modo === 'api') return importarPelaApi(url.href);
    try {
      return await importarDireto(url.href);
    } catch (erro) {
      const mensagem = String(erro?.message || '');
      const pareceBloqueio = erro instanceof TypeError || /failed to fetch|networkerror|load failed|cors/i.test(mensagem);
      if (!pareceBloqueio) throw erro;
      const falha = new Error('A loja bloqueou a leitura direta do navegador. O formulário está pronto, mas essa página precisará da rota POST /api/admin/produtos/importar no backend.');
      falha.cause = erro;
      throw falha;
    }
  }

  window.AdminProdutoImportador = Object.freeze({ importar, endpoint });
})();
