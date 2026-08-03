const basePath = new URL("../", document.currentScript.src).href;
const CHAVE_SESSAO_CONTA = "pcBuilderSessao";
const CHAVE_TEMA = "pcBuilderTema";

function obterSessaoConta() {
    try {
        const sessao = JSON.parse(
            sessionStorage.getItem(CHAVE_SESSAO_CONTA) || "null",
        );
        const expiracao = Date.parse(sessao?.expiraEm || "");
        const sessaoValida =
            Boolean(sessao?.id && sessao?.email) &&
            Number.isFinite(expiracao) &&
            expiracao > Date.now();

        if (!sessaoValida) {
            sessionStorage.removeItem(CHAVE_SESSAO_CONTA);
            localStorage.removeItem(CHAVE_SESSAO_CONTA);
            return null;
        }

        return sessao;
    } catch {
        sessionStorage.removeItem(CHAVE_SESSAO_CONTA);
        localStorage.removeItem(CHAVE_SESSAO_CONTA);
        return null;
    }
}

function escaparHtmlCabecalho(valor = "") {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function obterIniciaisConta(nome = "") {
    const partes = String(nome).trim().split(/\s+/).filter(Boolean);
    return (partes.length > 1 ? `${partes[0][0]}${partes.at(-1)[0]}` : partes[0]?.slice(0, 2) || "PB")
        .toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
    const ehSubPasta = window.location.pathname.includes('/paginas/');
    const basePath = ehSubPasta ? '../' : './';
    const sessaoConta = obterSessaoConta();
    const nomeConta = sessaoConta?.nome || sessaoConta?.email?.split("@")[0] || "Usuário";
    const primeiroNome = nomeConta.split(/\s+/)[0];
    const iniciaisConta = obterIniciaisConta(nomeConta);
    const papelConta = String(sessaoConta?.papel || "USUARIO").toUpperCase();
    const podeAcessarAdmin = ["ADMIN", "EDITOR", "REVISOR"].includes(papelConta);
    const linkPainelAdmin = podeAcessarAdmin
        ? `<a href="${basePath}admin/index.html" role="menuitem">⚙ Painel administrativo</a>`
        : "";

    const htmlContaDesktop = sessaoConta
        ? `
            <div class="menu-item-dropdown conta-logada-dropdown">
                <a
                    href="${basePath}paginas/builds-salvas.html"
                    class="btn-cabecalho-perfil"
                    aria-haspopup="true"
                    aria-expanded="false"
                >
                    <span class="avatar-cabecalho" aria-hidden="true">${escaparHtmlCabecalho(iniciaisConta)}</span>
                    <span class="nome-conta-cabecalho">${escaparHtmlCabecalho(primeiroNome)}</span>
                    <span aria-hidden="true">▾</span>
                </a>

                <div class="dropdown-conteudo dropdown-conta" role="menu" aria-label="Menu da conta">
                    ${linkPainelAdmin}
                    <a href="${basePath}paginas/builds-salvas.html" role="menuitem">💾 Builds Salvas</a>
                    <button type="button" data-acao-sair-conta role="menuitem">↪ Sair</button>
                </div>
            </div>
        `
        : `
            <a href="${basePath}paginas/login.html" class="btn-cabecalho-entrar">Entrar</a>
            <a href="${basePath}paginas/cadastro.html" class="btn-cabecalho-cadastrar">Cadastre-se</a>
        `;

    const htmlContaCompacta = sessaoConta
        ? `
            <div class="conta-mobile-dropdown">
                <button
                    type="button"
                    class="btn-cabecalho-usuario-mobile"
                    aria-label="Abrir menu da conta"
                    aria-haspopup="true"
                    aria-expanded="false"
                    aria-controls="dropdown-conta-mobile"
                    title="Menu da conta"
                >
                    <span class="avatar-cabecalho avatar-cabecalho-mobile" aria-hidden="true">${escaparHtmlCabecalho(iniciaisConta)}</span>
                </button>

                <div
                    class="dropdown-conta-mobile"
                    id="dropdown-conta-mobile"
                    role="menu"
                    aria-label="Menu da conta"
                >
                    <span class="dropdown-conta-mobile-titulo">${escaparHtmlCabecalho(primeiroNome)}</span>
                    ${linkPainelAdmin}
                    <a href="${basePath}paginas/builds-salvas.html" role="menuitem">💾 Builds Salvas</a>
                    <button type="button" data-acao-sair-conta role="menuitem">↪ Sair</button>
                </div>
            </div>
        `
        : `
            <div class="conta-mobile-dropdown">
                <button
                    type="button"
                    class="btn-cabecalho-usuario-mobile"
                    aria-label="Abrir opções de entrada e cadastro"
                    aria-haspopup="true"
                    aria-expanded="false"
                    aria-controls="dropdown-conta-mobile"
                    title="Conta"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                </button>

                <div
                    class="dropdown-conta-mobile"
                    id="dropdown-conta-mobile"
                    role="menu"
                    aria-label="Entrar ou cadastrar"
                >
                    <a href="${basePath}paginas/login.html" role="menuitem">Entrar</a>
                    <a
                        href="${basePath}paginas/cadastro.html"
                        class="dropdown-conta-mobile-cadastrar"
                        role="menuitem"
                    >
                        Cadastre-se
                    </a>
                </div>
            </div>
        `;

    const htmlDoCabecalho = `
        <div class="logo">
            <a href="${basePath}index.html" style="text-decoration: none; color: inherit;">PC Builder</a>
        </div>
        
        <!-- Botão Hambúrguer para Mobile -->
        <button class="menu-hamburguer" id="btn-hamburguer" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-principal">☰</button>
        
        <nav class="menu" id="menu-principal" aria-label="Menu principal">
            <ul role="menubar">
                <li role="none">
                    <a href="${basePath}pcbuild.html" role="menuitem">Monte seu PC</a>
                </li>

                <li role="none"><a href="${basePath}index.html" role="menuitem">Início</a></li>

                <li class="menu-item-dropdown" role="none">
                    <a href="${basePath}montados.html" role="menuitem"
                       aria-haspopup="true" aria-expanded="false">Montados ▾</a>

                    <div class="dropdown-conteudo" id="dropdown-pcs-prontos"
                         role="menu" aria-label="Submenu Montados"
                         style="width: 380px; max-height: 450px; overflow-y: auto;"></div>
                </li>

                <li class="menu-item-dropdown" role="none">
                    <a href="${basePath}pecas.html" role="menuitem"
                       aria-haspopup="true" aria-expanded="false">Peças ▾</a>

                    <div class="dropdown-conteudo dropdown-pecas" role="menu" aria-label="Submenu Peças">
                        <a href="${basePath}pecas.html?categoria=processador" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/cpu.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Processadores</span></a>
                        <a href="${basePath}pecas.html?categoria=cooler" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/cooler.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Coolers de processador</span></a>
                        <a href="${basePath}pecas.html?categoria=placa-video" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/placavideo.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Placas de vídeo</span></a>
                        <a href="${basePath}pecas.html?categoria=placa-mae" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/placamae.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Placas-mãe</span></a>
                        <a href="${basePath}pecas.html?categoria=memoria" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/ram.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Memórias</span></a>
                        <a href="${basePath}pecas.html?categoria=armazenamento" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/ssd.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Armazenamentos</span></a>
                        <a href="${basePath}pecas.html?categoria=gabinete" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/gabinete.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Gabinetes</span></a>
                        <a href="${basePath}pecas.html?categoria=fonte" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/fonte.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Fontes</span></a>

                        <div class="divisor-dropdown" role="separator"></div>

                        <a href="${basePath}pecas.html?categoria=monitor" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/monitor.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Monitores</span></a>
                        <a href="${basePath}pecas.html?categoria=mouse" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/mouse.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Mouses</span></a>
                        <a href="${basePath}pecas.html?categoria=teclado" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/teclado.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Teclados</span></a>
                        <a href="${basePath}pecas.html?categoria=fone" role="menuitem"><img class="icone-dropdown-peca" src="${basePath}imagens/pecas/fone.svg" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async"><span>Fones de ouvido</span></a>
                    </div>
                </li>

                <li role="none"><a href="${basePath}notebook.html" role="menuitem">Notebook</a></li>
                <li role="none"><a href="${basePath}ofertas.html" role="menuitem">Ofertas</a></li>

                <li class="menu-conta-mobile menu-tema-mobile" role="none">
                    <button type="button" data-alternar-tema role="menuitem">◐ Alternar tema</button>
                </li>
            </ul>
        </nav>

        <!-- Ações de conta -->
        <div class="cabecalho-conta" aria-label="Conta do usuário">
            <button type="button" class="btn-cabecalho-tema" data-alternar-tema aria-label="Alternar tema" title="Alternar tema">◐</button>
            ${htmlContaDesktop}
            ${htmlContaCompacta}
        </div>
    `;

    const container = document.getElementById("cabecalho-dinamico");

    if (container) {
        container.innerHTML = htmlDoCabecalho;
        marcarPaginaAtiva();
        carregarScriptVitrine();

        const btnHamburguer = document.getElementById('btn-hamburguer');
        const menuPrincipal = document.getElementById('menu-principal');

        if (btnHamburguer && menuPrincipal) {
            btnHamburguer.addEventListener('click', () => {
                const aberto = menuPrincipal.classList.toggle('ativo');
                btnHamburguer.setAttribute('aria-expanded', String(aberto));
                btnHamburguer.textContent = aberto ? '✕' : '☰';
            });
        }

        // Acessibilidade: teclado nos dropdowns
        configurarDropdownsTeclado();
        configurarContaCabecalho();
        configurarDropdownContaMobile();
        configurarTemaCabecalho();

        document.dispatchEvent(new CustomEvent("cabecalhoInjetado"));
    }
});

