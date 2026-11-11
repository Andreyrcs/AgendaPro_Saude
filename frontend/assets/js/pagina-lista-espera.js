/* AgendaPro Saúde — Lista de espera da clínica.
   À esquerda, os médicos e quantas pessoas esperam por cada um; à direita, a fila do escolhido,
   com o próximo horário livre e a ação de oferecê-lo à 1ª pessoa. Tudo fica gravado (clinica-dados.js). */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  const filaDe = (m) => D.filas[m] || (D.filas[m] = []);
  const diasNaFila = (p) => Math.max(0, Math.round((C.data(D.hoje) - C.data(p.desde)) / 86400000));
  const primeiroNome = (nome) => nome.split(" ")[0];

  let atual = location.hash.slice(1);
  if (!C.MEDICOS.includes(atual)) atual = C.MEDICOS.slice().sort((a, b) => filaDe(b).length - filaDe(a).length)[0];

  /* vindo da Nova consulta ("Oferecer a Rita"): a vaga daquele horário vem primeiro */
  const vagaPedida = new URLSearchParams(location.search).get("vaga");

  /* o próximo horário livre ou oferecido de um médico, de agora em diante */
  function proximaVaga(m) {
    const pedida = C.consultas.find((k) => k.id === vagaPedida && k.medico === m && k.horario);
    if (pedida) return pedida;
    return C.consultas
      .filter((k) => k.medico === m && k.horario && (k.data > D.hoje || (k.data === D.hoje && k.ini >= K.agora())))
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ini - b.ini))[0];
  }

  function desenharSubtitulo() {
    const total = K.totalFila();
    const com = C.MEDICOS.filter((m) => filaDe(m).length).length;
    let maisAntiga = null;
    C.MEDICOS.forEach((m) => filaDe(m).forEach((p) => { if (!maisAntiga || p.desde < maisAntiga.p.desde) maisAntiga = { p, m }; }));
    $("#subtitulo").innerHTML = "<b>" + total + (total === 1 ? " pessoa" : " pessoas") + "</b> aguardando vaga com " + com + (com === 1 ? " médico" : " médicos") + "." +
      (maisAntiga ? " Quem espera há mais tempo: " + A.esc(maisAntiga.p.nome) + ", " + diasNaFila(maisAntiga.p) + " dias, com " + K.medico(maisAntiga.m).nome + "." : "");
  }

  function desenharMedicos() {
    const ordem = C.MEDICOS.slice().sort((a, b) => filaDe(b).length - filaDe(a).length);
    $("#medicos").innerHTML = ordem.map((m) => {
      const md = K.medico(m);
      const n = filaDe(m).length;
      return '<button type="button" class="medico-opcao" data-medico="' + m + '" aria-current="' + (m === atual) + '">' +
        A.avatarMedico(md, 36) +
        '<span><span class="medico-opcao__nome">' + md.nome + '</span><span class="medico-opcao__sub">' + K.esp(md.esp).nome + "</span></span>" +
        '<span class="medico-opcao__n' + (n ? "" : " medico-opcao__n--zero") + '" aria-label="' + n + (n === 1 ? " pessoa" : " pessoas") + ' na fila">' + n + "</span></button>";
    }).join("");
  }

  function vagaHTML(m) {
    const v = proximaVaga(m);
    const lista = filaDe(m);
    if (!v) {
      return '<div class="vaga-caixa"><span class="vaga-caixa__texto"><b>Nenhuma vaga aberta por enquanto</b>' +
        "<span>Quando a recepção cancela uma consulta deste médico, o horário é oferecido à 1ª pessoa da fila.</span></span></div>";
    }
    const quando = K.cap(A.extenso(v.data)) + ", " + C.txt(v.ini);
    if (v.horario === "oferecido") {
      return '<div class="vaga-caixa vaga-caixa--oferecido">' + A.folha(v.data, { pequena: true, menta: true }) +
        '<span class="vaga-caixa__texto"><b>Vaga de ' + quando + " oferecida a " + A.esc(v.paciente) + "</b>" +
        "<span>A pessoa tem 30 minutos para confirmar. Se não confirmar, a vaga passa para a próxima.</span></span></div>";
    }
    return '<div class="vaga-caixa">' + A.folha(v.data, { pequena: true }) +
      '<span class="vaga-caixa__texto"><b>Horário livre: ' + quando + "</b><span>Pode ser oferecido à 1ª pessoa da fila.</span></span>" +
      (lista.length
        ? '<button type="button" class="botao botao--menta botao--pequeno" data-oferecer="' + v.id + '">' + I("bell-ring", "ic-sm") + "Oferecer a " + A.esc(primeiroNome(lista[0].nome)) + "</button>"
        : "") + "</div>";
  }

  function desenharDetalhe() {
    const m = atual;
    const md = K.medico(m);
    const lista = filaDe(m);
    const media = lista.length ? Math.round(lista.reduce((s, p) => s + diasNaFila(p), 0) / lista.length) : 0;
    $("#detalhe").innerHTML =
      '<div class="painel__cabeca"><div class="fila-cab">' + A.avatarMedico(md, 44) +
      '<div><h2 id="t-detalhe">' + md.nome + '</h2><p class="painel__titulo-sub">' + K.esp(md.esp).nome +
      (lista.length ? " · " + lista.length + (lista.length === 1 ? " pessoa" : " pessoas") + " · espera média de " + media + " dias" : "") + "</p></div></div></div>" +
      vagaHTML(m) +
      (lista.length
        ? '<ol class="pessoas" id="pessoas">' + lista.map((p, i) => {
            const dias = diasNaFila(p);
            return '<li class="pessoa" data-nome="' + A.esc(p.nome) + '">' +
              '<span class="pessoa__pos num" aria-hidden="true">' + (i + 1) + "º</span>" +
              '<span><span class="pessoa__nome"><span class="visualmente-oculto">' + (i + 1) + "ª posição: </span>" + A.esc(p.nome) + "</span>" +
              (p.app ? '<span class="pessoa__app">' + I("smartphone") + "pelo app</span>" : "") +
              '<span class="pessoa__sub">Desde ' + A.extenso(p.desde, false) + ' · <span class="' + (dias >= 14 ? "pessoa__espera--longa" : "") + '">' + (dias ? dias + (dias === 1 ? " dia" : " dias") : "entrou hoje") + "</span>" +
              (p.tel ? " · tel. " + A.esc(p.tel) : "") +
              (p.qualquer ? ' · <span class="pessoa__qualquer">aceita qualquer médico de ' + K.esp(p.qualquer).nome + "</span>" : "") + "</span></span>" +
              '<button type="button" class="link-acao link-acao--discreto" data-tirar="' + A.esc(p.nome) + '" aria-label="Tirar ' + A.esc(p.nome) + ' da fila">Tirar da fila</button></li>';
          }).join("") + "</ol>"
        : '<p class="vazio" style="margin-top:12px">Ninguém aguardando vaga com ' + md.nome + ".</p>") +
      foraDaFilaHTML(m);
  }

  /* quem foi marcado num horário da fila sem passar por ela: quando, por quem e por quê */
  function foraDaFilaHTML(m) {
    const registros = K.guardar.registrosForaDaFila(m);
    if (!registros.length) return "";
    return '<div class="fora-fila"><h3>Marcados fora da fila</h3>' +
      '<p class="painel__titulo-sub">Horários liberados por cancelamento que não foram oferecidos a quem esperava.</p><ul class="historico">' +
      registros.slice().reverse().map((r) =>
        '<li><span class="historico__quando">' + A.esc(r.paciente) + " · " + K.curtoData(r.dia) + " " + r.hora + "</span>" +
        '<span class="historico__quem">' + A.esc(r.motivo) + " · por " + A.esc(r.por) + ", " + K.curtoData(r.em) + " às " + r.as +
        " · " + r.naFila + (r.naFila === 1 ? " pessoa esperava" : " pessoas esperavam") + "</span></li>"
      ).join("") + "</ul></div>";
  }

  function desenharTudo() {
    desenharSubtitulo();
    desenharMedicos();
    desenharDetalhe();
    const conta = document.getElementById("nav-fila");
    if (conta) conta.textContent = K.totalFila();
  }

  function escolher(m) {
    atual = m;
    history.replaceState(null, "", "#" + m);
    desenharMedicos();
    desenharDetalhe();
    $("#detalhe").animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: "ease" });
  }

  /* posições antes de mudar a fila, para a animação FLIP (quem fica sobe um lugar) */
  function posicoes() {
    return new Map(Array.from(document.querySelectorAll("#pessoas .pessoa")).map((li) => [li.dataset.nome, li.getBoundingClientRect()]));
  }
  function subir(antes) {
    if (M.reduzido()) return;
    document.querySelectorAll("#pessoas .pessoa").forEach((li) => {
      const r = antes.get(li.dataset.nome);
      if (r) M.flip(li, r, { duracao: 320, easing: M.EASE_OUT });
    });
  }

  function oferecer(id) {
    const v = C.consultas.find((k) => k.id === id);
    if (!v) return;
    const lista = filaDe(v.medico);
    if (!lista.length) return;
    const antes = posicoes();
    const p = lista.shift();
    K.guardar.saiuDaFila(v.medico, p.nome);
    C.oferecerHorario(v, p.nome);
    desenharTudo();
    subir(antes);
    K.toast({
      titulo: "Vaga oferecida a " + p.nome,
      texto: K.curtoData(v.data) + ", " + C.txt(v.ini) + " com " + K.medico(v.medico).nome + ". " + (p.app ? "Aviso enviado pelo app." : "Ligue para " + (p.tel || "a pessoa") + "."),
      icone: "bell-ring",
      acao: { rotulo: "Desfazer", fazer: () => { lista.unshift(p); K.guardar.voltouParaFila(v.medico, p); C.liberarHorario(v); desenharTudo(); } },
    });
  }

  function tirar(nome) {
    const lista = filaDe(atual);
    const i = lista.findIndex((p) => p.nome === nome);
    if (i < 0) return;
    const antes = posicoes();
    const [p] = lista.splice(i, 1);
    const medicoDaFila = atual;
    K.guardar.saiuDaFila(medicoDaFila, p.nome);
    const li = document.querySelector('#pessoas .pessoa[data-nome="' + CSS.escape(nome) + '"]');
    const fim = () => { desenharTudo(); subir(antes); const prox = document.querySelector("#pessoas [data-tirar]"); if (prox) prox.focus({ preventScroll: true }); };
    if (li && !M.reduzido()) li.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(12px)" }], { duration: 180, easing: M.EASE_OUT }).finished.then(fim);
    else fim();
    K.toast({
      titulo: p.nome + " saiu da fila",
      texto: "Quem estava atrás subiu um lugar.",
      icone: "info",
      acao: { rotulo: "Desfazer", fazer: () => { lista.splice(i, 0, p); K.guardar.voltouParaFila(medicoDaFila, p); desenharTudo(); } },
    });
  }

  /* ─── Eventos ─── */
  $("#medicos").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-medico]");
    if (b && b.dataset.medico !== atual) escolher(b.dataset.medico);
  });
  $("#detalhe").addEventListener("click", (ev) => {
    const o = ev.target.closest("[data-oferecer]");
    if (o) { oferecer(o.dataset.oferecer); return; }
    const t = ev.target.closest("[data-tirar]");
    if (t) tirar(t.dataset.tirar);
  });
  window.addEventListener("hashchange", () => {
    const m = location.hash.slice(1);
    if (C.MEDICOS.includes(m) && m !== atual) escolher(m);
  });

  const dlg = $("#dlg-adicionar");
  const form = $("#form-adicionar");
  $("#f-medico").innerHTML = C.MEDICOS.map((m) => '<option value="' + m + '">' + K.medico(m).nome + " · " + K.esp(K.medico(m).esp).nome + "</option>").join("");
  $("#adicionar").addEventListener("click", () => {
    form.reset();
    $("#f-medico").value = atual;
    $("#c-nome").classList.remove("campo--erro");
    const erro = $("#c-nome .campo__erro");
    if (erro) erro.remove();
    K.abrirDialogo(dlg);
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim().replace(/\s+/g, " ");
    if (nome.split(" ").length < 2) {
      const c = $("#c-nome");
      c.classList.add("campo--erro");
      if (!c.querySelector(".campo__erro")) c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="e-nome">Escreva o nome e o sobrenome.</span>');
      form.nome.setAttribute("aria-describedby", "e-nome");
      form.nome.focus();
      M.tremer(form.nome);
      return;
    }
    const m = form.medico.value;
    const p = { nome, desde: D.hoje, tel: form.tel.value.trim() ? "•••• " + form.tel.value.replace(/\D/g, "").slice(-4) : "", app: form.app.checked };
    filaDe(m).push(p);
    K.guardar.entrouNaFila(m, p);
    K.fecharDialogo(dlg);
    if (m !== atual) atual = m;
    history.replaceState(null, "", "#" + m);
    desenharTudo();
    const novo = document.querySelector("#pessoas .pessoa:last-child");
    if (novo && !M.reduzido()) novo.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: M.EASE_OUT });
    K.toast({ titulo: nome + " entrou na fila", texto: filaDe(m).length + "ª posição com " + K.medico(m).nome + ".", icone: "list-ordered" });
  });

  /* outra aba mudou a fila ou a agenda (paciente respondeu a vaga, recepção cancelou): redesenha */
  C.aoMudar(() => { if (atual) desenharTudo(); });

  if (!atual) {
    $("#subtitulo").textContent = "Cadastre os médicos da clínica para abrir a lista de espera.";
    $("#adicionar").hidden = true;
    return;
  }
  desenharTudo();
})();
