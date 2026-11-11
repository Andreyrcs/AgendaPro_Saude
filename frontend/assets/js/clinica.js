/* AgendaPro Saúde — agenda da recepção (dia, semana e mês), próximos pacientes e lista de espera.
   "Agora" é o relógio do computador: a linha do agora anda e as faltas são marcadas na hora certa. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;

  const PX = 1.5;
  const INICIO = C.INICIO;
  const agora = () => C.minutoAgora();

  /* Selos da agenda: os status da CONSULTA e, para horário sem consulta, o estado do HORÁRIO.
     Os nomes vêm de DADOS.STATUS_CONSULTA e DADOS.ESTADO_HORARIO (os mesmos do app e do banco). */
  const SC = D.STATUS_CONSULTA, EH = D.ESTADO_HORARIO;
  const ESTADOS = {
    confirmada: { rotulo: SC.confirmada, icone: null },
    na_recepcao: { rotulo: SC.na_recepcao, icone: "user-check" },
    em_atendimento: { rotulo: SC.em_atendimento, icone: "stethoscope" },
    atendida: { rotulo: SC.atendida, icone: "check" },
    faltou: { rotulo: SC.faltou, icone: "x" },
    livre: { rotulo: "Horário " + EH.livre.toLowerCase(), icone: "plus" },
    oferecido: { rotulo: EH.oferecido, icone: "bell-ring" },
  };
  /* chave do selo: o estado do horário, quando não há consulta; senão o status da consulta */
  const chave = (k) => k.horario || k.status;
  const MOVEIS = ["confirmada", "na_recepcao"];

  const medico = (id) => D.medicos.find((m) => m.id === id);
  const esp = (id) => D.especialidades[id];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const curtoData = (dia) => { const d = C.data(dia); return A.SEMANA_CURTA[d.getDay()] + ", " + d.getDate() + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
  const segunda = (dia) => { const d = C.data(dia); const dow = d.getDay() || 7; return C.somaDias(dia, 1 - dow); };
  const relogio = () => new Date().toLocaleTimeString("pt-BR");

  const PXH = 2.6; /* px por minuto na disposição em linhas (igual a --pxh no CSS) */
  const LARG = C.FIM - INICIO;
  let layoutSalvo = null;
  try { layoutSalvo = localStorage.getItem("agendapro.layout"); } catch (e) { /* sem armazenamento */ }

  const primeiroComFila = C.MEDICOS.find((m) => (D.filas[m] || []).length) || C.MEDICOS[0] || null;
  const est = { vista: "dia", layout: layoutSalvo === "linha" ? "linha" : "coluna", dia: D.hoje, semana: segunda(D.hoje), filaMedico: primeiroComFila, sessao: null, filtro: new Set() };
  const emLinha = () => est.layout === "linha" && est.vista !== "mes";

  const $ = (s) => document.querySelector(s);
  const vistaEl = $("#vista");
  const anunciador = $("#anunciador");
  function anunciar(t) { anunciador.textContent = ""; setTimeout(() => { anunciador.textContent = t; }, 30); }

  /* ─── Consultas ─── */
  const ativas = C.ativa;
  const doDia = (dia) => C.consultas.filter((k) => k.data === dia && ativas(k));
  const ocupa = (k) => C.horarioDe(k) === "ocupado" || C.horarioDe(k) === "oferecido";
  const filaDe = (m) => D.filas[m] || [];
  const totalFila = () => C.MEDICOS.reduce((s, m) => s + filaDe(m).length, 0);

  function rotuloConsulta(k) {
    const m = medico(k.medico);
    const e = ESTADOS[chave(k)];
    const quem = k.horario === "livre" ? "Horário livre" : k.paciente;
    return quem + ", " + C.txt(k.ini) + " às " + C.txt(k.ini + k.dur) + ", " + curtoData(k.data) + ", " + m.nome + ". " + e.rotulo + "." +
      (k.presencaConfirmada && k.status === "confirmada" ? " Presença confirmada pelo paciente." : "") +
      (MOVEIS.includes(k.status) ? " Enter abre as opções." : "");
  }

  /* ─── Colunas da visão atual ─── */
  function colunas() {
    if (est.vista === "dia") return C.MEDICOS.map((m) => ({ medico: m, data: est.dia }));
    const cols = [];
    for (let i = 0; i < 6; i++) { const dia = C.somaDias(est.semana, i); C.MEDICOS.forEach((m) => cols.push({ medico: m, data: dia })); }
    return cols;
  }
  const indiceColuna = (k) => colunas().findIndex((c) => c.medico === k.medico && c.data === k.data);

  /* ─── Blocos ─── */
  function blocoHTML(k, c) {
    const e = ESTADOS[chave(k)];
    const nome = k.horario === "livre" ? "Horário livre" : k.paciente;
    const sub = k.horario === "oferecido" ? C.txt(k.ini) + " · aguarda" : k.presencaConfirmada && k.status === "confirmada" ? C.txt(k.ini) + " · vai vir" : C.txt(k.ini);
    return (
      '<button type="button" class="cbloco cbloco--' + chave(k) + '" data-id="' + k.id + '" style="--c:' + c + ";--ini:" + k.ini + ";--dur:" + k.dur + '"' +
      ' aria-label="' + A.esc(rotuloConsulta(k)) + '" aria-haspopup="menu">' +
      (e.icone ? I(e.icone) : "") +
      '<span class="cbloco__texto"><span class="cbloco__nome">' + A.esc(nome) + '</span><span class="cbloco__hora">' + sub + "</span></span></button>"
    );
  }
  function atualizarBloco(el, k) {
    const c = indiceColuna(k);
    const novo = document.createElement("div");
    novo.innerHTML = blocoHTML(k, c);
    const n = novo.firstElementChild;
    el.className = n.className;
    el.style.cssText = n.style.cssText;
    el.innerHTML = n.innerHTML;
    el.setAttribute("aria-label", n.getAttribute("aria-label"));
    aplicarFiltro();
  }
  const blocoEl = (id) => vistaEl.querySelector('.cbloco[data-id="' + id + '"]');

  /* ─── Visão Dia e Semana ─── */
  function fundoHTML(n, semana) {
    let h = "";
    for (let t = INICIO; t <= C.FIM; t += 30) {
      const y = (t - INICIO) * PX;
      h += '<div class="grade__linha' + (t % 60 ? " grade__linha--meia" : "") + '" style="top:' + y + 'px"></div>';
    }
    h += '<div class="grade__almoco" style="top:' + (300 * PX) + "px;height:" + (60 * PX) + 'px">' + (semana ? "" : "Almoço") + "</div>";
    for (let i = 1; i < n; i++) {
      const dia = semana && i % 6 === 0;
      if (semana && !dia) continue;
      h += '<div class="grade__sep' + (dia ? " grade__sep--dia" : "") + '" style="left:calc(' + i + " * 100% / " + n + ')"></div>';
    }
    return h;
  }
  function horasHTML() {
    let h = "";
    for (let t = INICIO + 60; t < C.FIM; t += 60) h += '<span class="grade__hora" style="top:' + (t - INICIO) * PX + 'px">' + C.txt(t) + "</span>";
    return h;
  }

  /* ─── Disposição em linhas: horas na horizontal, uma linha por médico (e por dia, na semana) ─── */
  function fundoLinhasHTML(n, semana) {
    let h = "";
    for (let t = INICIO; t <= C.FIM; t += 30) {
      h += '<div class="linhas__vlinha' + (t % 60 ? " linhas__vlinha--meia" : "") + '" style="left:' + (t - INICIO) * PXH + 'px"></div>';
    }
    h += '<div class="grade__almoco">' + (semana ? "" : "Almoço") + "</div>";
    for (let i = 1; i < n; i++) {
      const dia = semana && i % 6 === 0;
      h += '<div class="linhas__hsep' + (dia ? " linhas__hsep--dia" : "") + '" style="top:calc(' + i + " * var(--h))\"></div>";
    }
    return h;
  }
  function rotuloMedicoHTML(m, semana) {
    const md = medico(m);
    const nf = filaDe(m).length;
    if (semana) {
      return '<div class="linhas__med" style="--cor:' + md.cor + '">' + A.avatarMedico(md, 22) +
        '<span class="linhas__med-texto"><span class="linhas__med-nome">' + md.nome + "</span></span></div>";
    }
    return '<div class="linhas__med" style="--cor:' + md.cor + '">' + A.avatarMedico(md, 36) +
      '<span class="linhas__med-texto"><span class="linhas__med-nome">' + md.nome + '</span><span class="linhas__med-sub">' + esp(md.esp).nome + "</span>" +
      (nf ? '<span class="linhas__med-sub linhas__med-fila">' + nf + " na fila</span>" : "") + "</span></div>";
  }

  function vistaLinhas() {
    const semana = est.vista === "semana";
    const cols = colunas();
    const n = cols.length;
    let horas = "";
    for (let t = INICIO; t <= C.FIM; t += 60) horas += '<span class="linhas__hora" style="left:' + (t - INICIO) * PXH + 'px">' + C.txt(t) + "</span>";

    let rotulos;
    if (!semana) {
      rotulos = C.MEDICOS.map((m) => rotuloMedicoHTML(m, false)).join("");
    } else {
      rotulos = [0, 1, 2, 3, 4, 5].map((i) => {
        const dia = C.somaDias(est.semana, i);
        const f = (D.feriados || []).find((x) => x.data === dia);
        return '<div class="linhas__grupo"><div class="linhas__dia' + (dia === D.hoje ? " linhas__dia--hoje" : "") + '">' + curtoData(dia) +
          (f ? "<small>" + f.nome + "</small>" : "") + (dia === D.hoje ? '<span class="visualmente-oculto">, hoje</span>' : "") + "</div>" +
          '<div class="linhas__meds">' + C.MEDICOS.map((m) => rotuloMedicoHTML(m, true)).join("") + "</div></div>";
      }).join("");
    }

    const blocos = C.consultas.filter(ativas).map((k) => {
      const c = cols.findIndex((x) => x.medico === k.medico && x.data === k.data);
      return c < 0 ? "" : blocoHTML(k, c);
    }).join("");

    vistaEl.innerHTML =
      '<div class="grade grade--linha' + (semana ? " grade--semana" : "") + '" style="--n:' + n + ";--larg:" + LARG + '">' +
      '<div class="grade__rolagem" id="rolagem"><div class="linhas">' +
      '<div class="linhas__cab"><span class="linhas__canto">' + (semana ? "Dia e médico" : "Médico") + '</span><div class="linhas__eixo" aria-hidden="true">' + horas + "</div></div>" +
      '<div class="linhas__corpo"><div class="linhas__rotulos">' + rotulos + "</div>" +
      '<div class="grade__pista" id="pista">' + fundoLinhasHTML(n, semana) + blocos + '<div class="agora" id="agora" hidden><span class="agora__rotulo"></span></div></div>' +
      "</div></div></div></div>";
    posicionarAgora(true);
    const rol = $("#rolagem");
    rol.scrollLeft = Math.max(0, (agora() - 90 - INICIO) * PXH);
    if (semana) {
      const idx = cols.findIndex((c) => c.data === D.hoje);
      if (idx >= 0) rol.scrollTop = Math.max(0, idx * ($("#pista").offsetHeight / n) - 4);
    }
  }

  function vistaGrade() {
    if (emLinha()) { vistaLinhas(); return; }
    const semana = est.vista === "semana";
    const cols = colunas();
    const n = cols.length;
    let cab;
    if (!semana) {
      cab = '<div class="grade__colunas">' + C.MEDICOS.map((m) => {
        const md = medico(m);
        const nf = filaDe(m).length;
        return '<div class="grade__medico" style="--cor:' + md.cor + '">' +
          '<span class="grade__medico-texto"><span class="grade__medico-nome">' + md.nome + '</span><span class="grade__medico-esp">' + esp(md.esp).nome + "</span>" +
          (nf ? '<span class="grade__medico-fila">' + nf + " na fila</span>" : "") + "</span></div>";
      }).join("") + "</div>";
    } else {
      cab = '<div class="grade__dias">' + [0, 1, 2, 3, 4, 5].map((i) => {
        const dia = C.somaDias(est.semana, i);
        const f = (D.feriados || []).find((x) => x.data === dia);
        return '<div class="grade__dia-cab' + (dia === D.hoje ? " grade__dia-cab--hoje" : "") + '"><span class="grade__dia-nome">' + curtoData(dia) + (f ? " · " + f.nome : "") + (dia === D.hoje ? '<span class="visualmente-oculto">, hoje</span>' : "") + "</span>" +
          '<span class="grade__faixas" aria-hidden="true">' + C.MEDICOS.map((m) => '<span class="grade__faixa" style="background:' + medico(m).cor + '">' + A.iniciais(medico(m).nome) + "</span>").join("") + "</span></div>";
      }).join("") + "</div>";
    }
    const blocos = C.consultas.filter(ativas).map((k) => {
      const c = cols.findIndex((x) => x.medico === k.medico && x.data === k.data);
      return c < 0 ? "" : blocoHTML(k, c);
    }).join("");
    vistaEl.innerHTML =
      (semana ? '<ul class="legenda-medicos" aria-label="Ordem das faixas de cada dia">' + C.MEDICOS.map((m) => '<li>' + A.avatarMedico(medico(m), 22) + medico(m).nome + " · " + esp(medico(m).esp).nome + "</li>").join("") + "</ul>" : "") +
      '<div class="grade' + (semana ? " grade--semana" : "") + '" style="--n:' + n + '">' +
      '<div class="grade__cabeca"><span></span>' + cab + "</div>" +
      '<div class="grade__rolagem" id="rolagem"><div class="grade__corpo">' +
      '<div class="grade__horas" aria-hidden="true">' + horasHTML() + "</div>" +
      '<div class="grade__pista" id="pista">' + fundoHTML(n, semana) + blocos + '<div class="agora" id="agora" hidden><span class="agora__rotulo"></span></div></div>' +
      "</div></div></div>";
    posicionarAgora(true);
    const rol = $("#rolagem");
    rol.scrollTop = Math.max(0, (agora() - 90 - INICIO) * PX);
  }

  function posicionarAgora(primeira) {
    const linha = $("#agora");
    if (!linha) return;
    const cols = colunas();
    const n = cols.length;
    const idx = cols.findIndex((c) => c.data === D.hoje);
    if (idx < 0) { linha.hidden = true; return; }
    linha.hidden = false;
    const largura = est.vista === "dia" ? n : 6;
    if (primeira) linha.style.transition = "none";
    if (emLinha()) {
      linha.style.top = "calc(" + idx + " * var(--h))";
      linha.style.height = "calc(" + largura + " * var(--h))";
      linha.style.transform = "translateX(" + ((agora() - INICIO) * PXH) + "px)";
    } else {
      linha.style.left = "calc(" + idx + " * 100% / " + n + ")";
      linha.style.width = "calc(" + largura + " * 100% / " + n + ")";
      linha.style.transform = "translateY(" + ((agora() - INICIO) * PX) + "px)";
    }
    linha.querySelector(".agora__rotulo").textContent = C.txt(Math.floor(agora()));
    if (primeira) requestAnimationFrame(() => { linha.style.transition = ""; });
  }
  setInterval(() => posicionarAgora(false), 1000);

  /* ─── Visão Mês em 3D: semanas empilhadas como folhas de cbloco ─── */
  function semanasDoMes() {
    const lista = [];
    /* as semanas que tocam o mês de hoje */
    const mesHoje = D.hoje.slice(0, 7);
    const ultimo = C.iso(new Date(C.data(D.hoje).getFullYear(), C.data(D.hoje).getMonth() + 1, 0));
    for (let s = segunda(mesHoje + "-01"); s <= ultimo; s = C.somaDias(s, 7)) {
      const dias = [0, 1, 2, 3, 4, 5].map((i) => {
        const dia = C.somaDias(s, i);
        const cap = capacidadeDia(dia);
        const ocup = doDia(dia).filter(ocupa).reduce((t, k) => t + k.dur, 0);
        return { dia, o: cap ? Math.min(1, ocup / cap) : 0, fechado: !cap };
      });
      const ks = C.consultas.filter((k) => k.data >= s && k.data <= C.somaDias(s, 5) && ativas(k));
      lista.push({
        s, dias,
        consultas: ks.filter(ocupa).length,
        vagas: ks.filter((k) => k.horario).length,
        media: Math.round((dias.filter((d) => !d.fechado).reduce((t, d) => t + d.o, 0) / Math.max(1, dias.filter((d) => !d.fechado).length)) * 100),
        atual: s === segunda(D.hoje),
      });
    }
    return lista;
  }
  const nomeSemana = (s) => { const a = C.data(s), b = C.data(C.somaDias(s, 5)); return a.getDate() + (a.getMonth() !== b.getMonth() ? " de " + A.MESES[a.getMonth()] : "") + " a " + b.getDate() + " de " + A.MESES[b.getMonth()]; };

  function vistaMes() {
    const semanas = semanasDoMes();
    const total = semanas.length;
    vistaEl.innerHTML =
      '<div class="mes3d">' +
      '<div class="pilha" aria-hidden="true"><div class="pilha__palco">' +
      semanas.map((w, i) =>
        '<button type="button" tabindex="-1" class="camada' + (w.atual ? " camada--atual" : "") + '" data-semana="' + w.s + '" style="--i:' + (total - 1 - i) + '">' +
        '<span class="camada__faixa">' + nomeSemana(w.s) + (w.atual ? "<small>Esta semana</small>" : "") + "</span>" +
        '<span class="camada__dias">' + w.dias.map((d) => '<span class="camada__dia"><span class="camada__barra"><i style="--o:' + d.o.toFixed(2) + '"></i></span>' + A.SEMANA_CURTA[C.data(d.dia).getDay()] + " " + C.data(d.dia).getDate() + "</span>").join("") + "</span>" +
        '<span class="camada__total">' + w.consultas + " consultas · " + w.vagas + " vagas · " + w.media + "% ocupado</span></button>"
      ).join("") +
      "</div></div>" +
      '<ul class="semanas" aria-label="Semanas de ' + A.MESES_LONGOS[C.data(D.hoje).getMonth()] + '">' +
      semanas.map((w) =>
        '<li><button type="button" data-semana="' + w.s + '"><span class="semanas__nome">Semana de ' + nomeSemana(w.s) + (w.atual ? " (esta semana)" : "") + "</span>" +
        '<span class="semanas__n num">' + w.media + "%</span>" +
        '<span class="semanas__sub">' + w.consultas + " consultas · " + w.vagas + " vagas abertas</span><span class=\"semanas__sub\" style=\"text-align:right\">ocupação</span></button></li>"
      ).join("") + "</ul></div>";

    const pilha = vistaEl.querySelector(".pilha");
    const marcar = (s) => vistaEl.querySelectorAll("[data-semana]").forEach((b) => b.classList.toggle("ativa", b.dataset.semana === s));
    pilha.addEventListener("pointerenter", () => pilha.classList.add("pilha--aberta"));
    pilha.addEventListener("pointerleave", () => { pilha.classList.remove("pilha--aberta"); marcar(null); });
    vistaEl.querySelectorAll("[data-semana]").forEach((b) => {
      b.addEventListener("pointerenter", () => { pilha.classList.add("pilha--aberta"); marcar(b.dataset.semana); });
      b.addEventListener("focus", () => { pilha.classList.add("pilha--aberta"); marcar(b.dataset.semana); });
      b.addEventListener("blur", () => { pilha.classList.remove("pilha--aberta"); marcar(null); });
    });
    /* entrada: as folhas assentam uma sobre a outra */
    if (!M.reduzido()) {
      vistaEl.querySelectorAll(".camada").forEach((c, i) => {
        c.animate([{ opacity: 0, translate: "0 -40px" }, { opacity: 1, translate: "0 0" }], { duration: 420, delay: i * 60, easing: M.EASE_OUT, fill: "backwards" });
      });
    }
  }

  function abrirSemana(s, origem) {
    const fim = () => {
      est.semana = s;
      est.dia = s <= D.hoje && D.hoje <= C.somaDias(s, 5) ? D.hoje : s;
      trocarVista("semana");
    };
    const camada = vistaEl.querySelector('.camada[data-semana="' + s + '"]');
    if (M.reduzido() || !camada || !camada.offsetParent) { fim(); return; }
    vistaEl.querySelector(".pilha").classList.add("pilha--aberta");
    camada.animate([{ opacity: 1 }, { opacity: 0, translate: "0 -60px", scale: "1.08" }], { duration: 300, easing: M.EASE_IN_OUT, fill: "forwards" });
    void origem;
    setTimeout(fim, 260);
  }

  /* ─── Trocar de visão / navegar ─── */
  function tituloAgenda() {
    const t = $("#t-agenda");
    if (est.vista === "dia") t.textContent = cap(A.extenso(est.dia)) + (est.dia === D.hoje ? " · hoje" : "");
    else if (est.vista === "semana") t.textContent = "Semana de " + nomeSemana(est.semana);
    else t.textContent = cap(A.MESES_LONGOS[C.data(D.hoje).getMonth()]) + " de " + D.hoje.slice(0, 4) + ", semana a semana";
    $("#dica").textContent = est.vista === "mes"
      ? "Passe o mouse sobre as folhas para abrir a pilha. Clique numa semana para ver os horários."
      : "Arraste uma consulta para remarcar, ou clique nela para ver as opções. Pelo teclado: Tab até a consulta e Enter.";
    $("#ant").hidden = $("#prox").hidden = $("#hoje").hidden = est.vista === "mes";
  }

  function desenharVista() {
    tituloAgenda();
    document.querySelectorAll(".vistas [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === est.vista)));
    vistaEl.setAttribute("aria-labelledby", "aba-" + est.vista);
    $(".legenda").hidden = est.vista === "mes";
    $("#disposicao").hidden = est.vista === "mes";
    document.querySelectorAll("#disposicao [data-layout]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layout === est.layout)));
    if (!C.MEDICOS.length) {
      vistaEl.innerHTML = '<div class="vazio-agenda"><p><b>A agenda ainda está vazia.</b></p><p>Cadastre os médicos da clínica para abrir os horários.</p>' +
        '<a class="botao botao--principal" href="medicos.html">' + I("stethoscope", "ic-sm") + "Cadastrar médicos</a></div>";
      return;
    }
    if (est.vista === "mes") vistaMes(); else vistaGrade();
  }

  function trocarVista(v) {
    est.vista = v;
    desenharVista();
    vistaEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease" });
    desenharCalor();
  }

  function navegar(delta) {
    if (est.vista === "dia") {
      let d = C.somaDias(est.dia, delta);
      while (C.data(d).getDay() === 0) d = C.somaDias(d, delta);
      est.dia = d;
      est.semana = segunda(d);
    } else {
      est.semana = C.somaDias(est.semana, 7 * delta);
      est.dia = est.semana;
    }
    desenharVista();
    desenharCalor();
    vistaEl.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 150, easing: "ease" });
  }

  /* ─── Mapa de calor da semana ─── */
  function capacidadeDia(dia) {
    return C.MEDICOS.reduce((t, m) => {
      const e = C.expediente(m, dia);
      if (!e) return t;
      return t + (e[1] - e[0]) - Math.max(0, Math.min(e[1], 780) - Math.max(e[0], 720));
    }, 0);
  }
  function celulaCalor(dia, h) {
    const ini = h * 60, fim = ini + 60;
    let cap = 0, ocup = 0, total = 0, livres = 0;
    C.MEDICOS.forEach((m) => {
      const e = C.expediente(m, dia);
      if (!e || h === 12) return;
      cap += Math.max(0, Math.min(e[1], fim) - Math.max(e[0], ini));
    });
    doDia(dia).forEach((k) => {
      const sob = Math.max(0, Math.min(k.ini + k.dur, fim) - Math.max(k.ini, ini));
      if (!sob) return;
      if (ocupa(k)) { ocup += sob; total += 1; } else if (k.horario === "livre") livres += 1;
    });
    return { cap, o: cap ? Math.min(1, ocup / cap) : null, total, livres };
  }
  const passoCalor = (o) => (o < 0.2 ? 1 : o < 0.4 ? 2 : o < 0.6 ? 3 : o < 0.8 ? 4 : 5);

  function desenharCalor() {
    const grade = $("#calor");
    const horas = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    let h = "<span></span>" + horas.map((x) => '<span class="calor__hora">' + x + "h</span>").join("");
    let tabela = "<caption>Ocupação da semana de " + nomeSemana(est.semana) + ", por hora</caption><tr><th>Dia</th>" + horas.map((x) => "<th>" + x + "h</th>").join("") + "</tr>";
    for (let i = 0; i < 6; i++) {
      const dia = C.somaDias(est.semana, i);
      h += '<span class="calor__dia' + (dia === D.hoje ? " calor__dia--hoje" : "") + '">' + curtoData(dia) + "</span>";
      tabela += "<tr><th>" + cap(A.extenso(dia)) + "</th>";
      horas.forEach((x) => {
        const c = celulaCalor(dia, x);
        if (c.o === null) {
          h += '<span class="calor__celula calor__celula--vazia">' + (x === 12 ? "" : "–") + "</span>";
          tabela += "<td>" + (x === 12 ? "almoço" : "fechado") + "</td>";
          return;
        }
        const p = passoCalor(c.o);
        const pct = Math.round(c.o * 100);
        h += '<button type="button" tabindex="-1" class="calor__celula' + (p >= 4 ? " calor__celula--escura" : "") + '" style="background:var(--calor-' + p + ')" data-dia="' + dia + '" data-h="' + x + '"' +
          ' data-dica="' + A.esc("<b>" + cap(A.extenso(dia)) + ", " + x + "h às " + (x + 1) + "h</b>" + pct + "% ocupado · " + c.total + (c.total === 1 ? " consulta" : " consultas") + (c.livres ? " · " + c.livres + (c.livres === 1 ? " vaga livre" : " vagas livres") : "")) + '">' + pct + "</button>";
        tabela += "<td>" + pct + "%</td>";
      });
      tabela += "</tr>";
    }
    grade.innerHTML = h;
    $("#calor-tabela").innerHTML = tabela;
  }
  $("#calor").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-dia]");
    if (!c) return;
    est.dia = c.dataset.dia;
    est.semana = segunda(est.dia);
    trocarVista("dia");
    const rol = $("#rolagem");
    const suave = M.reduzido() ? "auto" : "smooth";
    if (rol && emLinha()) rol.scrollTo({ left: Math.max(0, (Number(c.dataset.h) * 60 - INICIO - 30) * PXH), behavior: suave });
    else if (rol) rol.scrollTo({ top: Math.max(0, (Number(c.dataset.h) * 60 - INICIO - 30) * PX), behavior: suave });
  });

  /* dica flutuante: mapa de calor e blocos da semana */
  const dica = $("#dica-flutuante");
  function mostrarDica(alvo, html) {
    dica.innerHTML = html;
    dica.hidden = false;
    const r = alvo.getBoundingClientRect();
    const d = dica.getBoundingClientRect();
    let x = r.left + r.width / 2 - d.width / 2;
    x = Math.max(8, Math.min(window.innerWidth - d.width - 8, x));
    let y = r.top - d.height - 8;
    if (y < 8) y = r.bottom + 8;
    dica.style.left = x + "px";
    dica.style.top = y + "px";
  }
  document.addEventListener("pointerover", (ev) => {
    if (est.sessao) return;
    const c = ev.target.closest("[data-dica]");
    if (c) { mostrarDica(c, c.dataset.dica); return; }
    const b = ev.target.closest(".grade--semana .cbloco");
    if (b) { const k = C.consultas.find((x) => x.id === b.dataset.id); mostrarDica(b, "<b>" + A.esc(k.horario === "livre" ? "Horário livre" : k.paciente) + "</b>" + C.txt(k.ini) + " · " + curtoData(k.data) + " · " + medico(k.medico).nome + "<br>" + ESTADOS[chave(k)].rotulo + (k.presencaConfirmada && k.status === "confirmada" ? " · presença confirmada" : "")); return; }
    dica.hidden = true;
  });
  document.addEventListener("focusin", (ev) => {
    const b = ev.target.closest(".grade--semana .cbloco");
    if (b) { const k = C.consultas.find((x) => x.id === b.dataset.id); mostrarDica(b, "<b>" + A.esc(k.horario === "livre" ? "Horário livre" : k.paciente) + "</b>" + C.txt(k.ini) + " · " + medico(k.medico).nome); }
    else dica.hidden = true;
  });

  /* ─── Contadores do topo ─── */
  function desenharResumo(animar) {
    const hoje = doDia(D.hoje);
    const consultas = hoje.filter(C.ehConsulta).length;
    const atendidas = hoje.filter((k) => k.status === "atendida").length;
    const vagas = hoje.filter((k) => k.horario).length;
    const oferecidas = hoje.filter((k) => k.horario === "oferecido").length;
    const fila = totalFila();
    const medicosComFila = C.MEDICOS.filter((m) => filaDe(m).length).length;
    const set = (id, v) => { const el = $(id); if (animar) M.contador(el, v); else { el.textContent = v; el.dataset.valor = v; } };
    set("#n-consultas", consultas);
    set("#n-vagas", vagas);
    set("#n-fila", fila);
    $("#s-consultas").textContent = atendidas + " já atendidas";
    $("#s-vagas").textContent = oferecidas ? oferecidas + (oferecidas === 1 ? " oferecida à fila" : " oferecidas à fila") : "por cancelamento";
    $("#s-fila").textContent = "em " + medicosComFila + " médicos";
    $("#nav-fila").textContent = fila;
    desenharProximos();
  }

  /* ─── Lista de espera ─── */
  function desenharFila() {
    const m = est.filaMedico;
    if (!m) {
      $("#fila-medicos").innerHTML = "";
      $("#fila-meta").textContent = "";
      $("#fila-lista").innerHTML = '<li class="fila__vazia">Cadastre os médicos da clínica para abrir a lista de espera.</li>';
      return;
    }
    $("#fila-medicos").innerHTML = '<label for="fila-sel">Médico</label><select id="fila-sel">' + C.MEDICOS.map((x) =>
      '<option value="' + x + '"' + (x === m ? " selected" : "") + ">" + medico(x).nome + " · " + filaDe(x).length + " na fila</option>"
    ).join("") + "</select>";
    const lista = filaDe(m);
    $("#fila-meta").textContent = lista.length + (lista.length === 1 ? " pessoa" : " pessoas") + " · " + esp(medico(m).esp).nome;
    $("#fila-lista").innerHTML = lista.length
      ? lista.map((p, i) =>
          '<li class="fila__item" data-nome="' + A.esc(p.nome) + '"><span class="fila__pos num" aria-hidden="true">' + (i + 1) + "º</span>" +
          '<span><span class="fila__nome"><span class="visualmente-oculto">' + (i + 1) + "ª posição: </span>" + A.esc(p.nome) +
          (p.app ? '<span class="fila__app">' + I("smartphone") + "pelo app</span>" : "") + "</span>" +
          '<span class="fila__sub" style="display:block">Desde ' + A.extenso(p.desde, false) + " · tel. " + p.tel + "</span></span></li>"
        ).join("")
      : '<li class="fila__vazia">Ninguém aguardando vaga com ' + medico(m).nome + ".</li>";
  }
  $("#fila-medicos").addEventListener("change", (ev) => {
    est.filaMedico = ev.target.value;
    desenharFila();
    $("#fila-sel").focus();
    $("#fila-lista").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
  });

  /* ─── Próximos pacientes: quem a recepção recebe agora, em ordem de horário ─── */
  const PROXIMOS_VISIVEIS = 4;
  const semAcento = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const medicoCurto = (id) => medico(id).nome.split(" ").slice(0, 2).join(" ");
  est.busca = "";
  est.proximosTodos = false;

  /* quem ainda passa pela recepção hoje: já chegou (aguarda ser chamado) ou ainda vai chegar.
     Quem está em atendimento já está com o médico e só aparece na busca. */
  function restantesHoje() {
    const t = agora();
    return doDia(D.hoje)
      .filter((k) => ["na_recepcao", "confirmada"].includes(k.status) && k.ini + k.dur > t)
      .sort((a, b) => a.ini - b.ini || (a.status === "na_recepcao" ? -1 : 1));
  }

  function situacaoProximo(k) {
    const t = agora();
    if (k.status === "em_atendimento") return '<span class="selo selo--em_atendimento">' + SC.em_atendimento + "</span>";
    if (k.status === "na_recepcao") {
      return k.chamado
        ? '<span class="selo selo--chamado">Chamado às ' + k.chamado + "</span>"
        : '<span class="selo selo--na_recepcao">' + SC.na_recepcao + "</span>";
    }
    if (k.status === "confirmada") {
      const falta = Math.round(k.ini - t);
      /* atraso não é falta: só o médico ou a recepção marcam "faltou" */
      if (falta < 0) return '<span class="selo selo--atraso">' + -falta + " min de atraso</span>";
      if (falta === 0) return '<span style="white-space:nowrap">horário agora</span>';
      if (falta <= 45) return '<span style="white-space:nowrap">chega em ' + falta + " min</span>";
      return "";
    }
    if (k.status === "atendida") return '<span class="selo selo--atendida">' + SC.atendida + "</span>";
    if (k.status === "faltou") return '<span class="selo selo--faltou">' + SC.faltou + "</span>";
    return "";
  }

  function acaoProximo(k) {
    if (k.status === "confirmada") {
      return '<button type="button" class="botao botao--secundario" data-chegou="' + k.id + '" aria-label="Marcar chegada de ' + A.esc(k.paciente) + '">Chegou</button>';
    }
    if (k.status === "na_recepcao") {
      return '<button type="button" class="botao botao--menta" data-chamar="' + k.id + '" aria-label="Chamar ' + A.esc(k.paciente) + ' no painel">Chamar</button>';
    }
    return "";
  }

  function desenharProximos() {
    const lista = $("#proximos-lista");
    const restantes = restantesHoje();
    const termo = semAcento(est.busca);
    let mostrados;
    if (termo) {
      mostrados = doDia(D.hoje)
        .filter((k) => k.paciente && C.ehConsulta(k) && semAcento(k.paciente).includes(termo))
        .sort((a, b) => a.ini - b.ini);
      $("#proximos-meta").textContent = mostrados.length + (mostrados.length === 1 ? " encontrado hoje" : " encontrados hoje");
    } else {
      mostrados = est.proximosTodos ? restantes : restantes.slice(0, PROXIMOS_VISIVEIS);
      $("#proximos-meta").textContent = restantes.length + " até o fim do dia";
    }

    lista.classList.toggle("proximos__lista--todos", !termo && est.proximosTodos);
    if (!mostrados.length) {
      lista.innerHTML = '<li class="proximos__vazio">' + (termo
        ? "Ninguém com esse nome na agenda de hoje. Confira a grafia."
        : "Todos os pacientes de hoje já foram atendidos.") + "</li>";
    } else {
      lista.innerHTML = mostrados.map((k, i) =>
        '<li class="proximo' + (!termo && i === 0 ? " proximo--primeiro" : "") + '" data-id="' + k.id + '">' +
        '<span class="proximo__folha"><span class="proximo__h">' + C.txt(k.ini) + "</span></span>" +
        '<span class="proximo__corpo">' +
        '<button type="button" class="proximo__nome" data-ver="' + k.id + '" title="Mostrar na agenda">' + A.esc(k.paciente) + "</button>" +
        '<span class="proximo__sub"><span class="proximo__medico">' + medicoCurto(k.medico) + "</span>" + situacaoProximo(k) + "</span>" +
        "</span>" +
        '<span class="proximo__acao">' + acaoProximo(k) + "</span></li>"
      ).join("");
    }

    const mais = $("#proximos-mais");
    const sobra = restantes.length - PROXIMOS_VISIVEIS;
    mais.hidden = !!termo || sobra <= 0;
    mais.textContent = est.proximosTodos ? "Mostrar só os próximos " + PROXIMOS_VISIVEIS : "Ver todos os " + restantes.length;
    mais.setAttribute("aria-expanded", String(est.proximosTodos));
  }

  /* aponta o bloco da consulta na agenda (troca para o dia de hoje se for preciso) */
  function mostrarNaAgenda(k) {
    if (est.vista !== "dia" || est.dia !== D.hoje) {
      est.dia = D.hoje;
      est.semana = segunda(D.hoje);
      est.vista = "dia";
      desenharVista();
      desenharCalor();
    }
    const el = blocoEl(k.id);
    if (!el) return;
    el.scrollIntoView({ block: "center", inline: "center", behavior: M.reduzido() ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
    el.classList.add("apontado");
    if (!M.reduzido()) el.animate([{ transform: "scale(1.06)" }, { transform: "none" }], { duration: 420, easing: M.EASE_OUT });
    setTimeout(() => el.classList.remove("apontado"), 1600);
  }

  function marcarChegada(k) {
    k.status = "na_recepcao";
    C.salvar();
    const el = blocoEl(k.id);
    if (el) atualizarBloco(el, k);
    desenharProximos();
    toast({
      titulo: k.paciente + " está na recepção",
      texto: medico(k.medico).nome + ", " + C.txt(k.ini),
      icone: "user-check",
      acao: { rotulo: "Desfazer", fazer: () => { k.status = "confirmada"; delete k.chamado; C.salvar(); const e2 = blocoEl(k.id); if (e2) atualizarBloco(e2, k); desenharProximos(); } },
    });
  }

  function devolverFoco(id, seletor) {
    const li = $('#proximos-lista [data-id="' + id + '"]');
    const alvo = li && (li.querySelector(seletor) || li.querySelector("[data-ver]"));
    if (alvo) alvo.focus({ preventScroll: true });
  }

  $("#proximos-lista").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    const k = C.consultas.find((x) => x.id === (b.dataset.chegou || b.dataset.chamar || b.dataset.ver));
    if (!k) return;
    if (b.dataset.ver) { mostrarNaAgenda(k); return; }
    if (b.dataset.chegou) { marcarChegada(k); devolverFoco(k.id, "[data-chamar]"); return; }
    if (b.dataset.chamar) {
      k.chamado = C.txt(Math.floor(agora()));
      C.salvar();
      desenharProximos();
      devolverFoco(k.id, "[data-chamar]");
      toast({ titulo: "Chamamos " + k.paciente, texto: "No painel da recepção, para " + medico(k.medico).nome + ".", icone: "bell-ring", duracao: 3600 });
    }
  });
  $("#busca").addEventListener("input", (ev) => { est.busca = ev.target.value.trim(); desenharProximos(); });
  $("#proximos-mais").addEventListener("click", () => {
    est.proximosTodos = !est.proximosTodos;
    desenharProximos();
  });
  /* Falta: só a recepção (aqui, no menu da consulta) ou o médico marcam. Atraso não é falta. */
  function marcarFalta(k) {
    k.status = "faltou";
    C.registrarFalta(k, "Não compareceu", K.conta.nome);
    const el = blocoEl(k.id);
    if (el) atualizarBloco(el, k);
    desenharProximos();
    desenharResumo(false);
    toast({
      titulo: "Falta registrada: " + k.paciente,
      texto: k.presencaConfirmada ? "Tinha confirmado presença: conta como falta sem aviso. Dá para retirar na ficha do paciente, se for justificada." : "Não tinha confirmado presença: fica registrada, mas não conta para restrição.",
      icone: "x", duracao: 6000,
    });
  }

  /* o relógio anda: atrasos e quem já saiu da lista se atualizam, sem roubar o foco de quem está usando */
  setInterval(() => {
    if ($("#proximos").contains(document.activeElement) && document.activeElement !== $("#busca")) return;
    desenharProximos();
  }, 30000);

  /* ─── Banco de dados: o trigger ─── */
  
  function acender(grupo) {
    document.querySelectorAll("#codigo span").forEach((s) => s.classList.toggle("aceso", s.dataset.g === grupo));
  }
  async function registrar(texto) {
    const log = $("#log");
    /* o painel do banco saiu da tela: mantém só a pausa entre os passos */
    if (!log) { await M.esperar(380); return; }
    const vazio = log.querySelector(".vazio");
    if (vazio) log.innerHTML = "";
    const li = document.createElement("li");
    li.innerHTML = "<time>" + relogio() + "</time><span>" + texto + "</span>";
    log.prepend(li);
    while (log.children.length > 6) log.lastElementChild.remove();
    if (!M.reduzido()) li.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: M.EASE_OUT });
    await M.esperar(380);
  }

  /* ─── Toasts ─── */
  function toast(o) {
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = I(o.icone || "bell-ring") + "<p>" + o.titulo + (o.texto ? "<small>" + o.texto + "</small>" : "") + "</p>" +
      (o.acao ? '<button type="button" class="botao botao--pequeno">' + I("undo", "ic-sm") + o.acao.rotulo + "</button>" : "");
    $("#toasts").appendChild(el);
    el.animate(M.reduzido() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(16px) scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: M.EASE_OUT });
    const fechar = () => {
      if (!el.isConnected) return;
      el.animate([{ opacity: 1 }, { opacity: 0, transform: M.reduzido() ? "none" : "translateY(8px)" }], { duration: 180, easing: "ease", fill: "forwards" }).finished.then(() => el.remove());
    };
    if (o.acao) el.querySelector("button").addEventListener("click", () => { fechar(); o.acao.fazer(); });
    setTimeout(fechar, o.duracao || 5200);
    anunciar(o.titulo + (o.texto ? ". " + o.texto : ""));
  }

  /* ─── Mover uma consulta (arrastar ou teclado) ─── */
  function validar(k, col, ini) {
    const cols = colunas();
    const alvo = cols[col];
    if (!alvo) return "Fora da agenda";
    const md = medico(alvo.medico);
    if (md.esp !== medico(k.medico).esp) return md.nome.replace(/^Dra?\. /, "") + " atende " + esp(md.esp).nome;
    const e = C.expediente(alvo.medico, alvo.data);
    if (!e || ini < e[0] || ini + k.dur > e[1]) return "Fora do expediente";
    if (ini < 780 && ini + k.dur > 720) return "Horário de almoço";
    if (alvo.data < D.hoje || (alvo.data === D.hoje && ini < agora())) return "Esse horário já passou";
    const choque = C.consultas.find((x) => x !== k && ativas(x) && x.horario !== "livre" && x.medico === alvo.medico && x.data === alvo.data && x.ini < ini + k.dur && ini < x.ini + x.dur);
    if (choque) return "Ocupado: " + (choque.paciente || "vaga oferecida");
    return null;
  }

  function encaixeEl() {
    let e = $("#encaixe");
    if (!e) {
      e = document.createElement("div");
      e.id = "encaixe";
      e.className = "encaixe";
      e.setAttribute("aria-hidden", "true");
      $("#pista").appendChild(e);
    }
    return e;
  }
  function mostrarEncaixe(k, col, ini, motivo) {
    const e = encaixeEl();
    const n = colunas().length;
    if (emLinha()) {
      e.style.left = ((ini - INICIO) * PXH) + "px";
      e.style.width = (k.dur * PXH - 3) + "px";
      e.style.top = "calc(" + col + " * var(--h) + 4px)";
      e.style.height = "calc(var(--h) - 8px)";
    } else {
      e.style.left = "calc(" + col + " * 100% / " + n + " + 3px)";
      e.style.width = "calc(100% / " + n + " - 6px)";
      e.style.top = ((ini - INICIO) * PX + 1) + "px";
      e.style.height = (k.dur * PX - 3) + "px";
    }
    e.classList.toggle("encaixe--nao", !!motivo);
    const alvo = colunas()[col];
    e.textContent = motivo || C.txt(ini) + (est.vista === "semana" ? "" : " · livre");
    e.dataset.texto = motivo || C.txt(ini) + " · " + curtoData(alvo.data) + " · " + medico(alvo.medico).nome;
  }
  function tirarEncaixe() { const e = $("#encaixe"); if (e) e.remove(); }

  /* encaixa o cbloco no lugar novo: FLIP do ponto onde foi solto até o destino, com mola */
  function assentar(el, k, de) {
    atualizarBloco(el, k);
    el.style.transform = "";
    el.classList.remove("levantado", "movendo-teclado");
    if (M.reduzido()) { el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180 }); return; }
    const para = el.getBoundingClientRect();
    const mola = M.mola({ duracao: 0.42, bounce: 0.22 });
    el.animate(
      [
        { transform: "translate(" + (de.left - para.left) + "px," + (de.top - para.top) + "px) scale(1.03)", boxShadow: "inset 0 0 0 2px #12263f, 0 18px 28px -12px rgba(10,24,40,.55)" },
        { transform: "none", boxShadow: getComputedStyle(el).boxShadow },
      ],
      { duration: mola.duracao, easing: mola.easing }
    );
  }
  function voltar(el, de, motivo) {
    el.classList.remove("levantado", "movendo-teclado");
    el.style.transform = "";
    if (!M.reduzido() && de) {
      const para = el.getBoundingClientRect();
      const mola = M.mola({ duracao: 0.38, bounce: 0.15 });
      el.animate([{ transform: "translate(" + (de.left - para.left) + "px," + (de.top - para.top) + "px)" }, { transform: "none" }], { duration: mola.duracao, easing: mola.easing })
        .finished.then(() => M.tremer(el));
    } else M.tremer(el);
    if (motivo) toast({ titulo: "Não dá para remarcar aí", texto: motivo, icone: "info", duracao: 3200 });
  }

  function remarcar(k, el, col, ini, de) {
    const antes = { medico: k.medico, data: k.data, ini: k.ini };
    const alvo = colunas()[col];
    /* um horário livre que estava ali deixa de existir: a consulta passa a ocupá-lo */
    for (let i = C.consultas.length - 1; i >= 0; i--) {
      const x = C.consultas[i];
      if (x.horario === "livre" && x.medico === alvo.medico && x.data === alvo.data && x.ini < ini + k.dur && ini < x.ini + x.dur) {
        C.consultas.splice(i, 1);
        const v = blocoEl(x.id);
        if (v) v.remove();
      }
    }
    k.medico = alvo.medico; k.data = alvo.data; k.ini = ini;
    C.salvar();
    assentar(el, k, de);
    desenharCalor();
    desenharResumo(true);
    toast({
      titulo: "Consulta de " + k.paciente + " remarcada",
      texto: curtoData(k.data) + ", " + C.txt(k.ini) + " · " + medico(k.medico).nome,
      icone: "calendar-days",
      acao: {
        rotulo: "Desfazer",
        fazer: () => {
          const e2 = blocoEl(k.id);
          const r = e2 ? e2.getBoundingClientRect() : null;
          Object.assign(k, antes);
          C.salvar();
          if (e2 && indiceColuna(k) >= 0) assentar(e2, k, r); else desenharVista();
          desenharCalor();
          desenharProximos();
          anunciar("Remarcação desfeita.");
        },
      },
    });
  }

  /* arrastar com ponteiro */
  vistaEl.addEventListener("pointerdown", (ev) => {
    const el = ev.target.closest(".cbloco");
    if (!el || ev.button !== 0 || est.sessao) return;
    const k = C.consultas.find((x) => x.id === el.dataset.id);
    const pista = $("#pista");
    const rp = pista.getBoundingClientRect();
    const r0 = el.getBoundingClientRect();
    const s = { k, el, x0: ev.clientX, y0: ev.clientY, dx: ev.clientX - r0.left, dy: ev.clientY - r0.top, ativo: false, id: ev.pointerId, col: null, ini: null, motivo: null, rp, r0 };
    if (!MOVEIS.includes(k.status)) { s.soClique = true; }
    est.sessao = s;
  });
  window.addEventListener("pointermove", (ev) => {
    const s = est.sessao;
    if (!s || s.teclado || ev.pointerId !== s.id || s.soClique) return;
    const dx = ev.clientX - s.x0, dy = ev.clientY - s.y0;
    if (!s.ativo) {
      if (Math.hypot(dx, dy) < 5) return;
      s.ativo = true;
      dica.hidden = true;
      try { s.el.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
      s.el.classList.add("levantado");
    }
    s.el.style.transform = M.reduzido() ? "" : "translate(" + dx + "px," + dy + "px) scale(1.03)";
    const pista = $("#pista");
    const rp = pista.getBoundingClientRect();
    const n = colunas().length;
    const linha = emLinha();
    const col = linha
      ? Math.max(0, Math.min(n - 1, Math.floor((ev.clientY - rp.top) / (rp.height / n))))
      : Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - rp.left) / (rp.width / n))));
    const passo = s.k.dur === 40 ? 20 : 15;
    const ini = linha
      ? Math.round(((ev.clientX - s.dx - rp.left) / PXH + INICIO) / passo) * passo
      : Math.round(((ev.clientY - s.dy - rp.top) / PX + INICIO) / passo) * passo;
    if (col !== s.col || ini !== s.ini) {
      s.col = col; s.ini = ini;
      s.motivo = validar(s.k, col, ini);
      mostrarEncaixe(s.k, col, ini, s.motivo);
    }
    /* rola a grade quando chega perto da borda */
    const rol = $("#rolagem").getBoundingClientRect();
    if (ev.clientY > rol.bottom - 30) $("#rolagem").scrollTop += 12;
    else if (ev.clientY < rol.top + 30) $("#rolagem").scrollTop -= 12;
    if (linha) {
      /* a coluna de médicos fica fixa à esquerda, então a borda útil começa depois dela */
      const borda = rol.left + parseFloat(getComputedStyle($(".grade--linha")).getPropertyValue("--rot"));
      if (ev.clientX > rol.right - 30) $("#rolagem").scrollLeft += 12;
      else if (ev.clientX < borda + 30) $("#rolagem").scrollLeft -= 12;
    }
  });
  function terminarArrasto(ev) {
    const s = est.sessao;
    if (!s || s.teclado || ev.pointerId !== s.id) return;
    est.sessao = null;
    if (!s.ativo) { abrirMenu(s.k, s.el); return; }
    tirarEncaixe();
    const de = s.el.getBoundingClientRect();
    const igual = s.col === indiceColuna(s.k) && s.ini === s.k.ini;
    if (igual) { voltar(s.el, de); return; }
    if (s.motivo) { voltar(s.el, de, s.motivo); return; }
    remarcar(s.k, s.el, s.col, s.ini, de);
  }
  window.addEventListener("pointerup", terminarArrasto);
  window.addEventListener("pointercancel", (ev) => {
    const s = est.sessao;
    if (!s || s.teclado) return;
    est.sessao = null;
    tirarEncaixe();
    voltar(s.el, s.el.getBoundingClientRect());
  });

  /* mover pelo teclado: setas mudam horário e coluna, Enter confirma, Esc desiste */
  function moverPeloTeclado(k, el) {
    const s = { k, el, teclado: true, col: indiceColuna(k), ini: k.ini, motivo: null };
    est.sessao = s;
    el.classList.add("movendo-teclado");
    el.focus();
    mostrarEncaixe(k, s.col, s.ini, "Use as setas");
    anunciar("Movendo a consulta de " + k.paciente + ". " + (emLinha()
      ? "Setas para os lados mudam o horário; para cima e para baixo, a linha."
      : "Setas para cima e para baixo mudam o horário; para os lados, a coluna.") + " Enter confirma, Esc desiste.");
  }
  vistaEl.addEventListener("keydown", (ev) => {
    const s = est.sessao;
    if (!s || !s.teclado) {
      const el = ev.target.closest(".cbloco");
      if (el && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); abrirMenu(C.consultas.find((x) => x.id === el.dataset.id), el); }
      return;
    }
    const n = colunas().length;
    const passo = s.k.dur;
    const linha = emLinha();
    const [teclaMenos, teclaMais, teclaAntes, teclaDepois] = linha
      ? ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
      : ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (ev.key === teclaMenos) s.ini -= passo;
    else if (ev.key === teclaMais) s.ini += passo;
    else if (ev.key === teclaAntes) s.col = Math.max(0, s.col - 1);
    else if (ev.key === teclaDepois) s.col = Math.min(n - 1, s.col + 1);
    else if (ev.key === "Escape") { ev.preventDefault(); est.sessao = null; tirarEncaixe(); s.el.classList.remove("movendo-teclado"); anunciar("Remarcação cancelada."); return; }
    else if (ev.key === "Enter") {
      ev.preventDefault();
      est.sessao = null;
      tirarEncaixe();
      const de = s.el.getBoundingClientRect();
      if (s.col === indiceColuna(s.k) && s.ini === s.k.ini) { s.el.classList.remove("movendo-teclado"); return; }
      if (s.motivo) { voltar(s.el, null, s.motivo); return; }
      remarcar(s.k, s.el, s.col, s.ini, de);
      s.el.focus();
      return;
    } else return;
    ev.preventDefault();
    s.ini = Math.max(INICIO, Math.min(C.FIM - s.k.dur, s.ini));
    s.motivo = validar(s.k, s.col, s.ini);
    mostrarEncaixe(s.k, s.col, s.ini, s.motivo);
    const e = $("#encaixe");
    anunciar(e.dataset.texto + (s.motivo ? "" : ". Livre."));
    const rol = $("#rolagem");
    if (linha) {
      const x = (s.ini - INICIO) * PXH;
      const rot = parseFloat(getComputedStyle($(".grade--linha")).getPropertyValue("--rot"));
      if (x < rol.scrollLeft + 20 || x > rol.scrollLeft + rol.clientWidth - rot - 100) rol.scrollLeft = x - (rol.clientWidth - rot) / 2;
      const h = $("#pista").offsetHeight / n;
      const y = s.col * h;
      if (y < rol.scrollTop || y + h > rol.scrollTop + rol.clientHeight - 34) rol.scrollTop = y - rol.clientHeight / 2;
      return;
    }
    const y = (s.ini - INICIO) * PX;
    if (y < rol.scrollTop + 20 || y > rol.scrollTop + rol.clientHeight - 60) rol.scrollTop = y - rol.clientHeight / 2;
  });

  /* ─── Menu de uma consulta ─── */
  const menuCamada = $("#menu");
  let menuOrigem = null;
  function abrirMenu(k, el) {
    menuOrigem = el;
    const m = medico(k.medico);
    const hojeFuturo = k.data === D.hoje && k.ini >= agora() - 30;
    const itens = [];
    if (MOVEIS.includes(k.status)) {
      itens.push(["mover", "move", "Remarcar (mover)"]);
      if (k.status === "confirmada" && hojeFuturo) itens.push(["chegada", "user-check", "Marcar chegada"]);
      if (k.status === "confirmada" && (k.data < D.hoje || (k.data === D.hoje && k.ini <= agora()))) itens.push(["falta", "x", "Marcar falta"]);
      itens.push(["cancelar", "calendar-x", "Cancelar consulta", true]);
    } else if (k.horario === "livre" && filaDe(k.medico).length && (k.data > D.hoje || k.ini >= agora())) {
      itens.push(["oferecer", "bell-ring", "Oferecer à lista de espera"]);
    }
    const semAcao = k.horario === "oferecido" ? "Aguardando a resposta da pessoa (até 30 minutos)."
      : k.horario === "livre" ? "Horário livre. Para marcar, use “Nova consulta”."
      : k.status === "faltou" ? "O paciente não compareceu: não há o que mudar."
      : k.status === "em_atendimento" ? "O paciente está com o médico agora."
      : "Consulta já atendida: não há o que mudar.";
    menuCamada.innerHTML =
      '<div class="menu" role="dialog" aria-label="Opções da consulta">' +
      '<div class="menu__cab"><p class="menu__nome">' + A.esc(k.horario === "livre" ? "Horário livre" : k.paciente) + "</p>" +
      '<p class="menu__sub">' + curtoData(k.data) + ", " + C.txt(k.ini) + " às " + C.txt(k.ini + k.dur) + "<br>" + m.nome + " · " + ESTADOS[chave(k)].rotulo + "</p>" +
      (k.presencaConfirmada && MOVEIS.includes(k.status) ? '<p class="menu__sub">' + I("circle-check", "ic-sm") + " Presença confirmada pelo paciente</p>" : "") + "</div>" +
      '<div class="menu__itens" role="menu">' +
      (itens.length
        ? itens.map(([acao, ic, t, perigo]) => '<button type="button" role="menuitem" data-acao="' + acao + '"' + (perigo ? ' class="menu__perigo"' : "") + ">" + I(ic, "ic-sm") + t + "</button>").join("")
        : '<p class="menu__sub" style="padding:6px 4px">' + semAcao + "</p>") +
      '<button type="button" role="menuitem" data-acao="fechar">' + I("x", "ic-sm") + "Fechar</button></div></div>";
    menuCamada.hidden = false;
    const menu = menuCamada.querySelector(".menu");
    const r = el.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    let x = r.right + 8, origem = "left";
    if (x + mr.width > window.innerWidth - 8) { x = r.left - mr.width - 8; origem = "right"; }
    let y = Math.max(8, Math.min(window.innerHeight - mr.height - 8, r.top));
    menu.style.left = Math.max(8, x) + "px";
    menu.style.top = y + "px";
    menu.style.setProperty("--origem", "top " + origem);
    menu.animate(M.reduzido() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: M.EASE_OUT });
    menu.querySelector("[data-acao]").focus();
    menu.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-acao]");
      if (!b) return;
      const acao = b.dataset.acao;
      if (acao === "fechar") return fecharMenu(true);
      if (acao === "mover") { fecharMenu(false); moverPeloTeclado(k, el); return; }
      if (acao === "falta") { fecharMenu(true); marcarFalta(k); return; }
      if (acao === "chegada") {
        fecharMenu(true);
        marcarChegada(k);
        el.animate([{ transform: "scale(0.96)" }, { transform: "none" }], { duration: 200, easing: M.EASE_OUT });
        return;
      }
      if (acao === "oferecer") { fecharMenu(false); oferecerVaga(k); return; }
      if (acao === "cancelar") {
        const cx = menu.querySelector(".menu__itens");
        cx.innerHTML =
          '<p class="menu__confirma">Cancelar a consulta de <b>' + A.esc(k.paciente) + "</b>? " +
          (filaDe(k.medico).length ? "A vaga vai para a 1ª pessoa da lista de espera." : "O horário fica livre.") + "</p>" +
          '<div class="menu__confirma-acoes"><button type="button" class="botao botao--secundario botao--pequeno" data-acao="fechar">Manter</button>' +
          '<button type="button" class="botao botao--principal botao--pequeno" data-acao="sim">Sim, cancelar</button></div>';
        cx.querySelector("[data-acao=fechar]").focus();
        return;
      }
      if (acao === "sim") { fecharMenu(false); cancelar(k); }
    });
  }
  function fecharMenu(devolverFoco) {
    menuCamada.hidden = true;
    menuCamada.innerHTML = "";
    if (devolverFoco && menuOrigem && menuOrigem.isConnected) menuOrigem.focus();
  }
  menuCamada.addEventListener("pointerdown", (ev) => { if (ev.target === menuCamada) fecharMenu(false); });
  menuCamada.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { ev.preventDefault(); fecharMenu(true); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      const itens = Array.from(menuCamada.querySelectorAll("button"));
      const i = itens.indexOf(document.activeElement);
      const j = (i + (ev.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length;
      ev.preventDefault();
      itens[j].focus();
    }
    if (ev.key === "Tab") {
      const itens = Array.from(menuCamada.querySelectorAll("button"));
      const i = itens.indexOf(document.activeElement);
      if (ev.shiftKey && i === 0) { ev.preventDefault(); itens[itens.length - 1].focus(); }
      else if (!ev.shiftKey && i === itens.length - 1) { ev.preventDefault(); itens[0].focus(); }
    }
  });

  /* ─── Cancelamento ───
     A consulta fica "cancelada" (continua no histórico do paciente) e o horário dela volta como "livre".
     Se houver lista de espera para o médico, o horário vira "oferecido" à 1ª pessoa da fila. */
  let ocupado = false;

  async function cancelar(k) {
    if (ocupado) return;
    ocupado = true;
    const el = blocoEl(k.id);
    const nome = k.paciente;
    anunciar("Consulta de " + nome + " cancelada.");
    /* 1. o bloco da consulta some */
    if (el) {
      if (!M.reduzido()) {
        await el.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "scale(0.9)", filter: "blur(3px)" }], { duration: 280, easing: M.EASE_OUT }).finished;
      } else {
        await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }).finished;
      }
    }
    /* 2. consulta → cancelada; no mesmo lugar nasce um horário livre */
    const h = C.cancelarConsulta(k, "Cancelada pela recepção");
    if (el) {
      el.dataset.id = h.id;
      atualizarBloco(el, h);
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    }
    desenharResumo(true);
    desenharCalor();
    acender("c1");
    await registrar("Consulta de " + A.esc(nome) + ": status <b>cancelada</b> · horário " + C.txt(h.ini) + " <b>livre</b>");
    /* 3. se houver fila, o horário livre é oferecido */
    await oferecerVaga(h, true);
    ocupado = false;
  }

  async function oferecerVaga(k, viaTrigger) {
    const lista = filaDe(k.medico);
    const m = medico(k.medico);
    if (!viaTrigger) { acender("c3"); }
    if (!lista.length) {
      await registrar("Ninguém na fila de " + m.nome + ": o horário fica <b>livre</b>");
      acender(null);
      toast({ titulo: "Consulta cancelada · horário livre", texto: "Ninguém está esperando vaga com " + m.nome + ".", icone: "info" });
      return;
    }
    acender("c3");
    const p = lista[0];
    await registrar("Horário " + C.txt(k.ini) + " com " + m.nome + " <b>oferecido</b> à 1ª da fila: " + A.esc(p.nome));
    /* 3. a 1ª pessoa da fila desliza até o horário livre */
    if (est.filaMedico !== k.medico) { est.filaMedico = k.medico; desenharFila(); }
    const card = $("#fila-lista .fila__item");
    const el = blocoEl(k.id);
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
    await M.esperar(M.reduzido() ? 0 : 260);
    const antes = new Map(Array.from(document.querySelectorAll("#fila-lista .fila__item")).map((li) => [li.dataset.nome, li.getBoundingClientRect()]));
    if (card && el && !M.reduzido()) {
      const rc = card.getBoundingClientRect();
      const rb = el.getBoundingClientRect();
      const voo = card.cloneNode(true);
      voo.classList.add("voando");
      voo.style.cssText = "left:" + rc.left + "px;top:" + rc.top + "px;width:" + rc.width + "px;height:" + rc.height + "px";
      document.body.appendChild(voo);
      card.style.visibility = "hidden";
      const mola = M.mola({ duracao: 0.7, bounce: 0.12 });
      const sx = rb.width / rc.width, sy = rb.height / rc.height;
      await voo.animate(
        [
          { transform: "none", transformOrigin: "top left", opacity: 1 },
          { transform: "translate(" + (rb.left - rc.left) + "px," + (rb.top - rc.top) + "px) scale(" + sx + "," + sy + ")", transformOrigin: "top left", opacity: 0.85 },
        ],
        { duration: mola.duracao, easing: mola.easing, fill: "forwards" }
      ).finished;
      voo.remove();
    }
    lista.shift();
    K.guardar.saiuDaFila(k.medico, p.nome);
    C.oferecerHorario(k, p.nome);
    if (el) {
      atualizarBloco(el, k);
      if (!M.reduzido()) el.animate([{ transform: "scale(1.08)" }, { transform: "none" }], { duration: 320, easing: M.EASE_OUT });
      else el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200 });
    }
    /* o resto da fila sobe um lugar (FLIP) */
    desenharFila();
    if (!M.reduzido()) {
      document.querySelectorAll("#fila-lista .fila__item").forEach((li) => {
        const r0 = antes.get(li.dataset.nome);
        if (r0) M.flip(li, r0, { duracao: 360, easing: M.EASE_OUT });
        const pos = li.querySelector(".fila__pos");
        pos.animate([{ transform: "translateY(6px)", opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 360, easing: M.EASE_OUT });
      });
    }
    desenharResumo(true);
    desenharCalor();
    acender(null);
    await registrar("Aviso enviado para " + A.esc(p.nome));
    /* 4. o aviso */
    toast({ titulo: "Consulta cancelada · vaga oferecida a " + p.nome, texto: "Vaga de " + curtoData(k.data) + ", " + C.txt(k.ini) + " com " + m.nome + ". A pessoa tem 30 minutos para confirmar.", icone: "bell-ring", duracao: 6000 });
    /* 5. quem usa o app vê a vaga na área do paciente: a fila e a agenda ficam gravadas (clinica-dados.js) */
  }

  /* outra aba mudou a agenda ou a fila (o paciente aceitou ou recusou a vaga): redesenha */
  C.aoMudar(() => {
    if (est.sessao) return;
    desenharVista();
    desenharCalor();
    desenharFila();
    desenharResumo(false);
  });


 

  /* ─── Controles ─── */
  document.querySelectorAll(".vistas [role=tab]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.vista !== est.vista) trocarVista(b.dataset.vista); }));
  document.querySelector(".vistas").addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const abas = Array.from(document.querySelectorAll(".vistas [role=tab]"));
    const i = abas.findIndex((b) => b.dataset.vista === est.vista);
    const j = (i + (ev.key === "ArrowRight" ? 1 : -1) + abas.length) % abas.length;
    abas[j].focus();
    trocarVista(abas[j].dataset.vista);
  });
  $("#disposicao").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-layout]");
    if (!b || b.dataset.layout === est.layout) return;
    est.layout = b.dataset.layout;
    try { localStorage.setItem("agendapro.layout", est.layout); } catch (e) { /* sem armazenamento */ }
    desenharVista();
    vistaEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease" });
    anunciar(est.layout === "linha" ? "Agenda em linhas: uma linha por médico." : "Agenda em colunas: uma coluna por médico.");
  });
  $("#ant").addEventListener("click", () => navegar(-1));
  $("#prox").addEventListener("click", () => navegar(1));
  $("#hoje").addEventListener("click", () => { est.dia = D.hoje; est.semana = segunda(D.hoje); desenharVista(); desenharCalor(); });
  vistaEl.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-semana]");
    if (b) abrirSemana(b.dataset.semana, b);
  });

  /* ─── Legenda que filtra: mostra só as situações escolhidas ─── */
  function desenharLegenda() {
    const todas = est.filtro.size === 0;
    $(".legenda").innerHTML =
      '<li class="legenda__rotulo" aria-hidden="true">Mostrar</li>' +
      '<li><button type="button" class="filtro-estado" data-estado="todas" aria-pressed="' + todas + '">Todas</button></li>' +
      Object.keys(ESTADOS).map((s) =>
        '<li><button type="button" class="filtro-estado" data-estado="' + s + '" aria-pressed="' + est.filtro.has(s) + '">' +
        '<span class="cbloco cbloco--' + s + '" aria-hidden="true">' + (ESTADOS[s].icone ? I(ESTADOS[s].icone) : "") + "</span>" + ESTADOS[s].rotulo + "</button></li>"
      ).join("");
  }
  function aplicarFiltro() {
    const blocos = vistaEl.querySelectorAll(".cbloco[data-id]");
    if (!blocos.length && est.vista === "mes") { $("#filtro-vazio").hidden = true; return; }
    const porId = new Map(C.consultas.map((k) => [k.id, k]));
    let visiveis = 0;
    blocos.forEach((b) => {
      const k = porId.get(b.dataset.id);
      const fora = est.filtro.size > 0 && (!k || !est.filtro.has(chave(k)));
      b.classList.toggle("cbloco--fora", fora);
      if (fora) { b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); }
      else { b.removeAttribute("tabindex"); b.removeAttribute("aria-hidden"); visiveis += 1; }
    });
    const vazio = est.filtro.size > 0 && visiveis === 0 && est.vista !== "mes";
    $("#filtro-vazio").hidden = !vazio;
    if (vazio) {
      const nomes = Array.from(est.filtro).map((s) => ESTADOS[s].rotulo.toLowerCase()).join(" ou ");
      $("#filtro-vazio-texto").textContent = "Nenhuma consulta " + nomes + " " + (est.vista === "dia" ? "neste dia." : "nesta semana.");
    }
    return visiveis;
  }
  function mudarFiltro(estado) {
    if (estado === "todas") est.filtro.clear();
    else if (est.filtro.has(estado)) est.filtro.delete(estado);
    else est.filtro.add(estado);
    if (est.filtro.size === Object.keys(ESTADOS).length) est.filtro.clear();
    desenharLegenda();
    const n = aplicarFiltro();
    if (est.filtro.size === 0) anunciar("Mostrando todas as consultas.");
    else if (n === 0) anunciar($("#filtro-vazio-texto").textContent);
    else anunciar("Mostrando " + n + (n === 1 ? " horário: " : " horários: ") + Array.from(est.filtro).map((s) => ESTADOS[s].rotulo).join(", ") + ".");
    const foco = $('.legenda [data-estado="' + estado + '"]');
    if (foco) foco.focus();
  }
  $(".legenda").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-estado]");
    if (b) mudarFiltro(b.dataset.estado);
  });
  $("#filtro-limpar").addEventListener("click", () => mudarFiltro("todas"));
  new MutationObserver(() => aplicarFiltro()).observe(vistaEl, { childList: true });

  /* ─── Cabeçalho e primeira pintura ─── */
  desenharLegenda();
  $("#folha-hoje").innerHTML = A.folha(D.hoje, { menta: true });
  const nMed = C.MEDICOS.length;
  $("#subtitulo").textContent = cap(A.extenso(D.hoje)) + " · " + D.clinica.nome + ", " + D.clinica.unidade + " · " +
    (nMed ? nMed + (nMed === 1 ? " médico atendendo" : " médicos atendendo") : "nenhum médico cadastrado ainda");
  document.querySelectorAll("[data-marca]").forEach((el) => { el.outerHTML = A.marca(Number(el.dataset.marca)); });

  desenharVista();
  desenharCalor();
  desenharFila();
  desenharResumo(false);
  /* contadores sobem uma vez ao abrir (momento de chegada, não do dia a dia) */
  if (!M.reduzido()) {
    ["#n-consultas", "#n-vagas", "#n-fila"].forEach((id) => {
      const el = $(id);
      const v = Number(el.textContent);
      el.textContent = "0"; el.dataset.valor = 0;
      setTimeout(() => M.contador(el, v, { duracao: 900, pulso: false }), 200);
    });
  }
})();
