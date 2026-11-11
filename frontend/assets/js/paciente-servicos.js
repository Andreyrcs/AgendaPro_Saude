/* AgendaPro Saúde — as ações do paciente que mexem na clínica: confirmar presença ("Vou" / "Não vou"),
   cancelar, marcar, responder a vaga da lista de espera e sair da fila, mais as faltas e a restrição.
   Usa a mesma agenda e a mesma fila da recepção (clinica-dados.js) e guarda o que o paciente muda,
   por conta (até a API ficar pronta). Com a API, cada função vira a chamada indicada ao lado dela.
   Nada aqui envolve dinheiro: cancelar nunca gera custo. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const API = window.API;
  const A = window.AP;
  const eu = API.usuarioAtual();
  const CHAVE = "agendapro.paciente.v2." + (eu ? eu.id : "anonimo");

  /* ─── Quem está logado ───
     A conta da Juliana (carga inicial) já vem com a família e as consultas dela.
     Qualquer outra conta começa só com a própria pessoa e sem consultas. */
  if (eu && eu.email !== "juliana.santos@email.com") {
    const primeiro = eu.nome.split(" ")[0];
    D.pessoas = [{
      id: "eu", nome: eu.nome, curto: primeiro, tratamento: "você", relacao: "Titular", nascimento: eu.nascimento || null,
      idade: eu.nascimento ? new Date().getFullYear() - Number(eu.nascimento.slice(0, 4)) - (D.hoje.slice(5) < eu.nascimento.slice(5) ? 1 : 0) : null, genero: null,
      cor: "var(--id-juliana)", alergias: "Nenhuma informada",
      avatar: { pele: "#c68642", cabelo: "cacheado", corCabelo: "#2b1b12", roupa: "#12263f" },
    }];
    D.titular = "eu";
    D.consultas = [];
    D.passadas = [];
    D.espera = null;
    D.acompanhamento = { retornos: [], exames: [] };
    D.prevencao.forEach((m) => { m.itens = []; });
    D.notificacoes = [];
  }

  /* o que esta conta já mudou (consultas, família, fila) volta ao abrir a página */
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo) ["consultas", "passadas", "pessoas", "espera"].forEach((k) => { if (salvo[k] !== undefined) D[k] = salvo[k]; });
    /* prevenção: os meses seguem a data de hoje; os itens de cada mês voltam como foram salvos */
    if (salvo && salvo.prevencao) D.prevencao.forEach((m) => { const s2 = salvo.prevencao.find((x) => x.mes === m.mes); if (s2) m.itens = s2.itens; });
  } catch (e) { /* sem armazenamento */ }
  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ consultas: D.consultas, passadas: D.passadas, pessoas: D.pessoas, espera: D.espera, prevencao: D.prevencao }));
    } catch (e) { /* sem armazenamento */ }
  }
  /* grava sozinho quando a pessoa sai ou troca de aba */
  window.addEventListener("pagehide", salvar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) salvar(); });

  const pessoa = (id) => D.pessoas.find((p) => p.id === id) || { nome: id };
  const titular = () => pessoa(D.titular).nome;
  const nomesDaFamilia = () => D.pessoas.map((p) => p.nome);
  const naAgenda = (c) => ({ origem: c.id, medico: c.medico, data: c.data, hora: c.hora, paciente: pessoa(c.pessoa).nome });

  /* ─── Horários livres ───
     GET /api/especialidades/{id}/horarios-livres
     São os mesmos horários "livre" que a recepção vê na agenda da clínica. */
  function atualizarHorarios() {
    const livres = C.horariosLivres();
    D.horarios = {};
    D.medicos.forEach((m) => { if (livres[m.id]) D.horarios[m.id] = livres[m.id]; });
  }

  /* ─── Confirmação de presença ───
     PUT /api/consultas/{id}/presenca   corpo { "vou": true | false }
     O cartão aparece a partir do início da véspera; "Não vou" cancela. */
  function paraConfirmar() {
    const vespera = (c) => C.somaDias(c.data, -1);
    return D.consultas.filter((c) => c.status === "confirmada" && !c.presencaConfirmada && D.hoje >= vespera(c) && D.hoje <= c.data);
  }
  function confirmarPresenca(c) {
    c.presencaConfirmada = true;
    const k = C.consultaDoPaciente(naAgenda(c));
    if (k) C.confirmarPresenca(k);
    salvar();
  }

  /* ─── Cancelar ("Não vou" também passa por aqui) ───
     DELETE /api/consultas/{id}  → a consulta fica "cancelada" e o horário volta a "livre"
     (ou é "oferecido" à 1ª pessoa da lista de espera daquele médico, que tem 30 min para aceitar).
     Até o fim da véspera: nenhuma consequência. No próprio dia, depois de "Vou": falta sem aviso. */
  function vaiContarFalta(c) {
    return !!c.presencaConfirmada && new Date() > D.avisoAte(c.data);
  }
  function cancelar(c) {
    D.consultas = D.consultas.filter((k) => k !== c);
    c.status = "cancelada";
    c.canceladaEm = new Date().toISOString();
    D.passadas.push(c);
    const r = C.cancelarPeloPaciente(naAgenda(c));
    let oferecidoA = null;
    const fila = D.filas[c.medico] || [];
    if (r.horario && fila.length) {
      const p = fila.shift();
      C.guardar.saiuDaFila(c.medico, p.nome);
      C.oferecerHorario(r.horario, p.nome);
      oferecidoA = p.nome;
    }
    atualizarHorarios();
    salvar();
    return { falta: r.falta, oferecidoA };
  }

  /* ─── Marcar ─── POST /api/consultas */
  function marcar(c) {
    const k = C.marcarConsulta({ origem: c.id, medico: c.medico, data: c.data, hora: c.hora, paciente: pessoa(c.pessoa).nome });
    if (k && c.motivo) { k.motivo = c.motivo; C.salvar(); }
    atualizarHorarios();
    salvar();
  }

  /* ─── Faltas e restrição ───
     GET /api/pacientes/{id}/situacao  → { faltas, restricao: "normal" | "so_fila" | "so_recepcao", ate }
     Vale para a conta toda (o titular responde pelas consultas da família). */
  function situacao() {
    return C.restricaoDe(nomesDaFamilia());
  }
  /* explicação curta para a tela de agendamento (e o que bloquear) */
  function avisoDeRestricao() {
    const s = situacao();
    const ate = s.ate ? A.extenso(s.ate, false) : "";
    if (s.tipo === "so_fila") {
      return { tipo: s.tipo, titulo: "Por enquanto, só pela lista de espera",
        texto: "Houve " + D.FALTAS_PARA_RESTRICAO + " faltas sem aviso depois de confirmar presença. Até " + ate + " você pode entrar na lista de espera, mas não marcar direto." };
    }
    if (s.tipo === "so_recepcao") {
      return { tipo: s.tipo, titulo: "Agende pela recepção",
        texto: "Houve uma nova falta sem aviso durante a restrição. Até " + ate + ", as consultas são marcadas pela recepção da clínica." };
    }
    return null;
  }
  /* a regra, para mostrar antes de confirmar um agendamento */
  function textoDaRegra() {
    return "Se não puder ir, avise até o fim do dia anterior (“Não vou” ou cancelar): não há nenhuma consequência. " +
      "Cancelar no próprio dia depois de ter confirmado “Vou” conta como falta. " + D.FALTAS_PARA_RESTRICAO + " faltas sem aviso deixam o agendamento só pela lista de espera por " + D.DIAS_DE_RESTRICAO + " dias.";
  }
  function textoDasFaltas() {
    const n = situacao().faltas;
    return "Você tem " + n + (n === 1 ? " falta registrada" : " faltas registradas") + ".";
  }

  /* ─── Família ───
     POST /api/pacientes/{id}/familiares   corpo { nome, parentesco, nascimento: "AAAA-MM-DD", alergias, cor }
     Parentesco e data de nascimento são obrigatórios (tabela Pacientes); a idade é calculada pela data. */
  const PARENTESCOS = ["Filho(a)", "Cônjuge", "Pai/Mãe", "Irmão(ã)", "Outro"];
  const CORES_FAMILIA = ["#fbdcc6", "#d9ecf8", "#e3f2dc", "#efe2f5", "#f9e9b9", "#fbe0ea"];
  /* d = { nome, relacao, nascimento: "dd/mm/aaaa", alergias, cor } → { erros, familiar } */
  function validarFamiliar(d) {
    const erros = {};
    const nome = String(d.nome || "").trim().replace(/\s+/g, " ");
    if (!nome) erros.nome = "Informe o nome do familiar.";
    if (!PARENTESCOS.includes(d.relacao)) erros.relacao = "Escolha o parentesco.";
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d.nascimento || "").trim());
    const iso = m ? m[3] + "-" + m[2] + "-" + m[1] : null;
    const valida = iso && C.iso(C.data(iso)) === iso;
    if (!valida) erros.nascimento = "Informe a data de nascimento no formato dd/mm/aaaa.";
    else if (iso > D.hoje) erros.nascimento = "A data de nascimento não pode ser no futuro.";
    if (Object.keys(erros).length) return { erros, familiar: null };
    const hoje = C.data(D.hoje), nasc = C.data(iso);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade -= 1;
    const curto = nome.split(" ")[0];
    return {
      erros,
      familiar: {
        id: "novo-" + Date.now(), nome, curto, tratamento: curto, relacao: d.relacao, nascimento: iso, idade,
        cor: d.cor || CORES_FAMILIA[D.pessoas.length % CORES_FAMILIA.length],
        alergias: String(d.alergias || "").trim() || "Nenhuma informada", genero: null,
      },
    };
  }
  function adicionarFamiliar(d) {
    const r = validarFamiliar(d);
    if (r.familiar) { D.pessoas.push(r.familiar); salvar(); }
    return r;
  }

  /* ─── Prevenção (tabelas Campanhas_Prevencao e Pessoa_Prevencao) ───
     As mesmas funções, regras e mensagens do app (aplicativo/src/servicos/prevencao.js).
     Formato: [{ mes: "AAAA-MM", campanha, tema, itens: [{ id, pessoa, titulo, status, nota, esp, consulta? }] }]
     status: "pendente" | "agendado" | "feito"; consulta = id da consulta marcada a partir do item. */
  const SITUACOES_PREVENCAO = ["pendente", "agendado", "feito"];
  /* o que faz sentido pedir em cada campanha; todo mês também aceita os itens gerais */
  const SUGESTOES_PREVENCAO = {
    "Outubro Rosa": [
      { titulo: "Mamografia", nota: "A cada 2 anos, dos 50 aos 74 anos", esp: "ginecologia" },
      { titulo: "Consulta com ginecologista", nota: "Inclui o exame clínico das mamas", esp: "ginecologia" },
    ],
    "Novembro Azul": [
      { titulo: "Exame de próstata (PSA)", nota: "Conforme orientação médica, a partir dos 50 anos", esp: "clinica" },
    ],
    "Janeiro Branco": [
      { titulo: "Consulta de saúde mental", nota: "Conversa sobre sono, humor e estresse", esp: "psiquiatria" },
    ],
    "Março Lilás": [
      { titulo: "Exame preventivo (Papanicolau)", nota: "Frequência conforme orientação médica", esp: "ginecologia" },
    ],
    "Vacinação contra a gripe": [{ titulo: "Vacina da gripe", nota: "Grupo prioritário: 60 anos ou mais", esp: null }],
  };
  const GERAIS_PREVENCAO = [
    { titulo: "Check-up anual com clínica geral", nota: "Uma vez por ano", esp: "clinica" },
    { titulo: "Revisão no dentista", nota: "A cada 6 meses", esp: null },
  ];
  /* lista de { titulo, nota, esp } que o paciente pode escolher para um mês */
  function sugestoesDoMes(mes) {
    const especificas = SUGESTOES_PREVENCAO[mes.campanha] || [];
    return especificas.concat(GERAIS_PREVENCAO.filter((g) => !especificas.some((s) => s.titulo === g.titulo)));
  }
  /* POST /api/pacientes/{id}/prevencao — inclui uma pessoa da família numa campanha.
     d = { mes: "AAAA-MM", pessoa: id, titulo, nota, esp }. Lança erro com a mesma frase do app. */
  function incluirNaPrevencao(d) {
    const mes = D.prevencao.find((m) => m.mes === d.mes);
    if (!mes) throw new Error("Escolha uma campanha.");
    if (!D.pessoas.some((p) => p.id === d.pessoa)) throw new Error("Escolha quem vai entrar na prevenção.");
    if (!d.titulo) throw new Error("Escolha o exame ou check-up.");
    if (mes.itens.some((i) => i.pessoa === d.pessoa && i.titulo === d.titulo)) throw new Error("Essa pessoa já está nesse item da prevenção.");
    const item = { id: "prev" + Date.now().toString(36), pessoa: d.pessoa, titulo: d.titulo, status: "pendente", nota: d.nota || "", esp: d.esp === undefined ? null : d.esp };
    mes.itens.push(item);
    salvar();
    return item;
  }
  /* PUT /api/prevencao/{id} — status e, ao agendar, a consulta ligada ao item (Pessoa_Prevencao.IdConsulta) */
  function marcarItemPrevencao(idItem, status, idConsulta) {
    if (!SITUACOES_PREVENCAO.includes(status)) throw new Error("Situação inválida.");
    for (const mes of D.prevencao) {
      const item = mes.itens.find((i) => i.id === idItem);
      if (item) {
        item.status = status;
        if (status === "pendente") delete item.consulta;
        const c = idConsulta && D.consultas.find((x) => x.id === idConsulta);
        if (c) {
          item.consulta = c.id;
          c.tipo = "prevencao"; /* na agenda, a consulta aparece como "Prevenção" */
          c.titulo = item.titulo;
          c.prevencao = item.id;
          c.motivo = item.titulo;
        }
        salvar();
        return item;
      }
    }
    throw new Error("Item de prevenção não encontrado.");
  }
  const itemPrevencao = (id) => D.prevencao.reduce((achado, m) => achado || m.itens.find((i) => i.id === id), null);

  /* ─── Lista de espera ───
     GET /api/pacientes/{id}/lista-espera  (posição e vaga oferecida)
     PUT /api/lista-espera/{id}/vaga       (aceitar ou recusar)
     DELETE /api/lista-espera/{id}         (sair da fila) */
  function sincronizar() {
    return C.sincronizarEspera(D.espera, titular());
  }
  function responderVaga(aceitar) {
    const e = D.espera;
    if (!e || !e.vaga) return;
    const h = C.consultas.find((k) => k.id === e.vaga.id && k.horario === "oferecido");
    if (h) C.responderVaga(h, aceitar);
    if (aceitar) { e.resolvida = true; }
    e.oferta = false;
    e.vaga = null;
    atualizarHorarios();
    salvar();
  }
  /* POST /api/lista-espera — entra no fim da fila do médico (bloqueado quando só pode agendar com a recepção) */
  function entrarNaFila(medicoId) {
    if (situacao().tipo === "so_recepcao") return null;
    const p = { nome: titular(), desde: D.hoje, tel: "", app: true };
    const lista = D.filas[medicoId] || (D.filas[medicoId] = []);
    if (!lista.some((x) => x.nome === p.nome)) { lista.push(p); C.guardar.entrouNaFila(medicoId, p); }
    const pos = lista.findIndex((x) => x.nome === p.nome) + 1;
    D.espera = { pessoa: D.titular, medico: medicoId, posicao: pos, naFila: lista.length, desde: D.hoje, notificar: true, sms: false, vaga: null };
    salvar();
    return D.espera;
  }
  function sairDaFila() {
    const e = D.espera;
    if (!e) return;
    C.guardar.saiuDaFila(e.medico, titular());
    e.resolvida = true;
    salvar();
  }
  /* ─── Retornos e exames pedidos pelo médico ───
     GET /api/pacientes/{id}/acompanhamento  (tabelas Retornos e Exames)
     Junta aos da carga inicial os que o médico pediu na agenda da clínica, para as pessoas da família. */
  const BASE_ACOMP = { retornos: (D.acompanhamento.retornos || []).slice(), exames: (D.acompanhamento.exames || []).slice() };
  function sincronizarAcompanhamento() {
    const porNome = (nome) => (D.pessoas.find((x) => x.nome === nome) || {}).id;
    const medicoDe = (id) => D.medicos.find((m) => m.id === id) || { nome: "", esp: null };
    const retornos = C.retornosDe(nomesDaFamilia())
      .filter((r) => r.status === "encaminhado" || r.status === "agendado")
      .map((r) => ({
        id: r.id, pessoa: porNome(r.paciente), titulo: "Retorno com " + medicoDe(r.medico).nome, medico: r.medico,
        esp: medicoDe(r.medico).esp, prazo: r.data || D.hoje,
        origem: (r.status === "encaminhado" ? "A recepção vai combinar a data com você" : "Data indicada pelo médico") + (r.nota ? " · " + r.nota : ""),
      }));
    const exames = C.examesDe(nomesDaFamilia())
      .filter((e) => e.status === "pendente")
      .map((e) => ({ id: e.id, pessoa: porNome(e.paciente), titulo: e.nome, pedidoPor: e.medico, status: "pendente", obs: "Pedido por " + medicoDe(e.medico).nome, origem: "" }));
    D.acompanhamento.retornos = BASE_ACOMP.retornos.concat(retornos);
    D.acompanhamento.exames = BASE_ACOMP.exames.concat(exames);
  }

  /* a recepção mudou a fila, a agenda ou as faltas (em outra aba deste navegador) */
  function aoMudar(fn) {
    C.aoMudar(() => { atualizarHorarios(); sincronizarAcompanhamento(); const nova = sincronizar(); fn(nova); });
  }

  atualizarHorarios();
  sincronizarAcompanhamento();
  sincronizar();

  window.PACIENTE = {
    salvar, cancelar, marcar, sincronizar, responderVaga, entrarNaFila, sairDaFila, aoMudar,
    paraConfirmar, confirmarPresenca, vaiContarFalta, PARENTESCOS, validarFamiliar, adicionarFamiliar,
    sugestoesDoMes, incluirNaPrevencao, marcarItemPrevencao, itemPrevencao,
    situacao, avisoDeRestricao, textoDaRegra, textoDasFaltas, atualizarHorarios,
  };
})();
