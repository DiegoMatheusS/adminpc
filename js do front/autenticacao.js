const SELETOR_CAMPO = ".campo-auth";
const CHAVE_EMAIL_LEMBRADO = "pcBuilderEmailLembrado";
const CHAVE_SESSAO_CONTA = "pcBuilderSessao";
const CHAVE_PERFIS_CONTA = "pcBuilderPerfisLocais";
const PREFIXO_TENTATIVAS_LOGIN = "pcBuilderTentativasLogin:";

const CONFIGURACAO_SENHA = Object.freeze({
    algoritmo: "PBKDF2",
    hash: "SHA-256",
    iteracoes: 210000,
    bytes: 32,
});

const LIMITE_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 30_000;
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

function normalizarEmailConta(email = "") {
    return String(email).trim().toLowerCase();
}

function webCryptoDisponivel() {
    return Boolean(window.crypto?.subtle && window.TextEncoder);
}

function obterPerfisLocais() {
    try {
        const perfis = JSON.parse(localStorage.getItem(CHAVE_PERFIS_CONTA) || "{}");
        return perfis && typeof perfis === "object" && !Array.isArray(perfis)
            ? perfis
            : {};
    } catch {
        return {};
    }
}

function salvarPerfisLocais(perfis) {
    localStorage.setItem(CHAVE_PERFIS_CONTA, JSON.stringify(perfis));
}

function bytesParaBase64Url(bytes) {
    let binario = "";
    bytes.forEach((byte) => {
        binario += String.fromCharCode(byte);
    });

    return btoa(binario)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64UrlParaBytes(valor = "") {
    const base64 = String(valor)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
    const binario = atob(base64 + preenchimento);

    return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}

async function derivarHashSenha(senha, salt, iteracoes = CONFIGURACAO_SENHA.iteracoes) {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(String(senha)),
        { name: CONFIGURACAO_SENHA.algoritmo },
        false,
        ["deriveBits"],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: CONFIGURACAO_SENHA.algoritmo,
            hash: CONFIGURACAO_SENHA.hash,
            salt,
            iterations: iteracoes,
        },
        material,
        CONFIGURACAO_SENHA.bytes * 8,
    );

    return new Uint8Array(bits);
}

async function criarCredencialSenha(senha) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivarHashSenha(senha, salt);

    return {
        algoritmo: CONFIGURACAO_SENHA.algoritmo,
        hashAlgoritmo: CONFIGURACAO_SENHA.hash,
        iteracoes: CONFIGURACAO_SENHA.iteracoes,
        salt: bytesParaBase64Url(salt),
        hash: bytesParaBase64Url(hash),
        criadoEm: new Date().toISOString(),
    };
}

function compararBytesTempoConstante(a, b) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;

    let diferenca = a.length ^ b.length;
    const tamanho = Math.max(a.length, b.length);

    for (let indice = 0; indice < tamanho; indice += 1) {
        diferenca |= (a[indice] ?? 0) ^ (b[indice] ?? 0);
    }

    return diferenca === 0;
}

async function validarCredencialSenha(senha, credencial) {
    if (
        !credencial ||
        credencial.algoritmo !== CONFIGURACAO_SENHA.algoritmo ||
        !credencial.salt ||
        !credencial.hash
    ) {
        return false;
    }

    const salt = base64UrlParaBytes(credencial.salt);
    const hashEsperado = base64UrlParaBytes(credencial.hash);
    const iteracoes = Number(credencial.iteracoes) || CONFIGURACAO_SENHA.iteracoes;
    const hashRecebido = await derivarHashSenha(senha, salt, iteracoes);

    return compararBytesTempoConstante(hashRecebido, hashEsperado);
}

