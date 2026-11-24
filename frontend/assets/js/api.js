/* AgendaPro Saúde — camada única de acesso ao servidor (seção 5.1): sessão, login, clínica e equipe.
   Toda chamada passa por chamar(), que lê o endereço da API em config.js e manda o token da sessão.
   Rotas e formatos: backend/docs/especificacao-api.md. Ajustes do front: backend/docs/ajustes-front.md. */
(function () {
  "use strict";

  const D = window.DADOS;
  const CHAVE_SESSAO = "agendapro.sessao";
  const PAPEIS = { dono: "Responsável pela clínica", recepcao: "Recepção", medico: "Médico", paciente: "Paciente" };

  const so = (t) => String(t || "").replace(/\D/g, "");

  /* ─── Acesso à API: toda chamada ao servidor passa por chamar() (seção 5.1) ───
     O endereço vem de config.js (window.AGENDAPRO_CONFIG). Envia e recebe JSON, manda o token da sessão em
     Authorization: Bearer, desiste depois do tempo limite e transforma a resposta de erro da API
     ({ "mensagem": "..." }) num ErroApi com o código HTTP e a mensagem pronta para a tela. */
  const CONFIG = window.AGENDAPRO_CONFIG || { API_URL: "http://localhost:5080", TEMPO_LIMITE_MS: 8000 };
  const SEM_SERVIDOR = "Não foi possível falar com o servidor";

  class ErroApi extends Error {
    constructor(status, mensagem) {
      super(mensagem);
      this.name = "ErroApi";
      this.status = status; /* 0 = sem resposta (servidor desligado, sem rede ou tempo esgotado) */
    }
  }

  async function chamar(metodo, caminho, corpo) {
    const cabecalhos = { Accept: "application/json" };
    if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
    const s = sessao();
    if (s && s.token) cabecalhos.Authorization = "Bearer " + s.token;

    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), CONFIG.TEMPO_LIMITE_MS);
    let resposta;
    try {
      resposta = await fetch(CONFIG.API_URL + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: controle.signal,
      });
    } catch (e) {
      throw new ErroApi(0, SEM_SERVIDOR);
    } finally {
      clearTimeout(relogio);
    }

    const texto = await resposta.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch (e) { dados = null; }
    if (!resposta.ok) throw erroDaResposta(resposta.status, dados, caminho);
    return dados; /* 204 (sem conteúdo) devolve null */
  }

  /* Como cada erro chega à tela (Quadro 5.1):
     401 fora do login → a sessão acabou (token vencido, conta desativada): apaga a sessão e volta ao login.
     403 sem mensagem  → perfil sem permissão para a rota.
     429, 400, 404, 409 e 500 → a mensagem da API, sem trocar (por exemplo, a do erro 50008). */
  const SESSAO_ACABOU = "Sua sessão terminou. Entre de novo.";
  const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";
  function erroDaResposta(status, dados, caminho) {
    const daApi = dados && dados.mensagem ? dados.mensagem : null;
    if (status === 401 && caminho !== "/api/auth/login") {
      apagarSessao();
      voltarAoLogin();
      return new ErroApi(401, SESSAO_ACABOU);
    }
    if (status === 403 && !daApi) return new ErroApi(403, SEM_PERMISSAO);
    return new ErroApi(status, daApi || "Não foi possível concluir agora. Tente de novo.");
  }
  function voltarAoLogin() {
    const pagina = location.pathname.split("/").pop() || "index.html";
    if (pagina !== "login.html") location.replace("login.html?expirou=1");
  }

  /* Data no formato da API (AAAA-MM-DD) no fuso do computador. Nunca toISOString(): em UTC, perto da
     meia-noite, o dia viraria o seguinte (ajustes-front.md, F25). */
  function dataISO(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ─── CNPJ: 14 dígitos e os dois dígitos verificadores ─── */
  function digitoCNPJ(base) {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split("").reduce((s, n, i) => s + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }
  function validarCNPJ(valor) {
    const c = so(valor);
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const d1 = digitoCNPJ(c.slice(0, 12));
    const d2 = digitoCNPJ(c.slice(0, 12) + d1);
    return c.endsWith(String(d1) + String(d2));
  }
  function formatarCNPJ(valor) {
    const c = so(valor).slice(0, 14);
    return c.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  function formatarTelefone(valor) {
    const t = so(valor);
    if (t.length < 10) return valor;
    return "(" + t.slice(0, 2) + ") " + t.slice(2, -4) + "-" + t.slice(-4);
  }

  /* ─── CPF: 11 dígitos e os dois dígitos verificadores (Pacientes.CPF guarda só os dígitos) ─── */
  function digitoCPF(base) {
    const soma = base.split("").reduce((s, n, i) => s + Number(n) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }
  function validarCPF(valor) {
    const c = so(valor);
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    const d1 = digitoCPF(c.slice(0, 9));
    return c.endsWith(String(d1) + String(digitoCPF(c.slice(0, 9) + d1)));
  }
  /* máscara 000.000.000-00: só entram números */
  function formatarCPF(valor) {
    return so(valor).slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  const ERRO_CPF = "CPF inválido.";

  /* ─── UF: as 27 siglas, sempre em 2 letras maiúsculas (Clinica.UF) ─── */
  const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  const validarUF = (uf) => UFS.includes(String(uf || "").trim());
  const ERRO_UF = "Use a sigla do estado em 2 letras maiúsculas, como SP.";

  /* ─── Senha: de 8 a 64 caracteres (a API confere de novo) ─── */
  const SENHA_MINIMA = 8;
  const ERRO_SENHA = "A senha precisa ter pelo menos 8 caracteres.";
  function exigirSenha(senha) { if (String(senha || "").length < SENHA_MINIMA) throw new Error(ERRO_SENHA); }

  /* ─── Sessão ───
     Guardada no navegador depois do login: o token da API e os dados de quem entrou.
     { token, expiraEm, usuarioId, papel, nome, email, clinicaId, medicoId, clinica }
     usuarioId é o idUsuario da conta (vai na URL das rotas /api/pacientes/{id}; nunca no corpo).
     clinica é a clínica aberta: a da equipe (GET /api/clinicas/{id}) ou a escolhida pelo paciente. */
  function sessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) || null; } catch (e) { return null; }
  }
  function gravarSessao(s) {
    try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch (e) { /* sem armazenamento */ }
    return s;
  }
  function apagarSessao() {
    try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* sem armazenamento */ }
  }
  const sessaoValida = (s) => !!(s && s.token && (!s.expiraEm || Date.parse(s.expiraEm) > Date.now()));
  function usuarioAtual() {
    const s = sessao();
    if (!sessaoValida(s)) return null;
    return { id: s.usuarioId, idUsuario: s.usuarioId, nome: s.nome, email: s.email, papel: s.papel, clinicaId: s.clinicaId, medicoId: s.medicoId };
  }
  function clinicaAtual() {
    const s = sessao();
    return sessaoValida(s) && s.clinica ? s.clinica : null;
  }

  /* ─── Páginas que pedem login ───
     Sem sessão válida (ou com o papel errado), a página manda para o login antes de mostrar qualquer coisa. */
  const EQUIPE = ["dono", "recepcao"];
  const PROTEGIDAS = {
    "clinica.html": EQUIPE, "conta.html": EQUIPE, "equipe.html": EQUIPE, "especialidades.html": EQUIPE,
    "horarios.html": EQUIPE, "lista-espera.html": EQUIPE, "medicos.html": EQUIPE, "nova-consulta.html": EQUIPE,
    "pacientes.html": EQUIPE, "medico.html": ["medico"],
    "paciente-desktop.html": ["paciente"], "paciente-mobile.html": ["paciente"], "escolher-clinica.html": ["paciente"],
  };
  function protegerPagina() {
    const pagina = location.pathname.split("/").pop() || "index.html";
    const papeis = PROTEGIDAS[pagina];
    if (!papeis) return true;
    const s = sessao();
    let destino = null;
    if (s && s.token && !sessaoValida(s)) destino = "login.html?expirou=1"; /* o token venceu (8 h na equipe, 30 dias no paciente) */
    else if (!sessaoValida(s) || !papeis.includes(s.papel)) destino = "login.html";
    else if (s.papel === "paciente" && !s.clinicaId && pagina !== "escolher-clinica.html") destino = "escolher-clinica.html";
    if (!destino) return true;
    if (s && !sessaoValida(s)) apagarSessao();
    document.documentElement.style.visibility = "hidden";
    location.replace(destino);
    return false;
  }

  function destinoDe(s) {
    if (s.papel === "dono" || s.papel === "recepcao") return "clinica.html";
    if (s.papel === "medico") return "medico.html";
    return s.clinicaId ? "paciente-desktop.html" : "escolher-clinica.html";
  }

  /* ─── Login e conta ─── */

  /* POST /api/auth/login → { token, expiraEm, usuario: { idUsuario, nome, email, papel, clinicaId, medicoId } }
     Dono e recepção: busca os dados da clínica (GET /api/clinicas/{id}) para as telas mostrarem nome e código. */
  async function entrar(email, senha) {
    apagarSessao(); /* o login nunca vai com o token de quem entrou antes neste navegador */
    const r = await chamar("POST", "/api/auth/login", { email: String(email || "").trim(), senha });
    const u = r.usuario;
    const s = gravarSessao({
      token: r.token, expiraEm: r.expiraEm, usuarioId: u.idUsuario, papel: u.papel, nome: u.nome, email: u.email,
      clinicaId: u.clinicaId, medicoId: u.medicoId, clinica: null,
    });
    try {
      if (s.papel === "dono" || s.papel === "recepcao") {
        s.clinica = await chamar("GET", "/api/clinicas/" + s.clinicaId);
        gravarSessao(s);
      } else if (s.papel === "paciente") {
        /* F7: no token do paciente a clínica vem nula. As clínicas dele decidem o destino:
           nenhuma → escolher-clinica.html; uma ou mais → a última que ele usou neste navegador, ou a primeira. */
        const minhas = await chamar("GET", "/api/pacientes/" + s.usuarioId + "/clinicas");
        const ultima = lerClinicaEscolhida(s.usuarioId);
        const c = minhas.find((x) => x.id === ultima) || minhas[0] || null;
        s.clinicaId = c ? c.id : null;
        s.clinica = c;
        gravarSessao(s);
      }
    } catch (e) {
      apagarSessao();
      throw e;
    }
    aplicarClinicaNasTelas();
    return { usuario: usuarioAtual(), sessao: s, destino: destinoDe(s) };
  }

  /* Sair: a API não guarda sessão (JWT), então basta apagar o token deste navegador (F14) */
  async function sair() {
    apagarSessao();
  }

  /* PUT /api/usuarios/{id}/senha   corpo { senhaAtual, novaSenha }  → 204 */
  async function trocarSenha(atual, nova) {
    const u = usuarioAtual();
    if (!u) throw new Error("Entre de novo para trocar a senha.");
    exigirSenha(nova);
    await chamar("PUT", "/api/usuarios/" + u.id + "/senha", { senhaAtual: atual, novaSenha: nova });
  }

  /* ─── Cadastros (rotas públicas): respondem 201 sem token, então o cadastro entra em seguida (F10) ─── */

  /* POST /api/pacientes  corpo { nome, email, senha, telefone, cpf (11 dígitos), nascimento (AAAA-MM-DD), alergias?, codigo? }
     Cria a conta e o titular; com o código, já vincula à clínica. Devolve o resultado do login (com o destino). */
  async function cadastrarPaciente(dados) {
    exigirSenha(dados.senha);
    await chamar("POST", "/api/pacientes", {
      nome: dados.nome.trim(), email: dados.email.trim(), senha: dados.senha,
      telefone: dados.telefone || null, cpf: so(dados.cpf), nascimento: dados.nascimento,
      alergias: dados.alergias || null, codigo: dados.codigo ? normalizarCodigo(dados.codigo) : null,
    });
    return entrar(dados.email, dados.senha);
  }

  /* POST /api/clinicas  corpo { clinica: { nome, cnpj, telefone, endereco, cidade, uf, publica }, dono: { nome, email, senha } }
     Cria a clínica (com o código AAA-0000) e a conta do dono; depois entra como dono. */
  async function cadastrarClinica(dados) {
    exigirSenha(dados.dono.senha);
    const r = await chamar("POST", "/api/clinicas", dados);
    const login = await entrar(dados.dono.email, dados.dono.senha);
    return { clinica: r.clinica, usuario: login.usuario, destino: login.destino };
  }

  /* ─── Clínicas do paciente (F7, F32) ─── */
  const CHAVE_ESCOLHIDA = "agendapro.clinicaEscolhida.";
  function lerClinicaEscolhida(idUsuario) {
    try { return Number(localStorage.getItem(CHAVE_ESCOLHIDA + idUsuario)) || null; } catch (e) { return null; }
  }
  /* 'ipe4821' → 'IPE-4821' */
  function normalizarCodigo(codigo) {
    const t = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return t.length > 3 ? t.slice(0, 3) + "-" + t.slice(3, 7) : t;
  }

  /* GET /api/clinicas?busca=  → só as públicas, pelo nome ou pela cidade (F32) */
  async function buscarClinicas(termo) {
    const busca = String(termo || "").trim();
    return chamar("GET", "/api/clinicas" + (busca ? "?busca=" + encodeURIComponent(busca) : ""));
  }

  /* GET /api/clinicas/codigo/{codigo}  → pública ou privada */
  async function clinicaPorCodigo(codigo) {
    return chamar("GET", "/api/clinicas/codigo/" + encodeURIComponent(normalizarCodigo(codigo)));
  }

  /* GET /api/pacientes/{id}/clinicas */
  async function clinicasDoPaciente() {
    const u = usuarioAtual();
    if (!u || u.papel !== "paciente") return [];
    return chamar("GET", "/api/pacientes/" + u.id + "/clinicas");
  }

  /* Abre a clínica nas telas do paciente (sem gravar nada na API) e lembra a escolha neste navegador */
  function usarClinica(c) {
    const s = sessao();
    s.clinicaId = c.id;
    s.clinica = c;
    gravarSessao(s);
    try { localStorage.setItem(CHAVE_ESCOLHIDA + s.usuarioId, String(c.id)); } catch (e) { /* sem armazenamento */ }
    aplicarClinicaNasTelas();
    return c;
  }

  /* POST /api/pacientes/{id}/clinicas  corpo { codigo } (qualquer clínica) ou { clinicaId } (só as públicas)
     201 = vínculo novo, 200 = já era vinculado. Depois, a clínica fica aberta nas telas. */
  async function vincularClinica(escolha) {
    const u = usuarioAtual();
    const corpo = escolha.codigo ? { codigo: normalizarCodigo(escolha.codigo) } : { clinicaId: Number(escolha.clinicaId) };
    const c = await chamar("POST", "/api/pacientes/" + u.id + "/clinicas", corpo);
    return usarClinica(c);
  }

  /* ─── Clínica e equipe ─── */

  /* A clínica que voltou da API passa a ser a clínica aberta na sessão (e o nome dela vale em todas as telas) */
  function guardarClinicaNaSessao(c) {
    const s = sessao();
    if (!s) return c;
    s.clinica = c;
    gravarSessao(s);
    aplicarClinicaNasTelas();
    return c;
  }

  /* GET /api/clinicas/{id}  (L1: dono e recepção, só a própria clínica). A cópia guardada no login pode estar velha:
     as telas da equipe buscam de novo a cada carga (clinica-servicos.js). */
  async function recarregarClinica() {
    const c = clinicaAtual();
    if (!c) throw new Error("Nenhuma clínica aberta.");
    return guardarClinicaNaSessao(await chamar("GET", "/api/clinicas/" + c.id));
  }

  /* PUT /api/clinicas/{id}  (só o dono). A API pede todos os campos: os que a tela não mandou vêm da clínica aberta. */
  async function atualizarClinica(campos) {
    const c = clinicaAtual();
    if (!c) throw new Error("Nenhuma clínica aberta.");
    if (campos.uf !== undefined && !validarUF(campos.uf)) throw new Error(ERRO_UF);
    const pega = (k) => (campos[k] !== undefined ? campos[k] : c[k]);
    const nova = await chamar("PUT", "/api/clinicas/" + c.id, {
      nome: String(pega("nome")).trim(), telefone: pega("telefone"), endereco: String(pega("endereco")).trim(),
      cidade: pega("cidade"), uf: String(pega("uf")).trim(), publica: !!pega("publica"),
    });
    return guardarClinicaNaSessao(nova);
  }

  /* GET /api/clinicas/{id}/equipe → [{ idUsuario, nome, email, papel }] (id = idUsuario, para as telas) */
  async function listarEquipe() {
    const c = clinicaAtual();
    if (!c) return [];
    const lista = await chamar("GET", "/api/clinicas/" + c.id + "/equipe");
    return lista.map((p) => Object.assign({ id: p.idUsuario }, p));
  }

  /* POST /api/clinicas/{id}/equipe  (só o dono) → { usuario, senhaProvisoria } */
  async function cadastrarRecepcionista(dados) {
    const c = clinicaAtual();
    const r = await chamar("POST", "/api/clinicas/" + c.id + "/equipe", { nome: dados.nome.trim(), email: dados.email.trim() });
    return { usuario: Object.assign({ id: r.usuario.idUsuario }, r.usuario), senhaProvisoria: r.senhaProvisoria };
  }

  /* POST /api/clinicas/{id}/equipe/{usuarioId}/senha-provisoria  (só o dono) → { senhaProvisoria } */
  async function gerarSenhaProvisoria(usuarioId) {
    return chamar("POST", "/api/clinicas/" + clinicaAtual().id + "/equipe/" + usuarioId + "/senha-provisoria");
  }

  /* DELETE /api/clinicas/{id}/equipe/{usuarioId}  (só o dono; a API não deixa remover a si mesmo) */
  async function removerDaEquipe(usuarioId) {
    const c = clinicaAtual();
    await chamar("DELETE", "/api/clinicas/" + c.id + "/equipe/" + usuarioId);
  }

  /* O nome e os contatos da clínica aberta passam a valer em todas as telas.
     Os médicos das telas ainda simuladas continuam os da carga inicial até as etapas 7 a 9. */
  function aplicarClinicaNasTelas() {
    const c = clinicaAtual();
    if (!c || !D || !D.clinica) return;
    D.clinica.nome = c.nome;
    D.clinica.endereco = c.endereco;
    D.clinica.telefone = c.telefone || "";
    D.clinica.telefoneLink = "+55" + so(c.telefone);
  }
  aplicarClinicaNasTelas();
  const liberada = protegerPagina();
  const pronto = Promise.resolve();

  window.API = {
    chamar, ErroApi, dataISO, CONFIG,
    pronto, PAPEIS, liberada,
    sessao, usuarioAtual, clinicaAtual, destinoDe,
    entrar, sair, trocarSenha,
    cadastrarClinica, atualizarClinica, recarregarClinica,
    listarEquipe, cadastrarRecepcionista, gerarSenhaProvisoria, removerDaEquipe,
    cadastrarPaciente, buscarClinicas, clinicaPorCodigo, vincularClinica, clinicasDoPaciente, usarClinica, normalizarCodigo,
    validarCNPJ, formatarCNPJ, formatarTelefone,
    validarCPF, formatarCPF, ERRO_CPF,
    UFS, validarUF, ERRO_UF, SENHA_MINIMA, ERRO_SENHA,
  };
})();