function abrirDropdown(item) {
    const link = item.querySelector(':scope > a');
    const menu = item.querySelector(':scope > .dropdown-conteudo');
    if (!link || !menu) return;
    item.classList.add('aberto');
    link.setAttribute('aria-expanded', 'true');
}

function fecharDropdown(item) {
    const link = item.querySelector(':scope > a');
    const menu = item.querySelector(':scope > .dropdown-conteudo');
    if (!link || !menu) return;
    item.classList.remove('aberto');
    link.setAttribute('aria-expanded', 'false');
}

function fecharTodosDropdowns() {
    document.querySelectorAll('.menu-item-dropdown').forEach(fecharDropdown);
}

function configurarDropdownsTeclado() {
    const dropdowns = document.querySelectorAll('.menu-item-dropdown');

    dropdowns.forEach((item) => {
        const gatilho = item.querySelector(':scope > a');
        const menu    = item.querySelector(':scope > .dropdown-conteudo');
        if (!gatilho || !menu) return;

        // Enter ou Space abre o dropdown no desktop e navega no mobile.
        gatilho.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    window.location.href = gatilho.href;
                    return;
                }

                e.preventDefault();
                const estaAberto = item.classList.contains('aberto');
                fecharTodosDropdowns();
                if (!estaAberto) abrirDropdown(item);
            }

            if (e.key === 'Escape') {
                fecharDropdown(item);
                gatilho.focus();
            }

            // Seta para baixo move foco para o primeiro item do menu
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                abrirDropdown(item);
                const primeiro = menu.querySelector('[role="menuitem"]');
                primeiro?.focus();
            }
        });

        // Setas cima/baixo navegam entre itens do dropdown
        menu.addEventListener('keydown', (e) => {
            const itens = Array.from(menu.querySelectorAll('[role="menuitem"]'));
            const atual = document.activeElement;
            const idx   = itens.indexOf(atual);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                itens[(idx + 1) % itens.length]?.focus();
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                itens[(idx - 1 + itens.length) % itens.length]?.focus();
            }

            if (e.key === 'Escape') {
                fecharDropdown(item);
                gatilho.focus();
            }

            // Tab fora do dropdown fecha ele
            if (e.key === 'Tab' && idx === itens.length - 1) {
                fecharDropdown(item);
            }
        });

        // Fecha ao clicar fora
        document.addEventListener('click', (e) => {
            if (!item.contains(e.target)) fecharDropdown(item);
        });

        /*
         * Mobile: Montados e Peças são links diretos.
         * O dropdown continua disponível apenas no desktop.
         */
        gatilho.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                fecharTodosDropdowns();
            }
        });
    });
}