function salvarPerfilLocal(perfil, credencial) {
    const perfis = obterPerfisLocais();
    const emailNormalizado = normalizarEmailConta(perfil.email);
    const perfilAnterior = perfis[emailNormalizado] || {};

    perfis[emailNormalizado] = {
        ...perfilAnterior,
        nome: String(
            perfil.nome ||
            perfilAnterior.nome ||
            emailNormalizado.split("@")[0] ||
            "Usuário",
        ).trim(),
        email: emailNormalizado,
        papel:
            perfil.papel ||
            perfilAnterior.papel ||
            (emailNormalizado === "admin@pcbuilder.local" ? "ADMIN" : "USUARIO"),
        credencial,
        atualizadoEm: new Date().toISOString(),
    };

    salvarPerfisLocais(perfis);
    return perfis[emailNormalizado];
}

function gerarIdSessao() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return bytesParaBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}

function iniciarSessaoLocal(perfil) {
    const agora = Date.now();
    const sessao = {
        id: gerarIdSessao(),
        nome: String(perfil.nome || "Usuário").trim(),
        email: normalizarEmailConta(perfil.email),
        papel:
            perfil.papel ||
            (normalizarEmailConta(perfil.email) === "admin@pcbuilder.local"
                ? "ADMIN"
                : "USUARIO"),
        inicioEm: new Date(agora).toISOString(),
        expiraEm: new Date(agora + DURACAO_SESSAO_MS).toISOString(),
        modo: "frontend-local-prototipo",
    };

    localStorage.removeItem(CHAVE_SESSAO_CONTA);
    sessionStorage.setItem(CHAVE_SESSAO_CONTA, JSON.stringify(sessao));
    window.dispatchEvent(new CustomEvent("pcBuilderSessaoAlterada", { detail: sessao }));
    return sessao;
}

function obterDestinoAposAutenticacao() {
    const parametros = new URLSearchParams(window.location.search);
    const retorno = parametros.get("retorno");

    if (retorno) {
        try {
            const destino = new URL(retorno, window.location.href);
            const mesmaOrigem = destino.origin === window.location.origin;
            const protocoloPermitido = ["http:", "https:", "file:"].includes(destino.protocol);

            if (mesmaOrigem && protocoloPermitido) return destino.href;
        } catch {
            // Usa o destino padrão abaixo.
        }
    }

    return new URL("./builds-salvas.html", window.location.href).href;
}

function redirecionarAposAutenticacao() {
    window.setTimeout(() => {
        window.location.assign(obterDestinoAposAutenticacao());
    }, 700);
}

function obterCampo(input) {
    return input?.closest(SELETOR_CAMPO) ?? null;
}

function definirErro(input, mensagem = "") {
    const campo = obterCampo(input);
    const mensagemElemento = campo?.querySelector(".mensagem-campo");

    if (!campo || !mensagemElemento) return;

    const possuiErro = Boolean(mensagem);
    campo.classList.toggle("tem-erro", possuiErro);
    input.setAttribute("aria-invalid", String(possuiErro));
    mensagemElemento.textContent = mensagem;
}

function limparErroAoDigitar(input) {
    input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") {
            definirErro(input, "");
        }
    });
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email).trim());
}

function validarNome(input) {
    const valor = input.value.trim();

    if (!valor) {
        definirErro(input, "Informe seu nome.");
        return false;
    }

    if (valor.length < 2 || valor.length > 80) {
        definirErro(input, "Use entre 2 e 80 caracteres.");
        return false;
    }

    definirErro(input, "");
    return true;
}

function validarEmail(input) {
    const valor = input.value.trim();

    if (!valor) {
        definirErro(input, "Informe seu e-mail.");
        return false;
    }

    if (valor.length > 254 || !emailValido(valor)) {
        definirErro(input, "Digite um e-mail válido.");
        return false;
    }

    definirErro(input, "");
    return true;
}

function analisarSenha(senha) {
    const valor = String(senha);
    const requisitos = {
        tamanho: valor.length >= 8,
        maiuscula: /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(valor),
        minuscula: /[a-záàâãéêíóôõúç]/.test(valor),
        numero: /\d/.test(valor),
        simbolo: /[^\p{L}\p{N}\s]/u.test(valor),
    };

    const total = Object.values(requisitos).filter(Boolean).length;
    let nivel = 0;

    if (valor) {
        nivel = total <= 2 ? 1 : total === 3 ? 2 : total === 4 ? 3 : 4;
    }

    return { requisitos, nivel };
}

