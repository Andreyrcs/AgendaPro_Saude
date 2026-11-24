/* AgendaPro Saúde — dados das telas do dono e da recepção, pela API (rotas em backend/docs/especificacao-api.md).
   CLINICA.iniciar(fn) é o portão das páginas da clínica: mostra "Carregando…", busca os dados da clínica aberta na
   sessão uma vez e só então redesenha a casca e roda a página. Se a API não responder, a tela mostra o erro e
   "Tentar de novo" (nada quebra).

   Carga (em paralelo): a clínica (GET /api/clinicas/{id}, L1), os médicos, as especialidades, a lista de espera,
   a agenda (GET /api/clinicas/{id}/agenda?de=&ate=) e os feriados (GET /api/feriados?de=&ate=).
   O modelo usa os mesmos nomes do antigo clinica-dados.js (consultas, MEDICOS, DURACAO, expediente, livres...),
   para as telas mudarem pouco.

   Cada item de CLINICA.consultas é UM destes dois (como antes):
   - uma consulta: { status: confirmada | na_recepcao | em_atendimento | atendida | faltou | cancelada, paciente, pessoa }
   - um horário sem consulta, gravado no banco: { status: null, horario: "livre" (VAGA) | "oferecido" (OFERECIDA) }
   Não existe horário livre "virtual": o espaço vazio da grade é livre, e livres() calcula pelo expediente.
   Os ids ficam como texto (F2): as telas comparam com A.mesmoId. */