function configurarDropdownContaMobile() {
    const container = document.querySelector(".conta-mobile-dropdown");
    const botao = container?.querySelector(".btn-cabecalho-usuario-mobile");
    const dropdown = container?.querySelector(".dropdown-conta-mobile");

    if (!container || !botao || !dropdown) return;

    const abrir = () => {
        container.classList.add("aberto");
        botao.setAttribute("aria-expanded", "true");
    };

    const fechar = () => {
        container.classList.remove("aberto");
        botao.setAttribute("aria-expanded", "false");
    };

    botao.addEventListener("click", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();

        if (container.classList.contains("aberto")) {
            fechar();
        } else {
            abrir();
        }
    });

    container.addEventListener("mouseenter", abrir);

    container.addEventListener("mouseleave", () => {
        if (!container.matches(":focus-within")) {
            fechar();
        }
    });

    container.addEventListener("focusin", abrir);

    container.addEventListener("focusout", (evento) => {
        if (!container.contains(evento.relatedTarget)) {
            fechar();
        }
    });

    document.addEventListener("click", (evento) => {
        if (!container.contains(evento.target)) {
            fechar();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && container.classList.contains("aberto")) {
            fechar();
            botao.focus();
        }
    });
}

function configurarContaCabecalho() {
    const botoesSair = document.querySelectorAll("[data-acao-sair-conta]");
    if (!botoesSair.length) return;

    botoesSair.forEach((botaoSair) => {
        botaoSair.addEventListener("click", () => {
            sessionStorage.removeItem(CHAVE_SESSAO_CONTA);
            localStorage.removeItem(CHAVE_SESSAO_CONTA);
            window.dispatchEvent(new CustomEvent("pcBuilderSessaoAlterada"));
            window.location.href = new URL("index.html", basePath).href;
        });
    });
}