function validarSenha(input, exigirForca = false) {
    const valor = input.value;

    if (!valor) {
        definirErro(input, "Informe sua senha.");
        return false;
    }

    if (valor.length > 128) {
        definirErro(input, "A senha deve ter no máximo 128 caracteres.");
        return false;
    }

    const { requisitos } = analisarSenha(valor);

    if (!requisitos.tamanho) {
        definirErro(input, "A senha precisa ter pelo menos 8 caracteres.");
        return false;
    }

    if (
        exigirForca &&
        !(requisitos.maiuscula && requisitos.minuscula && requisitos.numero)
    ) {
        definirErro(input, "Inclua maiúscula, minúscula e número.");
        return false;
    }

    definirErro(input, "");
    return true;
}

function validarConfirmacao(input, senhaInput) {
    if (!input.value) {
        definirErro(input, "Confirme sua senha.");
        return false;
    }

    if (input.value !== senhaInput.value) {
        definirErro(input, "As senhas não são iguais.");
        return false;
    }

    definirErro(input, "");
    return true;
}

function exibirStatus(formulario, mensagem, tipo = "info") {
    const status = formulario.querySelector(".auth-status");
    if (!status) return;

    status.className = `auth-status ${tipo}`;
    status.textContent = mensagem;
    status.hidden = false;
    status.focus?.({ preventScroll: true });
}

function ocultarStatus(formulario) {
    const status = formulario.querySelector(".auth-status");
    if (!status) return;

    status.hidden = true;
    status.textContent = "";
    status.className = "auth-status";
}

function definirFormularioOcupado(formulario, ocupado, texto = "Processando...") {
    formulario.setAttribute("aria-busy", String(ocupado));
    const botao = formulario.querySelector('button[type="submit"]');
    if (!botao) return;

    if (!botao.dataset.textoOriginal) {
        botao.dataset.textoOriginal = botao.textContent.trim();
    }

    botao.disabled = ocupado;
    botao.textContent = ocupado ? texto : botao.dataset.textoOriginal;
}

function configurarBotoesSenha() {
    document.querySelectorAll("[data-alternar-senha]").forEach((botao) => {
        const idAlvo = botao.dataset.alternarSenha;
        const input = document.getElementById(idAlvo);

        if (!input) return;

        botao.addEventListener("click", () => {
            const exibindo = input.type === "text";
            input.type = exibindo ? "password" : "text";
            botao.textContent = exibindo ? "Mostrar" : "Ocultar";
            botao.setAttribute("aria-pressed", String(!exibindo));
            input.focus();
        });
    });
}

function configurarMedidorSenha() {
    const input = document.getElementById("senha-cadastro");
    const medidor = document.getElementById("medidor-senha");

    if (!input || !medidor) return;

    const texto = medidor.querySelector(".medidor-senha-texto");
    const requisitosElementos = medidor.querySelectorAll("[data-requisito]");
    const rotulos = [
        "Digite uma senha segura.",
        "Senha fraca.",
        "Senha razoável.",
        "Senha boa.",
        "Senha forte.",
    ];

    const atualizar = () => {
        const analise = analisarSenha(input.value);
        medidor.dataset.nivel = String(analise.nivel);

        if (texto) {
            texto.textContent = rotulos[analise.nivel];
        }

        requisitosElementos.forEach((elemento) => {
            const requisito = elemento.dataset.requisito;
            const atendido = Boolean(analise.requisitos[requisito]);

            elemento.classList.toggle("atendido", atendido);
            elemento.classList.toggle("pendente", !atendido);
            elemento.setAttribute(
                "aria-label",
                `${elemento.textContent.trim()}: ${atendido ? "atendido" : "pendente"}`,
            );
        });
    };

    input.addEventListener("input", atualizar);
    input.addEventListener("change", atualizar);
    atualizar();
}

