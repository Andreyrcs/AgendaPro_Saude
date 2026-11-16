/* AgendaPro Saúde — camada de dados das contas: clínicas, equipe, pacientes e sessão.
   Hoje grava neste navegador (localStorage). Quando a API em C# estiver pronta, troca-se só o
   miolo de cada função por uma chamada fetch ao endpoint indicado ao lado dela; as telas
   continuam iguais, porque já esperam Promises e os mesmos campos.
   A lista completa função × endpoint está em docs/relatorio-integracao.md. */
(function () {
  "use strict";

  const D = window.DADOS;
  const CHAVE = "agendapro.api.v2";
  const CHAVE_SESSAO = "agendapro.sessao";
  const PAPEIS = { dono: "Responsável pela clínica", recepcao: "Recepção", medico: "Médico", paciente: "Paciente" };

  const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const so = (t) => String(t || "").replace(/\D/g, "");
  const novoId = (p) => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

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
  function cnpjDe(base12) {
    const d1 = digitoCNPJ(base12);
    return formatarCNPJ(base12 + d1 + digitoCNPJ(base12 + d1));
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
  /* CPF fictício e válido para os pacientes da carga inicial da agenda (sempre o mesmo para o mesmo nome) */
  function cpfFicticio(nome) {
    let h = 7;
    for (const ch of String(nome)) h = (h * 31 + ch.charCodeAt(0)) % 1000000007;
    const base = String(100000000 + (h % 900000000));
    const d1 = digitoCPF(base);
    return base + d1 + digitoCPF(base + d1);
  }
  const ERRO_CPF = "CPF inválido.";
  const ERRO_CPF_REPETIDO = "Este CPF já está cadastrado.";

  /* ─── UF: as 27 siglas, sempre em 2 letras maiúsculas (Clinica.UF) ─── */
  const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  const validarUF = (uf) => UFS.includes(String(uf || "").trim());
  const ERRO_UF = "Use a sigla do estado em 2 letras maiúsculas, como SP.";

  /* ─── Senha: mínimo de 8 caracteres (igual ao app) ─── */
  const SENHA_MINIMA = 8;
  const ERRO_SENHA = "A senha precisa ter pelo menos 8 caracteres.";
  function exigirSenha(senha) { if (String(senha || "").length < SENHA_MINIMA) throw new Error(ERRO_SENHA); }

  /* ─── Senha ───
     ┌─ PONTO DE TROCA PARA A API ────────────────────────────────────────────────┐
     │ Enquanto as contas ficam neste navegador, a senha vira um resumo SHA-256    │
     │ só para não ficar legível no localStorage.                                  │
     │ Com a API: apagar resumo() e mandar a senha como o usuário digitou, por     │
     │ HTTPS, em POST /api/auth/login e nos cadastros. Quem faz o hash é o         │
     │ servidor, com BCrypt (BCrypt.HashPassword no cadastro, BCrypt.Verify no     │
     │ login — já é assim em backend/Controllers/UsuariosController.cs e           │
     │ AuthController.cs). Hash no navegador NÃO substitui o hash no servidor.     │
     └─────────────────────────────────────────────────────────────────────────────┘ */
  async function resumo(senha) {
    try {
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("agendapro:" + senha));
      return "sha256:" + Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      /* sem crypto.subtle (arquivo aberto direto do disco): resumo simples, só para não guardar a senha legível */
      let h = 5381;
      for (const ch of "agendapro:" + senha) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
      return "fraco:" + h.toString(16);
    }
  }

  /* ─── Armazenamento ─── */
  let banco = null;
  function ler() {
    if (banco) return banco;
    try { banco = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { banco = null; }
    if (!banco || !Array.isArray(banco.clinicas)) banco = { clinicas: [], usuarios: [], vinculos: [], semente: false };
    return banco;
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  }

  /* Carga inicial: três clínicas, uma conta de cada papel (as do "Acesso rápido" do login)
     e a conta de acesso de cada médico (Medicos.IdUsuario é obrigatório) */
  const DOMINIO = { ipe: "clinicaipe.com.br", jacaranda: "clinicajacaranda.com.br", aroeira: "centroaroeira.com.br" };
  async function semear() {
    const b = ler();
    if (b.semente) return;
    const ipe = D.clinica;
    b.clinicas.push(
      { id: "ipe", nome: ipe.nome, cnpj: cnpjDe("123456780001"), telefone: ipe.telefone, endereco: ipe.endereco, cidade: "São Paulo", uf: "SP", codigo: "IPE-4821", publica: true },
      { id: "jacaranda", nome: "Clínica Jacarandá", cnpj: cnpjDe("234567810001"), telefone: "(19) 3311-0000", endereco: "Rua dos Ipês, 88 — Cambuí", cidade: "Campinas", uf: "SP", codigo: "JAC-2093", publica: true },
      { id: "aroeira", nome: "Centro Médico Aroeira", cnpj: cnpjDe("345678120001"), telefone: "(11) 2200-0000", endereco: "Av. das Aroeiras, 1500 — Tatuapé", cidade: "São Paulo", uf: "SP", codigo: "ARO-7716", publica: true },
    );
    const familiaJuliana = D.pessoas.find((p) => p.id === "juliana");
    const contas = [
      { nome: "Renata Albuquerque", email: "dono@clinicaipe.com.br", senha: "dono1234", papel: "dono", clinicaId: "ipe" },
      { nome: "Carla Mendes", email: "recepcao@clinicaipe.com.br", senha: "recepcao123", papel: "recepcao", clinicaId: "ipe" },
      { nome: "Juliana Santos", email: "juliana.santos@email.com", senha: "paciente123", papel: "paciente", clinicaId: null, cpf: familiaJuliana.cpf },
      { nome: "Marta Ferraz", email: "recepcao@clinicajacaranda.com.br", senha: "recepcao123", papel: "recepcao", clinicaId: "jacaranda" },
    ];
    /* e-mail do médico: primeiro.ultimo@dominio-da-clinica (ex.: paulo.menezes@clinicaipe.com.br) */
    D.todosMedicos.forEach((m) => {
      const partes = semAcento(m.nome.replace(/^Dra?\.\s+/, "")).split(" ");
      contas.push({ nome: m.nome, email: partes[0] + "." + partes[partes.length - 1] + "@" + DOMINIO[m.clinica], senha: "medico123", papel: "medico", clinicaId: m.clinica, medicoId: m.id });
    });
    for (const c of contas) {
      b.usuarios.push({ id: novoId("u"), nome: c.nome, email: c.email, senha: await resumo(c.senha), papel: c.papel, clinicaId: c.clinicaId, medicoId: c.medicoId || null, telefone: "", cpf: c.cpf || "" });
    }
    const juliana = b.usuarios.find((u) => u.papel === "paciente");
    b.vinculos.push({ pacienteId: juliana.id, clinicaId: "ipe" });
    b.semente = true;
    gravar();
  }
  const pronto = semear();

  /* ─── Sessão ─── */
  function sessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) || null; } catch (e) { return null; }
  }
  function abrirSessao(u, clinicaId) {
    const s = { usuarioId: u.id, papel: u.papel, nome: u.nome, clinicaId: clinicaId !== undefined ? clinicaId : u.clinicaId, medicoId: u.medicoId || null };
    try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch (e) { /* sem armazenamento */ }
    return s;
  }
  function usuarioAtual() {
    const s = sessao();
    return s ? ler().usuarios.find((u) => u.id === s.usuarioId) || null : null;
  }
  function clinicaAtual() {
    const s = sessao();
    return s && s.clinicaId ? ler().clinicas.find((c) => c.id === s.clinicaId) || null : null;
  }
  function exigir(papeis) {
    const u = usuarioAtual();
    if (!u || !papeis.includes(u.papel)) throw new Error("Só " + papeis.map((p) => PAPEIS[p].toLowerCase()).join(" ou ") + " pode fazer isso.");
    return u;
  }

  /* ─── Páginas que pedem login ───
     Sem sessão (ou com o papel errado), a página manda para o login antes de mostrar qualquer coisa. */
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
    const u = s && usuarioAtual();
    let destino = null;
    if (!s || !u || !papeis.includes(s.papel)) destino = "login.html";
    else if (s.papel === "paciente" && !s.clinicaId && pagina !== "escolher-clinica.html") destino = "escolher-clinica.html";
    if (!destino) return true;
    document.documentElement.style.visibility = "hidden";
    location.replace(destino);
    return false;
  }

  function vinculosDe(pacienteId) {
    return ler().vinculos.filter((v) => v.pacienteId === pacienteId);
  }
  function destinoDe(u) {
    if (u.papel === "dono" || u.papel === "recepcao") return "clinica.html";
    if (u.papel === "medico") return "medico.html";
    return vinculosDe(u.id).length ? "paciente-desktop.html" : "escolher-clinica.html";
  }
  function emailEmUso(email) {
    return ler().usuarios.some((u) => u.email === email.toLowerCase().trim());
  }

  /* ─── CPFs já cadastrados (Pacientes.CPF é único): titulares e familiares de todas as contas ───
     Começa com a família da carga inicial (dados.js). { cpf: "11 dígitos", nome } */
  const FAMILIA_INICIAL = D.pessoas.map((p) => ({ cpf: p.cpf, nome: p.nome }));
  function cpfsCadastrados() {
    const b = ler();
    if (!b.cpfs) { b.cpfs = FAMILIA_INICIAL.slice(); gravar(); }
    return b.cpfs;
  }
  const cpfEmUso = (cpf) => cpfsCadastrados().some((x) => x.cpf === so(cpf));
  /* o CPF de um paciente pelo nome (quem se cadastrou ou foi incluído como familiar), ou null */
  function cpfDe(nome) {
    const x = cpfsCadastrados().find((p) => p.nome === nome);
    return x ? x.cpf : null;
  }
  /* valida e reserva o CPF; lança "CPF inválido." ou "Este CPF já está cadastrado." */
  function guardarCPF(cpf, nome) {
    if (!validarCPF(cpf)) throw new Error(ERRO_CPF);
    if (cpfEmUso(cpf)) throw new Error(ERRO_CPF_REPETIDO);
    cpfsCadastrados().push({ cpf: so(cpf), nome });
    gravar();
    return so(cpf);
  }

  /* ─── Funções que as telas usam ─── */

  /* POST /api/auth/login   corpo { email, senha }  (com a API: senha sem resumo(), ver PONTO DE TROCA) */
  async function entrar(email, senha) {
    await pronto;
    const u = ler().usuarios.find((x) => x.email === email.toLowerCase().trim());
    if (!u || u.senha !== (await resumo(senha))) throw new Error("E-mail ou senha incorretos.");
    let clinicaId = u.clinicaId;
    if (u.papel === "paciente") {
      const vs = vinculosDe(u.id);
      clinicaId = vs.length ? vs[0].clinicaId : null;
    }
    return { usuario: u, sessao: abrirSessao(u, clinicaId), destino: destinoDe(u) };
  }

  /* PUT /api/usuarios/{id}/senha   corpo { senhaAtual, novaSenha }  (com a API: sem resumo()) */
  async function trocarSenha(atual, nova) {
    await pronto;
    const u = usuarioAtual();
    if (!u) throw new Error("Entre de novo para trocar a senha.");
    if (u.senha !== (await resumo(atual))) throw new Error("A senha atual não confere.");
    exigirSenha(nova);
    u.senha = await resumo(nova);
    delete u.provisoria;
    gravar();
  }

  /* POST /api/auth/logout */
  async function sair() {
    try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* sem armazenamento */ }
  }

  /* POST /api/clinicas  (cria a clínica e a conta do responsável juntas) */
  async function cadastrarClinica(dados) {
    await pronto;
    const b = ler();
    const c = dados.clinica, d = dados.dono;
    if (!validarCNPJ(c.cnpj)) throw new Error("CNPJ inválido. Confira os 14 números.");
    if (b.clinicas.some((x) => so(x.cnpj) === so(c.cnpj))) throw new Error("Já existe uma clínica com este CNPJ.");
    if (emailEmUso(d.email)) throw new Error("Este e-mail já tem uma conta. Use outro ou entre com ele.");
    if (!validarUF(c.uf)) throw new Error(ERRO_UF);
    exigirSenha(d.senha);
    const clinica = {
      id: novoId("c"), nome: c.nome.trim(),
      cnpj: formatarCNPJ(c.cnpj), telefone: formatarTelefone(c.telefone), endereco: c.endereco.trim(),
      cidade: c.cidade.trim(), uf: c.uf.trim(), codigo: gerarCodigo(c.nome), publica: c.publica !== false,
    };
    const dono = { id: novoId("u"), nome: d.nome.trim(), email: d.email.toLowerCase().trim(), senha: await resumo(d.senha), papel: "dono", clinicaId: clinica.id };
    b.clinicas.push(clinica);
    b.usuarios.push(dono);
    gravar();
    abrirSessao(dono, clinica.id);
    return { clinica, usuario: dono };
  }
  function gerarCodigo(nome) {
    const fracas = ["clinica", "centro", "medico", "medica", "consultorio", "de", "da", "do", "das", "dos", "e", "saude"];
    const palavra = semAcento(nome).split(/[^a-z]+/).filter((p) => p && !fracas.includes(p))[0] || semAcento(nome).replace(/[^a-z]/g, "") || "cli";
    const prefixo = (palavra + "xxx").slice(0, 3).toUpperCase();
    let codigo;
    do { codigo = prefixo + "-" + String(1000 + Math.floor(Math.random() * 9000)); } while (ler().clinicas.some((x) => x.codigo === codigo));
    return codigo;
  }

  /* PUT /api/clinicas/{id}  (só o responsável) */
  async function atualizarClinica(campos) {
    await pronto;
    exigir(["dono"]);
    const c = clinicaAtual();
    if (!c) throw new Error("Nenhuma clínica aberta.");
    if (campos.uf !== undefined && !validarUF(campos.uf)) throw new Error(ERRO_UF);
    ["nome", "endereco", "cidade", "uf"].forEach((k) => { if (campos[k] !== undefined) c[k] = String(campos[k]).trim(); });
    if (campos.telefone !== undefined) c.telefone = formatarTelefone(campos.telefone);
    if (campos.publica !== undefined) c.publica = !!campos.publica;
    gravar();
    aplicarClinicaNasTelas();
    return c;
  }

  /* GET /api/clinicas/{id}/equipe */
  async function listarEquipe() {
    await pronto;
    const c = clinicaAtual();
    if (!c) return [];
    const ordem = { dono: 0, recepcao: 1, medico: 2 };
    return ler().usuarios.filter((u) => u.clinicaId === c.id && u.papel !== "paciente")
      .sort((a, b) => ordem[a.papel] - ordem[b.papel] || a.nome.localeCompare(b.nome));
  }

  /* POST /api/clinicas/{id}/equipe  (só o responsável) */
  async function cadastrarRecepcionista(dados) {
    await pronto;
    exigir(["dono"]);
    const c = clinicaAtual();
    if (emailEmUso(dados.email)) throw new Error("Este e-mail já tem uma conta.");
    const senhaProvisoria = dados.senhaProvisoria || gerarSenhaProvisoria();
    const u = { id: novoId("u"), nome: dados.nome.trim(), email: dados.email.toLowerCase().trim(), senha: await resumo(senhaProvisoria), papel: "recepcao", clinicaId: c.id, provisoria: true };
    ler().usuarios.push(u);
    gravar();
    return { usuario: u, senhaProvisoria };
  }
  /* POST /api/clinicas/{id}/medicos  (cria a conta de acesso do médico: tabela Medicos.IdUsuario)
     dados = { nome, email, medicoId, telefone } → { usuario, senhaProvisoria }
     O telefone do médico é o da conta dele (Usuarios.Telefone). */
  async function cadastrarContaMedico(dados) {
    await pronto;
    exigir(["dono", "recepcao"]);
    const c = clinicaAtual();
    if (emailEmUso(dados.email)) throw new Error("Este e-mail já tem uma conta.");
    const senhaProvisoria = gerarSenhaProvisoria();
    const u = { id: novoId("u"), nome: dados.nome.trim(), email: dados.email.toLowerCase().trim(), senha: await resumo(senhaProvisoria), papel: "medico", clinicaId: c.id, medicoId: dados.medicoId, telefone: dados.telefone || "", provisoria: true };
    ler().usuarios.push(u);
    gravar();
    return { usuario: u, senhaProvisoria };
  }
  /* Telefone do médico = telefone da conta dele (Usuarios.Telefone).
     Ler: vem junto da lista de médicos. Gravar: PUT /api/medicos/{id} (a API grava em Usuarios.Telefone). */
  function telefoneDoMedico(medicoId) {
    const u = ler().usuarios.find((x) => x.papel === "medico" && x.medicoId === medicoId);
    return u ? u.telefone || "" : "";
  }
  function salvarTelefoneMedico(medicoId, telefone) {
    const u = ler().usuarios.find((x) => x.papel === "medico" && x.medicoId === medicoId);
    if (!u) return false; /* médico ainda sem conta: o telefone entra quando a conta for criada */
    u.telefone = telefone || "";
    gravar();
    return true;
  }
  function emailLivre(email) { return !emailEmUso(email); }
  function gerarSenhaProvisoria() {
    const letras = "abcdefghjkmnpqrstuvwxyz";
    let s = "";
    for (let i = 0; i < 5; i++) s += letras[Math.floor(Math.random() * letras.length)];
    return s + String(100 + Math.floor(Math.random() * 900));
  }

  /* DELETE /api/clinicas/{id}/equipe/{usuarioId}  (só o responsável; não remove a si mesmo) */
  async function removerDaEquipe(usuarioId) {
    await pronto;
    const eu = exigir(["dono"]);
    if (usuarioId === eu.id) throw new Error("Você não pode remover a sua própria conta.");
    const b = ler();
    const i = b.usuarios.findIndex((u) => u.id === usuarioId && u.clinicaId === eu.clinicaId && u.papel === "recepcao");
    if (i < 0) throw new Error("Pessoa não encontrada na equipe.");
    const [removido] = b.usuarios.splice(i, 1);
    gravar();
    return removido;
  }

  /* POST /api/pacientes   corpo { nome, email, senha, telefone, cpf: "11 dígitos", nascimento }
     O CPF é obrigatório, válido e único (Pacientes.CPF). */
  async function cadastrarPaciente(dados) {
    await pronto;
    if (emailEmUso(dados.email)) throw new Error("Este e-mail já tem uma conta. Entre com ele ou use outro.");
    if (!validarCPF(dados.cpf)) throw new Error(ERRO_CPF);
    if (cpfEmUso(dados.cpf)) throw new Error(ERRO_CPF_REPETIDO);
    exigirSenha(dados.senha);
    const u = {
      id: novoId("u"), nome: dados.nome.trim(), email: dados.email.toLowerCase().trim(), senha: await resumo(dados.senha),
      papel: "paciente", clinicaId: null, telefone: dados.telefone || "", cpf: so(dados.cpf), nascimento: dados.nascimento || "",
    };
    guardarCPF(u.cpf, u.nome);
    ler().usuarios.push(u);
    gravar();
    abrirSessao(u, null);
    return u;
  }

  /* GET /api/clinicas?busca=  (só as que aceitam aparecer na busca) */
  async function buscarClinicas(termo) {
    await pronto;
    const t = semAcento(termo).trim();
    return ler().clinicas
      .filter((c) => c.publica && (!t || [c.nome, c.cidade, c.endereco].some((x) => semAcento(x).includes(t))))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /* GET /api/clinicas/codigo/{codigo} */
  async function clinicaPorCodigo(codigo) {
    await pronto;
    const k = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const c = ler().clinicas.find((x) => x.codigo.replace("-", "") === k);
    if (!c) throw new Error("Não achamos uma clínica com esse código. Confira com a recepção.");
    return c;
  }

  /* POST /api/pacientes/{id}/clinicas */
  async function vincularClinica(clinicaId) {
    await pronto;
    const u = exigir(["paciente"]);
    if (!ler().clinicas.some((c) => c.id === clinicaId)) throw new Error("Clínica não encontrada.");
    if (!vinculosDe(u.id).some((v) => v.clinicaId === clinicaId)) ler().vinculos.push({ pacienteId: u.id, clinicaId });
    gravar();
    abrirSessao(u, clinicaId);
    aplicarClinicaNasTelas();
    return clinicaAtual();
  }

  /* GET /api/pacientes/{id}/clinicas */
  async function clinicasDoPaciente() {
    await pronto;
    const u = usuarioAtual();
    if (!u || u.papel !== "paciente") return [];
    const ids = vinculosDe(u.id).map((v) => v.clinicaId);
    return ler().clinicas.filter((c) => ids.includes(c.id));
  }

  /* O nome, os contatos e os médicos da clínica aberta passam a valer em todas as telas */
  function aplicarClinicaNasTelas() {
    const c = clinicaAtual();
    if (!c || !D || !D.clinica) return;
    D.clinica.id = c.id;
    D.clinica.nome = c.nome;
    D.clinica.endereco = c.endereco;
    D.clinica.telefone = c.telefone;
    D.clinica.telefoneLink = "+55" + so(c.telefone);
    D.medicos.length = 0;
    D.todosMedicos.filter((m) => m.clinica === c.id).forEach((m) => D.medicos.push(m));
  }
  aplicarClinicaNasTelas();
  const liberada = protegerPagina();

  window.API = {
    pronto, PAPEIS, liberada,
    sessao, usuarioAtual, clinicaAtual, destinoDe,
    entrar, sair, trocarSenha,
    cadastrarClinica, atualizarClinica,
    listarEquipe, cadastrarRecepcionista, removerDaEquipe, cadastrarContaMedico, emailLivre,
    telefoneDoMedico, salvarTelefoneMedico,
    cadastrarPaciente, buscarClinicas, clinicaPorCodigo, vincularClinica, clinicasDoPaciente,
    validarCNPJ, formatarCNPJ, formatarTelefone,
    validarCPF, formatarCPF, cpfFicticio, cpfEmUso, cpfDe, guardarCPF, ERRO_CPF, ERRO_CPF_REPETIDO,
    UFS, validarUF, ERRO_UF, SENHA_MINIMA, ERRO_SENHA,
  };
})();