function configurarTemaCabecalho() {
    const temaSistemaEscuro = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const salvo = localStorage.getItem(CHAVE_TEMA);
    const temaInicial = salvo || (temaSistemaEscuro ? "escuro" : "claro");

    const aplicar = (tema) => {
        const normalizado = tema === "escuro" ? "escuro" : "claro";
        document.documentElement.dataset.tema = normalizado;
        document.querySelectorAll("[data-alternar-tema]").forEach((botao) => {
            botao.setAttribute("aria-pressed", String(normalizado === "escuro"));
            botao.title = normalizado === "escuro" ? "Usar tema claro" : "Usar tema escuro";
        });
    };

    aplicar(temaInicial);

    document.querySelectorAll("[data-alternar-tema]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const novoTema = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
            localStorage.setItem(CHAVE_TEMA, novoTema);
            aplicar(novoTema);
        });
    });
}

function carregarScriptVitrine() {
    if (document.querySelector("script[data-vitrine-loader]")) return;

    const script = document.createElement("script");
    script.type = "module";
    
    // Ajusta o caminho do script de vitrine também!
    const ehSubPasta = window.location.pathname.includes('/paginas/');
    const basePath = ehSubPasta ? '../' : './';
    
    script.src = `${basePath}js/vitrine.js?v=3`;
    script.dataset.vitrineLoader = "true";

    document.body.appendChild(script);
}

function normalizarCaminho(url) {
    const caminho = new URL(url, window.location.href)
        .pathname
        .replace(/\/+$/, "");

    if (caminho.endsWith("/index.html")) {
        return caminho.slice(0, -"/index.html".length) || "/";
    }

    return caminho || "/";
}

function marcarPaginaAtiva() {
    const paginaAtual = normalizarCaminho(window.location.href);
    const hashAtual = window.location.hash;

    const links = document.querySelectorAll(
        ".menu > ul > li > a, .cabecalho-conta a"
    );

    links.forEach((link) => {
        link.classList.remove("ativo");
        link.removeAttribute("aria-current");

        const href = link.getAttribute("href");

        if (!href || href === "#") return;

        const urlDoLink = new URL(link.href, window.location.href);
        const paginaDoLink = normalizarCaminho(urlDoLink.href);
        const possuiHash = Boolean(urlDoLink.hash);

        const corresponde = possuiHash
            ? paginaDoLink === paginaAtual && urlDoLink.hash === hashAtual
            : paginaDoLink === paginaAtual && !hashAtual;

        if (corresponde) {
            link.classList.add("ativo");
            link.setAttribute("aria-current", "page");
        }
    });

    const iconeContaMobile = document.querySelector(
        ".btn-cabecalho-usuario-mobile",
    );
    const paginaDeConta = /\/paginas\/(login|cadastro|builds-salvas)\.html$/i.test(
        paginaAtual,
    );

    if (iconeContaMobile && paginaDeConta) {
        iconeContaMobile.classList.add("ativo");
        iconeContaMobile.setAttribute("aria-current", "page");
    }
}