function obterChaveTentativas(email) {
    return `${PREFIXO_TENTATIVAS_LOGIN}${encodeURIComponent(normalizarEmailConta(email))}`;
}

function obterEstadoTentativas(email) {
    try {
        const estado = JSON.parse(localStorage.getItem(obterChaveTentativas(email)) || "null");
        return estado && typeof estado === "object"
            ? estado
            : { falhas: 0, bloqueadoAte: 0 };
    } catch {
        return { falhas: 0, bloqueadoAte: 0 };
    }
}

function tempoRestanteBloqueio(email) {
    const estado = obterEstadoTentativas(email);
    return Math.max(0, Number(estado.bloqueadoAte || 0) - Date.now());
}

function registrarFalhaLogin(email) {
    const chave = obterChaveTentativas(email);
    const estado = obterEstadoTentativas(email);
    const falhas = Number(estado.falhas || 0) + 1;

    if (falhas >= LIMITE_TENTATIVAS) {
        localStorage.setItem(
            chave,
            JSON.stringify({ falhas: 0, bloqueadoAte: Date.now() + TEMPO_BLOQUEIO_MS }),
        );
        return;
    }

    localStorage.setItem(chave, JSON.stringify({ falhas, bloqueadoAte: 0 }));
}

function limparTentativasLogin(email) {
    localStorage.removeItem(obterChaveTentativas(email));
}

function mensagemContaAntiga(perfil) {
    return perfil && !perfil.credencial
        ? "Esta conta foi criada na versão anterior, que não guardava credencial. Abra Cadastre-se novamente com o mesmo e-mail para definir uma senha."
        : "E-mail ou senha incorretos.";
}

function configurarLogin(formulario) {
    const emailInput = formulario.elements.email;
    const senhaInput = formulario.elements.senha;
    const lembrarInput = formulario.elements.lembrar;

    const emailLembrado = localStorage.getItem(CHAVE_EMAIL_LEMBRADO);
    if (emailLembrado && emailInput) {
        emailInput.value = emailLembrado;
        lembrarInput.checked = true;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        ocultarStatus(formulario);

        const valido = [
            validarEmail(emailInput),
            validarSenha(senhaInput),
        ].every(Boolean);

        if (!valido) {
            formulario.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        if (!webCryptoDisponivel()) {
            exibirStatus(
                formulario,
                "A autenticação segura exige HTTPS ou Live Server em um navegador moderno.",
                "erro",
            );
            return;
        }

        const email = normalizarEmailConta(emailInput.value);
        const bloqueioRestante = tempoRestanteBloqueio(email);

        if (bloqueioRestante > 0) {
            const segundos = Math.ceil(bloqueioRestante / 1000);
            exibirStatus(
                formulario,
                `Muitas tentativas. Aguarde ${segundos} segundo${segundos === 1 ? "" : "s"} e tente novamente.`,
                "aviso",
            );
            return;
        }

        definirFormularioOcupado(formulario, true, "Verificando...");

        try {
            const perfis = obterPerfisLocais();
            const perfil = perfis[email];
            const credencialValida = perfil?.credencial
                ? await validarCredencialSenha(senhaInput.value, perfil.credencial)
                : false;

            if (!perfil || !credencialValida) {
                registrarFalhaLogin(email);
                exibirStatus(formulario, mensagemContaAntiga(perfil), "erro");
                senhaInput.select();
                return;
            }

            limparTentativasLogin(email);

            if (lembrarInput.checked) {
                localStorage.setItem(CHAVE_EMAIL_LEMBRADO, email);
            } else {
                localStorage.removeItem(CHAVE_EMAIL_LEMBRADO);
            }

            iniciarSessaoLocal(perfil);
            senhaInput.value = "";

            exibirStatus(
                formulario,
                "Login concluído. Abrindo suas Builds Salvas...",
                "sucesso",
            );

            redirecionarAposAutenticacao();
        } catch (erro) {
            console.error("Falha ao autenticar a conta local.", erro);
            exibirStatus(
                formulario,
                "Não foi possível validar a conta neste navegador.",
                "erro",
            );
        } finally {
            definirFormularioOcupado(formulario, false);
        }
    });
}

