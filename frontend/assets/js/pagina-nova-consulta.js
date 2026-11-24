/* AgendaPro Saúde — Nova consulta, pela API.
   Paciente (escolhido pelo id, entre os que têm a conta vinculada à clínica) → especialidade e médico → dia → horário.
   Os horários livres vêm de GET /api/especialidades/{id}/horarios-livres (F26), a mesma fonte que o paciente usa:
   expediente, almoço, feriado, o que já passou e o que já está ocupado. Marcar: POST /api/consultas
   { pessoa, medico, data, hora, motivo } (F22); o botão fica desativado durante o envio, e a recusa do banco
   (por exemplo "Este horário acabou de ser ocupado. Escolha outro.") aparece como veio.
   Regras da lista de espera:
   · horário oferecido à fila (aguardando os 30 minutos) aparece com cadeado e não pode ser marcado aqui;
   · sem dia que sirva, o mesmo paciente entra na lista de espera dali mesmo (POST /api/lista-espera).
   Aceita vir preenchida: ?paciente={id}, ?esp={id}, ?medico={id}&dia=&hora=. */
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
  const HOJE = CL.hoje;
  const est = { esp: null, medico: null, dia: null, hora: null, mes: 0, pessoa: null, situacao: null };
  const ATE = A.extenso(K.ULTIMO_DIA, false);
  const RESERVADO = "Este horário está reservado para a lista de espera.";

  const espComAgenda = () => Object.keys(CL.especialidades).filter((id) => CL.MEDICOS.some((m) => A.mesmoId(K.medico(m).esp, id)));
  const medicosDaEsp = (esp) => CL.MEDICOS.filter((m) => esp && A.mesmoId(K.medico(m).esp, esp));
  const filaDe = (m) => { const f = CL.filaDoMedico(m); return f ? f.pessoas || [] : []; };
  const curtoMedico = (md) => md.nome.split(" ").slice(0, 2).join(" ");
  const duracao = (m) => CL.DURACAO[m] || 30;

  /* ─── Horários livres da API, por especialidade: { idMedico: { "AAAA-MM-DD": ["HH:MM", ...] } } ─── */
  const livresApi = {};
  let erroLivres = "";
  async function carregarLivres(esp, forcar) {
    if (!esp || (!forcar && livresApi[esp])) return;
    erroLivres = "";
    try {
      const r = await API.chamar("GET", "/api/especialidades/" + encodeURIComponent(esp) + "/horarios-livres");
      const mapa = {};
      (r || []).forEach((x) => { const d = {}; (x.dias || []).forEach((y) => { d[y.data] = y.horas.slice(); }); mapa[String(x.medico.id)] = d; });
      livresApi[esp] = mapa;
    } catch (e) {
      if (e.status !== 401) erroLivres = e.message;
      livresApi[esp] = {};
    }
  }
  function livres(m, dia) {
    const porEsp = livresApi[K.medico(m) ? K.medico(m).esp : est.esp];
    const horas = porEsp && porEsp[m] && porEsp[m][dia];
    return (horas || []).map((h) => ({ ini: CL.hm(h), dur: duracao(m) }));
  }
  /* horários já oferecidos à fila (status OFERECIDA, da agenda da clínica): aparecem com cadeado, mas a recepção não marca */
  const oferecidos = (m, dia) => CL.consultas
    .filter((k) => k.medico === m && k.data === dia && k.horario === "oferecido" && (dia > HOJE || k.ini >= K.agora()))
    .map((k) => ({ ini: k.ini, dur: k.dur, oferecido: true }));

  /* ─── Os dias da janela: de hoje até onde a agenda abre ─── */
  function diasDaJanela() {
    const lista = [];
    for (let d = HOJE; d <= K.ULTIMO_DIA; d = CL.somaDias(d, 1)) lista.push(d);
    return lista;
  }
  function primeiroLivre(m) {
    for (const d of diasDaJanela()) { const l = livres(m, d); if (l.length) return { dia: d, ini: l[0].ini }; }
    return null;
  }
  /* meses que aparecem no calendário: o de hoje até o do último dia aberto */
  const MESES = (function () {
    const lista = [];
    const fim = CL.data(K.ULTIMO_DIA);
    const d = CL.data(HOJE);
    d.setDate(1);
    while (d <= fim) { lista.push({ ano: d.getFullYear(), mes: d.getMonth() }); d.setMonth(d.getMonth() + 1); }
    return lista;
  })();
  const porTela = () => (window.matchMedia("(max-width: 700px)").matches ? 1 : 2);
  const indiceDoMes = (dia) => { const d = CL.data(dia); return MESES.findIndex((x) => x.ano === d.getFullYear() && x.mes === d.getMonth()); };

  $("#subtitulo").textContent = "Escolha o paciente, a especialidade, o médico e um horário livre. A agenda está aberta até " + ATE + ".";

  /* ─── Paciente (pelo id) e a situação da conta (F5) ─── */
  const seletor = window.ESCOLHER_PACIENTE($("#paciente-escolha"), {
    prefixo: "nc",
    aoEscolher: async (p) => {
      est.pessoa = p;
      est.situacao = null;
      $("#paciente-escolha").classList.remove("campo--erro");
      desenharSituacao();
      desenharResumo();
      if (!p) return;
      try {
        const s = await API.chamar("GET", "/api/pacientes/" + encodeURIComponent(p.idConta) + "/situacao");
        if (est.pessoa === p) { est.situacao = s; desenharSituacao(); }
      } catch (e) { /* a situação é só um aviso: sem ela, a API ainda confere a regra ao marcar */ }
    },
  });
  function desenharSituacao() {
    const s = est.situacao;
    const p = est.pessoa;
    if (!p || !s || s.restricao === "normal") { $("#aviso-situacao").innerHTML = ""; return; }
    const ate = s.ate ? A.extenso(s.ate, false) : "";
    $("#aviso-situacao").innerHTML = '<p class="aviso-fila aviso-situacao">' + I("info") + "<span>" + (s.restricao === "so_fila"
      ? "Pela regra de faltas, a conta de " + A.esc(p.nome) + " só marca pela lista de espera até " + ate + ". Pela recepção, a consulta pode ser marcada."
      : "Pela regra de faltas, a conta de " + A.esc(p.nome) + " só agenda com a recepção até " + ate + " e não pode entrar na lista de espera.") + "</span></p>";
  }

  /* ─── Especialidade e médico ─── */
  function desenharEsp() {
    const com = espComAgenda();
    const ids = Object.keys(CL.especialidades).sort((a, b) => CL.especialidades[a].nome.localeCompare(CL.especialidades[b].nome, "pt-BR"));
    $("#f-esp").innerHTML = '<option value="">' + (ids.length ? "Escolha a especialidade" : "Nenhuma especialidade cadastrada") + "</option>" +
      ids.map((id) => {
        const ok = com.includes(id);
        return '<option value="' + A.esc(id) + '"' + (ok ? "" : " disabled") + (A.mesmoId(id, est.esp) ? " selected" : "") + ">" +
          A.esc(CL.especialidades[id].nome) + (ok ? "" : " (sem médico com horário)") + "</option>";
      }).join("");
  }

  function desenharMedicos() {
    const lista = medicosDaEsp(est.esp);
    $("#medicos").innerHTML = est.esp && !livresApi[est.esp]
      ? '<p class="vazio" role="status">Carregando os horários livres…</p>'
      : erroLivres
        ? '<p class="vazio" role="alert">Não deu para carregar os horários: ' + A.esc(erroLivres) + "</p>"
        : lista.length
          ? lista.map((m) => {
              const md = K.medico(m);
              const l = primeiroLivre(m);
              const idm = "m-" + A.esc(m);
              return '<div class="escolha"><input type="radio" name="medico" id="' + idm + '" value="' + A.esc(m) + '"' + (A.mesmoId(m, est.medico) ? " checked" : "") + " />" +
                '<label for="' + idm + '">' + A.avatarMedico(md, 40) + "<span><b>" + A.esc(md.nome) + "</b><small>" +
                (l ? "Próximo livre: " + K.curtoData(l.dia) + " · " + CL.txt(l.ini) : "Sem horário livre até " + ATE) + (md.sala ? " · " + A.esc(md.sala) : "") + "</small></span></label></div>";
            }).join("")
          : '<p class="vazio">Escolha a especialidade para ver os médicos.</p>';
    const fila = est.medico ? filaDe(est.medico).length : 0;
    $("#aviso-fila").innerHTML = fila
      ? '<p class="aviso-fila">' + I("info") + "<span>" + fila + (fila === 1 ? " pessoa aguarda" : " pessoas aguardam") + " vaga com " + A.esc(K.medico(est.medico).nome) +
        '. Horário oferecido à fila fica reservado para ela. <a href="lista-espera.html#' + encodeURIComponent(est.medico) + '">Ver a fila</a></span></p>'
      : "";
  }

  /* ─── Dia: calendário, dois meses por vez (um no celular) ─── */
  function situacaoDoDia(d) {
    if (d < HOJE || d > K.ULTIMO_DIA) return { tipo: "fora" };
    const feriado = CL.feriadoDe(d);
    if (!CL.expediente(est.medico, d)) return { tipo: "fechado", feriado };
    const l = livres(est.medico, d);
    if (!l.length) return { tipo: "lotado" };
    return { tipo: "livre", n: l.length, fila: oferecidos(est.medico, d).length > 0 };
  }

  function mesHTML(ano, mes) {
    const primeiro = new Date(ano, mes, 1);
    const recuo = (primeiro.getDay() + 6) % 7; /* semana começa na segunda */
    const dias = new Date(ano, mes + 1, 0).getDate();
    let celulas = "";
    for (let i = 0; i < recuo; i++) celulas += '<span class="cal__vazio" aria-hidden="true"></span>';
    for (let n = 1; n <= dias; n++) {
      const d = CL.iso(new Date(ano, mes, n));
      const s = situacaoDoDia(d);
      const domingo = CL.data(d).getDay() === 0 || (s.feriado);
      const classes = "cal__dia cal__dia--" + s.tipo + (domingo ? " cal__dia--domingo" : "") + (d === HOJE ? " cal__dia--hoje" : "");
      if (s.tipo !== "livre") {
        const nota = s.tipo === "lotado" ? "lotado" : s.tipo === "fechado" ? (s.feriado ? "feriado" : "") : "";
        const rotulo = s.tipo === "fora" ? "" : K.cap(A.extenso(d)) + ", " + (s.tipo === "lotado" ? "lotado" : s.feriado ? s.feriado.nome + ", clínica fechada" : "não atende");
        celulas += '<span class="' + classes + '"' + (rotulo ? ' role="img" aria-label="' + A.esc(rotulo) + '"' : ' aria-hidden="true"') + ">" +
          '<span class="cal__n" aria-hidden="true">' + n + "</span>" + (nota ? '<span class="cal__nota" aria-hidden="true">' + nota + "</span>" : "") + "</span>";
        continue;
      }
      const rotulo = K.cap(A.extenso(d)) + ", " + s.n + (s.n === 1 ? " horário livre" : " horários livres") +
        (s.fila ? ", inclui horário reservado à lista de espera" : "");
      celulas += '<span class="' + classes + '"><input type="radio" name="dia" id="d-' + d + '" value="' + d + '"' + (d === est.dia ? " checked" : "") +
        ' aria-label="' + rotulo + '" /><label for="d-' + d + '"><span class="cal__n">' + n + '</span><span class="cal__nota">' + s.n +
        (s.n === 1 ? " livre" : " livres") + "</span>" + (s.fila ? '<span class="cal__ponto" aria-hidden="true"></span>' : "") + "</label></span>";
    }
    return '<div class="cal__mes"><p class="cal__titulo">' + A.MESES_LONGOS[mes] + " <span>" + ano + "</span></p>" +
      '<div class="cal__semana" aria-hidden="true"><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span><span>dom</span></div>' +
      '<div class="cal__grade">' + celulas + "</div></div>";
  }

  function desenharDias() {
    const caixa = $("#dias");
    const semDia = $("#sem-dia");
    if (!est.medico) {
      caixa.innerHTML = '<p class="vazio">Escolha o médico para ver os dias.</p>';
      $("#dia-sub").textContent = "";
      semDia.innerHTML = "";
      return;
    }
    const n = porTela();
    est.mes = Math.max(0, Math.min(est.mes, MESES.length - n));
    const visiveis = MESES.slice(est.mes, est.mes + n);
    const nomeVis = visiveis.map((x) => A.MESES_LONGOS[x.mes]).join(" e ");
    $("#dia-sub").textContent = "A agenda abre até " + ATE + " (" + CL.ABRE_MESES + " meses). O número em cada dia é quantos horários livres ele tem.";
    caixa.innerHTML =
      '<div class="cal__barra"><button type="button" class="botao-icone" data-mes="-1" aria-label="Mês anterior"' + (est.mes === 0 ? " disabled" : "") + ">" + I("chevron-left", "ic-sm") + "</button>" +
      '<p class="cal__periodo" aria-live="polite">' + K.cap(nomeVis) + " de " + visiveis[visiveis.length - 1].ano + "</p>" +
      '<button type="button" class="botao-icone" data-mes="1" aria-label="Próximo mês"' + (est.mes + n >= MESES.length ? " disabled" : "") + ">" + I("chevron-right", "ic-sm") + "</button></div>" +
      '<div class="cal__meses cal__meses--' + n + '">' + visiveis.map((x) => mesHTML(x.ano, x.mes)).join("") + "</div>" +
      '<ul class="cal__legenda" aria-hidden="true"><li><i class="cal__amostra"></i>Livre</li><li><i class="cal__amostra cal__amostra--fila"></i>Tem horário reservado à fila</li>' +
      '<li><i class="cal__amostra cal__amostra--lotado"></i>Lotado ou fechado</li></ul>';

    const algum = diasDaJanela().some((d) => situacaoDoDia(d).tipo === "livre");
    const md = K.medico(est.medico);
    semDia.innerHTML = algum
      ? '<p class="sem-dia__linha">Nenhum desses dias serve para o paciente? <button type="button" class="link-acao" data-abrir-fila>Colocar na lista de espera</button></p>'
      : '<div class="aviso-fila">' + I("info") + "<span><b>Nenhum dia livre com " + A.esc(md.nome) + " até " + ATE + ".</b> " +
        'Coloque o paciente na lista de espera: ele recebe a vaga quando alguém cancelar.</span></div>' +
        '<button type="button" class="botao botao--menta" data-abrir-fila>' + I("list-ordered", "ic-sm") + "Entrar na lista de espera deste médico</button>";
  }

  /* ─── Horário ─── */
  function desenharHoras() {
    const caixa = $("#horas");
    if (!est.medico || !est.dia) {
      caixa.innerHTML = '<p class="vazio">' + (est.medico ? "Escolha o dia para ver os horários." : "Escolha o médico e o dia para ver os horários.") + "</p>";
      $("#hora-sub").textContent = "";
      desenharBloqueio();
      return;
    }
    const lista = livres(est.medico, est.dia).concat(oferecidos(est.medico, est.dia)).sort((a, b) => a.ini - b.ini);
    const reservados = lista.filter((x) => x.oferecido).length;
    $("#hora-sub").textContent = K.cap(A.extenso(est.dia)) + " · consultas de " + duracao(est.medico) + " minutos." +
      (reservados ? " Com cadeado, " + (reservados === 1 ? "o horário oferecido" : "os horários oferecidos") + " à lista de espera, aguardando resposta." : "");
    caixa.innerHTML = lista.map((x) => {
      const h = CL.txt(x.ini);
      return '<div class="hora-opcao' + (x.oferecido ? " hora-opcao--fila" : "") + '"><input type="radio" name="hora" id="h-' + x.ini + '" value="' + h + '"' +
        (h === est.hora ? " checked" : "") + (x.oferecido ? ' aria-label="' + h + ', reservado para a lista de espera"' : "") + ' /><label for="h-' + x.ini + '">' +
        (x.oferecido ? '<svg class="ic cadeado" aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' : "") + h + "</label></div>";
    }).join("") || '<p class="vazio">Sem horário livre neste dia.</p>';
    desenharBloqueio();
  }

  /* o horário escolhido foi oferecido à fila? a recepção não pode marcar nele */
  function horarioEscolhido() {
    if (!est.medico || !est.dia || !est.hora) return null;
    return livres(est.medico, est.dia).concat(oferecidos(est.medico, est.dia)).find((x) => CL.txt(x.ini) === est.hora) || null;
  }
  const reservado = () => { const x = horarioEscolhido(); return !!(x && x.oferecido); };
  function desenharBloqueio() {
    const caixa = $("#bloqueio");
    if (!reservado()) { caixa.innerHTML = ""; return; }
    const lista = filaDe(est.medico);
    caixa.innerHTML =
      '<div class="bloqueio" role="alert">' +
      '<p class="bloqueio__titulo">' + I("list-ordered", "ic-sm") + "<span>" + RESERVADO + "</span></p>" +
      "<p>Ele foi oferecido a quem espera vaga com " + A.esc(curtoMedico(K.medico(est.medico))) + " e aguarda a resposta (até 30 minutos). Escolha outro horário." +
      (lista.length ? " " + lista.length + (lista.length === 1 ? " pessoa ainda aguarda" : " pessoas ainda aguardam") + " na fila." : "") + "</p></div>";
  }

  /* ─── Resumo ─── */
  function faltando() {
    const f = [];
    if (!est.pessoa) f.push(["paciente", "#paciente-escolha input"]);
    if (!est.medico) f.push(["médico", est.esp ? "#medicos input" : "#f-esp"]);
    if (!est.dia) f.push(["dia", "#dias input"]);
    if (!est.hora) f.push(["horário", "#horas input"]);
    else if (reservado()) f.push(["outro horário (este está reservado para a lista de espera)", "#horas input:checked"]);
    return f;
  }

  function desenharResumo() {
    const md = est.medico && K.medico(est.medico);
    $("#r-data").innerHTML = est.dia
      ? A.folha(est.dia, { bloco: true, menta: true }) + "<span><b>" + K.cap(A.extenso(est.dia)) + "</b><span>" + (est.hora ? "às " + est.hora : "horário a escolher") + "</span></span>"
      : "";
    const item = (rot, val) => "<div><dt>" + rot + "</dt>" + (val ? "<dd>" + val + "</dd>" : '<dd class="falta">a escolher</dd>') + "</div>";
    $("#r-lista").innerHTML =
      item("Paciente", est.pessoa ? A.esc(est.pessoa.nome) : "") +
      item("Especialidade", est.esp && CL.especialidades[est.esp] ? A.esc(CL.especialidades[est.esp].nome) : "") +
      item("Médico", md ? A.esc(md.nome) : "") +
      item("Duração", md ? duracao(est.medico) + " minutos" : "");
    const f = faltando();
    $("#marcar").setAttribute("aria-disabled", String(f.length > 0));
    $("#r-falta").textContent = f.length ? "Falta: " + f.map((x) => x[0]).join(", ") + "." : "Tudo pronto. Confira e marque.";
  }

  function tudo() {
    desenharMedicos();
    desenharDias();
    desenharHoras();
    desenharResumo();
  }

  async function escolherEsp(esp) {
    est.esp = esp || null;
    const lista = medicosDaEsp(est.esp);
    est.medico = lista.length === 1 ? lista[0] : null;
    est.dia = est.hora = null;
    est.mes = 0;
    tudo();
    if (est.esp && !livresApi[est.esp]) { await carregarLivres(est.esp); tudo(); }
  }

  /* ─── Eventos ─── */
  $("#f-esp").addEventListener("change", (ev) => { escolherEsp(ev.target.value); });
  $("#form").addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.name === "medico") { est.medico = t.value; est.dia = est.hora = null; est.mes = 0; tudo(); const r = document.getElementById("m-" + t.value); if (r) r.focus(); }
    else if (t.name === "dia") { est.dia = t.value; est.hora = null; desenharDias(); desenharHoras(); desenharResumo(); $("#d-" + t.value).focus(); }
    else if (t.name === "hora") {
      est.hora = t.value;
      desenharBloqueio();
      desenharResumo();
      if (!M.reduzido() && $("#bloqueio .bloqueio")) $("#bloqueio .bloqueio").animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: M.EASE_OUT });
    }
  });
  $("#form").addEventListener("click", (ev) => {
    const m = ev.target.closest("[data-mes]");
    if (m && !m.disabled) {
      est.mes += Number(m.dataset.mes);
      desenharDias();
      const mesmo = $('#dias [data-mes="' + m.dataset.mes + '"]:not(:disabled)') || $("#dias [data-mes]:not(:disabled)");
      if (mesmo) mesmo.focus();
      return;
    }
    if (ev.target.closest("[data-abrir-fila]")) abrirFila();
  });
  /* troca 1 ↔ 2 meses quando a tela muda de largura */
  window.matchMedia("(max-width: 700px)").addEventListener("change", () => { if (est.medico) desenharDias(); });

  /* ─── Lista de espera, sem sair da tela: o mesmo paciente, na fila deste médico ─── */
  const dlgFila = $("#dlg-fila");
  const formFila = $("#form-fila");
  const okFila = formFila.querySelector('button[type="submit"]');
  function exigirPaciente() {
    $("#paciente-escolha").classList.add("campo--erro");
    K.toast({ titulo: "Escolha o paciente primeiro", texto: "Procure pelo nome ou pelo CPF.", icone: "info" });
    seletor.focar();
    $("#paciente-escolha").scrollIntoView({ block: "center", behavior: M.reduzido() ? "auto" : "smooth" });
  }
  function abrirFila() {
    if (!est.pessoa) { exigirPaciente(); return; }
    const md = K.medico(est.medico);
    formFila.reset();
    $("#e-fila").hidden = true;
    const n = filaDe(est.medico).length;
    $("#dlg-fila-texto").textContent = est.pessoa.nome + " na fila de " + md.nome + " · " + K.esp(md.esp).nome + ". " +
      (n ? n + (n === 1 ? " pessoa está" : " pessoas estão") + " na frente." : "Ninguém na frente: a próxima vaga é dela.");
    K.abrirDialogo(dlgFila);
  }
  formFila.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (okFila.disabled || !est.pessoa) return;
    const md = K.medico(est.medico);
    okFila.disabled = true;
    try {
      const r = await API.chamar("POST", "/api/lista-espera", { pessoa: Number(est.pessoa.id), medico: Number(est.medico), usaApp: formFila.app.checked });
      await CL.recarregar(["fila"]);
      K.desenharMenu();
      K.fecharDialogo(dlgFila);
      mostrarFeito(
        A.folha(HOJE, { bloco: true, menta: true }) +
        '<h2 id="t-feito">Na lista de espera</h2>' +
        "<p><b>" + A.esc(est.pessoa.nome) + "</b> está na posição " + r.posicao + " da fila de " + A.esc(md.nome) +
        ". Quando uma consulta for cancelada, a vaga é oferecida a quem estiver em 1º" + (formFila.app.checked ? ", com aviso pelo app." : ", e a recepção liga.") + "</p>" +
        '<div class="feito__acoes"><a class="botao botao--principal" href="lista-espera.html#' + encodeURIComponent(est.medico) + '">Ver a fila</a>' +
        '<button type="button" class="botao botao--secundario" id="outra">Marcar outra consulta</button></div>'
      );
    } catch (e) {
      if (e.status !== 401) { const x = $("#e-fila"); x.textContent = e.message; x.hidden = false; M.tremer(x); }
    } finally {
      okFila.disabled = false;
    }
  });

  /* ─── Marcar ─── */
  const marcar = $("#marcar");
  $("#form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (marcar.disabled) return;
    const f = faltando();
    if (f.length) {
      if (f[0][0] === "paciente") $("#paciente-escolha").classList.add("campo--erro");
      if (reservado()) K.anunciar(RESERVADO);
      const alvo = $(f[0][1]);
      if (alvo) { alvo.focus(); alvo.scrollIntoView({ block: "center", behavior: M.reduzido() ? "auto" : "smooth" }); }
      M.tremer(marcar);
      return;
    }
    const md = K.medico(est.medico);
    const motivo = $("#f-motivo-consulta").value.trim();
    marcar.disabled = true;
    marcar.setAttribute("aria-busy", "true");
    try {
      const r = await API.chamar("POST", "/api/consultas", { pessoa: Number(est.pessoa.id), medico: Number(est.medico), data: est.dia, hora: est.hora, motivo: motivo || null, retorno: retornoDoPaciente() });
      if (retornoDoPaciente()) retorno = null; /* já marcado: a próxima consulta é comum */
      delete livresApi[est.esp];
      CL.recarregar(["agenda"]).catch(() => {});
      mostrarFeito(
        A.folha(r.data, { bloco: true, menta: true }) +
        '<h2 id="t-feito">Consulta marcada</h2>' +
        "<p><b>" + A.esc(r.pessoa ? r.pessoa.nome : est.pessoa.nome) + "</b> com " + A.esc(r.medico.nome) + " (" + A.esc(r.especialidade.nome) + "), " + A.extenso(r.data) + ", às " + A.esc(r.hora) +
        (r.sala ? ", " + A.esc(r.sala) : "") + ". Ela já aparece na agenda da recepção e na do médico.</p>" +
        '<div class="feito__acoes"><a class="botao botao--principal" href="clinica.html">Ver a agenda</a>' +
        '<button type="button" class="botao botao--secundario" id="outra">Marcar outra consulta</button></div>'
      );
    } catch (e) {
      if (e.status === 401) return;
      K.toast({ titulo: "Não deu para marcar", texto: e.message, icone: "info", duracao: 7000 });
      /* o horário pode ter sido ocupado por outra pessoa: busca os livres de novo */
      await carregarLivres(est.esp, true);
      await CL.recarregar(["agenda", "fila"]).catch(() => {});
      if (!horarioEscolhido()) est.hora = null;
      tudo();
    } finally {
      marcar.disabled = false;
      marcar.removeAttribute("aria-busy");
    }
  });

  function mostrarFeito(html) {
    const feito = $("#feito");
    feito.innerHTML = html;
    $("#form").hidden = true;
    feito.hidden = false;
    feito.focus();
    if (!M.reduzido()) {
      feito.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: M.EASE_OUT });
      M.chuvaDeFolhas(feito.querySelector(".bloco"));
    }
    K.anunciar(feito.querySelector("h2").textContent + ". " + feito.querySelector("p").textContent);
    $("#outra").addEventListener("click", () => {
      $("#form").reset();
      Object.assign(est, { esp: null, medico: null, dia: null, hora: null, mes: 0, pessoa: null, situacao: null });
      seletor.limpar();
      desenharSituacao();
      desenharEsp();
      tudo();
      feito.hidden = true;
      $("#form").hidden = false;
      seletor.focar();
    });
  }

  /* ─── Retorno que esta consulta atende (veio de "Marcar" na ficha): vale só para aquele paciente ─── */
  const daUrl = new URLSearchParams(location.search);
  let retorno = daUrl.get("retorno");
  const retornoDoPaciente = () => (retorno && A.mesmoId(est.pessoa.id, daUrl.get("paciente")) ? Number(retorno) : null);

  /* ─── Primeira pintura, com o que veio na URL ─── */
  (async function () {
    const q = new URLSearchParams(location.search);
    const qm = q.get("medico");
    if (qm && CL.MEDICOS.some((m) => A.mesmoId(m, qm))) {
      est.medico = String(qm);
      est.esp = K.medico(qm).esp;
    } else if (q.get("esp") && espComAgenda().includes(q.get("esp"))) {
      est.esp = q.get("esp");
      const lista = medicosDaEsp(est.esp);
      if (lista.length === 1) est.medico = lista[0];
    }
    desenharEsp();
    tudo();
    if (q.get("paciente")) seletor.definirPorId(q.get("paciente"));
    if (!est.esp) return;
    await carregarLivres(est.esp);
    const qd = q.get("dia");
    if (qm && qd && livres(est.medico, qd).length) {
      est.dia = qd;
      est.mes = Math.max(0, indiceDoMes(qd));
      const qh = q.get("hora");
      if (qh && livres(est.medico, qd).some((x) => CL.txt(x.ini) === qh)) est.hora = qh;
    }
    tudo();
  })();
  }
})();
