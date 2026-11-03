(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;

  const MEDICO_ID = "paulo";
  const PX = 1.5;
  const INICIO = C.INICIO;
  const AGORA0 = 10 * 60 + 40;
  const T0 = Date.now();
  const agora = () => Math.min(C.FIM, AGORA0 + (Date.now() - T0) / 60000);

  const est = { vista: "dia", dia: D.hoje, semana: segunda(D.hoje) };

  const $ = (s) => document.querySelector(s);
  const vistaEl = $("#vista");
  const anunciador = $("#anunciador");

  function anunciar(texto) {
    anunciador.textContent = "";
    setTimeout(() => { anunciador.textContent = texto; }, 30);
  }

  function segunda(dia) {
    const d = C.data(dia);
    const dow = d.getDay() || 7;
    return C.somaDias(dia, 1 - dow);
  }

  function minhasConsultas(dia) {
    return C.consultas.filter((k) => k.medico === MEDICO_ID && k.data === dia && k.status !== "cancelada");
  }

  function colunas() {
    if (est.vista === "dia") return [{ data: est.dia }];
    const cols = [];
    for (let i = 0; i < 6; i++) cols.push({ data: C.somaDias(est.semana, i) });
    return cols;
  }

  const ESTADOS = {
    atendida: "Atendida",
    em: "Em atendimento",
    chegou: "Na recepção",
    confirmada: "Confirmada",
    faltou: "Faltou",
    vaga: "Vaga aberta",
    oferecida: "Oferecida à fila",
  };

  function rotuloBloco(k) {
    const status = ESTADOS[k.status] || k.status;
    const quem = k.status === "vaga" ? "Horário livre" : k.paciente;
    return quem + ", " + C.txt(k.ini) + " a " + C.txt(k.ini + k.dur) + ". " + status + ".";
  }

  function blocoHTML(k, c) {
    const nome = k.status === "vaga" ? "Vaga aberta" : k.paciente;
    return (
      '<div class="cbloco cbloco--' + k.status + '" style="--c:' + c + ";--ini:" + k.ini + ";--dur:" + k.dur + '"' +
      ' role="listitem" aria-label="' + A.esc(rotuloBloco(k)) + '">' +
      '<span class="cbloco__texto"><span class="cbloco__nome">' + A.esc(nome) + '</span>' +
      '<span class="cbloco__hora">' + C.txt(k.ini) + "</span></span></div>"
    );
  }

  function fundoHTML(n) {
    let h = "";
    for (let t = INICIO; t <= C.FIM; t += 30) {
      const y = (t - INICIO) * PX;
      h += '<div class="grade__linha' + (t % 60 ? " grade__linha--meia" : "") + '" style="top:' + y + 'px"></div>';
    }
    h += '<div class="grade__almoco" style="top:' + (300 * PX) + "px;height:" + (60 * PX) + 'px">Almoço</div>';
    for (let i = 1; i < n; i++) {
      h += '<div class="grade__sep grade__sep--dia" style="left:calc(' + i + " * 100% / " + n + ')"></div>';
    }
    return h;
  }

  function horasHTML() {
    let h = "";
    for (let t = INICIO + 60; t < C.FIM; t += 60) {
      h += '<span class="grade__hora" style="top:' + (t - INICIO) * PX + 'px">' + C.txt(t) + "</span>";
    }
    return h;
  }

  function curtoData(dia) {
    const d = C.data(dia);
    return A.SEMANA_CURTA[d.getDay()] + ", " + d.getDate() + "/" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function cabecalhoDia() {
    const md = D.medicos.find((m) => m.id === MEDICO_ID);
    return (
      '<div class="grade__colunas">' +
      '<div class="grade__medico" style="--cor:' + md.cor + '">' +
      '<span class="grade__medico-texto">' +
      '<span class="grade__medico-nome">' + md.nome + "</span>" +
      '<span class="grade__medico-esp">' + D.especialidades[md.esp].nome + "</span>" +
      "</span></div></div>"
    );
  }

  function cabecalhoSemana() {
    return (
      '<div class="grade__dias">' +
      colunas().map((col) => {
        const f = (D.feriados || []).find((x) => x.data === col.data);
        return (
          '<div class="grade__dia-cab' + (col.data === D.hoje ? " grade__dia-cab--hoje" : "") + '">' +
          '<span class="grade__dia-nome">' + curtoData(col.data) +
          (f ? " · " + f.nome : "") +
          (col.data === D.hoje ? '<span class="visualmente-oculto">, hoje</span>' : "") +
          "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function vistaGrade() {
    const cols = colunas();
    const n = cols.length;
    const semana = est.vista === "semana";
    const cab = semana ? cabecalhoSemana() : cabecalhoDia();
    const blocos = cols.flatMap((col, c) => minhasConsultas(col.data).map((k) => blocoHTML(k, c))).join("");
    vistaEl.setAttribute("aria-labelledby", semana ? "aba-semana" : "aba-dia");
    vistaEl.innerHTML =
      '<div class="grade' + (semana ? " grade--semana" : "") + '" style="--n:' + n + '" role="list" aria-label="Consultas">' +
      '<div class="grade__cabeca"><span></span>' + cab + "</div>" +
      '<div class="grade__rolagem" id="rolagem"><div class="grade__corpo">' +
      '<div class="grade__horas" aria-hidden="true">' + horasHTML() + "</div>" +
      '<div class="grade__pista" id="pista">' +
      fundoHTML(n) + blocos +
      '<div class="agora" id="agora" hidden><span class="agora__rotulo"></span></div>' +
      "</div></div></div></div>";
    posicionarAgora(true);
    const rol = $("#rolagem");
    if (rol) rol.scrollTop = Math.max(0, (agora() - 90 - INICIO) * PX);
  }

  function posicionarAgora(primeira) {
    const linha = $("#agora");
    if (!linha) return;
    const cols = colunas();
    const n = cols.length;
    const idx = cols.findIndex((c) => c.data === D.hoje);
    if (idx < 0) { linha.hidden = true; return; }
    linha.hidden = false;
    if (primeira) linha.style.transition = "none";
    linha.style.left = "calc(" + idx + " * 100% / " + n + ")";
    linha.style.width = "calc(100% / " + n + ")";
    linha.style.transform = "translateY(" + ((agora() - INICIO) * PX) + "px)";
    linha.querySelector(".agora__rotulo").textContent = C.txt(Math.floor(agora()));
    if (primeira) requestAnimationFrame(() => { linha.style.transition = ""; });
  }

  setInterval(() => posicionarAgora(false), 1000);

  function atualizarContadores() {
    const consultas = minhasConsultas(D.hoje);
    const atendidas = consultas.filter((k) => k.status === "atendida" || k.status === "em").length;
    const restantes = consultas.filter((k) => k.status === "confirmada" || k.status === "chegou").length;
    const nEl = $("#n-consultas");
    const sEl = $("#s-consultas");
    const atEl = $("#n-atendidas");
    const reEl = $("#n-restantes");
    if (nEl) nEl.textContent = consultas.length;
    if (sEl) sEl.textContent = consultas.length === 1 ? "consulta" : "consultas";
    if (atEl) atEl.textContent = atendidas;
    if (reEl) reEl.textContent = restantes;
  }

  function atualizarTitulo() {
    const t = $("#t-agenda");
    if (!t) return;
    if (est.vista === "dia") {
      t.textContent = A.extenso(est.dia, true);
    } else {
      const fim = C.somaDias(est.semana, 5);
      const d0 = C.data(est.semana);
      const d1 = C.data(fim);
      t.textContent = d0.getDate() + " a " + d1.getDate() + "/" + String(d1.getMonth() + 1).padStart(2, "0");
    }
  }

  function atualizarAbas() {
    document.querySelectorAll("[data-vista]").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.vista === est.vista));
    });
  }

  function redesenhar() {
    atualizarTitulo();
    atualizarAbas();
    atualizarContadores();
    vistaGrade();
  }

  document.addEventListener("click", (ev) => {
    const bv = ev.target.closest("[data-vista]");
    if (bv && bv.dataset.vista !== est.vista) {
      est.vista = bv.dataset.vista;
      if (est.vista === "semana") est.semana = segunda(est.dia);
      redesenhar();
      anunciar("Visão de " + bv.textContent.trim().toLowerCase());
      return;
    }
    if (ev.target.closest("#hoje")) {
      est.dia = D.hoje;
      est.semana = segunda(D.hoje);
      redesenhar();
      anunciar("Hoje, " + A.extenso(D.hoje, true));
      return;
    }
    if (ev.target.closest("#ant")) {
      if (est.vista === "dia") est.dia = C.somaDias(est.dia, -1);
      else est.semana = C.somaDias(est.semana, -7);
      redesenhar();
      return;
    }
    if (ev.target.closest("#prox")) {
      if (est.vista === "dia") est.dia = C.somaDias(est.dia, 1);
      else est.semana = C.somaDias(est.semana, 7);
      redesenhar();
      return;
    }
  });

  document.querySelectorAll("[data-marca]").forEach((el) => {
    el.outerHTML = A.marca(Number(el.dataset.marca));
  });

  const folhaEl = document.getElementById("folha-hoje");
  if (folhaEl) folhaEl.innerHTML = A.folha(D.hoje);

  const subEl = document.getElementById("subtitulo");
  const md = D.medicos.find((m) => m.id === MEDICO_ID);
  if (subEl && md) subEl.textContent = md.nome + " · " + D.especialidades[md.esp].nome;

  redesenhar();
})();
