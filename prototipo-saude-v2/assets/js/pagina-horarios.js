/* AgendaPro Saúde v2 — Horários da clínica (protótipo, dados FICTÍCIOS)
   O expediente de cada médico desenhado num eixo das 7h às 19h, o almoço hachurado e a linha
   do agora na faixa de segunda a sexta. Editar muda só esta tela: no protótipo nada é salvo. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  const SEG = "2026-10-19";
  const SAB = "2026-10-24";
  const JANELA = C.FIM - C.INICIO;
  const HOJE_SEMANA = C.data(D.hoje).getDay() >= 1 && C.data(D.hoje).getDay() <= 5;

  /* estado local do expediente: [início, fim] em minutos, ou null */
  const exp = {};
  D.medicos.forEach((md) => {
    const naAgenda = C.MEDICOS.includes(md.id);
    exp[md.id] = {
      semana: naAgenda ? C.expediente(md.id, SEG) : null,
      sabado: naAgenda ? C.expediente(md.id, SAB) : null,
      dur: C.DURACAO[md.id] || 30,
    };
  });
  const temHorario = (id) => !!(exp[id] && (exp[id].semana || exp[id].sabado));

  function horariosNoDia(e, dur) {
    if (!e) return 0;
    let n = 0;
    for (let t = e[0]; t + dur <= e[1]; t += dur) if (!(t < 780 && t + dur > 720)) n += 1;
    return n;
  }

  function barra(e, agoraNaFaixa) {
    if (!e) return '<span class="expediente expediente--fechado"><span class="expediente__trilho" aria-hidden="true"></span><span class="expediente__texto">Não atende</span></span>';
    const pct = (m) => ((m - C.INICIO) / JANELA) * 100;
    const almoco = e[0] < 780 && e[1] > 720
      ? '<b style="left:' + pct(Math.max(720, e[0])) + "%;width:" + (pct(Math.min(780, e[1])) - pct(Math.max(720, e[0]))) + '%"></b>' : "";
    const agora = agoraNaFaixa ? '<em style="left:' + pct(K.agora()) + '%"></em>' : "";
    return '<span class="expediente"><span class="expediente__trilho" aria-hidden="true"><i style="left:' + pct(e[0]) + "%;width:" + (pct(e[1]) - pct(e[0])) + '%"></i>' + almoco + agora + "</span>" +
      '<span class="expediente__texto">' + C.txt(e[0]) + "–" + C.txt(e[1]) + "</span></span>";
  }

  function eixo() {
    return [7, 10, 13, 16, 19].map((h) => '<span style="left:' + (((h * 60 - C.INICIO) / JANELA) * 100) + '%">' + h + "h</span>").join("");
  }

  function quemHTML(md) {
    return '<span class="quem">' + A.avatarMedico(md, 36) + '<span class="quem__texto"><span class="quem__nome">' + md.nome + '</span><span class="tabela__sub">' + K.esp(md.esp).nome + "</span></span></span>";
  }

  function desenhar() {
    const com = D.medicos.filter((md) => temHorario(md.id));
    const sem = D.medicos.filter((md) => !temHorario(md.id));
    const sabado = com.filter((md) => exp[md.id].sabado);

    $("#subtitulo").innerHTML = "<b>" + com.length + (com.length === 1 ? " médico" : " médicos") + "</b> com expediente nesta unidade. " +
      (sabado.length
        ? "Aos sábados atendem " + sabado.length + ": " + sabado.map((md) => md.nome.split(" ").slice(0, 2).join(" ")).join(", ").replace(/, ([^,]*)$/, " e $1") + "."
        : "Ninguém atende aos sábados.");

    $("#linhas").innerHTML = com.map((md) => {
      const e = exp[md.id];
      const porSemana = horariosNoDia(e.semana, e.dur) * 5 + horariosNoDia(e.sabado, e.dur);
      return '<tr data-id="' + md.id + '">' +
        "<td>" + quemHTML(md) + "</td>" +
        '<td data-rotulo="Segunda a sexta">' + barra(e.semana, HOJE_SEMANA) + "</td>" +
        '<td data-rotulo="Sábado">' + barra(e.sabado, false) + "</td>" +
        '<td class="num" data-rotulo="Consulta">' + e.dur + " min</td>" +
        '<td class="num" data-rotulo="Horários por semana">' + porSemana + "</td>" +
        '<td class="tabela__acao"><button type="button" class="link-acao" data-editar="' + md.id + '" aria-label="Editar expediente de ' + md.nome + '">Editar</button></td></tr>';
    }).join("");

    $("#linhas-sem").innerHTML = sem.length
      ? sem.map((md) =>
          '<tr data-id="' + md.id + '"><td>' + quemHTML(md) + '</td><td data-rotulo="Especialidade">' + K.esp(md.esp).nome + "</td>" +
          '<td class="tabela__acao"><button type="button" class="link-acao" data-editar="' + md.id + '">' + I("plus", "ic-sm") + "Cadastrar horário</button></td></tr>"
        ).join("")
      : '<tr><td colspan="3" class="tabela__traco">Todos os médicos do cadastro já têm horário.</td></tr>';
  }

  function desenharFechados() {
    const futuros = (D.feriados || []).filter((f) => f.data >= D.hoje);
    let domingo = D.hoje;
    while (C.data(domingo).getDay() !== 0) domingo = C.somaDias(domingo, 1);
    $("#fechados").innerHTML =
      "<li>" + A.folha(domingo, { pequena: true }) + "<span><b>Todos os domingos</b><span>O próximo é " + A.extenso(domingo, false) + "</span></span></li>" +
      futuros.map((f) => "<li>" + A.folha(f.data, { pequena: true }) + "<span><b>" + f.nome + "</b><span>" + K.cap(A.extenso(f.data)) + "</span></span></li>").join("");
  }

  /* ─── Editar ─── */
  const dlg = $("#dlg-exp");
  const form = $("#form-exp");
  let editando = null;
  const opcoes = () => {
    let h = "";
    for (let t = C.INICIO; t <= C.FIM; t += 10) if (t % 30 === 0 || t % 40 === 0) h += '<option value="' + t + '">' + C.txt(t) + "</option>";
    return h;
  };
  ["#f-s-ini", "#f-s-fim", "#f-b-ini", "#f-b-fim"].forEach((s) => { $(s).innerHTML = opcoes(); });

  function alternar() {
    ["sIni", "sFim"].forEach((n) => { form[n].disabled = !form.semana.checked; });
    ["bIni", "bFim"].forEach((n) => { form[n].disabled = !form.sabado.checked; });
  }
  form.semana.addEventListener("change", alternar);
  form.sabado.addEventListener("change", alternar);

  function abrir(id) {
    const md = K.medico(id);
    if (!md) return;
    editando = id;
    const e = exp[id];
    $("#t-dlg").textContent = temHorario(id) ? "Editar expediente" : "Cadastrar horário";
    $("#dlg-quem").textContent = md.nome + " · " + K.esp(md.esp).nome;
    form.semana.checked = !!e.semana || !temHorario(id);
    form.sabado.checked = !!e.sabado;
    form.sIni.value = String((e.semana || [480])[0]);
    form.sFim.value = String((e.semana || [480, 1020])[1]);
    form.bIni.value = String((e.sabado || [480])[0]);
    form.bFim.value = String((e.sabado || [480, 720])[1]);
    form.dur.value = String(e.dur);
    $("#e-exp").hidden = true;
    alternar();
    K.abrirDialogo(dlg);
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const s = form.semana.checked ? [Number(form.sIni.value), Number(form.sFim.value)] : null;
    const b = form.sabado.checked ? [Number(form.bIni.value), Number(form.bFim.value)] : null;
    const dur = Number(form.dur.value);
    let erro = "";
    if (!s && !b) erro = "Marque pelo menos um período de atendimento.";
    else if ((s && s[1] - s[0] < 60) || (b && b[1] - b[0] < 60)) erro = "O fim precisa ser pelo menos 1 hora depois do começo.";
    if (erro) {
      const e = $("#e-exp");
      e.textContent = erro;
      e.hidden = false;
      M.tremer(e);
      return;
    }
    const md = K.medico(editando);
    const antes = Object.assign({}, exp[editando]);
    exp[editando] = { semana: s, sabado: b, dur };
    K.fecharDialogo(dlg);
    desenhar();
    const linha = document.querySelector('#linhas tr[data-id="' + editando + '"]');
    if (linha && !M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 900, easing: "ease" });
    const id = editando;
    K.toast({
      titulo: "Expediente de " + md.nome + " salvo",
      texto: "No protótipo, a agenda não muda e nada fica salvo.",
      icone: "clock",
      acao: { rotulo: "Desfazer", fazer: () => { exp[id] = antes; desenhar(); } },
    });
  });

  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-editar]");
    if (b) abrir(b.dataset.editar);
  });

  $("#eixo-1").innerHTML = eixo();
  $("#eixo-2").innerHTML = eixo();
  desenhar();
  desenharFechados();
  /* vindo de Médicos ("Cadastrar horário"): abre direto o médico pedido */
  const pedido = location.hash.slice(1);
  if (pedido && K.medico(pedido)) setTimeout(() => abrir(pedido), 120);
  /* a linha do agora anda */
  setInterval(() => { if (!dlg.open) desenhar(); }, 60000);
})();
