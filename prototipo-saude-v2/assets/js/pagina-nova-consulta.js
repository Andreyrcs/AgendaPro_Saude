/* AgendaPro Saúde v2 — Nova consulta (protótipo, dados FICTÍCIOS)
   Paciente → especialidade e médico → dia (calendário até onde a agenda abre) → horário livre.
   Os horários seguem a mesma regra da agenda: expediente, almoço, o que já passou e o que já está ocupado.
   Regras da lista de espera:
   · horário que abriu por cancelamento, de médico com fila, é da fila: só se marca fora dela com um motivo,
     que fica registrado;
   · horário já oferecido à fila (aguardando os 30 minutos) não aparece como livre;
   · sem dia que sirva, a pessoa entra na lista de espera dali mesmo, com os dados já preenchidos.
   Aceita vir preenchida: ?paciente=, ?esp=, ?medico=&dia=&hora=. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  const espComAgenda = Object.keys(D.especialidades).filter((id) => C.MEDICOS.some((m) => K.medico(m).esp === id));
  const est = { esp: null, medico: null, dia: null, hora: null, mes: 0, furar: null, abrirFurar: false };
  const ATE = A.extenso(K.ULTIMO_DIA, false);
  const MOTIVOS = ["Urgência médica", "Retorno pedido pelo médico", "Remarcação de consulta que a clínica cancelou"];

  const filaDe = (m) => D.filas[m] || [];
  const ehDaFila = (x) => !!(x && x.vaga && filaDe(est.medico).length);
  const curtoMedico = (md) => md.nome.split(" ").slice(0, 2).join(" ");
  const primeiroNome = (n) => n.split(" ")[0];

  /* ─── Os dias da janela: de hoje até onde a agenda abre ─── */
  function diasDaJanela() {
    const lista = [];
    for (let d = D.hoje; d <= K.ULTIMO_DIA; d = C.somaDias(d, 1)) lista.push(d);
    return lista;
  }
  function primeiroLivre(m) {
    for (const d of diasDaJanela()) { const l = K.livres(m, d); if (l.length) return { dia: d, ini: l[0].ini }; }
    return null;
  }
  /* meses que aparecem no calendário: o de hoje até o do último dia aberto */
  const MESES = (function () {
    const lista = [];
    const fim = C.data(K.ULTIMO_DIA);
    const d = C.data(D.hoje);
    d.setDate(1);
    while (d <= fim) { lista.push({ ano: d.getFullYear(), mes: d.getMonth() }); d.setMonth(d.getMonth() + 1); }
    return lista;
  })();
  const porTela = () => (window.matchMedia("(max-width: 700px)").matches ? 1 : 2);
  const indiceDoMes = (dia) => { const d = C.data(dia); return MESES.findIndex((x) => x.ano === d.getFullYear() && x.mes === d.getMonth()); };

  $("#subtitulo").textContent = "Escolha o paciente, a especialidade, o médico e um horário livre. A agenda está aberta até " + ATE + ".";

  /* ─── Especialidade e médico ─── */
  function desenharEsp() {
    $("#f-esp").innerHTML = '<option value="">Escolha a especialidade</option>' +
      Object.keys(D.especialidades).map((id) => {
        const ok = espComAgenda.includes(id);
        return '<option value="' + id + '"' + (ok ? "" : " disabled") + (id === est.esp ? " selected" : "") + ">" +
          D.especialidades[id].nome + (ok ? "" : " (sem médico nesta unidade)") + "</option>";
      }).join("");
  }

  function desenharMedicos() {
    const lista = est.esp ? C.MEDICOS.filter((m) => K.medico(m).esp === est.esp) : [];
    $("#medicos").innerHTML = lista.length
      ? lista.map((m) => {
          const md = K.medico(m);
          const l = primeiroLivre(m);
          return '<div class="escolha"><input type="radio" name="medico" id="m-' + m + '" value="' + m + '"' + (m === est.medico ? " checked" : "") + " />" +
            '<label for="m-' + m + '">' + A.avatarMedico(md, 40) + "<span><b>" + md.nome + "</b><small>" +
            (l ? "Próximo livre: " + K.curtoData(l.dia) + " · " + C.txt(l.ini) : "Sem horário livre até " + ATE) + "</small></span></label></div>";
        }).join("")
      : '<p class="vazio">Escolha a especialidade para ver os médicos.</p>';
    const fila = est.medico ? filaDe(est.medico).length : 0;
    $("#aviso-fila").innerHTML = fila
      ? '<p class="aviso-fila">' + I("info") + "<span>" + fila + (fila === 1 ? " pessoa aguarda" : " pessoas aguardam") + " vaga com " + K.medico(est.medico).nome +
        '. Os horários liberados por cancelamento ficam reservados para a fila. <a href="lista-espera.html#' + est.medico + '">Ver a fila</a></span></p>'
      : "";
  }

  /* ─── Dia: calendário, dois meses por vez (um no celular) ─── */
  function situacaoDoDia(d) {
    if (d < D.hoje || d > K.ULTIMO_DIA) return { tipo: "fora" };
    const feriado = (D.feriados || []).find((f) => f.data === d);
    if (!C.expediente(est.medico, d)) return { tipo: "fechado", feriado };
    const l = K.livres(est.medico, d);
    if (!l.length) return { tipo: "lotado" };
    return { tipo: "livre", n: l.length, fila: l.some(ehDaFila) };
  }

  function mesHTML(ano, mes) {
    const primeiro = new Date(ano, mes, 1);
    const recuo = (primeiro.getDay() + 6) % 7; /* semana começa na segunda */
    const dias = new Date(ano, mes + 1, 0).getDate();
    let celulas = "";
    for (let i = 0; i < recuo; i++) celulas += '<span class="cal__vazio" aria-hidden="true"></span>';
    for (let n = 1; n <= dias; n++) {
      const d = C.iso(new Date(ano, mes, n));
      const s = situacaoDoDia(d);
      const domingo = C.data(d).getDay() === 0 || (s.feriado);
      const classes = "cal__dia cal__dia--" + s.tipo + (domingo ? " cal__dia--domingo" : "") + (d === D.hoje ? " cal__dia--hoje" : "");
      if (s.tipo !== "livre") {
        const nota = s.tipo === "lotado" ? "lotado" : s.tipo === "fechado" ? (s.feriado ? "feriado" : "") : "";
        const rotulo = s.tipo === "fora" ? "" : K.cap(A.extenso(d)) + ", " + (s.tipo === "lotado" ? "lotado" : s.feriado ? s.feriado.nome + ", clínica fechada" : "não atende");
        celulas += '<span class="' + classes + '"' + (rotulo ? ' role="img" aria-label="' + rotulo + '"' : ' aria-hidden="true"') + ">" +
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
    $("#dia-sub").textContent = "A agenda abre até " + ATE + " (" + C.ABRE_MESES + " meses). O número em cada dia é quantos horários livres ele tem.";
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
      : '<div class="aviso-fila">' + I("info") + "<span><b>Nenhum dia livre com " + md.nome + " até " + ATE + ".</b> " +
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
    const lista = K.livres(est.medico, est.dia);
    const daFila = lista.some(ehDaFila);
    const oferecidos = C.consultas.filter((k) => k.medico === est.medico && k.data === est.dia && k.status === "oferecida").length;
    $("#hora-sub").textContent = K.cap(A.extenso(est.dia)) + " · consultas de " + (C.DURACAO[est.medico] || 30) + " minutos." +
      (daFila ? " Com cadeado, horários liberados por cancelamento: são da lista de espera." : "") +
      (oferecidos ? " " + oferecidos + (oferecidos === 1 ? " horário já foi oferecido" : " horários já foram oferecidos") + " à fila e aguarda resposta, por isso não aparece." : "");
    caixa.innerHTML = lista.map((x) => {
      const h = C.txt(x.ini);
      const fila = ehDaFila(x);
      return '<div class="hora-opcao' + (fila ? " hora-opcao--fila" : x.vaga ? " hora-opcao--vaga" : "") + '"><input type="radio" name="hora" id="h-' + x.ini + '" value="' + h + '"' +
        (h === est.hora ? " checked" : "") + (fila ? ' aria-label="' + h + ', reservado à lista de espera"' : "") + ' /><label for="h-' + x.ini + '">' +
        (fila ? '<svg class="ic cadeado" aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' : "") + h + "</label></div>";
    }).join("") || '<p class="vazio">Sem horário livre neste dia.</p>';
    desenharBloqueio();
  }

  /* o horário escolhido é da fila? então mostra quem está esperando e o caminho para marcar fora dela */
  function horarioEscolhido() {
    if (!est.medico || !est.dia || !est.hora) return null;
    return K.livres(est.medico, est.dia).find((x) => C.txt(x.ini) === est.hora) || null;
  }
  function desenharBloqueio() {
    const caixa = $("#bloqueio");
    const x = horarioEscolhido();
    if (!ehDaFila(x)) { caixa.innerHTML = ""; est.furar = null; est.abrirFurar = false; return; }
    const lista = filaDe(est.medico);
    const p = lista[0];
    const md = K.medico(est.medico);
    const motivo = est.furar ? est.furar.motivo : "";
    const outro = motivo && !MOTIVOS.includes(motivo);
    caixa.innerHTML =
      '<div class="bloqueio">' +
      '<p class="bloqueio__titulo">' + I("list-ordered", "ic-sm") + "<span>Esse horário é da lista de espera. Oferecer a " + A.esc(primeiroNome(p.nome)) + "?</span></p>" +
      "<p>Ele abriu por cancelamento, e " + lista.length + (lista.length === 1 ? " pessoa aguarda" : " pessoas aguardam") + " vaga com " + curtoMedico(md) + ". " +
      "A 1ª é " + A.esc(p.nome) + ", na fila desde " + A.extenso(p.desde, false) + ".</p>" +
      '<div class="bloqueio__acoes"><a class="botao botao--menta botao--pequeno" href="lista-espera.html?vaga=' + x.vaga.id + "#" + est.medico + '">' +
      I("bell-ring", "ic-sm") + "Oferecer a " + A.esc(primeiroNome(p.nome)) + "</a>" +
      '<button type="button" class="link-acao" id="furar" aria-expanded="' + est.abrirFurar + '" aria-controls="furar-caixa">Marcar fora da fila</button></div>' +
      '<div class="bloqueio__furar" id="furar-caixa"' + (est.abrirFurar ? "" : " hidden") + ">" +
      '<div class="campo" id="c-motivo"><label for="f-motivo">Por que marcar fora da fila?</label><select id="f-motivo">' +
      '<option value="">Escolha o motivo</option>' + MOTIVOS.map((m) => "<option" + (m === motivo ? " selected" : "") + ">" + m + "</option>").join("") +
      '<option value="outro"' + (outro ? " selected" : "") + ">Outro motivo</option></select></div>" +
      '<div class="campo" id="c-motivo-outro"' + (outro ? "" : " hidden") + '><label for="f-motivo-outro">Explique em poucas palavras</label>' +
      '<input id="f-motivo-outro" autocomplete="off" value="' + (outro ? A.esc(motivo) : "") + '" /></div>' +
      '<p class="campo__dica">Fica registrado com o seu nome (' + A.esc(K.conta.nome) + "), a data e o motivo, e aparece na tela da lista de espera.</p></div></div>";
  }
  function lerMotivo() {
    const sel = $("#f-motivo");
    if (!sel) return;
    const outro = sel.value === "outro";
    $("#c-motivo-outro").hidden = !outro;
    const texto = outro ? $("#f-motivo-outro").value.trim() : sel.value;
    est.furar = texto.length >= 3 ? { motivo: texto } : null;
    desenharResumo();
  }

  /* ─── Resumo ─── */
  function faltando() {
    const f = [];
    if ($("#f-nome").value.trim().split(/\s+/).length < 2) f.push(["paciente", "#f-nome"]);
    if (!est.medico) f.push(["médico", est.esp ? "#medicos input" : "#f-esp"]);
    if (!est.dia) f.push(["dia", "#dias input"]);
    if (!est.hora) f.push(["horário", "#horas input"]);
    else if (ehDaFila(horarioEscolhido()) && !est.furar) f.push(["oferecer à fila ou dar o motivo", est.abrirFurar ? "#f-motivo" : "#furar"]);
    return f;
  }

  function desenharResumo() {
    const md = est.medico && K.medico(est.medico);
    const nome = $("#f-nome").value.trim();
    $("#r-data").innerHTML = est.dia
      ? A.folha(est.dia, { bloco: true, menta: true }) + "<span><b>" + K.cap(A.extenso(est.dia)) + "</b><span>" + (est.hora ? "às " + est.hora : "horário a escolher") + "</span></span>"
      : "";
    const item = (rot, val) => "<div><dt>" + rot + "</dt>" + (val ? "<dd>" + val + "</dd>" : '<dd class="falta">a escolher</dd>') + "</div>";
    $("#r-lista").innerHTML =
      item("Paciente", nome ? A.esc(nome) : "") +
      item("Especialidade", est.esp ? D.especialidades[est.esp].nome : "") +
      item("Médico", md ? md.nome : "") +
      item("Duração", md ? (C.DURACAO[est.medico] || 30) + " minutos" : "") +
      (est.furar ? item("Fora da fila", A.esc(est.furar.motivo)) : "");
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

  /* ─── Eventos ─── */
  $("#f-esp").addEventListener("change", (ev) => {
    est.esp = ev.target.value || null;
    const lista = C.MEDICOS.filter((m) => est.esp && K.medico(m).esp === est.esp);
    est.medico = lista.length === 1 ? lista[0] : null;
    est.dia = est.hora = null;
    est.mes = 0;
    tudo();
  });
  $("#form").addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.name === "medico") { est.medico = t.value; est.dia = est.hora = null; est.mes = 0; tudo(); $("#m-" + t.value).focus(); }
    else if (t.name === "dia") { est.dia = t.value; est.hora = null; desenharDias(); desenharHoras(); desenharResumo(); $("#d-" + t.value).focus(); }
    else if (t.name === "hora") {
      est.hora = t.value;
      est.abrirFurar = false;
      desenharBloqueio();
      desenharResumo();
      if (!M.reduzido() && $("#bloqueio .bloqueio")) $("#bloqueio .bloqueio").animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: M.EASE_OUT });
    } else if (t.id === "f-motivo") { lerMotivo(); if (t.value === "outro") $("#f-motivo-outro").focus(); }
  });
  $("#form").addEventListener("input", (ev) => { if (ev.target.id === "f-motivo-outro") lerMotivo(); });
  $("#form").addEventListener("click", (ev) => {
    const m = ev.target.closest("[data-mes]");
    if (m && !m.disabled) {
      est.mes += Number(m.dataset.mes);
      desenharDias();
      const mesmo = $('#dias [data-mes="' + m.dataset.mes + '"]:not(:disabled)') || $("#dias [data-mes]:not(:disabled)");
      if (mesmo) mesmo.focus();
      return;
    }
    if (ev.target.closest("#furar")) {
      est.abrirFurar = !est.abrirFurar;
      $("#furar").setAttribute("aria-expanded", String(est.abrirFurar));
      $("#furar-caixa").hidden = !est.abrirFurar;
      if (est.abrirFurar) $("#f-motivo").focus();
      desenharResumo();
      return;
    }
    if (ev.target.closest("[data-abrir-fila]")) abrirFila();
  });
  $("#f-nome").addEventListener("input", () => {
    $("#c-nome").classList.remove("campo--erro");
    desenharResumo();
  });
  /* troca 1 ↔ 2 meses quando a tela muda de largura */
  window.matchMedia("(max-width: 700px)").addEventListener("change", () => { if (est.medico) desenharDias(); });

  /* ─── Lista de espera, sem sair da tela ─── */
  const dlgFila = $("#dlg-fila");
  const formFila = $("#form-fila");
  function abrirFila() {
    const md = K.medico(est.medico);
    const colegas = D.medicos.filter((x) => x.esp === md.esp);
    formFila.reset();
    formFila.querySelectorAll(".campo__erro").forEach((e) => e.remove());
    $("#c-fila-nome").classList.remove("campo--erro");
    formFila.nome.value = $("#f-nome").value.trim();
    formFila.tel.value = $("#f-tel").value.trim();
    const n = filaDe(est.medico).length;
    $("#dlg-fila-texto").textContent = md.nome + " · " + K.esp(md.esp).nome + ". " +
      (n ? n + (n === 1 ? " pessoa está" : " pessoas estão") + " na frente." : "Ninguém na frente: a próxima vaga é dela.");
    $("#fila-qualquer").hidden = colegas.length < 2;
    $("#fila-opcoes").innerHTML =
      '<div class="escolha"><input type="radio" name="quem" id="q-so" value="so" checked /><label for="q-so"><span><b>Só com ' + md.nome + "</b>" +
      "<small>" + n + " na fila</small></span></label></div>" +
      '<div class="escolha"><input type="radio" name="quem" id="q-qualquer" value="qualquer" /><label for="q-qualquer"><span><b>Qualquer médico de ' + K.esp(md.esp).nome + "</b>" +
      "<small>" + colegas.map(curtoMedico).join(", ") + ". Espera menos: recebe a primeira vaga que abrir com qualquer um deles.</small></span></label></div>";
    K.abrirDialogo(dlgFila);
  }
  formFila.addEventListener("submit", (ev) => {
    ev.preventDefault();
    formFila.querySelectorAll(".campo__erro").forEach((e) => e.remove());
    const nome = formFila.nome.value.trim().replace(/\s+/g, " ");
    if (nome.split(" ").length < 2) {
      $("#c-fila-nome").classList.add("campo--erro");
      $("#c-fila-nome").insertAdjacentHTML("beforeend", '<span class="campo__erro" id="e-fila-nome">Escreva o nome e o sobrenome.</span>');
      formFila.nome.setAttribute("aria-describedby", "e-fila-nome");
      formFila.nome.focus();
      M.tremer(formFila.nome);
      return;
    }
    const md = K.medico(est.medico);
    const digitos = formFila.tel.value.replace(/\D/g, "");
    const qualquer = !$("#fila-qualquer").hidden && formFila.quem.value === "qualquer";
    const p = { nome, desde: D.hoje, tel: digitos ? "•••• " + digitos.slice(-4) : "", app: formFila.app.checked };
    if (qualquer) p.qualquer = md.esp;
    const lista = D.filas[est.medico] || (D.filas[est.medico] = []);
    lista.push(p);
    K.guardar.entrouNaFila(est.medico, p);
    K.desenharMenu();
    K.fecharDialogo(dlgFila);
    mostrarFeito(
      A.folha(D.hoje, { bloco: true, menta: true }) +
      '<h2 id="t-feito">Na lista de espera</h2>' +
      "<p><b>" + A.esc(nome) + "</b> é a " + lista.length + "ª da fila de " + md.nome +
      (qualquer ? " e também recebe as vagas de qualquer médico de " + K.esp(md.esp).nome : "") +
      ". Quando uma consulta for cancelada, a vaga é oferecida a quem estiver em 1º" + (p.app ? ", com aviso pelo app" : ", e a recepção liga") + ". Fica guardado neste navegador.</p>" +
      '<div class="feito__acoes"><a class="botao botao--principal" href="lista-espera.html#' + est.medico + '">Ver a fila</a>' +
      '<button type="button" class="botao botao--secundario" id="outra">Marcar outra consulta</button></div>'
    );
  });

  /* ─── Marcar ─── */
  $("#form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = faltando();
    if (f.length) {
      if (f[0][0] === "paciente") $("#c-nome").classList.add("campo--erro");
      const alvo = $(f[0][1]);
      if (alvo) { alvo.focus(); alvo.scrollIntoView({ block: "center", behavior: M.reduzido() ? "auto" : "smooth" }); }
      M.tremer($("#marcar"));
      return;
    }
    const nome = $("#f-nome").value.trim().replace(/\s+/g, " ");
    const ini = C.hm(est.hora);
    const dur = C.DURACAO[est.medico] || 30;
    const x = horarioEscolhido();
    const fora = ehDaFila(x) && est.furar;
    const lista = filaDe(est.medico);
    /* o horário liberado por cancelamento deixa de ser vaga */
    C.consultas.forEach((k) => {
      if (k.status === "vaga" && k.medico === est.medico && k.data === est.dia && k.ini < ini + dur && ini < k.ini + k.dur) k.status = "cancelada";
    });
    C.consultas.push({ id: "k" + Date.now(), medico: est.medico, data: est.dia, ini, dur, paciente: nome, status: "confirmada" });
    if (fora) {
      K.guardar.foraDaFila({
        medico: est.medico, dia: est.dia, hora: est.hora, paciente: nome, motivo: est.furar.motivo,
        por: K.conta.nome, em: D.hoje, as: C.txt(Math.floor(K.agora())), naFila: lista.length, primeiro: lista[0].nome,
      });
    }
    const md = K.medico(est.medico);
    mostrarFeito(
      A.folha(est.dia, { bloco: true, menta: true }) +
      '<h2 id="t-feito">Consulta marcada</h2>' +
      "<p><b>" + A.esc(nome) + "</b> com " + md.nome + " (" + D.especialidades[md.esp].nome + "), " + A.extenso(est.dia) + ", às " + est.hora + ". " +
      (fora ? "Registrado como marcação fora da fila: " + A.esc(est.furar.motivo).toLowerCase() + ". " : "") +
      "No protótipo a consulta não fica salva: ao recarregar, a agenda volta ao original.</p>" +
      '<div class="feito__acoes"><a class="botao botao--principal" href="clinica.html">Ver a agenda</a>' +
      '<button type="button" class="botao botao--secundario" id="outra">Marcar outra consulta</button></div>'
    );
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
      Object.assign(est, { esp: null, medico: null, dia: null, hora: null, mes: 0, furar: null, abrirFurar: false });
      desenharEsp();
      tudo();
      feito.hidden = true;
      $("#form").hidden = false;
      $("#f-nome").focus();
    });
  }

  /* ─── Primeira pintura, com o que veio na URL ─── */
  const q = new URLSearchParams(location.search);
  const nomes = Array.from(new Set(C.consultas.filter((k) => k.paciente).map((k) => k.paciente))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#conhecidos").innerHTML = nomes.map((n) => '<option value="' + A.esc(n) + '"></option>').join("");
  if (q.get("paciente")) $("#f-nome").value = q.get("paciente");
  const qm = q.get("medico");
  if (qm && C.MEDICOS.includes(qm)) {
    est.medico = qm;
    est.esp = K.medico(qm).esp;
    const qd = q.get("dia");
    if (qd && K.livres(qm, qd).length) {
      est.dia = qd;
      est.mes = Math.max(0, indiceDoMes(qd));
      const qh = q.get("hora");
      if (qh && K.livres(qm, qd).some((x) => C.txt(x.ini) === qh)) est.hora = qh;
    }
  } else if (q.get("esp") && espComAgenda.includes(q.get("esp"))) {
    est.esp = q.get("esp");
    const lista = C.MEDICOS.filter((m) => K.medico(m).esp === est.esp);
    if (lista.length === 1) est.medico = lista[0];
  }
  desenharEsp();
  tudo();
})();
