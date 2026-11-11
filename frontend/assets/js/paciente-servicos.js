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
      id: "eu", nome: eu.nome, curto: primeiro, tratamento: "você", relacao: "Você", idade: null, genero: null,
      cor: "var(--id-juliana)", alergias: "Nenhuma informada", sus: "",
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
  } catch (e) { /* sem armazenamento */ }
  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ consultas: D.consultas, passadas: D.passadas, pessoas: D.pessoas, espera: D.espera }));
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
    C.marcarConsulta({ origem: c.id, medico: c.medico, data: c.data, hora: c.hora, paciente: pessoa(c.pessoa).nome });
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
  /* a recepção mudou a fila, a agenda ou as faltas (em outra aba deste navegador) */
  function aoMudar(fn) {
    C.aoMudar(() => { atualizarHorarios(); const nova = sincronizar(); fn(nova); });
  }

  atualizarHorarios();
  sincronizar();

  window.PACIENTE = {
    salvar, cancelar, marcar, sincronizar, responderVaga, entrarNaFila, sairDaFila, aoMudar,
    paraConfirmar, confirmarPresenca, vaiContarFalta,
    situacao, avisoDeRestricao, textoDaRegra, textoDasFaltas, atualizarHorarios,
  };
})();
