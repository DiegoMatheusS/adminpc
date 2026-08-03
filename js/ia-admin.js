/**
 * PC Builder Admin — Integração com IA
 *
 * Botões disponíveis em produto.html:
 *   #btn-ia-normalizar     → pega conteúdo bruto importado e organiza campos via IA
 *   #btn-ia-analisar       → analisa o produto já cadastrado (precisa de ?id=)
 *   #btn-ia-gerar-descricao → gera descrição para produto já cadastrado (precisa de ?id=)
 */
(function () {
  const cfg = window.AdminConfig;
  const BASE = String(cfg?.apiBaseUrl || 'http://localhost:3000/api').replace(/\/$/, '');
  const idProduto = Number(new URLSearchParams(location.search).get('id')) || null;

  /* ── Utilitários ── */

  function esc(v) { return AdminUI.esc(v); }

  async function chamarIa(rota, corpo) {
    const resp = await fetch(`${BASE}/admin/ia/${rota}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (resp.status === 401 || resp.status === 403) throw new Error('Sem permissão. Faça login como administrador.');
    if (resp.status === 503) throw new Error('IA indisponível. Configure GEMINI_API_KEY no backend.');
    if (!resp.ok) {
      let msg = '';
      try { msg = (await resp.json()).message || ''; } catch (_) {}
      throw new Error(msg || `Erro ${resp.status}.`);
    }
    return resp.json();
  }

  function btnCarregando(btn, sim) {
    btn.disabled = sim;
    btn.dataset.textoOriginal = btn.dataset.textoOriginal || btn.textContent;
    btn.textContent = sim ? '✦ Aguarde...' : btn.dataset.textoOriginal;
  }

  function criarPainel(id, containerSeletor) {
    let p = document.getElementById(id);
    if (p) return p;
    p = document.createElement('div');
    p.id = id;
    p.className = 'admin-ia-painel';
    p.hidden = true;
    const container = document.querySelector(containerSeletor);
    container?.appendChild(p);
    return p;
  }

  function mostrar(painel, html, tipo = 'info') {
    painel.hidden = false;
    painel.className = `admin-ia-painel admin-ia-painel--${tipo}`;
    painel.innerHTML = html;
  }

  /* ── Coletar dados do formulário para contexto ── */

  function coletarFormulario() {
    const form = document.getElementById('produto-form');
    if (!form) return '';
    const obj = {};
    new FormData(form).forEach((v, k) => { obj[k] = v; });
    // inclui URL de importação se preenchida
    const urlInput = document.getElementById('urlOriginalImportacao');
    if (urlInput?.value) obj._urlOrigem = urlInput.value;
    return JSON.stringify(obj, null, 2);
  }

  /* ── 1. Organizar com IA (normalizar conteúdo importado) ── */

  function configurarOrganizar() {
    const btn = document.getElementById('btn-ia-normalizar');
    if (!btn || btn.dataset.iaConfigurado) return;
    btn.dataset.iaConfigurado = '1';

    const painel = criarPainel('ia-painel-normalizar', '.admin-import-section');

    btn.addEventListener('click', async () => {
      const conteudo = coletarFormulario();
      if (conteudo.length < 30) {
        AdminUI.toast('Importe ou preencha alguns dados antes de organizar com IA.', 'alerta');
        return;
      }

      btnCarregando(btn, true);
      painel.hidden = true;

      try {
        const res = await chamarIa('normalizar-produto', {
          conteudoBruto: conteudo,
          urlOrigem: document.getElementById('urlOriginalImportacao')?.value || '',
        });

        // Tenta preencher campos reconhecidos no formulário
        const campos = res.camposNormalizados || {};
        const mapaForm = {
          nome: 'nome', marca: 'fabricante', fabricante: 'fabricante',
          modelo: 'modelo', mpn: 'mpn', gtin: 'gtin',
          descricao: 'descricao', categoria: 'categoria',
        };
        let aplicados = 0;
        Object.entries(mapaForm).forEach(([chaveIa, chaveForm]) => {
          if (!campos[chaveIa]) return;
          const el = document.getElementById(chaveForm) || document.querySelector(`[name="${chaveForm}"]`);
          if (!el || el.value.trim()) return; // não sobrescreve campo já preenchido
          el.value = String(campos[chaveIa]);
          el.closest?.('.admin-field')?.classList.add('foi-importado');
          aplicados++;
        });

        // Atualiza preview se disponível
        if (typeof preview === 'function') preview();

        const alertasHtml = res.alertas?.length
          ? `<ul class="admin-ia-lista-alertas">${res.alertas.map(a => `<li>⚠ ${esc(a)}</li>`).join('')}</ul>` : '';
        const ausentesHtml = res.ausentes?.length
          ? `<ul class="admin-ia-lista-ausentes">${res.ausentes.map(a => `<li>✗ ${esc(a)}</li>`).join('')}</ul>` : '';

        mostrar(
          painel,
          `<strong>✦ Organizado pela IA</strong>
           <p>${esc(res.textoExplicativo || '')}${aplicados ? ` ${aplicados} campo(s) preenchido(s) automaticamente.` : ''}</p>
           ${alertasHtml}${ausentesHtml}
           ${Object.keys(campos).length ? `<details><summary>Ver campos normalizados</summary><pre class="admin-ia-texto">${esc(JSON.stringify(campos, null, 2))}</pre></details>` : ''}`,
          res.alertas?.length ? 'alerta' : 'info',
        );
        AdminUI.toast(aplicados ? `IA preencheu ${aplicados} campo(s). Revise antes de salvar.` : 'Normalização concluída. Revise os dados.', 'sucesso');
      } catch (erro) {
        mostrar(painel, `<span>⚠ ${esc(erro.message)}</span>`, 'erro');
        AdminUI.toast(erro.message, 'erro');
      } finally {
        btnCarregando(btn, false);
      }
    });
  }

  /* ── 2. Revisar produto com IA (precisa de ?id=) ── */

  function configurarAnalisar() {
    const btn = document.getElementById('btn-ia-analisar-produto');
    if (!btn || btn.dataset.iaConfigurado) return;
    btn.dataset.iaConfigurado = '1';

    if (!idProduto) { btn.hidden = true; return; }

    const painel = criarPainel('ia-painel-analise', '.admin-form-card');

    btn.addEventListener('click', async () => {
      btnCarregando(btn, true);
      painel.hidden = true;

      try {
        const res = await chamarIa('analisar-produto', { hardwareId: idProduto });
        mostrar(
          painel,
          `<strong>✦ Revisão da IA</strong><pre class="admin-ia-texto">${esc(res.analise)}</pre>`,
          'info',
        );
        AdminUI.toast('Revisão concluída.', 'sucesso');
      } catch (erro) {
        mostrar(painel, `<span>⚠ ${esc(erro.message)}</span>`, 'erro');
        AdminUI.toast(erro.message, 'erro');
      } finally {
        btnCarregando(btn, false);
      }
    });
  }

  /* ── 3. Gerar descrição com IA (precisa de ?id=) ── */

  function configurarGerarDescricao() {
    const btn = document.getElementById('btn-ia-gerar-descricao');
    if (!btn || btn.dataset.iaConfigurado) return;
    btn.dataset.iaConfigurado = '1';

    if (!idProduto) { btn.hidden = true; return; }

    btn.addEventListener('click', async () => {
      btnCarregando(btn, true);

      try {
        const res = await chamarIa('gerar-descricao', { hardwareId: idProduto });
        const campo = document.getElementById('descricao');
        if (campo) {
          campo.value = res.descricao;
          campo.dispatchEvent(new Event('input'));
        }
        AdminUI.toast('Descrição gerada. Revise antes de salvar.', 'sucesso');
      } catch (erro) {
        AdminUI.toast(erro.message, 'erro');
      } finally {
        btnCarregando(btn, false);
      }
    });
  }

  /* ── Init ── */

  function init() {
    configurarOrganizar();
    configurarAnalisar();
    configurarGerarDescricao();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.AdminIa = { chamarIa };
})();
