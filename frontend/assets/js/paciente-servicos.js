/* AgendaPro Saúde — dados e ações da área do paciente, pela API (rotas em backend/docs/especificacao-api.md).
   carregar() busca família, consultas, fila, acompanhamento, prevenção, avisos, situação, especialidades, horários
   livres e feriados, e deixa tudo em window.DADOS no formato que as telas já usam. Cada ação chama a API e
   carrega de novo. O {id} das rotas /api/pacientes/{id}/... é o idUsuario da sessão: a API confere com o token.
   Nada aqui envolve dinheiro: cancelar nunca gera custo. */
(function () {
  "use strict";

  const D = window.DADOS;
  const API = window.API;
  const A = window.AP;
  const eu = API.usuarioAtual();
  const clinica = API.clinicaAtual();
  const CONTA = eu ? "/api/pacientes/" + eu.id : null;

  /* A área do paciente começa vazia: nada da carga simulada aparece aqui */
  function zerar() {
    D.titular = null;
    D.pessoas = [];
    D.consultas = [];
    D.passadas = [];
    D.espera = null;
    D.acompanhamento = { retornos: [], exames: [] };
    D.prevencao = [];
    D.examesPrevencaoGerais = []; /* as gerais já vêm dentro dos exames de cada mês (F30) */
    D.notificacoes = [];
    D.medicos = [];
    D.especialidades = {};
    D.horarios = {};
    D.filas = {};
    D.feriados = [];
  }
  zerar();

  /* ─── Idade pela data de nascimento (F6): a API não manda idade ─── */
  function idade(nascimento, hojeIso) {
    if (!nascimento) return null;
    const n = A.data(nascimento), h = A.data(hojeIso || D.hoje);
    let anos = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) anos -= 1;
    return anos;
  }
  const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  /* A pediatria é reconhecida pelo NOME (F2): atende só menores de 18 anos */
  const ehPediatria = (nomeEspecialidade) => semAcento(nomeEspecialidade) === "pediatria";

  /* Ilustração do familiar: não existe no banco, fica só neste navegador (por pessoa) */
  const CHAVE_AVATAR = "agendapro.avatar.";
  function lerAvatar(id) {
    try { return JSON.parse(localStorage.getItem(CHAVE_AVATAR + id)) || null; } catch (e) { return null; }
  }
  function salvarAvatar(id, avatar) {
    try { localStorage.setItem(CHAVE_AVATAR + id, JSON.stringify(avatar)); } catch (e) { /* sem armazenamento */ }
    const p = D.pessoas.find((x) => A.mesmoId(x.id, id));
    if (p) p.avatar = avatar;
  }

  /* ─── Da API para o formato das telas ─── */
  /* Familiar: { id, nome, curto, cpf, relacao, nascimento, cor, alergias, titular } */
  function pessoaDaApi(f) {
    return {
      id: f.id, nome: f.nome, curto: f.curto, tratamento: f.titular ? "você" : f.curto,
      relacao: f.relacao, nascimento: f.nascimento, idade: idade(f.nascimento), cpf: f.cpf,
      cor: f.cor, alergias: f.alergias || "Nenhuma informada" /* F35: sem alergias, a API manda null */,
      alergiasApi: f.alergias, titular: f.titular, avatar: lerAvatar(f.id),
    };
  }

  /* Médicos e especialidades vêm junto das consultas, da fila e dos horários livres */
  const CORES_MEDICO = ["#d9ecf8", "#fde3d3", "#e3f2dc", "#efe2f5", "#f9e9b9", "#d6efe6", "#f7d9dc", "#dfe6f6", "#e6f1d4", "#fbe0ea"];
  function registrarEspecialidade(e) {
    if (e && !D.especialidades[e.id]) D.especialidades[e.id] = { nome: e.nome, desc: "", duracao: e.duracao || null };
    return e ? e.id : null;
  }
  function registrarMedico(m, especialidade) {
    if (!m) return null;
    const esp = registrarEspecialidade(especialidade);
    let x = D.medicos.find((k) => A.mesmoId(k.id, m.id));
    if (!x) {
      x = { id: m.id, nome: m.nome, esp, sala: m.sala || "", cor: CORES_MEDICO[D.medicos.length % CORES_MEDICO.length] };
      D.medicos.push(x);
    }
    if (esp && !x.esp) x.esp = esp;
    if (m.sala && !x.sala) x.sala = m.sala;
    return x.id;
  }

  /* Consulta: { id, data, hora, sala, status, motivo, tipo, titulo, presencaConfirmada, pessoa, medico, especialidade } */
  function consultaDaApi(c) {
    return {
      id: c.id, pessoa: c.pessoa ? c.pessoa.id : null, medico: registrarMedico(c.medico, c.especialidade),
      data: c.data, hora: c.hora, sala: c.sala || (c.medico && c.medico.sala) || "", status: c.status,
      motivo: c.motivo || "", tipo: c.tipo, titulo: c.titulo, presencaConfirmada: !!c.presencaConfirmada,
    };
  }

  const ICONE_AVISO = { VAGA_OFERECIDA: "bell-ring", CONSULTA_CONFIRMADA: "calendar-days", RESTRICAO: "info" };
  function quando(dataIso) {
    const n = A.diasAte(dataIso);
    if (n === 0) return "Hoje";
    if (n === -1) return "Ontem";
    return A.curto(dataIso);
  }

  /* ─── Carregar tudo ─── */
  let situacaoAtual = { faltas: 0, restricao: "normal", ate: null };

  async function carregar() {
    const hoje = A.data(D.hoje);
    const ate = new Date(hoje.getFullYear(), hoje.getMonth() + 7, 0);
    const de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const [familia, consultas, fila, acompanhamento, prevencao, avisos, situacao, especialidades, feriados] = await Promise.all([
      API.chamar("GET", CONTA + "/familiares"),
      API.chamar("GET", CONTA + "/consultas"),
      API.chamar("GET", CONTA + "/lista-espera"),
      API.chamar("GET", CONTA + "/acompanhamento"),
      API.chamar("GET", CONTA + "/prevencao"),
      API.chamar("GET", CONTA + "/notificacoes"),
      API.chamar("GET", CONTA + "/situacao"),
      API.chamar("GET", "/api/clinicas/" + clinica.id + "/especialidades"),
      API.chamar("GET", "/api/feriados?de=" + API.dataISO(de) + "&ate=" + API.dataISO(ate)),
    ]);
    /* horários livres de cada especialidade da clínica: GET /api/especialidades/{id}/horarios-livres (F26: lista) */
    const livres = await Promise.all(especialidades.map((e) => API.chamar("GET", "/api/especialidades/" + e.id + "/horarios-livres")));

    zerar();
    especialidades.forEach((e) => { D.especialidades[e.id] = { nome: e.nome, desc: "", duracao: e.duracao }; });
    livres.forEach((lista, i) => lista.forEach((x) => {
      const id = registrarMedico(x.medico, especialidades[i]);
      D.horarios[id] = x.dias;
    }));

    D.pessoas = familia.map(pessoaDaApi);
    const titular = D.pessoas.find((p) => p.titular) || D.pessoas[0];
    D.titular = titular ? titular.id : null;

    D.consultas = consultas.proximas.map(consultaDaApi);
    D.passadas = consultas.passadas.map(consultaDaApi);

    D.espera = fila && fila.naFila ? {
      id: fila.id, pessoa: fila.pessoa.id, medico: registrarMedico(fila.medico, fila.especialidade),
      posicao: fila.posicao, naFila: fila.naFila, desde: fila.desde,
      vaga: fila.vagaOferecida ? { data: fila.vagaOferecida.data, hora: fila.vagaOferecida.hora, expiraEm: fila.vagaOferecida.expiraEm } : null,
      oferta: !!fila.vagaOferecida,
    } : null;

    D.acompanhamento = {
      retornos: acompanhamento.retornos.map((r) => ({
        id: r.id, pessoa: r.pessoa.id, titulo: r.titulo, medico: registrarMedico(r.medico, r.especialidade),
        esp: r.especialidade ? r.especialidade.id : null, prazo: r.prazo, origem: r.origem,
      })),
      exames: acompanhamento.exames.map((x) => ({
        id: x.id, pessoa: x.pessoa.id, titulo: x.titulo, pedidoPor: x.pedidoPor ? registrarMedico(x.pedidoPor, null) : null,
        status: x.status, obs: x.obs, origem: x.origem,
      })),
    };

    D.prevencao = prevencao.map((m) => ({
      id: m.id, mes: m.mes, campanha: m.campanha, tema: m.tema, exames: m.exames,
      itens: m.itens.map((i) => ({ id: i.id, pessoa: i.pessoa.id, exame: i.exame, titulo: i.titulo, nota: i.nota || "", especialidade: i.especialidade, status: i.status, consulta: i.consulta || undefined })),
    }));

    D.notificacoes = avisos.map((n) => ({ id: n.id, tipo: n.tipo, icone: ICONE_AVISO[n.tipo] || "bell", texto: n.mensagem, quando: quando(n.dataEnvio), nova: !n.lida }));
    D.feriados = feriados.map((f) => ({ data: f.data, nome: f.nome }));
    situacaoAtual = situacao;
    return D;
  }

  /* ─── Começar a tela só com os dados da API ───
     Se a API não responder, a tela mostra o erro e "Tentar de novo" (nada quebra). */
  function iniciar(montarTela) {
    const alvo = document.querySelector("main") || document.body;
    const espera = document.createElement("p");
    espera.className = "carregando-area";
    espera.setAttribute("role", "status");
    espera.textContent = "Carregando seus dados…";
    alvo.prepend(espera);
    carregar().then(() => {
      espera.remove();
      montarTela();
      vigiarVaga();
    }).catch((e) => {
      if (e && e.status === 401) return; /* api.js já voltou ao login */
      espera.className = "carregando-area carregando-area--erro";
      espera.setAttribute("role", "alert");
      espera.innerHTML = A.esc(e.message) + ' <button type="button" class="botao botao--secundario botao--pequeno">Tentar de novo</button>';
      espera.querySelector("button").addEventListener("click", () => { espera.remove(); iniciar(montarTela); });
    });
  }

  /* ─── Confirmação de presença ───
     PUT /api/consultas/{id}/presenca  { vou }. O cartão aparece a partir do início da véspera; "Não vou" cancela. */
  function paraConfirmar() {
    return D.consultas.filter((c) => c.status === "confirmada" && !c.presencaConfirmada && D.hoje >= somaDias(c.data, -1) && D.hoje <= c.data);
  }
  function somaDias(iso, n) { const d = A.data(iso); d.setDate(d.getDate() + n); return API.dataISO(d); }
  async function confirmarPresenca(c) {
    await API.chamar("PUT", "/api/consultas/" + c.id + "/presenca", { vou: true });
    await carregar();
  }
  /* "Não vou": a API cancela com as mesmas regras do cancelamento e responde { falta, oferecidoAFila } */
  async function naoVou(c) {
    const r = await API.chamar("PUT", "/api/consultas/" + c.id + "/presenca", { vou: false });
    await carregar();
    return r;
  }

  /* ─── Cancelar ───
     DELETE /api/consultas/{id} → { falta, oferecidoAFila } (F19). O próprio banco oferece o horário ao 1º da fila.
     Até o fim da véspera: nenhuma consequência. No próprio dia, depois de "Vou": falta sem aviso (aviso antes). */
  function vaiContarFalta(c) {
    return !!c.presencaConfirmada && new Date() > D.avisoAte(c.data);
  }
  async function cancelar(c) {
    const r = await API.chamar("DELETE", "/api/consultas/" + c.id);
    await carregar();
    return r;
  }

  /* ─── Marcar ─── POST /api/consultas { pessoa, medico, data, hora, motivo } (F22). Devolve a consulta criada.
     Com itemPrevencao, a consulta fica ligada ao item (PUT /api/prevencao/{id}). */
  async function marcar(d) {
    const c = await API.chamar("POST", "/api/consultas", {
      pessoa: Number(d.pessoa), medico: Number(d.medico), data: d.data, hora: d.hora, motivo: d.motivo || null,
    });
    if (d.itemPrevencao) await API.chamar("PUT", "/api/prevencao/" + d.itemPrevencao, { status: "agendado", idConsulta: c.id });
    await carregar();
    return consultaDaApi(c);
  }

  /* ─── Faltas e restrição (F5) ───
     GET /api/pacientes/{id}/situacao → { faltas, restricao: "normal" | "so_fila" | "so_recepcao", ate } */
  function situacao() {
    return { faltas: situacaoAtual.faltas, restricao: situacaoAtual.restricao, tipo: situacaoAtual.restricao, ate: situacaoAtual.ate };
  }
  function avisoDeRestricao() {
    const s = situacao();
    const ate = s.ate ? A.extenso(s.ate, false) : "";
    if (s.restricao === "so_fila") {
      return { tipo: s.restricao, titulo: "Por enquanto, você pode agendar só pela lista de espera",
        texto: " Houve " + D.FALTAS_PARA_RESTRICAO + " faltas sem aviso depois de confirmar presença." + (ate ? " Isso vale até " + ate + "." : "") };
    }
    if (s.restricao === "so_recepcao") {
      return { tipo: s.restricao, titulo: "Por enquanto, agende pela recepção da clínica",
        texto: " Houve uma nova falta sem aviso durante a restrição." + (ate ? " Isso vale até " + ate + "." : "") };
    }
    return null;
  }
  function textoDaRegra() {
    return "Se não puder ir, avise até o fim do dia anterior (“Não vou” ou cancelar): não há nenhuma consequência. " +
      "Cancelar no próprio dia depois de ter confirmado “Vou” conta como falta. " + D.FALTAS_PARA_RESTRICAO + " faltas sem aviso deixam o agendamento só pela lista de espera por " + D.DIAS_DE_RESTRICAO + " dias.";
  }
  function textoDasFaltas() {
    const n = situacao().faltas;
    return "Você tem " + n + (n === 1 ? " falta registrada" : " faltas registradas") + ".";
  }

  /* ─── Família ───
     POST /api/pacientes/{id}/familiares e PUT /api/pacientes/{id}/familiares/{idPessoa}
     corpo { nome, cpf (11 dígitos), relacao, nascimento (AAAA-MM-DD), alergias, cor }.
     CPF, parentesco e nascimento são obrigatórios; a idade é calculada pela data (F6). */
  const PARENTESCOS = ["Filho(a)", "Cônjuge", "Pai/Mãe", "Irmão(ã)", "Outro"];
  const CORES_FAMILIA = ["#FBDCC6", "#D9ECF8", "#E3F2DC", "#EFE2F5", "#F9E9B9", "#FBE0EA"];
  /* d = { nome, cpf, relacao, nascimento: "dd/mm/aaaa", alergias, cor } → { erros, dados } (conferência da tela;
     a API confere de novo, inclusive se o CPF já existe) */
  function validarFamiliar(d, titular) {
    const erros = {};
    const nome = String(d.nome || "").trim().replace(/\s+/g, " ");
    if (!nome) erros.nome = "Informe o nome do familiar.";
    if (!API.validarCPF(d.cpf)) erros.cpf = API.ERRO_CPF;
    if (!titular && !PARENTESCOS.includes(d.relacao)) erros.relacao = "Escolha o parentesco.";
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d.nascimento || "").trim());
    const iso = m ? m[3] + "-" + m[2] + "-" + m[1] : null;
    const valida = iso && API.dataISO(A.data(iso)) === iso;
    if (!valida) erros.nascimento = "Informe a data de nascimento no formato dd/mm/aaaa.";
    else if (iso > D.hoje) erros.nascimento = "A data de nascimento não pode ser no futuro.";
    if (Object.keys(erros).length) return { erros, dados: null };
    return {
      erros,
      dados: {
        nome, cpf: String(d.cpf).replace(/\D/g, ""), relacao: titular ? "Titular" : d.relacao, nascimento: iso,
        alergias: String(d.alergias || "").trim() || null, cor: d.cor || CORES_FAMILIA[D.pessoas.length % CORES_FAMILIA.length],
      },
    };
  }
  /* erro da API → campo do formulário */
  function campoDoErro(mensagem) {
    if (/CPF/.test(mensagem)) return "cpf";
    if (/parentesco/i.test(mensagem)) return "relacao";
    if (/nascimento/i.test(mensagem)) return "nascimento";
    if (/nome/i.test(mensagem)) return "nome";
    return null;
  }
  async function salvarFamiliar(d, idPessoa) {
    const existente = idPessoa ? D.pessoas.find((p) => A.mesmoId(p.id, idPessoa)) : null;
    const r = validarFamiliar(d, existente && existente.titular);
    if (!r.dados) return { erros: r.erros, familiar: null };
    if (existente && !d.cor) r.dados.cor = existente.cor; /* editar não troca a cor de identificação */
    try {
      const f = idPessoa
        ? await API.chamar("PUT", CONTA + "/familiares/" + idPessoa, r.dados)
        : await API.chamar("POST", CONTA + "/familiares", r.dados);
      if (d.avatar) salvarAvatar(f.id, d.avatar);
      await carregar();
      return { erros: {}, familiar: D.pessoas.find((p) => A.mesmoId(p.id, f.id)) };
    } catch (e) {
      const campo = campoDoErro(e.message);
      if (!campo) throw e;
      return { erros: { [campo]: e.message }, familiar: null };
    }
  }
  const adicionarFamiliar = (d) => salvarFamiliar(d, null);
  const editarFamiliar = (idPessoa, d) => salvarFamiliar(d, idPessoa);

  /* ─── Prevenção (Campanhas_Prevencao, Exames_Prevencao, Pessoa_Prevencao) ───
     Mês: { id, mes: "AAAA-MM", campanha, tema, exames, itens }; Item: { id, pessoa, exame, titulo, nota, especialidade, status, consulta? } */
  const SITUACOES_PREVENCAO = ["pendente", "agendado", "feito"];
  function sugestoesDoMes(mes) {
    return mes.exames || []; /* as gerais já vêm junto (F30) */
  }
  /* A prevenção respeita a idade: consulta de pediatria só para menores de 18 anos */
  function podeNaPrevencao(pessoa, exame) {
    if (!pessoa || !exame) return false;
    return !ehPediatria(exame.especialidade) || (pessoa.idade !== null && pessoa.idade < 18);
  }
  /* POST /api/pacientes/{id}/prevencao { mes, pessoa, exame } */
  async function incluirNaPrevencao(d) {
    const mes = D.prevencao.find((m) => m.mes === d.mes);
    if (!mes) throw new Error("Escolha uma campanha.");
    const p = D.pessoas.find((x) => A.mesmoId(x.id, d.pessoa));
    if (!p) throw new Error("Escolha quem vai entrar na prevenção.");
    const exame = sugestoesDoMes(mes).find((e) => A.mesmoId(e.id, d.exame));
    if (!exame) throw new Error("Escolha o exame ou check-up.");
    if (!podeNaPrevencao(p, exame)) throw new Error("A pediatria atende só crianças e adolescentes até 18 anos.");
    const item = await API.chamar("POST", CONTA + "/prevencao", { mes: d.mes, pessoa: Number(d.pessoa), exame: Number(d.exame) });
    await carregar();
    return itemPrevencao(item.id);
  }
  /* "Marcar": a especialidade pelo NOME na clínica aberta; devolve o id dela ou lança a mensagem */
  function especialidadeNaClinica(nome) {
    const id = Object.keys(D.especialidades).find((k) => semAcento(D.especialidades[k].nome) === semAcento(nome));
    if (!id) throw new Error("Esta clínica não atende essa especialidade.");
    return id;
  }
  /* PUT /api/prevencao/{id} { status, idConsulta? } */
  async function marcarItemPrevencao(idItem, status, idConsulta) {
    if (!SITUACOES_PREVENCAO.includes(status)) throw new Error("Situação inválida.");
    await API.chamar("PUT", "/api/prevencao/" + idItem, idConsulta ? { status, idConsulta: Number(idConsulta) } : { status });
    await carregar();
    return itemPrevencao(idItem);
  }
  const itemPrevencao = (id) => D.prevencao.reduce((achado, m) => achado || m.itens.find((i) => A.mesmoId(i.id, id)), null);

  /* ─── Lista de espera (F21) ───
     GET /api/pacientes/{id}/lista-espera (posição e vaga oferecida, com expiraEm em milissegundos)
     POST /api/lista-espera { pessoa, medico } · DELETE /api/lista-espera/{id} · PUT /api/lista-espera/{id}/vaga { aceitar } */
  async function entrarNaFila(pessoaId, medicoId) {
    await API.chamar("POST", "/api/lista-espera", { pessoa: Number(pessoaId), medico: Number(medicoId) });
    await carregar();
    return D.espera;
  }
  async function sairDaFila() {
    if (!D.espera) return;
    await API.chamar("DELETE", "/api/lista-espera/" + D.espera.id);
    await carregar();
  }
  /* aceitar → devolve a consulta confirmada; recusar → null (a vaga passa ao próximo) */
  async function responderVaga(aceitar) {
    const e = D.espera;
    if (!e || !e.vaga) return null;
    const c = await API.chamar("PUT", "/api/lista-espera/" + e.id + "/vaga", { aceitar: !!aceitar });
    await carregar();
    return c ? consultaDaApi(c) : null;
  }
  /* segundos que faltam para responder à vaga (0 quando o prazo passou) */
  function segundosDaVaga() {
    const e = D.espera;
    if (!e || !e.vaga || !e.vaga.expiraEm) return 0;
    return Math.max(0, Math.round((e.vaga.expiraEm - Date.now()) / 1000));
  }

  /* ─── Avisos (F27) ─── PUT /api/pacientes/{id}/notificacoes/lidas */
  const avisosNovos = () => D.notificacoes.filter((n) => n.nova).length;
  async function lerTodosAvisos() {
    await API.chamar("PUT", CONTA + "/notificacoes/lidas");
    D.notificacoes.forEach((n) => { n.nova = false; });
  }

  /* ─── Vaga oferecida enquanto a tela está aberta ───
     Sem notificação push: a tela pergunta à API a cada 30 segundos se a fila mudou. */
  const ouvintes = [];
  let vigiando = false;
  function vigiarVaga() {
    if (vigiando) return;
    vigiando = true;
    /* só avisa a tela quando algo mudou: redesenhar à toa tiraria o foco e a rolagem de quem está lendo */
    const retrato = () => JSON.stringify([D.espera, D.consultas.map((c) => c.id + c.status + c.presencaConfirmada), D.notificacoes.length, situacaoAtual]);
    setInterval(async () => {
      if (document.hidden) return;
      const antes = retrato(), ofertaAntes = D.espera && D.espera.oferta;
      try { await carregar(); } catch (e) { return; }
      if (retrato() === antes) return;
      const ofertaAgora = D.espera && D.espera.oferta;
      ouvintes.forEach((fn) => fn(!ofertaAntes && ofertaAgora));
    }, 30000);
  }
  function aoMudar(fn) { ouvintes.push(fn); }

  window.PACIENTE = {
    iniciar, carregar, idade, ehPediatria,
    paraConfirmar, confirmarPresenca, naoVou, vaiContarFalta, cancelar, marcar,
    situacao, avisoDeRestricao, textoDaRegra, textoDasFaltas,
    PARENTESCOS, CORES_FAMILIA, validarFamiliar, adicionarFamiliar, editarFamiliar, salvarAvatar,
    sugestoesDoMes, podeNaPrevencao, incluirNaPrevencao, marcarItemPrevencao, itemPrevencao, especialidadeNaClinica,
    entrarNaFila, sairDaFila, responderVaga, segundosDaVaga,
    avisosNovos, lerTodosAvisos, aoMudar,
    salvar() { /* os dados ficam na API: nada a gravar no navegador */ },
  };
})();
