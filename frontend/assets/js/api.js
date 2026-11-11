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

  /* Carga inicial: três clínicas e uma conta de cada papel (as do "Acesso rápido" do login) */
  async function semear() {
    const b = ler();
    if (b.semente) return;
    const ipe = D.clinica;
    b.clinicas.push(
      { id: "ipe", nome: ipe.nome, unidade: ipe.unidade, cnpj: cnpjDe("123456780001"), telefone: ipe.telefone, endereco: ipe.endereco, cidade: "São Paulo", uf: "SP", codigo: "IPE-4821", publica: true },
      { id: "jacaranda", nome: "Clínica Jacarandá", unidade: "Unidade Cambuí", cnpj: cnpjDe("234567810001"), telefone: "(19) 3311-0000", endereco: "Rua dos Ipês, 88 — Cambuí", cidade: "Campinas", uf: "SP", codigo: "JAC-2093", publica: true },
      { id: "aroeira", nome: "Centro Médico Aroeira", unidade: "Unidade Tatuapé", cnpj: cnpjDe("345678120001"), telefone: "(11) 2200-0000", endereco: "Av. das Aroeiras, 1500 — Tatuapé", cidade: "São Paulo", uf: "SP", codigo: "ARO-7716", publica: true },
    );
    const contas = [
      { nome: "Renata Albuquerque", email: "dono@clinicaipe.com.br", senha: "dono1234", papel: "dono", clinicaId: "ipe" },
      { nome: "Carla Mendes", email: "recepcao@clinicaipe.com.br", senha: "recepcao123", papel: "recepcao", clinicaId: "ipe" },
      { nome: "Dr. Paulo Menezes", email: "paulo.menezes@clinicaipe.com.br", senha: "medico123", papel: "medico", clinicaId: "ipe", medicoId: "paulo" },
      { nome: "Juliana Santos", email: "juliana.santos@email.com", senha: "paciente123", papel: "paciente", clinicaId: null },
      { nome: "Marta Ferraz", email: "recepcao@clinicajacaranda.com.br", senha: "recepcao123", papel: "recepcao", clinicaId: "jacaranda" },
      { nome: "Dr. Marcos Vieira", email: "marcos.vieira@clinicajacaranda.com.br", senha: "medico123", papel: "medico", clinicaId: "jacaranda", medicoId: "marcos" },
    ];
    for (const c of contas) {
      b.usuarios.push({ id: novoId("u"), nome: c.nome, email: c.email, senha: await resumo(c.senha), papel: c.papel, clinicaId: c.clinicaId, medicoId: c.medicoId || null });
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
    const clinica = {
      id: novoId("c"), nome: c.nome.trim(), unidade: (c.unidade || "").trim() || "Unidade principal",
      cnpj: formatarCNPJ(c.cnpj), telefone: formatarTelefone(c.telefone), endereco: c.endereco.trim(),
      cidade: c.cidade.trim(), uf: c.uf.trim().toUpperCase(), codigo: gerarCodigo(c.nome), publica: c.publica !== false,
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
    ["nome", "unidade", "endereco", "cidade"].forEach((k) => { if (campos[k] !== undefined) c[k] = String(campos[k]).trim(); });
    if (campos.uf !== undefined) c.uf = String(campos.uf).trim().toUpperCase();
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
     dados = { nome, email, medicoId } → { usuario, senhaProvisoria } */
  async function cadastrarContaMedico(dados) {
    await pronto;
    exigir(["dono", "recepcao"]);
    const c = clinicaAtual();
    if (emailEmUso(dados.email)) throw new Error("Este e-mail já tem uma conta.");
    const senhaProvisoria = gerarSenhaProvisoria();
    const u = { id: novoId("u"), nome: dados.nome.trim(), email: dados.email.toLowerCase().trim(), senha: await resumo(senhaProvisoria), papel: "medico", clinicaId: c.id, medicoId: dados.medicoId, provisoria: true };
    ler().usuarios.push(u);
    gravar();
    return { usuario: u, senhaProvisoria };
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

  /* POST /api/pacientes */
  async function cadastrarPaciente(dados) {
    await pronto;
    if (emailEmUso(dados.email)) throw new Error("Este e-mail já tem uma conta. Entre com ele ou use outro.");
    const u = {
      id: novoId("u"), nome: dados.nome.trim(), email: dados.email.toLowerCase().trim(), senha: await resumo(dados.senha),
      papel: "paciente", clinicaId: null, telefone: dados.telefone || "", documento: dados.documento || "", nascimento: dados.nascimento || "",
    };
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
      .filter((c) => c.publica && (!t || [c.nome, c.cidade, c.unidade, c.endereco].some((x) => semAcento(x).includes(t))))
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
    D.clinica.unidade = c.unidade;
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
    cadastrarPaciente, buscarClinicas, clinicaPorCodigo, vincularClinica, clinicasDoPaciente,
    validarCNPJ, formatarCNPJ, formatarTelefone,
  };
})();
