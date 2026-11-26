/* AgendaPro Saúde — Lista de espera da clínica, pela API.
   À esquerda, os médicos e quantas pessoas esperam por cada um; à direita, a fila do escolhido, com a vaga aberta e a
   ação de oferecê-la. Tudo vem de GET /api/clinicas/{id}/lista-espera (F21: [{ medico, especialidade, pessoas, vagas }]).
   Oferecer: POST /api/consultas/{vaga}/oferecer (a API escolhe a pessoa). Tirar: DELETE /api/lista-espera/{id}.
   Adicionar: POST /api/lista-espera { pessoa, medico, usaApp }, com o paciente escolhido pelo id (cada conta fica em
   uma fila por vez). Trocar de médico: não há rota própria, então a tela tira da fila e põe na do outro médico; se o
   segundo passo falhar, tenta devolver a pessoa à fila antiga (no fim) e avisa. O telefone aparece mascarado. */
(function () {
  "use strict";

  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const API = window.API;
  const CL = window.CLINICA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  CL.iniciar(iniciar);
  function iniciar() {
  const filas = () => CL.fila;
  const filaDe = (m) => { const f = CL.filaDoMedico(m); return f ? f.pessoas || [] : []; };
  const nomeMedico = (m) => { const f = CL.filaDoMedico(m); return f ? f.medico.nome : ""; };
  const nomeEsp = (m) => { const f = CL.filaDoMedico(m); return f && f.especialidade ? f.especialidade.nome : ""; };
  const corDe = (m) => { const md = K.medico(m); return md ? md.cor : A.corDoMedico(0); };
  const avatar = (m, tam) => A.avatarMedico({ nome: nomeMedico(m), cor: corDe(m) }, tam);
  const diasNaFila = (p) => Math.max(0, Math.round((CL.data(CL.hoje) - CL.data(p.desde)) / 86400000));
  const idMedico = (f) => String(f.medico.id);

  let atual = decodeURIComponent(location.hash.slice(1));
  function escolherInicial() {
    if (filas().some((f) => A.mesmoId(f.medico.id, atual))) return;
    const maior = filas().slice().sort((a, b) => (b.pessoas || []).length - (a.pessoas || []).length)[0];
    atual = maior ? idMedico(maior) : null;
  }
  escolherInicial();

  /* a vaga do médico: a já oferecida a alguém da fila, ou a primeira VAGA futura (sobra de cancelamento) */
  function vagaDe(m) {
    const oferecida = filaDe(m).find((p) => p.vagaOferecida);
    if (oferecida) return { oferecida: true, data: oferecida.vagaOferecida.data, hora: oferecida.vagaOferecida.hora, pessoa: oferecida.pessoa };
    const f = CL.filaDoMedico(m);
    const v = f && (f.vagas || [])[0];
    return v ? { oferecida: false, id: String(v.id), data: v.data, hora: v.hora } : null;
  }
  const aguardando = (m) => filaDe(m).filter((p) => !p.vagaOferecida);

  function desenharSubtitulo() {
    const total = CL.totalFila();
    const com = filas().filter((f) => (f.pessoas || []).length).length;
    let maisAntiga = null;
    filas().forEach((f) => (f.pessoas || []).forEach((p) => { if (!maisAntiga || p.desde < maisAntiga.p.desde) maisAntiga = { p, f }; }));
    $("#subtitulo").innerHTML = filas().length
      ? "<b>" + total + (total === 1 ? " pessoa" : " pessoas") + "</b> aguardando vaga com " + com + (com === 1 ? " médico" : " médicos") + "." +
        (maisAntiga ? " Quem espera há mais tempo: " + A.esc(maisAntiga.p.pessoa.nome) + ", " + diasNaFila(maisAntiga.p) + (diasNaFila(maisAntiga.p) === 1 ? " dia" : " dias") + ", com " + A.esc(maisAntiga.f.medico.nome) + "." : "")
      : "Cadastre os médicos da clínica para abrir a lista de espera.";
  }

  function desenharMedicos() {
    const ordem = filas().slice().sort((a, b) => (b.pessoas || []).length - (a.pessoas || []).length || a.medico.nome.localeCompare(b.medico.nome, "pt-BR"));
    $("#medicos").innerHTML = ordem.length ? ordem.map((f) => {
      const m = idMedico(f);
      const n = (f.pessoas || []).length;
      return '<button type="button" class="medico-opcao" data-medico="' + A.esc(m) + '" aria-current="' + A.mesmoId(m, atual) + '">' +
        avatar(m, 36) +
        '<span><span class="medico-opcao__nome">' + A.esc(f.medico.nome) + '</span><span class="medico-opcao__sub">' + A.esc(nomeEsp(m)) + "</span></span>" +
        '<span class="medico-opcao__n' + (n ? "" : " medico-opcao__n--zero") + '" aria-label="' + n + (n === 1 ? " pessoa" : " pessoas") + ' na fila">' + n + "</span></button>";
    }).join("") : '<p class="vazio">Nenhum médico cadastrado ainda.</p>';
  }

  function vagaHTML(m) {
    const v = vagaDe(m);
    if (!v) {
      return '<div class="vaga-caixa"><span class="vaga-caixa__texto"><b>Nenhuma vaga aberta por enquanto</b>' +
        "<span>Quando uma consulta deste médico é cancelada, o horário é oferecido sozinho à 1ª pessoa da fila.</span></span></div>";
    }
    const quando = K.cap(A.extenso(v.data)) + ", " + v.hora;
    if (v.oferecida) {
      return '<div class="vaga-caixa vaga-caixa--oferecido">' + A.folha(v.data, { pequena: true, menta: true }) +
        '<span class="vaga-caixa__texto"><b>Vaga de ' + quando + " oferecida a " + A.esc(v.pessoa.nome) + "</b>" +
        "<span>A pessoa tem 30 minutos para confirmar. Se não confirmar, a vaga passa para a próxima.</span></span></div>";
    }
    /* vaga: sobrou de um cancelamento quando ninguém da fila pôde receber; só ela pode ser oferecida */
    const espera = aguardando(m);
    return '<div class="vaga-caixa">' + A.folha(v.data, { pequena: true }) +
      '<span class="vaga-caixa__texto"><b>Vaga: ' + quando + "</b><span>Sobrou de um cancelamento" +
      (espera.length ? ". Pode ser oferecida à 1ª pessoa da fila." : ", quando ninguém estava na fila.") + "</span></span>" +
      (espera.length
        ? '<button type="button" class="botao botao--menta botao--pequeno" data-oferecer="' + A.esc(v.id) + '">' + I("bell-ring", "ic-sm") + "Oferecer horário</button>"
        : "") + "</div>";
  }

  function pessoaHTML(p, i, m) {
    const dias = diasNaFila(p);
    const nome = A.esc(p.pessoa.nome);
    return '<li class="pessoa" data-id="' + A.esc(p.id) + '">' +
      '<span class="pessoa__pos num" aria-hidden="true">' + (i + 1) + "º</span>" +
      '<span><span class="pessoa__nome"><span class="visualmente-oculto">Posição ' + (i + 1) + ": </span>" + nome + "</span>" +
      (p.usaApp ? '<span class="pessoa__app">' + I("smartphone") + "pelo app</span>" : "") +
      '<span class="pessoa__sub">Desde ' + A.extenso(p.desde, false) + ' · <span class="' + (dias >= 14 ? "pessoa__espera--longa" : "") + '">' +
      (dias ? dias + (dias === 1 ? " dia" : " dias") : "entrou hoje") + "</span>" + CL.telefoneHTML(p) +
      (p.vagaOferecida ? " · <b>vaga oferecida (" + K.curtoData(p.vagaOferecida.data) + ", " + A.esc(p.vagaOferecida.hora) + "), aguardando resposta</b>" : "") + "</span></span>" +
      '<span class="pessoa__acoes">' +
      (p.vagaOferecida || filas().length < 2 ? "" : '<button type="button" class="link-acao" data-trocar="' + A.esc(p.id) + '" aria-label="Trocar o médico de ' + nome + '">Trocar de médico</button>') +
      '<button type="button" class="link-acao link-acao--discreto" data-tirar="' + A.esc(p.id) + '" aria-label="Tirar ' + nome + ' da fila">Tirar da fila</button></span></li>';
  }

  function desenharDetalhe() {
    const m = atual;
    if (!m) { $("#detalhe").innerHTML = '<p class="vazio">Cadastre os médicos da clínica para abrir a lista de espera.</p>'; return; }
    const lista = filaDe(m);
    const media = lista.length ? Math.round(lista.reduce((s, p) => s + diasNaFila(p), 0) / lista.length) : 0;
    $("#detalhe").innerHTML =
      '<div class="painel__cabeca"><div class="fila-cab">' + avatar(m, 44) +
      '<div><h2 id="t-detalhe">' + A.esc(nomeMedico(m)) + '</h2><p class="painel__titulo-sub">' + A.esc(nomeEsp(m)) +
      (lista.length ? " · " + lista.length + (lista.length === 1 ? " pessoa" : " pessoas") + " · espera média de " + media + (media === 1 ? " dia" : " dias") : "") + "</p></div></div></div>" +
      vagaHTML(m) +
      (lista.length
        ? '<ol class="pessoas" id="pessoas">' + lista.map((p, i) => pessoaHTML(p, i, m)).join("") + "</ol>"
        : '<p class="vazio" style="margin-top:12px">Ninguém aguardando vaga com ' + A.esc(nomeMedico(m)) + ".</p>");
  }

  function desenharTudo() {
    escolherInicial();
    desenharSubtitulo();
    desenharMedicos();
    desenharDetalhe();
    K.desenharMenu();
  }

  function escolher(m) {
    atual = m;
    history.replaceState(null, "", "#" + encodeURIComponent(m));
    desenharMedicos();
    desenharDetalhe();
    $("#detalhe").animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: "ease" });
  }

  /* ─── Chamadas: uma por vez; a mensagem de erro é a da API ─── */
  let ocupado = false;
  async function acao(fazer) {
    if (ocupado) return null;
    ocupado = true;
    try { return await fazer(); }
    catch (e) { if (e && e.status !== 401) K.toast({ titulo: "Não deu para concluir", texto: e.message, icone: "info", duracao: 6000 }); return null; }
    finally { ocupado = false; }
  }
  const pessoaPorId = (id) => { for (const f of filas()) { const p = (f.pessoas || []).find((x) => A.mesmoId(x.id, id)); if (p) return { p, m: idMedico(f) }; } return null; };

  /* "Oferecer horário" (POST /api/consultas/{id}/oferecer): só numa vaga; a API escolhe a 1ª pessoa que pode receber */
  async function oferecer(idVaga) {
    const v = vagaDe(atual);
    const r = await acao(async () => { const x = await API.chamar("POST", "/api/consultas/" + encodeURIComponent(idVaga) + "/oferecer"); await CL.recarregar(["fila", "agenda"]); return x; });
    if (!r) return;
    desenharTudo();
    if (r.oferecidaA) {
      K.toast({ titulo: "Vaga oferecida a " + r.oferecidaA.pessoa.nome, texto: (v ? K.curtoData(v.data) + ", " + v.hora + " com " + nomeMedico(atual) + ". " : "") + "A pessoa tem 30 minutos para confirmar.", icone: "bell-ring", duracao: 6000 });
    } else {
      K.toast({ titulo: "Ninguém da fila pôde receber esta vaga", texto: "Quem está na fila já tem consulta nesse horário. A vaga continua aberta.", icone: "info", duracao: 6000 });
    }
  }

  /* Tirar da fila: o primeiro clique pede confirmação; sem "Desfazer" (voltaria para o fim da fila) */
  async function tirar(botao) {
    const achado = pessoaPorId(botao.dataset.tirar);
    if (!achado) return;
    if (botao.dataset.confirmar !== "1") {
      botao.dataset.confirmar = "1";
      botao.textContent = "Confirmar: tirar " + achado.p.pessoa.nome;
      botao.classList.remove("link-acao--discreto");
      return;
    }
    const ok = await acao(async () => { await API.chamar("DELETE", "/api/lista-espera/" + encodeURIComponent(achado.p.id)); await CL.recarregar(["fila", "agenda"]); return true; });
    if (!ok) return;
    desenharTudo();
    const prox = document.querySelector("#pessoas [data-tirar]");
    if (prox) prox.focus({ preventScroll: true });
    K.toast({ titulo: achado.p.pessoa.nome + " saiu da fila", texto: "Quem estava atrás subiu um lugar.", icone: "info" });
  }

  /* Trocar de médico: DELETE da entrada atual + POST na fila do outro médico (a pessoa vai para o fim da fila nova) */
  function abrirTroca(botao) {
    const achado = pessoaPorId(botao.dataset.trocar);
    if (!achado) return;
    const li = botao.closest(".pessoa");
    if (li.querySelector(".trocar-medico")) return;
    const outros = filas().filter((f) => !A.mesmoId(f.medico.id, achado.m));
    li.insertAdjacentHTML("beforeend",
      '<form class="trocar-medico" data-trocar-form="' + A.esc(achado.p.id) + '">' +
      '<div class="campo"><label for="troca-' + A.esc(achado.p.id) + '">Novo médico</label><select id="troca-' + A.esc(achado.p.id) + '">' +
      outros.map((f) => '<option value="' + A.esc(f.medico.id) + '">' + A.esc(f.medico.nome) + " · " + A.esc(f.especialidade ? f.especialidade.nome : "") + "</option>").join("") +
      '</select></div><button type="submit" class="botao botao--principal botao--pequeno">Trocar</button>' +
      '<button type="button" class="botao botao--secundario botao--pequeno" data-cancelar-troca>Cancelar</button>' +
      '<p class="campo__dica" style="flex-basis:100%">A pessoa sai desta fila e entra no fim da fila do outro médico.</p></form>');
    li.querySelector("select").focus();
  }
  async function trocar(form) {
    const achado = pessoaPorId(form.dataset.trocarForm);
    if (!achado) return;
    const novo = form.querySelector("select").value;
    const p = achado.p;
    const corpo = (medico) => ({ pessoa: Number(p.pessoa.id), medico: Number(medico), usaApp: !!p.usaApp });
    let entrou = null;
    let erro = null;
    const feito = await acao(async () => {
      await API.chamar("DELETE", "/api/lista-espera/" + encodeURIComponent(p.id));
      try {
        entrou = await API.chamar("POST", "/api/lista-espera", corpo(novo));
      } catch (e) {
        if (e.status === 401) throw e;
        erro = e;
        /* não entrou na fila nova: tenta devolver à antiga (no fim, porque a posição foi perdida) */
        try { await API.chamar("POST", "/api/lista-espera", corpo(achado.m)); erro.devolvida = true; } catch (e2) { erro.devolvida = false; }
      }
      await CL.recarregar(["fila", "agenda"]);
      return true;
    });
    if (!feito) return;
    if (entrou) {
      escolher(String(novo));
      desenharTudo();
      K.toast({ titulo: p.pessoa.nome + " agora espera vaga com " + nomeMedico(novo), texto: "Posição " + entrou.posicao + " na fila nova.", icone: "list-ordered", duracao: 6000 });
      return;
    }
    desenharTudo();
    K.toast({
      titulo: "Não deu para trocar o médico de " + p.pessoa.nome,
      texto: erro.message + (erro.devolvida ? " A pessoa voltou para a fila de " + nomeMedico(achado.m) + ", no fim." : " A pessoa ficou fora da fila: adicione de novo."),
      icone: "info", duracao: 9000,
    });
  }

  /* ─── Eventos ─── */
  $("#medicos").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-medico]");
    if (b && !A.mesmoId(b.dataset.medico, atual)) escolher(b.dataset.medico);
  });
  $("#detalhe").addEventListener("click", (ev) => {
    const o = ev.target.closest("[data-oferecer]");
    if (o) { oferecer(o.dataset.oferecer); return; }
    const t = ev.target.closest("[data-tirar]");
    if (t) { tirar(t); return; }
    const tr = ev.target.closest("[data-trocar]");
    if (tr) { abrirTroca(tr); return; }
    const c = ev.target.closest("[data-cancelar-troca]");
    if (c) { const f = c.closest("form"); const b = f.closest(".pessoa").querySelector("[data-trocar]"); f.remove(); if (b) b.focus(); }
  });
  $("#detalhe").addEventListener("submit", (ev) => {
    const f = ev.target.closest("[data-trocar-form]");
    if (!f) return;
    ev.preventDefault();
    trocar(f);
  });
  window.addEventListener("hashchange", () => {
    const m = decodeURIComponent(location.hash.slice(1));
    if (filas().some((f) => A.mesmoId(f.medico.id, m)) && !A.mesmoId(m, atual)) escolher(m);
  });

  /* ─── Adicionar à fila: o paciente escolhido pelo id ─── */
  const dlg = $("#dlg-adicionar");
  const form = $("#form-adicionar");
  const botaoOk = form.querySelector('button[type="submit"]');
  const seletor = window.ESCOLHER_PACIENTE($("#adicionar-paciente"), { prefixo: "add", aoEscolher: () => { $("#e-adicionar").hidden = true; } });
  function erroAdicionar(texto) { const e = $("#e-adicionar"); e.textContent = texto; e.hidden = false; M.tremer(e); }
  $("#adicionar").addEventListener("click", () => {
    form.reset();
    seletor.limpar();
    $("#e-adicionar").hidden = true;
    $("#f-medico").innerHTML = filas().map((f) => '<option value="' + A.esc(f.medico.id) + '">' + A.esc(f.medico.nome) + " · " + A.esc(f.especialidade ? f.especialidade.nome : "") + "</option>").join("");
    if (atual) $("#f-medico").value = atual;
    K.abrirDialogo(dlg);
    seletor.focar();
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (botaoOk.disabled) return;
    const pessoa = seletor.escolhido();
    if (!pessoa) { erroAdicionar("Escolha o paciente: procure pelo nome ou pelo CPF."); seletor.focar(); return; }
    const m = form.medico.value;
    botaoOk.disabled = true;
    try {
      const r = await API.chamar("POST", "/api/lista-espera", { pessoa: Number(pessoa.id), medico: Number(m), usaApp: form.app.checked });
      await CL.recarregar(["fila"]);
      K.fecharDialogo(dlg);
      atual = String(m);
      history.replaceState(null, "", "#" + encodeURIComponent(m));
      desenharTudo();
      const novo = document.querySelector('#pessoas .pessoa[data-id="' + CSS.escape(String(r.id)) + '"]');
      if (novo && !M.reduzido()) novo.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: M.EASE_OUT });
      K.toast({ titulo: pessoa.nome + " entrou na fila", texto: "Posição " + r.posicao + " na fila de " + nomeMedico(m) + ".", icone: "list-ordered" });
    } catch (e) {
      if (e.status !== 401) erroAdicionar(e.message);
    } finally {
      botaoOk.disabled = false;
    }
  });

  /* outra pessoa mudou a fila (o paciente respondeu a vaga, outra recepção cancelou): consulta a API a cada 30 s */
  CL.vigiar(desenharTudo, () => ocupado || dlg.open || !!document.querySelector("#detalhe .trocar-medico, #detalhe [data-confirmar]"));

  if (!atual) $("#adicionar").hidden = true;
  desenharTudo();
  }
})();