function configurarCadastro(formulario) {
    const nomeInput = formulario.elements.nome;
    const emailInput = formulario.elements.email;
    const senhaInput = formulario.elements.senha;
    const confirmacaoInput = formulario.elements.confirmacao;
    const termosInput = formulario.elements.termos;
    const grupoTermos = termosInput.closest(".grupo-termos");
    const mensagemTermos = grupoTermos?.querySelector(".mensagem-campo");

    senhaInput.addEventListener("input", () => {
        if (confirmacaoInput.value) {
            validarConfirmacao(confirmacaoInput, senhaInput);
        }
    });

    confirmacaoInput.addEventListener("input", () => {
        if (confirmacaoInput.value) {
            validarConfirmacao(confirmacaoInput, senhaInput);
        }
    });

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        ocultarStatus(formulario);

        const validacoes = [
            validarNome(nomeInput),
            validarEmail(emailInput),
            validarSenha(senhaInput, true),
            validarConfirmacao(confirmacaoInput, senhaInput),
        ];

        const termosValidos = termosInput.checked;
        grupoTermos?.classList.toggle("tem-erro", !termosValidos);
        termosInput.setAttribute("aria-invalid", String(!termosValidos));
        if (mensagemTermos) {
            mensagemTermos.textContent = termosValidos
                ? ""
                : "Aceite os Termos de uso e a Política de privacidade.";
        }

        if (![...validacoes, termosValidos].every(Boolean)) {
            formulario.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        if (!webCryptoDisponivel()) {
            exibirStatus(
                formulario,
                "A criação segura da conta exige HTTPS ou Live Server em um navegador moderno.",
                "erro",
            );
            return;
        }

        const email = normalizarEmailConta(emailInput.value);
        const perfis = obterPerfisLocais();
        const perfilExistente = perfis[email];

        if (perfilExistente?.credencial) {
            definirErro(emailInput, "Este e-mail já está cadastrado.");
            exibirStatus(
                formulario,
                "Já existe uma conta com esse e-mail. Use a página Entrar.",
                "aviso",
            );
            emailInput.focus();
            return;
        }

        definirFormularioOcupado(formulario, true, "Protegendo senha...");

        try {
            const credencial = await criarCredencialSenha(senhaInput.value);
            const perfil = salvarPerfilLocal(
                {
                    nome: nomeInput.value.trim(),
                    email,
                },
                credencial,
            );

            iniciarSessaoLocal(perfil);
            senhaInput.value = "";
            confirmacaoInput.value = "";

            exibirStatus(
                formulario,
                perfilExistente
                    ? "Conta antiga atualizada com senha. Abrindo suas Builds Salvas..."
                    : "Conta criada neste navegador. Abrindo suas Builds Salvas...",
                "sucesso",
            );

            redirecionarAposAutenticacao();
        } catch (erro) {
            console.error("Falha ao criar a credencial local.", erro);
            exibirStatus(
                formulario,
                "Não foi possível proteger a senha neste navegador.",
                "erro",
            );
        } finally {
            definirFormularioOcupado(formulario, false);
        }
    });

    termosInput.addEventListener("change", () => {
        if (!termosInput.checked) return;

        grupoTermos?.classList.remove("tem-erro");
        termosInput.setAttribute("aria-invalid", "false");
        if (mensagemTermos) mensagemTermos.textContent = "";
    });
}

function iniciarAutenticacao() {
    configurarBotoesSenha();
    configurarMedidorSenha();

    document.querySelectorAll(".campo-auth input").forEach(limparErroAoDigitar);

    const formulario = document.querySelector("[data-form-auth]");
    if (!formulario) return;

    if (formulario.dataset.formAuth === "login") {
        configurarLogin(formulario);
    }

    if (formulario.dataset.formAuth === "cadastro") {
        configurarCadastro(formulario);
    }
}

document.addEventListener("DOMContentLoaded", iniciarAutenticacao, { once: true });
