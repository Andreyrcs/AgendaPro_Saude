/* AgendaPro Saúde — Horários da clínica, pela API.
   O expediente de cada médico desenhado num eixo das 7h às 19h, o almoço hachurado e a linha do agora na faixa de
   segunda a sexta. Salvar: PUT /api/medicos/{id}/expediente { semana, sabado, almoco } com as horas em HH:MM (F4):
   é o que abre (ou muda) a agenda do médico.
   Os dias fechados vêm de GET /api/feriados (L3, só leitura: a tabela é global, os feriados nacionais vêm do script). */
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
  const JANELA = CL.FIM - CL.INICIO;
  const HOJE_SEMANA = CL.data(CL.hoje).getDay() >= 1 && CL.data(CL.hoje).getDay() <= 5;

  /* expediente de um médico em minutos: { semana: [início, fim] | null, sabado, dur, almoco: [início, fim] | null } */
  function expDe(md) {
    const e = md.expediente || {};
    const min = (p) => (p ? [CL.hm(p.inicio), CL.hm(p.fim)] : null);
    return { semana: min(e.semana), sabado: min(e.sabado), dur: CL.DURACAO[md.id] || 30, almoco: min(e.almoco) };
  }
  const temHorario = (md) => !!md.expediente;
  const periodo = (x) => (x ? { inicio: CL.txt(x[0]), fim: CL.txt(x[1]) } : null);

  function horariosNoDia(e, dur, almoco) {
    if (!e) return 0;
    let n = 0;
    for (let t = e[0]; t + dur <= e[1]; t += dur) if (!(almoco && t < almoco[1] && t + dur > almoco[0])) n += 1;
    return n;
  }

  function barra(e, agoraNaFaixa, al) {
    if (!e) return '<span class="expediente expediente--fechado"><span class="expediente__trilho" aria-hidden="true"></span><span class="expediente__texto">Não atende</span></span>';
    const pct = (m) => ((m - CL.INICIO) / JANELA) * 100;
    const almoco = al && e[0] < al[1] && e[1] > al[0]
      ? '<b style="left:' + pct(Math.max(al[0], e[0])) + "%;width:" + (pct(Math.min(al[1], e[1])) - pct(Math.max(al[0], e[0]))) + '%"></b>' : "";
    const agora = agoraNaFaixa ? '<em style="left:' + pct(K.agora()) + '%"></em>' : "";
    return '<span class="expediente"><span class="expediente__trilho" aria-hidden="true"><i style="left:' + pct(e[0]) + "%;width:" + (pct(e[1]) - pct(e[0])) + '%"></i>' + almoco + agora + "</span>" +
      '<span class="expediente__texto">' + CL.txt(e[0]) + "–" + CL.txt(e[1]) + "</span></span>";
  }

  function eixo() {
    return [7, 10, 13, 16, 19].map((h) => '<span style="left:' + (((h * 60 - CL.INICIO) / JANELA) * 100) + '%">' + h + "h</span>").join("");
  }

  function quemHTML(md) {
    return '<span class="quem">' + A.avatarMedico(md, 36) + '<span class="quem__texto"><span class="quem__nome">' + A.esc(md.nome) +
      '</span><span class="tabela__sub">' + A.esc(K.esp(md.esp).nome) + "</span></span></span>";
  }

  function desenhar() {
    const com = CL.medicos.filter(temHorario);
    const sem = CL.medicos.filter((md) => !temHorario(md));
    const sabado = com.filter((md) => expDe(md).sabado);

    $("#subtitulo").innerHTML = CL.medicos.length
      ? "<b>" + com.length + (com.length === 1 ? " médico" : " médicos") + "</b> com expediente nesta clínica. " +
        (sabado.length
          ? "Aos sábados atendem " + sabado.length + ": " + sabado.map((md) => A.esc(md.nome.split(" ").slice(0, 2).join(" "))).join(", ").replace(/, ([^,]*)$/, " e $1") + "."
          : "Ninguém atende aos sábados.")
      : "Nenhum médico cadastrado ainda. Cadastre em Médicos e volte aqui para definir o expediente.";

    /* o almoço de cada médico vem do expediente dele; a frase só aparece quando é igual para todos */
    const almocos = Array.from(new Set(com.map((md) => { const a = expDe(md).almoco; return a ? CL.txt(a[0]) + " às " + CL.txt(a[1]) : "sem almoço"; })));
    $("#meta-almoco").textContent = com.length && almocos.length === 1 && almocos[0] !== "sem almoço" ? "Almoço das " + almocos[0] + " para todos" : "";

    $("#linhas").innerHTML = com.length ? com.map((md) => {
      const e = expDe(md);
      const porSemana = horariosNoDia(e.semana, e.dur, e.almoco) * 5 + horariosNoDia(e.sabado, e.dur, e.almoco);
      return '<tr data-id="' + A.esc(md.id) + '">' +
        "<td>" + quemHTML(md) + "</td>" +
        '<td data-rotulo="Segunda a sexta">' + barra(e.semana, HOJE_SEMANA, e.almoco) + "</td>" +
        '<td data-rotulo="Sábado">' + barra(e.sabado, false, e.almoco) + "</td>" +
        '<td class="num" data-rotulo="Consulta">' + e.dur + " min</td>" +
        '<td class="num" data-rotulo="Horários por semana">' + porSemana + "</td>" +
        '<td class="tabela__acao"><button type="button" class="link-acao" data-editar="' + A.esc(md.id) + '" aria-label="Editar expediente de ' + A.esc(md.nome) + '">Editar</button></td></tr>';
    }).join("")
      : '<tr><td colspan="6"><p class="vazio">Nenhum médico com expediente ainda.</p></td></tr>';

    $("#linhas-sem").innerHTML = sem.length
      ? sem.map((md) =>
          '<tr data-id="' + A.esc(md.id) + '"><td>' + quemHTML(md) + '</td><td data-rotulo="Especialidade">' + A.esc(K.esp(md.esp).nome) + "</td>" +
          '<td class="tabela__acao"><button type="button" class="link-acao" data-editar="' + A.esc(md.id) + '" aria-label="Cadastrar horário de ' + A.esc(md.nome) + '">' + I("plus", "ic-sm") + "Cadastrar horário</button></td></tr>"
        ).join("")
      : '<tr><td colspan="3" class="tabela__traco">' + (CL.medicos.length ? "Todos os médicos do cadastro já têm horário." : "Ninguém no cadastro ainda.") + "</td></tr>";
  }

  /* Domingos e feriados (GET /api/feriados): a clínica não atende e a API não marca consulta */
  function desenharFechados() {
    const futuros = CL.feriados.filter((f) => f.data >= CL.hoje).sort((a, b) => (a.data < b.data ? -1 : 1));
    let domingo = CL.hoje;
    while (CL.data(domingo).getDay() !== 0) domingo = CL.somaDias(domingo, 1);
    $("#fechados").innerHTML =
      "<li>" + A.folha(domingo, { pequena: true }) + "<span><b>Todos os domingos</b><span>O próximo é " + A.extenso(domingo, false) + "</span></span></li>" +
      futuros.map((f) => "<li>" + A.folha(f.data, { pequena: true }) + "<span><b>" + A.esc(f.nome) + "</b><span>" + K.cap(A.extenso(f.data)) + "</span></span></li>").join("");
  }

  /* ─── Editar ─── */
  const dlg = $("#dlg-exp");
  const form = $("#form-exp");
  const ok = form.querySelector('button[type="submit"]');
  let editando = null;
  const opcoes = () => {
    let h = "";
    for (let t = CL.INICIO; t <= CL.FIM; t += 10) if (t % 30 === 0 || t % 40 === 0) h += '<option value="' + t + '">' + CL.txt(t) + "</option>";
    return h;
  };
  ["#f-s-ini", "#f-s-fim", "#f-b-ini", "#f-b-fim", "#f-a-ini", "#f-a-fim"].forEach((s) => { $(s).innerHTML = opcoes(); });

  function alternar() {
    ["sIni", "sFim"].forEach((n) => { form[n].disabled = !form.semana.checked; });
    ["bIni", "bFim"].forEach((n) => { form[n].disabled = !form.sabado.checked; });
    ["aIni", "aFim"].forEach((n) => { form[n].disabled = !form.almoco.checked; });
  }
  form.semana.addEventListener("change", alternar);
  form.sabado.addEventListener("change", alternar);
  form.almoco.addEventListener("change", alternar);

  function mostrarErro(texto) {
    const e = $("#e-exp");
    e.textContent = texto;
    e.hidden = false;
    M.tremer(e);
  }

  function abrir(id) {
    const md = K.medico(id);
    if (!md) return;
    editando = md.id;
    const e = expDe(md);
    $("#t-dlg").textContent = temHorario(md) ? "Editar expediente" : "Cadastrar horário";
    $("#dlg-quem").textContent = md.nome + " · " + K.esp(md.esp).nome;
    form.semana.checked = !!e.semana || !temHorario(md);
    form.sabado.checked = !!e.sabado;
    form.sIni.value = String((e.semana || [480])[0]);
    form.sFim.value = String((e.semana || [480, 1020])[1]);
    form.bIni.value = String((e.sabado || [480])[0]);
    form.bFim.value = String((e.sabado || [480, 720])[1]);
    form.almoco.checked = temHorario(md) ? !!e.almoco : true;
    form.aIni.value = String((e.almoco || [720])[0]);
    form.aFim.value = String((e.almoco || [720, 780])[1]);
    $("#dlg-dur").textContent = "Cada consulta dura " + e.dur + " minutos: é a duração da especialidade (" + K.esp(md.esp).nome + ").";
    $("#e-exp").hidden = true;
    alternar();
    K.abrirDialogo(dlg);
  }

  async function salvar(id, corpo) {
    await API.chamar("PUT", "/api/medicos/" + id + "/expediente", corpo);
    await CL.recarregar(["medicos"]);
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    const s = form.semana.checked ? [Number(form.sIni.value), Number(form.sFim.value)] : null;
    const b = form.sabado.checked ? [Number(form.bIni.value), Number(form.bFim.value)] : null;
    const al = form.almoco.checked ? [Number(form.aIni.value), Number(form.aFim.value)] : null;
    let erro = "";
    if (!s && !b) erro = "Marque pelo menos um período de atendimento.";
    else if ((s && s[1] - s[0] < 60) || (b && b[1] - b[0] < 60)) erro = "O fim precisa ser pelo menos 1 hora depois do começo.";
    else if (al && al[1] <= al[0]) erro = "O fim do almoço precisa ser depois do começo.";
    else if (al && s && (al[0] < s[0] || al[1] > s[1])) erro = "O almoço precisa ficar dentro do expediente.";
    if (erro) { mostrarErro(erro); return; }

    const md = K.medico(editando);
    const antes = md.expediente
      ? { semana: md.expediente.semana || null, sabado: md.expediente.sabado || null, almoco: md.expediente.almoco || null }
      : { semana: null, sabado: null, almoco: null };
    const corpo = { semana: periodo(s), sabado: periodo(b), almoco: periodo(al) };
    ok.disabled = true;
    try {
      await salvar(md.id, corpo);
      K.fecharDialogo(dlg);
      desenhar();
      const linha = document.querySelector('#linhas tr[data-id="' + CSS.escape(md.id) + '"]');
      if (linha && !M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 900, easing: "ease" });
      K.toast({
        titulo: "Expediente de " + md.nome + " salvo",
        texto: "A agenda passa a usar este horário.",
        icone: "clock",
        acao: {
          rotulo: "Desfazer",
          fazer: async () => {
            try { await salvar(md.id, antes); desenhar(); K.anunciar("Expediente anterior de volta."); }
            catch (e) { if (e.status !== 401) K.toast({ titulo: "Não deu para desfazer", texto: e.message, icone: "info" }); }
          },
        },
      });
    } catch (e) {
      if (e.status !== 401) mostrarErro(e.message);
    } finally {
      ok.disabled = false;
    }
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
  const pedido = decodeURIComponent(location.hash.slice(1));
  if (pedido && K.medico(pedido)) setTimeout(() => abrir(pedido), 120);
  /* a linha do agora anda */
  setInterval(() => { if (!dlg.open) desenhar(); }, 60000);
  }
})();