(function () {
  "use strict";

  const API = window.API;
  const A = window.AP;

  /* ─── Datas e horas ─── */
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
  const txt = (min) => pad(Math.floor(min / 60)) + ":" + pad(Math.round(min % 60));
  const iso = (d) => API.dataISO(d);
  const data = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const somaDias = (s, n) => { const d = data(s); d.setDate(d.getDate() + n); return iso(d); };
  const minutoAgora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const segunda = (dia) => { const d = data(dia); return somaDias(dia, 1 - (d.getDay() || 7)); };
  const comoTexto = (x) => (x === null || x === undefined ? x : String(x));

  const hoje = iso(new Date());
  /* A agenda fica aberta para marcar até 2 meses à frente (a mesma conta de GET /horarios-livres) */
  const ABRE_MESES = 2;
  const ABRE_ATE = (function () { const d = data(hoje); d.setMonth(d.getMonth() + ABRE_MESES); return iso(d); })();
  /* Janela carregada: da segunda-feira da semana do dia 1 deste mês até ABRE_ATE (a visão Mês cabe inteira) */
  const JANELA_DE = segunda(hoje.slice(0, 8) + "01");
  /* Feriados: um ano à frente, para a lista de "dias fechados" em Horários */
  const FERIADOS_ATE = (function () { const d = data(hoje); d.setFullYear(d.getFullYear() + 1); return iso(d); })();
  /* a grade da agenda vai das 7h às 19h */
  const INICIO = 7 * 60;
  const FIM = 19 * 60;

  const CLINICA = {
    clinica: null, /* { id, nome, endereco, telefone, cnpj, cidade, uf, codigo, publica } */
    fila: [], /* [{ medico, especialidade, pessoas: [...], vagas: [...] }] (F21), como vem da API */
    medicos: [], /* [{ id, nome, crm, sala, telefone, esp, especialidade, cor, expediente | null }] */
    especialidades: {}, /* { id: { id, nome, duracao } } */
    feriados: [], /* [{ id, data, nome }] */
    consultas: [], /* itens da agenda (formato acima) */
    MEDICOS: [], /* ids dos médicos com expediente: só eles aparecem na agenda */
    DURACAO: {}, /* id do médico → minutos de cada consulta (a duração da especialidade dele) */
    EXPEDIENTE: {}, /* id do médico → { semana: ["HH:MM","HH:MM"] | null, sabado, almoco: [min, min] | null } */
    carregada: false,
    hoje, ABRE_MESES, ABRE_ATE, INICIO, FIM,
  };

  /* ─── O que veio da API (bruto) e o período de agenda já buscado ─── */
  const bruto = { medicos: [], especialidades: [], fila: [], agenda: [], feriados: [] };
  const periodo = { de: JANELA_DE, ate: ABRE_ATE };

  function base() {
    const c = API.clinicaAtual();
    if (!c) throw new Error("Nenhuma clínica aberta. Entre de novo.");
    return "/api/clinicas/" + c.id;
  }
  const buscar = {
    clinica: () => API.recarregarClinica(),
    medicos: () => API.chamar("GET", base() + "/medicos"),
    especialidades: () => API.chamar("GET", base() + "/especialidades"),
    fila: () => API.chamar("GET", base() + "/lista-espera"),
    agenda: () => API.chamar("GET", base() + "/agenda?de=" + periodo.de + "&ate=" + periodo.ate),
    feriados: () => API.chamar("GET", "/api/feriados?de=" + periodo.de + "&ate=" + (periodo.ate > FERIADOS_ATE ? periodo.ate : FERIADOS_ATE)),
  };

  /* troca o conteúdo sem trocar o objeto: as telas guardam a referência de CLINICA.consultas, MEDICOS... */
  function trocarLista(lista, novos) { lista.length = 0; novos.forEach((x) => lista.push(x)); }
  function trocarObjeto(obj, novo) { Object.keys(obj).forEach((k) => delete obj[k]); Object.assign(obj, novo); }

  /* Monta o modelo das telas a partir do bruto da API */
  function montar() {
    const esp = {};
    (bruto.especialidades || []).forEach((e) => { esp[String(e.id)] = { id: String(e.id), nome: e.nome, duracao: e.duracao || 30 }; });
    trocarObjeto(CLINICA.especialidades, esp);

    const medicos = (bruto.medicos || []).map((m, i) => ({
      id: String(m.id), nome: m.nome, crm: m.crm, sala: m.sala, telefone: m.telefone,
      esp: m.especialidade ? String(m.especialidade.id) : null,
      especialidade: m.especialidade ? Object.assign({}, m.especialidade, { id: String(m.especialidade.id) }) : null,
      cor: A.corDoMedico(i), /* F15: uma cor por posição na lista de GET /clinicas/{id}/medicos */
      expediente: m.expediente || null,
    }));
    trocarLista(CLINICA.medicos, medicos);

    const duracao = {}, expedientes = {};
    medicos.forEach((m) => {
      duracao[m.id] = (esp[m.esp] || {}).duracao || (m.especialidade && m.especialidade.duracao) || 30;
      const e = m.expediente;
      if (!e) return;
      const par = (p) => (p ? [p.inicio, p.fim] : null);
      expedientes[m.id] = { semana: par(e.semana), sabado: par(e.sabado), almoco: e.almoco ? [hm(e.almoco.inicio), hm(e.almoco.fim)] : null };
    });
    trocarObjeto(CLINICA.DURACAO, duracao);
    trocarObjeto(CLINICA.EXPEDIENTE, expedientes);
    trocarLista(CLINICA.MEDICOS, medicos.filter((m) => m.expediente).map((m) => m.id));

    CLINICA.fila = bruto.fila || [];
    CLINICA.feriados = (bruto.feriados || []).map((f) => ({ id: String(f.id), data: f.data, nome: f.nome }));
    /* A.folha() pinta domingo e feriado lendo DADOS.feriados: passa a ser o feriado real (sai na Etapa 11) */
    if (window.DADOS) window.DADOS.feriados = CLINICA.feriados;

    const ativos = new Set(medicos.map((m) => m.id));
    trocarLista(CLINICA.consultas, (bruto.agenda || [])
      .filter((c) => c.medico && ativos.has(String(c.medico.id))) /* médico desativado (L6): fica fora da grade */
      .map(itemDaAgenda));
  }

  /* ConsultaResposta → item da agenda. A duração é a da especialidade do médico (a resposta não traz a hora de fim). */
  const STATUS_DE_CONSULTA = ["confirmada", "na_recepcao", "em_atendimento", "atendida", "faltou", "cancelada"];
  function itemDaAgenda(c) {
    const medico = String(c.medico.id);
    const k = {
      id: String(c.id), medico, data: c.data, ini: hm(c.hora), dur: CLINICA.DURACAO[medico] || 30,
      paciente: c.pessoa ? c.pessoa.nome : null,
      pessoa: c.pessoa ? Object.assign({}, c.pessoa, { id: String(c.pessoa.id) }) : null,
      status: STATUS_DE_CONSULTA.includes(c.status) ? c.status : null,
      presencaConfirmada: !!c.presencaConfirmada, motivo: c.motivo || "", sala: c.sala || null,
      nomeMedico: c.medico.nome, nomeEsp: c.especialidade ? c.especialidade.nome : "",
    };
    if (c.status === "livre") { k.horario = "livre"; k.vaga = true; }
    if (c.status === "oferecido") {
      k.horario = "oferecido";
      /* a linha OFERECIDA não tem paciente: o nome vem de quem recebeu a vaga na lista de espera */
      const quem = pessoaComVaga(medico, c.data, c.hora);
      k.paciente = quem ? quem.pessoa.nome : null;
      k.expiraEm = quem && quem.vagaOferecida ? quem.vagaOferecida.expiraEm : null;
    }
    return k;
  }
  function pessoaComVaga(medico, dia, hora) {
    const f = CLINICA.fila.find((x) => A.mesmoId(x.medico.id, medico));
    return f ? (f.pessoas || []).find((p) => p.vagaOferecida && p.vagaOferecida.data === dia && p.vagaOferecida.hora === hora) || null : null;
  }

  /* ─── Carga ─── */
  async function carregar() {
    base();
    const [clinica, medicos, especialidades, fila, agenda, feriados] = await Promise.all([
      buscar.clinica(), buscar.medicos(), buscar.especialidades(), buscar.fila(), buscar.agenda(), buscar.feriados(),
    ]);
    CLINICA.clinica = clinica;
    Object.assign(bruto, { medicos, especialidades, fila, agenda, feriados });
    montar();
    CLINICA.carregada = true;
    return CLINICA;
  }

  /* Busca de novo só as partes que mudaram ("agenda", "fila", "medicos", "especialidades", "feriados", "clinica")
     e remonta o modelo. A fila vem antes da agenda: o nome de quem recebeu a vaga sai dela. */
  async function recarregar(partes) {
    const lista = [].concat(partes || ["agenda", "fila"]);
    const respostas = await Promise.all(lista.map((p) => buscar[p]()));
    lista.forEach((p, i) => { if (p === "clinica") CLINICA.clinica = respostas[i]; else bruto[p] = respostas[i]; });
    montar();
    return CLINICA;
  }

  /* A agenda e os feriados de um período fora da janela carregada (navegar para semanas antigas ou distantes) */
  async function garantirPeriodo(de, ate) {
    if (de >= periodo.de && ate <= periodo.ate) return false;
    if (de < periodo.de) periodo.de = de;
    if (ate > periodo.ate) periodo.ate = ate;
    await recarregar(["agenda", "feriados"]);
    return true;
  }

  /* ─── Regras de status (iguais em todas as telas) ─── */
  /* "livre" | "oferecido" | "ocupado" | null (consulta cancelada não ocupa horário) */
  function horarioDe(k) {
    if (k.horario) return k.horario;
    return k.status === "cancelada" ? null : "ocupado";
  }
  const ehConsulta = (k) => !k.horario && !!k.status;
  const ativa = (k) => horarioDe(k) !== null;
  const futuro = (k) => k.data > hoje || (k.data === hoje && k.ini > minutoAgora());
  /* "Oferecer horário" (POST /api/consultas/{id}/oferecer): só numa vaga (VAGA) que ainda não passou */
  const podeOferecer = (h) => !!h && h.horario === "livre" && !!h.vaga && futuro(h);

  /* ─── Expediente (Horarios_Atendimento): [início, fim] em minutos no dia, ou null ─── */
  const feriadoDe = (dia) => CLINICA.feriados.find((f) => f.data === dia) || null;
  function expediente(m, dia) {
    const dow = data(dia).getDay();
    if (dow === 0 || feriadoDe(dia)) return null;
    const e = CLINICA.EXPEDIENTE[m];
    if (!e) return null;
    const x = dow === 6 ? e.sabado : e.semana;
    return x ? [hm(x[0]), hm(x[1])] : null;
  }
  const almocoDe = (m) => (CLINICA.EXPEDIENTE[m] ? CLINICA.EXPEDIENTE[m].almoco : null);
  const noAlmoco = (m, ini, dur) => { const a = almocoDe(m); return !!a && ini < a[1] && ini + dur > a[0]; };

  /* Horários livres de um médico num dia, pela mesma regra de GET /horarios-livres: grade do começo do expediente,
     de duração em duração, sem o almoço, sem o que já passou e sem encostar em consulta (a VAGA conta como livre). */
  function livres(m, dia) {
    const e = expediente(m, dia);
    if (!e || dia < hoje) return [];
    const dur = CLINICA.DURACAO[m] || 30;
    const ks = CLINICA.consultas.filter((k) => k.medico === m && k.data === dia && ativa(k));
    const lista = [];
    const agora = minutoAgora();
    for (let t = e[0]; t + dur <= e[1]; t += dur) {
      if (noAlmoco(m, t, dur)) continue;
      if (dia === hoje && t <= agora) continue;
      const bate = ks.filter((x) => x.ini < t + dur && t < x.ini + x.dur);
      if (bate.some((x) => horarioDe(x) !== "livre")) continue;
      lista.push({ ini: t, dur, vaga: bate[0] || null });
    }
    return lista;
  }

  /* Pessoas esperando em todas as filas da clínica (o número ao lado de "Lista de espera" no menu) */
  function totalFila() {
    return CLINICA.fila.reduce((s, f) => s + (f.pessoas || []).length, 0);
  }
  const filaDoMedico = (m) => CLINICA.fila.find((f) => A.mesmoId(f.medico.id, m)) || null;

  /* Telefone de quem está na fila (F21): mascarado na tela (•••• 1234). "Ver telefone" mostra o número inteiro só
     naquela linha, para a recepção ligar a quem não usa o app. */
  const mascarar = (t) => { const d = String(t || "").replace(/\D/g, ""); return d ? "•••• " + d.slice(-4) : ""; };
  function telefoneHTML(p) {
    if (!p.telefone) return " · sem telefone";
    return ' · tel. <span class="tel-numero">' + A.esc(mascarar(p.telefone)) + "</span>" +
      ' <button type="button" class="link-acao link-acao--discreto" data-ver-tel="' + A.esc(p.telefone) + '" aria-label="Ver o telefone de ' +
      A.esc(p.pessoa ? p.pessoa.nome : "") + '">Ver telefone</button>';
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-ver-tel]");
    if (!b) return;
    const alvo = b.previousElementSibling;
    if (alvo && alvo.classList.contains("tel-numero")) alvo.textContent = b.dataset.verTel;
    const foco = alvo || b.parentElement;
    b.remove();
    if (foco) { foco.setAttribute("tabindex", "-1"); foco.focus(); }
  });

  const medico = (id) => CLINICA.medicos.find((m) => A.mesmoId(m.id, id)) || null;
  const esp = (id) => CLINICA.especialidades[String(id)] || null;

  /* ─── Consulta periódica no lugar do evento "storage" entre abas: a agenda e a fila a cada 30 s ───
     pausar() devolve true enquanto a pessoa está no meio de algo (arrasto, menu ou diálogo aberto). */
  function vigiar(aoMudar, pausar, partes) {
    let ocupado = false;
    return setInterval(async () => {
      if (ocupado || document.hidden || (pausar && pausar())) return;
      ocupado = true;
      try { await recarregar(partes || ["fila", "agenda"]); if (!(pausar && pausar())) aoMudar(); }
      catch (e) { /* sem rede agora: tenta de novo na próxima volta */ }
      finally { ocupado = false; }
    }, 30000);
  }

  function iniciar(montarTela) {
    if (API.liberada === false) return; /* a página já está indo para o login */
    const alvo = document.querySelector("main") || document.body;
    const espera = document.createElement("p");
    espera.className = "carregando-area";
    espera.setAttribute("role", "status");
    espera.textContent = "Carregando os dados da clínica…";
    alvo.prepend(espera);
    carregar().then(() => {
      espera.remove();
      if (window.CASCA) window.CASCA.atualizar();
      montarTela();
    }).catch((e) => {
      if (e && e.status === 401) return; /* api.js já mandou para o login */
      espera.className = "carregando-area carregando-area--erro";
      espera.setAttribute("role", "alert");
      espera.innerHTML = A.esc(e.message) + ' <button type="button" class="botao botao--secundario botao--pequeno">Tentar de novo</button>';
      espera.querySelector("button").addEventListener("click", () => { espera.remove(); iniciar(montarTela); });
    });
  }

  Object.assign(CLINICA, {
    iniciar, carregar, recarregar, garantirPeriodo, vigiar, totalFila, filaDoMedico, medico, esp, feriadoDe, mascarar, telefoneHTML,
    horarioDe, ehConsulta, ativa, futuro, podeOferecer, expediente, almocoDe, noAlmoco, livres,
    minutoAgora, hm, txt, iso, data, somaDias, segunda,
  });
  window.CLINICA = CLINICA;
})();
