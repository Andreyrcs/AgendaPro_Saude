/* AgendaPro Saúde v2 — casca comum das páginas da clínica (protótipo, dados FICTÍCIOS)
   Monta o menu lateral com a página atual marcada, a folha de hoje no cabeçalho,
   os avisos que sobem do rodapé e o relógio do protótipo ("agora" começa às 10:40). */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const I = A.icone;

  const PAGINAS = [
    { id: "agenda", href: "clinica.html", icone: "calendar-days", rotulo: "Agenda" },
    { id: "fila", href: "lista-espera.html", icone: "list-ordered", rotulo: "Lista de espera" },
    { id: "medicos", href: "medicos.html", icone: "stethoscope", rotulo: "Médicos" },
    { id: "horarios", href: "horarios.html", icone: "clock", rotulo: "Horários" },
    { id: "especialidades", href: "especialidades.html", icone: "heart-pulse", rotulo: "Especialidades" },
    { id: "pacientes", href: "pacientes.html", icone: "users", rotulo: "Pacientes" },
  ];

  const AGORA0 = 10 * 60 + 40;
  const T0 = Date.now();
  const agora = () => Math.min(C.FIM, AGORA0 + (Date.now() - T0) / 60000);

  const medico = (id) => D.medicos.find((m) => m.id === id);
  const esp = (id) => D.especialidades[id];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const totalFila = () => Object.values(D.filas).reduce((s, l) => s + l.length, 0);
  const curtoData = (dia) => { const d = C.data(dia); return A.SEMANA_CURTA[d.getDay()] + ", " + d.getDate() + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
  const semAcento = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ─── O que a recepção cadastra fica guardado neste navegador ───
     Médicos novos, edições (nome, especialidade, telefone, sala) e especialidades novas.
     A conta da recepção tem o botão que volta tudo aos dados de exemplo. */
  const CHAVE_LOJA = "agendapro.clinica.v1";
  const loja = { medicos: [], edicoes: {}, especialidades: {}, fila: [], saiuDaFila: [], foraDaFila: [] };
  try { Object.assign(loja, JSON.parse(localStorage.getItem(CHAVE_LOJA)) || {}); } catch (e) { /* sem armazenamento */ }
  const gravarLoja = () => { try { localStorage.setItem(CHAVE_LOJA, JSON.stringify(loja)); } catch (e) { /* sem armazenamento */ } };

  /* a sala de cada médico vem das consultas que já têm sala marcada */
  D.medicos.forEach((md) => {
    const k = (D.consultas || []).concat(D.passadas || []).find((x) => x.medico === md.id && x.sala);
    if (!md.sala && k) md.sala = k.sala;
  });
  Object.assign(D.especialidades, loja.especialidades);
  loja.medicos.forEach((md) => { if (!D.medicos.some((x) => x.id === md.id)) D.medicos.push(md); });
  Object.keys(loja.edicoes).forEach((id) => { const md = D.medicos.find((x) => x.id === id); if (md) Object.assign(md, loja.edicoes[id]); });
  /* fila: quem entrou por aqui vai para o fim; quem saiu não volta ao recarregar */
  loja.fila.forEach((p) => {
    const lista = D.filas[p.medico] || (D.filas[p.medico] = []);
    if (!lista.some((x) => x.nome === p.nome)) lista.push(Object.assign({}, p));
  });
  loja.saiuDaFila.forEach((s) => {
    const lista = D.filas[s.medico] || [];
    const i = lista.findIndex((x) => x.nome === s.nome);
    if (i >= 0) lista.splice(i, 1);
  });

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
    tudoDeVolta() { try { localStorage.removeItem(CHAVE_LOJA); } catch (e) { /* sem armazenamento */ } },
    temAlteracoes() {
      return loja.medicos.length + Object.keys(loja.edicoes).length + Object.keys(loja.especialidades).length +
        loja.fila.length + loja.saiuDaFila.length + loja.foraDaFila.length > 0;
    },
  };

  /* ─── Preferências da conta (texto, movimento, menu recolhido) ─── */
  const CHAVE_PREF = "agendapro.recepcao.pref";
  const pref = { texto: "normal", movimento: "sistema", menu: "aberto" };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(CHAVE_PREF)) || {}); } catch (e) { /* sem armazenamento */ }
  function aplicarPref() {
    const raiz = document.documentElement;
    raiz.style.fontSize = pref.texto === "grande" ? "112.5%" : "";
    if (pref.movimento === "reduzido") raiz.dataset.movimento = "reduzido"; else delete raiz.dataset.movimento;
    raiz.dataset.lateral = pref.menu === "recolhido" ? "recolhida" : "aberta";
  }
  function mudarPref(chave, valor) {
    pref[chave] = valor;
    try { localStorage.setItem(CHAVE_PREF, JSON.stringify(pref)); } catch (e) { /* sem armazenamento */ }
    aplicarPref();
    atualizarBotaoMenu();
  }
  aplicarPref();

  /* ─── A conta de quem está na recepção (dados FICTÍCIOS) ─── */
  const CHAVE_CONTA = "agendapro.recepcao.conta";
  const conta = { nome: "Carla Mendes", email: "carla.mendes@clinicaipe.exemplo", tel: "(11) 2345-0000", ramal: "12", funcao: "Recepção" };
  try { Object.assign(conta, JSON.parse(localStorage.getItem(CHAVE_CONTA)) || {}); } catch (e) { /* sem armazenamento */ }
  function salvarConta(campos) {
    Object.assign(conta, campos);
    try { localStorage.setItem(CHAVE_CONTA, JSON.stringify(conta)); } catch (e) { /* sem armazenamento */ }
    desenharPe();
  }
  function desenharPe() {
    const pe = document.querySelector("a.lateral__pe");
    if (!pe) return;
    pe.innerHTML = '<span class="avatar-iniciais" style="--tam: 36px; background: #d4f3e6" aria-hidden="true">' + A.iniciais(conta.nome) + "</span>" +
      '<span class="lateral__rotulo"><b>' + A.esc(conta.nome) + "</b><br />" + A.esc(conta.funcao) + "</span>";
    pe.setAttribute("aria-label", "Minha conta: " + conta.nome + ", " + conta.funcao);
  }

  /* ─── Menu lateral ─── */
  const menu = document.getElementById("lateral-menu");
  function desenharMenu() {
    const atual = menu.dataset.pagina;
    menu.innerHTML = PAGINAS.map((p) => {
      const n = p.id === "fila" ? totalFila() : null;
      return '<li><a href="' + p.href + '"' + (p.id === atual ? ' aria-current="page"' : "") + ' data-dica-lateral="' + p.rotulo + (n ? " · " + n : "") + '">' +
        I(p.icone, "ic-sm") + '<span class="lateral__rotulo">' + p.rotulo + "</span>" +
        (p.id === "fila" ? '<span class="lateral__conta num" id="nav-fila">' + n + "</span>" : "") + "</a></li>";
    }).join("");
  }
  if (menu) desenharMenu();

  /* botão de recolher: some o texto, ficam a marca, os ícones e a pessoa */
  const lateral = document.querySelector(".lateral");
  let botaoMenu = null;
  function atualizarBotaoMenu() {
    if (!botaoMenu) return;
    const recolhida = pref.menu === "recolhido";
    botaoMenu.setAttribute("aria-expanded", String(!recolhida));
    botaoMenu.setAttribute("aria-label", recolhida ? "Expandir o menu" : "Recolher o menu");
    botaoMenu.dataset.dicaLateral = recolhida ? "Expandir o menu" : "Recolher o menu";
    if (!botaoMenu.firstChild) botaoMenu.innerHTML = I("chevron-left", "ic-sm");
  }
  if (lateral) {
    botaoMenu = document.createElement("button");
    botaoMenu.type = "button";
    botaoMenu.className = "lateral__recolher";
    lateral.querySelector(".lateral__marca").insertAdjacentElement("afterend", botaoMenu);
    botaoMenu.addEventListener("click", () => {
      const dica = document.querySelector(".lateral__dica");
      if (dica) dica.hidden = true;
      mudarPref("menu", pref.menu === "recolhido" ? "aberto" : "recolhido");
    });
    atualizarBotaoMenu();

    /* quem está logado vira o atalho para a conta */
    const pe = lateral.querySelector(".lateral__pe");
    if (pe && pe.tagName !== "A") {
      const link = document.createElement("a");
      link.className = "lateral__pe";
      link.href = "conta.html";
      link.dataset.dicaLateral = "Minha conta";
      if (document.body.dataset.pagina === "conta") link.setAttribute("aria-current", "page");
      pe.replaceWith(link);
    }
    desenharPe();
    /* a logo (30px) é desenhada aqui, igual em todas as páginas; só o texto ao lado some quando o menu recolhe */
    lateral.querySelectorAll("[data-marca]").forEach((el) => { el.outerHTML = A.marca(Number(el.dataset.marca) || 30); });
    const marcaTexto = lateral.querySelector(".lateral__marca > span:not(.marca)");
    if (marcaTexto) marcaTexto.classList.add("lateral__rotulo");

    /* menu recolhido: o nome de cada item aparece ao lado do ícone, no mouse e no teclado */
    const dica = document.createElement("div");
    dica.className = "lateral__dica";
    dica.setAttribute("aria-hidden", "true");
    dica.hidden = true;
    document.body.appendChild(dica);
    const mostrar = (ev) => {
      const alvo = ev.target.closest("[data-dica-lateral]");
      if (!alvo || pref.menu !== "recolhido" || window.innerWidth <= 900) { dica.hidden = true; return; }
      const r = alvo.getBoundingClientRect();
      dica.textContent = alvo.dataset.dicaLateral;
      dica.hidden = false;
      dica.style.left = r.right + 10 + "px";
      dica.style.top = r.top + r.height / 2 + "px";
    };
    lateral.addEventListener("pointerover", mostrar);
    lateral.addEventListener("focusin", mostrar);
    lateral.addEventListener("pointerleave", () => { dica.hidden = true; });
    lateral.addEventListener("focusout", () => { dica.hidden = true; });
  }

  const folhaHoje = document.getElementById("folha-hoje");
  if (folhaHoje && !folhaHoje.innerHTML.trim()) folhaHoje.innerHTML = A.folha(D.hoje, { menta: true });

  /* ─── Anúncio para leitores de tela ─── */
  const anunciador = document.getElementById("anunciador");
  function anunciar(t) {
    if (!anunciador) return;
    anunciador.textContent = "";
    setTimeout(() => { anunciador.textContent = t; }, 30);
  }

  /* ─── Avisos (mesmo desenho dos avisos da agenda) ─── */
  function toast(o) {
    const caixa = document.getElementById("toasts");
    if (!caixa) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = I(o.icone || "bell-ring") + "<p>" + o.titulo + (o.texto ? "<small>" + o.texto + "</small>" : "") + "</p>" +
      (o.acao ? '<button type="button" class="botao botao--pequeno">' + I("undo", "ic-sm") + o.acao.rotulo + "</button>" : "");
    caixa.appendChild(el);
    el.animate(M.reduzido() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(16px) scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: M.EASE_OUT });
    const fechar = () => {
      if (!el.isConnected) return;
      el.animate([{ opacity: 1 }, { opacity: 0, transform: M.reduzido() ? "none" : "translateY(8px)" }], { duration: 180, easing: "ease", fill: "forwards" }).finished.then(() => el.remove());
    };
    if (o.acao) el.querySelector("button").addEventListener("click", () => { fechar(); o.acao.fazer(); });
    setTimeout(fechar, o.duracao || 5200);
    anunciar(o.titulo + (o.texto ? ". " + o.texto : ""));
  }

  /* ─── Diálogos (<dialog> nativo: foco preso e Esc de graça) ─── */
  function abrirDialogo(dlg) {
    dlg.showModal();
    if (!M.reduzido()) dlg.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: M.EASE_OUT });
    const primeiro = dlg.querySelector("input, select, textarea, button");
    if (primeiro) primeiro.focus();
  }
  function fecharDialogo(dlg) {
    if (!dlg.open) return;
    if (M.reduzido()) { dlg.close(); return; }
    dlg.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(0.98)" }], { duration: 140, easing: "ease", fill: "forwards" })
      .finished.then(() => { dlg.close(); dlg.getAnimations().forEach((a) => a.cancel()); });
  }
  document.addEventListener("click", (ev) => {
    const f = ev.target.closest("[data-fechar-dialogo]");
    if (f) fecharDialogo(f.closest("dialog"));
    /* clique no fundo escuro fecha */
    if (ev.target.tagName === "DIALOG" && ev.target.open) {
      const r = ev.target.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) fecharDialogo(ev.target);
    }
  });

  /* ─── Horários livres de um médico num dia (a mesma regra da agenda) ─── */
  function livres(m, dia) {
    const e = C.expediente(m, dia);
    if (!e || dia < D.hoje) return [];
    const dur = C.DURACAO[m] || 30;
    const ks = C.consultas.filter((k) => k.medico === m && k.data === dia && k.status !== "cancelada");
    const lista = [];
    for (let t = e[0]; t + dur <= e[1]; t += dur) {
      if (t < 780 && t + dur > 720) continue; /* almoço */
      if (dia === D.hoje && t < agora()) continue;
      const k = ks.find((x) => x.ini < t + dur && t < x.ini + x.dur);
      if (k && k.status !== "vaga") continue;
      lista.push({ ini: t, dur, vaga: k || null });
    }
    return lista;
  }
  /* até onde a agenda está aberta para marcar (configuração da clínica, em clinica-dados.js) */
  const ULTIMO_DIA = C.ABRE_ATE;

  window.CASCA = {
    agora, medico, esp, cap, curtoData, semAcento, totalFila, livres, ULTIMO_DIA,
    toast, anunciar, abrirDialogo, fecharDialogo, desenharMenu,
    guardar, pref, mudarPref, conta, salvarConta,
  };
})();
