(function () {
  const $ = s => document.querySelector(s);
  const form = $('#produto-form');
  const id = Number(new URLSearchParams(location.search).get('id')) || null;
  const produto = id ? AdminStore.produto(id) : null;
  const chaveOfertaImportada = 'pcBuilderOfertaImportada';
  const chaveRascunho = `pcBuilderNotebookRascunhoAuto:${id || 'novo'}`;
  let dadosImportados = null, alterado = false, salvando = false, timer = null;

  if (produto && produto.categoria !== 'Notebook') {
    AdminUI.toast('O item informado não é um notebook.', 'erro');
    setTimeout(()=>location.replace('notebooks.html'), 300);
    return;
  }
  function n(v) { return v === '' || v === null || v === undefined ? null : Number(v); }
  function normalizarCodigo(v){ return String(v||'').replace(/[^a-z0-9]/gi,'').toUpperCase(); }
  function gtinValido(v){ const d=String(v||'').replace(/\D/g,''); if(!d)return true; if(![8,12,13,14].includes(d.length))return false; const c=d.slice(0,-1).split('').reverse(); const soma=c.reduce((t,x,i)=>t+Number(x)*(i%2===0?3:1),0); return (10-(soma%10))%10===Number(d.at(-1)); }
  function validarIds(mostrar=true){
    const mpn=normalizarCodigo($('#mpn').value), gtin=String($('#gtin').value||'').replace(/\D/g,''); $('#gtin').value=gtin;
    const outros=AdminStore.produtos().filter(x=>Number(x.id)!==Number(id));
    const dupM=mpn&&outros.find(x=>normalizarCodigo(x.mpn)===mpn), dupG=gtin&&outros.find(x=>String(x.gtin||'').replace(/\D/g,'')===gtin);
    const msgs=[]; if(gtin&&!gtinValido(gtin))msgs.push('O GTIN/EAN não passou na validação do dígito verificador.'); if(dupM)msgs.push(`MPN já usado em “${dupM.nome}”.`); if(dupG)msgs.push(`GTIN/EAN já usado em “${dupG.nome}”.`);
    const st=$('#validacao-identificadores'); if(mostrar){st.hidden=!msgs.length; st.className=`admin-import-status ${msgs.length?'erro':'sucesso'}`; st.innerHTML=msgs.length?`<strong>Revise os identificadores.</strong><span>${AdminUI.esc(msgs.join(' '))}</span>`:'';} return !msgs.length;
  }
  function coletarTecnicos(){ const r={}; form.querySelectorAll('[name^="tecnico."]').forEach(el=>{ const k=el.name.slice(8), v=String(el.value||'').trim(); if(v!=='') r[k]=el.type==='number'?Number(v):v; }); return r; }
  function preencher(){
    if(!produto)return; $('#notebook-form-titulo').textContent='Editar notebook';
    Object.entries(produto).forEach(([k,v])=>{ if(k==='especificacoesTecnicas')return; const el=form.elements.namedItem(k); if(el&&v!==null&&v!==undefined)el.value=v; });
    Object.entries(produto.especificacoesTecnicas||{}).forEach(([k,v])=>{ const el=form.elements.namedItem(`tecnico.${k}`); if(el&&v!==null&&v!==undefined)el.value=v; });
  }
  function preview(){ $('#preview-imagem').src=$('#imagemUrl').value||'assets/placeholder-produto.svg'; $('#preview-nome').textContent=$('#nome').value||'Nome do notebook'; $('#preview-descricao').textContent=$('#descricao').value||'A descrição aparecerá aqui.'; const b=$('#preview-status'), st=$('#status').value; b.textContent=AdminUI.statusLabel(st); b.className=`admin-status ${AdminUI.statusClass(st)}`; const s=coletarTecnicos(); const resumo=[]; if(s.processadorResumo)resumo.push(s.processadorResumo); if(s.gpuResumo)resumo.push(s.gpuResumo); if(s.ramInstaladaGb)resumo.push(`${s.ramInstaladaGb} GB RAM`); if(s.telaPolegadas)resumo.push(`${s.telaPolegadas}\"${s.taxaHz?` · ${s.taxaHz} Hz`:''}`); $('#preview-especificacoes').textContent=resumo.join(' · ')||'Especificações principais aparecerão aqui.'; }
  function collect(forceDraft=false){ const fd=new FormData(form), item={}; for(const [k,v] of fd.entries()){if(k.startsWith('tecnico.'))continue; item[k]=v;} item.id=id||undefined; item.categoria='Notebook'; item.especificacoesTecnicas=coletarTecnicos(); item.consumoWatts=null; item.larguraMm=null; item.alturaMm=null; item.profundidadeMm=null; if(forceDraft)item.status='RASCUNHO'; return item; }
  function validarLink(el, obrig=false){const v=el.value.trim();if(!v&&!obrig)return '';try{return new URL(v).href}catch(_){AdminUI.toast(`Revise o endereço em “${el.labels?.[0]?.textContent||'link'}”.`,'erro');el.focus();return null;}}
  async function buscarDados(){ const url=validarLink($('#urlOriginalImportacao'),true); if(!url)return; const btn=$('#buscar-dados-produto'), st=$('#importacao-status'); btn.disabled=true;btn.textContent='Buscando...';st.hidden=false;st.className='admin-import-status';st.innerHTML='<strong>Consultando a página do notebook...</strong>'; try { dadosImportados=await AdminProdutoImportador.importar(url); const base=['nome','fabricante','modelo','mpn','gtin','descricao','imagemUrl']; let achados=0; base.forEach(k=>{if(dadosImportados[k]===null||dadosImportados[k]===undefined||dadosImportados[k]==='')return; const el=form.elements.namedItem(k); if(el&&!String(el.value||'').trim()){el.value=dadosImportados[k];el.closest('.admin-field')?.classList.add('foi-importado');achados++;}}); st.className='admin-import-status sucesso';st.innerHTML=`<strong>${achados} campo(s) preenchido(s).</strong><span>Use “Organizar com IA” para tentar estruturar os dados técnicos encontrados e revise tudo antes de salvar.</span>`; preview(); validarIds(); } catch(e){st.className='admin-import-status erro';st.innerHTML=`<strong>Não foi possível buscar automaticamente.</strong><span>${AdminUI.esc(e.message||'Preencha manualmente.')}</span>`;} finally {btn.disabled=false;btn.textContent='Buscar dados';} }
  function prepararOferta(salvo){ const original=validarLink($('#urlOriginalImportacao')), afiliado=validarLink($('#urlAfiliadoImportacao')); if(!$('#abrir-oferta-apos-salvar').checked||!original||afiliado===null)return false; sessionStorage.setItem(chaveOfertaImportada,JSON.stringify({produtoId:salvo.id,titulo:dadosImportados?.nome||salvo.nome,urlOriginal:original,urlAfiliado:afiliado||'',preco:dadosImportados?.preco??'',precoAnterior:dadosImportados?.precoAnterior??'',emEstoque:dadosImportados?.emEstoque,codigoExterno:dadosImportados?.codigoExterno||'',verificadoEm:new Date().toISOString().slice(0,16)})); setTimeout(()=>location.href=`oferta.html?produtoId=${salvo.id}&importacao=1`,350); return true; }
  function autoSalvar(){if(!alterado||salvando)return;localStorage.setItem(chaveRascunho,JSON.stringify({salvoEm:new Date().toISOString(),dados:collect(true)}));$('#status-rascunho-automatico').textContent=`Rascunho automático salvo às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;}
  async function restaurar(){if(produto)return;let x=null;try{x=JSON.parse(localStorage.getItem(chaveRascunho)||'null')}catch(_){}if(!x?.dados?.nome)return;if(!(await AdminUI.confirmAction('Restaurar rascunho automático?',`Há um rascunho salvo em ${AdminUI.date(x.salvoEm)}.`)))return;Object.entries(x.dados).forEach(([k,v])=>{if(k==='especificacoesTecnicas')return;const el=form.elements.namedItem(k);if(el&&v!==null&&v!==undefined)el.value=v;});Object.entries(x.dados.especificacoesTecnicas||{}).forEach(([k,v])=>{const el=form.elements.namedItem(`tecnico.${k}`);if(el&&v!==null&&v!==undefined)el.value=v;});preview();}
  function marcou(){alterado=true;clearTimeout(timer);timer=setTimeout(autoSalvar,800);}
  function salvar(draft){if(!draft&&!form.reportValidity())return;if(!$('#nome').value.trim()){AdminUI.toast('Informe o nome do notebook.','erro');return;}if(!validarIds()){AdminUI.toast('Corrija o MPN ou GTIN/EAN antes de salvar.','erro');return;}salvando=true;const salvo=AdminStore.salvarProduto(collect(draft));localStorage.removeItem(chaveRascunho);alterado=false;AdminUI.toast(draft?'Rascunho salvo.':'Notebook salvo com sucesso.');if(prepararOferta(salvo))return;setTimeout(()=>location.href=`notebook.html?id=${salvo.id}`,350);}

  preencher(); preview(); restaurar();
  form.addEventListener('input',()=>{preview();marcou();}); form.addEventListener('submit',e=>{e.preventDefault();salvar(false);});
  $('#salvar-rascunho').onclick=()=>salvar(true); $('#buscar-dados-produto').onclick=buscarDados; $('#limpar-importacao').onclick=()=>{$('#urlOriginalImportacao').value='';$('#urlAfiliadoImportacao').value='';$('#importacao-status').hidden=true;dadosImportados=null;};
  $('#mpn').addEventListener('blur',()=>validarIds()); $('#gtin').addEventListener('blur',()=>validarIds()); $('#preview-imagem').addEventListener('error',()=>{$('#preview-imagem').src='assets/placeholder-produto.svg';});
  window.addEventListener('beforeunload',e=>{if(!alterado||salvando)return;e.preventDefault();e.returnValue='';});
})();
