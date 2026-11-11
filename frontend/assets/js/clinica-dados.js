/* AgendaPro Saúde — agenda da clínica aberta na sessão (clinicaId).
   Na primeira visita de cada clínica a agenda inicial é montada e guardada neste navegador;
   depois tudo que a recepção e o médico mudam fica gravado (C.salvar()).
   Com a API: GET /api/clinicas/{id}/agenda?de=&ate= no lugar de carregar(), e cada mudança
   vira a sua chamada (PUT /api/consultas/{id}/status, POST /api/consultas etc.).

   Cada item da agenda é UM destes dois:
   - uma consulta:  { status: confirmada | na_recepcao | em_atendimento | atendida | faltou | cancelada, paciente }
   - um horário sem consulta: { status: null, horario: "livre" | "oferecido" }  (oferecido = vaga mandada à lista de espera)
   Cancelar: a consulta fica "cancelada" (histórico) e nasce um horário "livre" ou "oferecido" no mesmo lugar. */
(function () {
  "use strict";

  const D = window.DADOS;
  const CLINICA = (D.clinica && D.clinica.id) || "ipe";
  const CHAVE = "agendapro.agenda.v2." + CLINICA;
  const INICIO = 7 * 60;
  const FIM = 19 * 60;

  const hm = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const txt = (min) => String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(Math.round(min % 60)).padStart(2, "0");
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const data = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const somaDias = (s, n) => { const d = data(s); d.setDate(d.getDate() + n); return iso(d); };
  const diasEntre = (a, b) => Math.round((data(b) - data(a)) / 86400000);
  const minutoAgora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const hoje = D.hoje;

  /* ─── O que a recepção cadastra fica guardado neste navegador, por clínica ───
     Médicos novos, edições (nome, especialidade, telefone, sala), especialidades novas
     e as mudanças na lista de espera (quem entrou, quem saiu). */
  const CHAVE_LOJA = "agendapro.clinica.v2." + CLINICA;
  const loja = { medicos: [], edicoes: {}, especialidades: {}, fila: [], saiuDaFila: [], foraDaFila: [] };
  const lerLoja = () => {
    try { Object.assign(loja, { fila: [], saiuDaFila: [] }, JSON.parse(localStorage.getItem(CHAVE_LOJA)) || {}); } catch (e) { /* sem armazenamento */ }
  };
  const gravarLoja = () => { try { localStorage.setItem(CHAVE_LOJA, JSON.stringify(loja)); } catch (e) { /* sem armazenamento */ } };
  lerLoja();

  /* a sala de cada médico vem das consultas que já têm sala marcada */
  D.medicos.forEach((md) => {
    const k = (D.consultas || []).concat(D.passadas || []).find((x) => x.medico === md.id && x.sala);
    if (!md.sala && k) md.sala = k.sala;
  });
  Object.assign(D.especialidades, loja.especialidades);
  loja.medicos.forEach((md) => { if (!D.medicos.some((x) => x.id === md.id)) D.medicos.push(md); });
  Object.keys(loja.edicoes).forEach((id) => { const md = D.medicos.find((x) => x.id === id); if (md) Object.assign(md, loja.edicoes[id]); });

  /* fila = fila da carga inicial + quem entrou por aqui (no fim) − quem saiu */
  const FILAS_BASE = JSON.parse(JSON.stringify(D.filas));
  function montarFilas() {
    Object.keys(D.filas).forEach((m) => { if (!FILAS_BASE[m]) delete D.filas[m]; });
    Object.keys(FILAS_BASE).forEach((m) => { D.filas[m] = FILAS_BASE[m].map((p) => Object.assign({}, p)); });
    loja.fila.forEach((p) => {
      const lista = D.filas[p.medico] || (D.filas[p.medico] = []);
      if (!lista.some((x) => x.nome === p.nome)) lista.push(Object.assign({}, p));
    });
    loja.saiuDaFila.forEach((s) => {
      const lista = D.filas[s.medico] || [];
      const i = lista.findIndex((x) => x.nome === s.nome);
      if (i >= 0) lista.splice(i, 1);
    });
  }
  montarFilas();

  const guardar = {
    entrouNaFila(medico, p) {
      loja.saiuDaFila = loja.saiuDaFila.filter((s) => !(s.medico === medico && s.nome === p.nome));
      loja.fila.push(Object.assign({ medico }, p));
      gravarLoja();
    },
    saiuDaFila(medico, nome) {
      const antes = loja.fila.length;
      loja.fila = loja.fila.filter((p) => !(p.medico === medico && p.nome === nome));
      if (loja.fila.length === antes) loja.saiuDaFila.push({ medico, nome });
      gravarLoja();
    },
    voltouParaFila(medico, p) {
      const i = loja.saiuDaFila.findIndex((s) => s.medico === medico && s.nome === p.nome);
      if (i >= 0) loja.saiuDaFila.splice(i, 1); else loja.fila.push(Object.assign({ medico }, p));
      gravarLoja();
    },
    /* quem marcou fora da fila, quando e por quê */
    foraDaFila(r) { loja.foraDaFila.push(r); gravarLoja(); },
    registrosForaDaFila(medico) { return loja.foraDaFila.filter((r) => !medico || r.medico === medico); },
    medicoNovo(md) { loja.medicos.push(md); gravarLoja(); },
    edicaoMedico(id, campos) {
      const novo = loja.medicos.find((x) => x.id === id);
      if (novo) Object.assign(novo, campos); else loja.edicoes[id] = Object.assign(loja.edicoes[id] || {}, campos);
      gravarLoja();
    },
    especialidade(id, e) { loja.especialidades[id] = e; gravarLoja(); },
    tudoDeVolta() { try { localStorage.removeItem(CHAVE_LOJA); localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ } },
    temAlteracoes() {
      return loja.medicos.length + Object.keys(loja.edicoes).length + Object.keys(loja.especialidades).length +
        loja.fila.length + loja.saiuDaFila.length + loja.foraDaFila.length > 0;
    },
  };

  /* Quais médicos têm agenda aberta: os da carga inicial + quem ganhou expediente em Horários.
     Clínica recém-cadastrada começa sem nenhum: cadastra o médico, define o horário, a agenda abre. */
  const NA_AGENDA = {
    ipe: ["helena", "fernanda", "paulo", "camila", "luana", "andre"],
    jacaranda: ["marcos", "silvia", "tomas"],
    aroeira: ["renata", "igor", "lia"],
  };
  loja.expedientes = loja.expedientes || {};
  const MEDICOS = (NA_AGENDA[CLINICA] || []).concat(Object.keys(loja.expedientes))
    .filter((id, i, l) => l.indexOf(id) === i && D.medicos.some((m) => m.id === id));
  /* duração de cada consulta: vem da especialidade do médico (Especialidades.DuracaoPadrao) */
  const DURACAO = {};
  D.medicos.forEach((m) => { DURACAO[m.id] = (D.especialidades[m.esp] || {}).duracao || 30; });
  guardar.expediente = (id, e) => { loja.expedientes[id] = e; gravarLoja(); };

  /* Configuração da clínica: até quando a agenda fica aberta para marcar (2 meses à frente de hoje) */
  const ABRE_MESES = 2;
  const ABRE_ATE = (function () { const d = data(hoje); d.setMonth(d.getMonth() + ABRE_MESES); return iso(d); })();

  /* Expediente de cada médico: [início, fim] de segunda a sexta e no sábado */
  const PADRAO = { semana: ["08:00", "17:00"], sabado: null };
  const EXPEDIENTE = {
    helena: { semana: ["07:30", "17:00"], sabado: ["08:00", "12:00"] },
    fernanda: { semana: ["08:00", "16:30"], sabado: ["08:00", "12:00"] },
    paulo: { semana: ["08:00", "16:40"], sabado: null },
    camila: { semana: ["09:00", "17:00"], sabado: null },
    luana: { semana: ["13:30", "17:30"], sabado: null },
    andre: { semana: ["07:30", "17:30"], sabado: ["08:00", "12:00"] },
    marcos: { semana: ["08:00", "17:00"], sabado: ["08:00", "12:00"] },
    silvia: { semana: ["08:00", "14:00"], sabado: null },
    tomas: { semana: ["10:00", "18:00"], sabado: null },
    renata: { semana: ["08:00", "16:00"], sabado: null },
    igor: { semana: ["09:00", "17:00"], sabado: null },
    lia: { semana: ["13:00", "18:00"], sabado: null },
  };
  /* o que foi salvo em Horários vale mais que a carga inicial (minutos → "HH:MM") */
  Object.keys(loja.expedientes).forEach((id) => {
    const e = loja.expedientes[id];
    const par = (x) => (x ? [txt(x[0]), txt(x[1])] : null);
    EXPEDIENTE[id] = { semana: par(e.semana), sabado: par(e.sabado), almoco: e.almoco === undefined ? [720, 780] : e.almoco };
  });
  MEDICOS.forEach((m) => { if (!EXPEDIENTE[m]) EXPEDIENTE[m] = PADRAO; });
  /* almoço de cada médico em minutos [início, fim], ou null se não para (Horarios_Atendimento.InicioAlmoco/FimAlmoco).
     Na carga inicial todos param das 12h às 13h. */
  function almocoDe(m) {
    const e = EXPEDIENTE[m] || PADRAO;
    return e.almoco === undefined ? [720, 780] : e.almoco;
  }
  const noAlmoco = (m, ini, dur) => { const a = almocoDe(m); return !!a && ini < a[1] && ini + dur > a[0]; };
  const OCUPACAO = { helena: 0.8, fernanda: 0.68, paulo: 0.86, camila: 0.9, luana: 0.5, andre: 0.6 };

  /* Agenda detalhada de hoje na Clínica Ipê: [início, duração, paciente, como estava na carga inicial] */
  const HOJE_IPE = {
    helena: [
      ["07:30", 30, "Antônio Carlos Ribeiro"], ["08:00", 30, "Francisca Oliveira"], ["08:30", 30, "Lucas Ferreira", "faltou"],
      ["09:00", 30, "Aline Souza"], ["09:30", 30, "José Roberto Lima"], ["10:30", 30, "Beatriz Nunes"], ["11:00", 30, "Thiago Alves"],
      ["11:30", 30, "Raimunda Costa"], ["14:00", 30, "Pedro Henrique Dias"], ["14:30", 30, "Ana Clara Mendes"], ["16:00", 30, "Márcia Gonçalves"],
    ],
    fernanda: [
      ["08:00", 30, "Kauã Pereira"], ["08:30", 30, "Yasmin Freitas"], ["09:30", 30, "Miguel Assis"], ["10:00", 30, "Laura Batista"],
      ["10:30", 30, "Heitor Carvalho"], ["11:00", 30, "Sofia Almeida"], ["13:00", 30, "Enzo Barros"], ["15:30", 30, "Davi Lucca Moreira"],
    ],
    paulo: [
      ["08:00", 40, "Sebastião Araújo"], ["08:40", 40, "Sônia Cardoso"], ["09:20", 40, "Benedito Silva"], ["10:00", 40, "Iracema Tavares"],
      ["10:40", 40, "Wellington Santos"], ["11:20", 40, "Fátima Haddad"], ["14:00", 40, "Otávio Lopes"], ["14:40", 40, null, "livre"],
      ["15:20", 40, "Cláudia Teixeira"],
    ],
    camila: [
      ["09:00", 30, "Letícia Barbosa"], ["09:30", 30, "Gabriel Rocha"], ["10:00", 30, "Natália Campos", "faltou"], ["10:30", 30, "Priscila Ramos"],
      ["11:00", 30, "Hugo Martins"], ["13:30", 30, "Rosana Freire"], ["15:30", 30, "Daniel Kim"], ["16:00", 30, "Vitória Lima"],
    ],
    luana: [["13:30", 30, "Rafael Moreira"], ["14:00", 30, "Joana Prado"], ["15:00", 30, "Celso Nakamura"]],
    andre: [["07:30", 30, "Marcos Paulo Reis"], ["08:00", 30, "Elaine Duarte"], ["10:00", 30, "Jorge Batista"], ["11:30", 30, "Patrícia Lemos"], ["16:30", 30, "Severino Cunha"]],
  };

  const PRIMEIROS = ["Ana", "Bruno", "Carla", "Diego", "Eliane", "Fábio", "Gisele", "Hélio", "Ivone", "Jéssica", "Kleber", "Lúcia", "Mateus", "Nair", "Otávio",
    "Paula", "Quitéria", "Renato", "Sueli", "Tiago", "Ubiratan", "Valéria", "Wagner", "Yara", "Zilda", "Akira", "Moacir", "Jaciara", "Kiara", "Raí",
    "Luzia", "Edson", "Maria José", "João Pedro", "Thaís", "Cícero", "Mariana", "Hiroshi", "Aparecida", "Ícaro"];
  const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Almeida", "Costa", "Gomes", "Ribeiro", "Martins", "Carvalho",
    "Araújo", "Melo", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira", "Tanaka", "Guarani", "Yamada", "Cavalcanti", "Bezerra", "Teixeira", "Freitas"];

  function rng(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function expediente(medico, dia) {
    const dow = data(dia).getDay();
    if (dow === 0 || (D.feriados || []).some((f) => f.data === dia)) return null;
    const e = EXPEDIENTE[medico] || PADRAO;
    const x = dow === 6 ? e.sabado : e.semana;
    return x ? [hm(x[0]), hm(x[1])] : null;
  }

  /* Situação de uma consulta de HOJE pela hora do relógio, na carga inicial */
  function statusPeloRelogio(ini, dur, semente, agora) {
    if (semente === "faltou" && ini + dur <= agora) return "faltou";
    if (ini + dur <= agora) return "atendida";
    if (ini <= agora) return "em_atendimento";
    if (ini - agora <= 20) return "na_recepcao";
    return "confirmada";
  }

  /* ─── Carga inicial (só na primeira visita desta clínica) ─── */
  function montar() {
    const lista = [];
    let seq = 4800;
    const agora = minutoAgora();
    const add = (medico, dia, ini, dur, paciente, status, horario) => {
      seq += 1;
      const k = { id: "k" + seq, medico, data: dia, ini, dur, paciente: paciente || null, status: status || null, gerada: true };
      if (horario) k.horario = horario;
      lista.push(k);
    };
    const semente = CLINICA.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const desde = somaDias(hoje, -21);
    for (let dia = desde; dia <= ABRE_ATE; dia = somaDias(dia, 1)) {
      const sorte = rng(Number(dia.replace(/-/g, "")) * 7 + 13 + semente);
      const longe = diasEntre(hoje, dia);
      const fator = longe <= 21 ? 1 : Math.max(0.2, 1 - (longe - 21) / 45);
      MEDICOS.forEach((m) => {
        const e = expediente(m, dia);
        if (!e) return;
        if (dia === hoje && CLINICA === "ipe" && HOJE_IPE[m] && data(dia).getDay() !== 6) {
          HOJE_IPE[m].forEach(([h, dur, pac, s]) => {
            const ini = hm(h);
            if (s === "livre") add(m, dia, ini, dur, null, null, "livre");
            else add(m, dia, ini, dur, pac, statusPeloRelogio(ini, dur, s, agora));
          });
          return;
        }
        const dur = DURACAO[m] || 30;
        for (let t = e[0]; t + dur <= e[1]; t += dur) {
          if (noAlmoco(m, t, dur)) continue; /* almoço */
          const r = sorte();
          const nome = PRIMEIROS[Math.floor(sorte() * PRIMEIROS.length)] + " " + SOBRENOMES[Math.floor(sorte() * SOBRENOMES.length)];
          const ocup = OCUPACAO[m] || 0.6;
          if (dia < hoje) {
            if (r < ocup) add(m, dia, t, dur, nome, sorte() < 0.09 ? "faltou" : "atendida");
          } else if (r < ocup * 0.92 * fator) {
            add(m, dia, t, dur, nome, dia === hoje ? statusPeloRelogio(t, dur, null, agora) : "confirmada");
          } else if (longe <= 21 && r < ocup && (dia > hoje || t > agora)) {
            add(m, dia, t, dur, null, null, "livre");
          }
        }
      });
    }
    /* as consultas da família da Juliana também estão na agenda da Clínica Ipê */
    if (CLINICA === "ipe") {
      (D.consultas || []).forEach((c) => {
        if (!MEDICOS.includes(c.medico)) return;
        const pessoa = D.pessoas.find((p) => p.id === c.pessoa);
        const ini = hm(c.hora);
        const dur = DURACAO[c.medico] || 30;
        for (let i = lista.length - 1; i >= 0; i--) {
          const x = lista[i];
          if (x.medico === c.medico && x.data === c.data && x.ini < ini + dur && ini < x.ini + x.dur) lista.splice(i, 1);
        }
        add(c.medico, c.data, ini, dur, pessoa ? pessoa.nome : c.pessoa, "confirmada");
        lista[lista.length - 1].origem = c.id;
      });
    }
    /* quem faltou na carga inicial já tem a falta registrada (não se sabe se tinha confirmado: não conta para restrição) */
    const faltas = lista.filter((k) => k.status === "faltou").map((k, i) => ({
      id: "f0" + i, paciente: k.paciente, consulta: k.id, data: k.data, hora: txt(k.ini), medico: k.medico,
      confirmou: false, motivo: "Não compareceu", por: "Recepção", retirada: false,
    }));
    return { consultas: lista, seq, faltas };
  }

  /* As consultas da carga inicial (gerada: true) que ninguém mexeu acompanham o relógio:
     as de dias passados viram "atendida" e as de hoje seguem a hora (atendida, em atendimento...).
     Sem isso, uma agenda montada ontem abriria hoje com tudo "confirmada" e viraria falta em cascata.
     Consultas marcadas ou mudadas por pessoas nunca são tocadas aqui. */
  function acompanharRelogio(a) {
    const agora = minutoAgora();
    a.consultas.forEach((k) => {
      if (!k.gerada || k.horario || k.status !== "confirmada" || k.data > hoje) return;
      k.status = k.data < hoje ? "atendida" : statusPeloRelogio(k.ini, k.dur, null, agora);
    });
    return a;
  }

  function carregar() {
    let a = null;
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.consultas)) a = salvo;
    } catch (e) { /* sem armazenamento */ }
    a = acompanharRelogio(a || montar());
    try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch (e) { /* sem armazenamento */ }
    return a;
  }
  const agenda = carregar();
  agenda.faltas = agenda.faltas || [];
  agenda.retornos = agenda.retornos || [];
  agenda.exames = agenda.exames || [];
  const consultas = agenda.consultas;

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(agenda)); } catch (e) { /* sem armazenamento */ }
  }
  function apagar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ }
  }
  function novoId() { agenda.seq = (agenda.seq || 9000) + 1; return "k" + agenda.seq; }

  /* ─── Regras de status (iguais em todas as telas) ─── */
  /* "livre" | "oferecido" | "ocupado" | null (consulta cancelada não ocupa horário) */
  function horarioDe(k) {
    if (k.horario) return k.horario;
    return k.status === "cancelada" ? null : "ocupado";
  }
  const ehConsulta = (k) => !k.horario && !!k.status;
  const ativa = (k) => horarioDe(k) !== null;

  /* Cancela: a consulta vira "cancelada" e o horário dela volta como "livre" no mesmo lugar.
     Devolve o horário novo, para quem chamou oferecer à lista de espera se quiser. */
  function cancelarConsulta(k, motivo) {
    k.status = "cancelada";
    k.canceladaEm = new Date().toISOString();
    if (motivo) k.motivoCancelamento = motivo;
    const h = { id: novoId(), medico: k.medico, data: k.data, ini: k.ini, dur: k.dur, paciente: null, status: null, horario: "livre" };
    consultas.push(h);
    salvar();
    return h;
  }
  /* Um horário livre passa a ser oferecido à 1ª pessoa da fila */
  function oferecerHorario(h, nome) {
    h.horario = "oferecido";
    h.paciente = nome;
    h.oferecidoEm = new Date().toISOString();
    salvar();
  }
  /* Um horário vira consulta confirmada (paciente aceitou a vaga ou a recepção marcou) */
  function ocuparHorario(h, nome) {
    delete h.horario;
    delete h.oferecidoEm;
    delete h.gerada; /* agora é uma consulta marcada por uma pessoa */
    h.paciente = nome;
    h.status = "confirmada";
    salvar();
  }
  /* A pessoa recusou ou o prazo passou: o horário volta a ficar livre */
  function liberarHorario(h) {
    h.horario = "livre";
    h.paciente = null;
    delete h.oferecidoEm;
    salvar();
  }


  /* ─── Lado do paciente: a mesma agenda e a mesma fila que a recepção usa ─── */
  const futuro = (k) => k.data > hoje || (k.data === hoje && k.ini > minutoAgora());

  /* vaga que a recepção ofereceu para esta pessoa e que ainda não passou */
  function vagaOferecida(nome) {
    return consultas.find((k) => k.horario === "oferecido" && k.paciente === nome && futuro(k)) || null;
  }
  /* aceitar: o horário vira consulta confirmada; recusar: volta a ficar livre e a pessoa volta ao seu lugar na fila */
  function responderVaga(h, aceitar) {
    const nome = h.paciente;
    if (aceitar) { ocuparHorario(h, nome); return; }
    liberarHorario(h);
    guardar.voltouParaFila(h.medico, { nome, desde: hoje, tel: "", app: true });
    montarFilas();
  }
  /* atualiza o objeto de espera do paciente (D.espera) com a fila e a vaga de verdade */
  function sincronizarEspera(e, nome) {
    if (!e) return false;
    const v = vagaOferecida(nome);
    const lista = D.filas[e.medico] || [];
    const pos = lista.findIndex((p) => p.nome === nome) + 1;
    const novaOferta = !!v && (!e.vaga || e.vaga.id !== v.id);
    if (v) {
      e.vaga = { id: v.id, data: v.data, hora: txt(v.ini), prazo: "30 minutos" };
      e.posicao = 1;
      e.oferta = true;
    } else {
      e.vaga = null;
      e.oferta = false;
      if (pos) e.posicao = pos;
    }
    e.naFila = Math.max(lista.length, e.posicao);
    if (!v && !pos && !e.resolvida) e.resolvida = true;
    return novaOferta;
  }
  /* a consulta que o paciente marcou também entra na agenda da clínica */
  function marcarConsulta(c) {
    const ini = hm(c.hora);
    const dur = DURACAO[c.medico] || 30;
    const livre = consultas.find((x) => x.medico === c.medico && x.data === c.data && x.ini === ini && x.horario);
    if (livre) { ocuparHorario(livre, c.paciente); livre.origem = c.origem; return livre; }
    const k = { id: novoId(), medico: c.medico, data: c.data, ini, dur, paciente: c.paciente, status: "confirmada", origem: c.origem };
    consultas.push(k);
    salvar();
    return k;
  }
  /* o paciente cancelou: a mesma regra da recepção (consulta "cancelada" + horário "livre") */
  /* acha na agenda da clínica a consulta que o paciente vê ({ origem } ou médico, data, hora e nome) */
  function consultaDoPaciente(c) {
    const ini = hm(c.hora);
    return consultas.find((x) => (c.origem && x.origem === c.origem) ||
      (x.medico === c.medico && x.data === c.data && x.ini === ini && x.paciente === c.paciente && x.status && x.status !== "cancelada")) || null;
  }
  /* cancelar pelo paciente: até o fim da véspera, sem consequência.
     No próprio dia, depois de ter dito "Vou", conta como falta sem aviso.
     Devolve { horario (o horário que ficou livre), falta (true/false) } */
  function cancelarPeloPaciente(c) {
    const k = consultaDoPaciente(c);
    if (!k || k.status === "cancelada") return { horario: null, falta: false };
    const falta = !!k.presencaConfirmada && new Date() > D.avisoAte(k.data);
    if (falta) registrarFalta(k, "Cancelou no dia, depois de confirmar presença", "Paciente");
    return { horario: cancelarConsulta(k, "Cancelada pelo paciente"), falta };
  }

  /* Outra aba gravou (a recepção ofereceu uma vaga, o paciente respondeu...): recarrega e avisa a tela */
  const ouvintes = [];
  function aoMudar(fn) { ouvintes.push(fn); }
  window.addEventListener("storage", (ev) => {
    if (ev.key === CHAVE && ev.newValue) {
      try {
        const novo = JSON.parse(ev.newValue);
        consultas.length = 0;
        novo.consultas.forEach((k) => consultas.push(k));
        agenda.seq = novo.seq;
        agenda.faltas = novo.faltas || [];
        agenda.retornos = novo.retornos || [];
        agenda.exames = novo.exames || [];
      } catch (e) { return; }
      ouvintes.forEach((fn) => fn("agenda"));
    } else if (ev.key === CHAVE_LOJA) {
      lerLoja();
      montarFilas();
      ouvintes.forEach((fn) => fn("fila"));
    }
  });

  /* ─── Presença e faltas ───
     Faltas ficam em agenda.faltas: { id, paciente, consulta, data, hora, medico, confirmou, motivo, por, retirada }.
     Só contam para a restrição as faltas sem aviso de quem tinha confirmado presença ("Vou") e que a recepção não retirou. */

  /* "Vou": a consulta fica com a presença confirmada (a recepção e o médico veem) */
  function confirmarPresenca(k) {
    k.presencaConfirmada = true;
    k.confirmadaEm = new Date().toISOString();
    salvar();
  }

  /* registra uma falta: pelo médico, pela recepção, ou quando o paciente cancela no dia depois de dizer "Vou" */
  function registrarFalta(k, motivo, por) {
    if (agenda.faltas.some((f) => f.consulta === k.id && !f.retirada)) return null;
    const f = {
      id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      paciente: k.paciente, consulta: k.id, data: k.data, hora: txt(k.ini), medico: k.medico,
      confirmou: !!k.presencaConfirmada, motivo, por: por || "", retirada: false,
    };
    agenda.faltas.push(f);
    salvar();
    return f;
  }

  /* falta justificada: a recepção retira (fica no histórico como retirada, não conta mais) */
  function retirarFalta(id, por, motivo) {
    const f = agenda.faltas.find((x) => x.id === id);
    if (!f) return;
    f.retirada = true;
    f.retiradaPor = por || "";
    f.retiradaEm = new Date().toISOString();
    f.motivoRetirada = String(motivo || "").trim();
    salvar();
  }
  /* todas as faltas, inclusive as retiradas (histórico da ficha) */
  const historicoFaltasDe = (nomes) => agenda.faltas.filter((f) => [].concat(nomes).includes(f.paciente));

  /* faltas de uma ou mais pessoas (nomes), sem as retiradas */
  function faltasDe(nomes) {
    const lista = [].concat(nomes);
    return agenda.faltas.filter((f) => lista.includes(f.paciente) && !f.retirada);
  }

  /* Restrição atual: "normal", "so_fila" (só lista de espera) ou "so_recepcao" (só agenda com a recepção).
     Anda pelas faltas que contam, da mais antiga para a mais nova:
     FALTAS_PARA_RESTRICAO faltas → só fila por DIAS_DE_RESTRICAO; nova falta nesse período → só recepção.
     DIAS_DE_RESTRICAO dias sem falta nova → volta ao normal. Devolve { tipo, ate, faltas }. */
  function restricaoDe(nomes) {
    const todas = faltasDe(nomes);
    const contam = todas.filter((f) => f.confirmou).sort((a, b) => (a.data < b.data ? -1 : 1));
    let tipo = "normal", ate = null, seguidas = 0;
    contam.forEach((f) => {
      if (tipo !== "normal" && f.data > ate) { tipo = "normal"; seguidas = 0; }
      if (tipo === "normal") {
        seguidas += 1;
        if (seguidas >= D.FALTAS_PARA_RESTRICAO) { tipo = "so_fila"; ate = somaDias(f.data, D.DIAS_DE_RESTRICAO); }
      } else {
        tipo = "so_recepcao";
        ate = somaDias(f.data, D.DIAS_DE_RESTRICAO);
      }
    });
    if (tipo !== "normal" && hoje > ate) tipo = "normal";
    return { tipo, ate: tipo === "normal" ? null : ate, faltas: todas.length };
  }

  /* Horários livres para o paciente: os mesmos "livre" que a recepção vê na agenda, de agora em diante.
     Formato: { idMedico: [{ data, horas: ["HH:MM", ...] }] } */
  function horariosLivres() {
    const porMedico = {};
    consultas
      .filter((k) => k.horario === "livre" && futuro(k))
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ini - b.ini))
      .forEach((k) => {
        const dias = porMedico[k.medico] || (porMedico[k.medico] = []);
        let dia = dias.find((d) => d.data === k.data);
        if (!dia) { dia = { data: k.data, horas: [] }; dias.push(dia); }
        dia.horas.push(txt(k.ini));
      });
    return porMedico;
  }

  /* ─── Retornos e exames pedidos pelo médico (tabelas Retornos e Exames) ───
     Retorno: { id, paciente, medico, consulta, data, nota, status: encaminhado | agendado | realizado | cancelado }
     Exame:   { id, paciente, medico, consulta, nome, status: pendente | realizado }
     Ficam na agenda da clínica: o médico pede, a recepção e o paciente veem. */
  const novoIdItem = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function registrarRetorno(r) {
    const x = Object.assign({ id: novoIdItem("r"), status: "encaminhado", criadoEm: new Date().toISOString() }, r);
    agenda.retornos.push(x);
    salvar();
    return x;
  }
  function registrarExame(e) {
    const x = Object.assign({ id: novoIdItem("e"), status: "pendente", criadoEm: new Date().toISOString() }, e);
    agenda.exames.push(x);
    salvar();
    return x;
  }
  function mudarStatusExame(id, status) {
    const x = agenda.exames.find((e) => e.id === id);
    if (x) { x.status = status; salvar(); }
  }
  const retornosDe = (nomes) => agenda.retornos.filter((r) => [].concat(nomes).includes(r.paciente));
  const examesDe = (nomes) => agenda.exames.filter((e) => [].concat(nomes).includes(e.paciente));

  window.CLIDADOS = {
    registrarRetorno, registrarExame, mudarStatusExame, retornosDe, examesDe,
    CLINICA, MEDICOS, DURACAO, INICIO, FIM, ABRE_MESES, ABRE_ATE, EXPEDIENTE, almocoDe, noAlmoco,
    consultas, expediente, salvar, apagar, novoId, guardar, aoMudar,
    confirmarPresenca, registrarFalta, retirarFalta, faltasDe, historicoFaltasDe, restricaoDe, horariosLivres,
    horarioDe, ehConsulta, ativa, cancelarConsulta, oferecerHorario, ocuparHorario, liberarHorario,
    vagaOferecida, responderVaga, sincronizarEspera, marcarConsulta, cancelarPeloPaciente, consultaDoPaciente,
    minutoAgora, hm, txt, iso, data, somaDias,
  };
})();
