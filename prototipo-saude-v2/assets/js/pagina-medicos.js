/* AgendaPro Saúde v2 — Médicos da clínica (protótipo, dados FICTÍCIOS)
   Quem atende nesta unidade e como está a agenda de cada um: expediente de hoje, consultas,
   ocupação da semana, fila e o próximo horário livre. Todos os números vêm das consultas. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  const ocupa = (k) => ["atendida", "em", "chegou", "confirmada", "faltou", "oferecida"].includes(k.status);
  const segunda = (dia) => { const d = C.data(dia); return C.somaDias(dia, 1 - (d.getDay() || 7)); };
  const SEG = segunda(D.hoje);
  const SEMANA = [0, 1, 2, 3, 4, 5].map((i) => C.somaDias(SEG, i));
  const CORES = ["#e2ecf0", "#fbe0ea", "#e6f1d4", "#efe2f5", "#d6efe6", "#f9e9b9"];

  /* minutos de atendimento possíveis no dia, sem o almoço */
  function capacidade(m, dia) {
    const e = C.expediente(m, dia);
    if (!e) return 0;
    return e[1] - e[0] - Math.max(0, Math.min(e[1], 780) - Math.max(e[0], 720));
  }

  function numeros(m) {
    const hoje = C.consultas.filter((k) => k.medico === m && k.data === D.hoje && k.status !== "cancelada");
    const consultas = hoje.filter((k) => !["vaga", "oferecida"].includes(k.status));
    const cap = SEMANA.reduce((t, d) => t + capacidade(m, d), 0);
    const ocup = C.consultas.filter((k) => k.medico === m && SEMANA.includes(k.data) && ocupa(k)).reduce((t, k) => t + k.dur, 0);
    let livre = null;
    for (let d = D.hoje; d <= K.ULTIMO_DIA && !livre; d = C.somaDias(d, 1)) {
      const l = K.livres(m, d);
      if (l.length) livre = { dia: d, ini: l[0].ini };
    }
    return {
      consultas: consultas.length,
      atendidas: consultas.filter((k) => k.status === "atendida").length,
      ocupacao: cap ? Math.min(1, ocup / cap) : 0,
      fila: (D.filas[m] || []).length,
      expediente: C.expediente(m, D.hoje),
      livre,
    };
  }

  function quemHTML(md) {
    return '<span class="quem">' + A.avatarMedico(md, 36) + '<span class="quem__texto"><span class="quem__nome">' + md.nome + '</span><span class="tabela__sub">' + K.esp(md.esp).nome + "</span></span></span>";
  }

  function desenhar() {
    const dados = C.MEDICOS.map((m) => ({ m, md: K.medico(m), n: numeros(m) }));

    const cheio = dados.slice().sort((a, b) => b.n.ocupacao - a.n.ocupacao)[0];
    $("#subtitulo").innerHTML = "<b>" + dados.length + " médicos</b> com agenda na " + D.clinica.nome + ", " + D.clinica.unidade + ". " +
      "Agenda mais cheia da semana: " + cheio.md.nome + ", " + Math.round(cheio.n.ocupacao * 100) + "% ocupada" +
      (cheio.n.fila ? " e " + cheio.n.fila + " pessoas na fila." : ".");
    $("#meta-semana").textContent = "Semana de " + C.data(SEG).getDate() + " a " + C.data(SEMANA[5]).getDate() + " de " + A.MESES_LONGOS[C.data(SEMANA[5]).getMonth()];

    $("#linhas").innerHTML = dados.map(({ m, md, n }) => {
      const pct = Math.round(n.ocupacao * 100);
      return "<tr>" +
        "<td>" + quemHTML(md) + "</td>" +
        '<td data-rotulo="Expediente hoje">' + (n.expediente
          ? '<span class="num">' + C.txt(n.expediente[0]) + "–" + C.txt(n.expediente[1]) + "</span>"
          : '<span class="tabela__traco">Não atende hoje</span>') + "</td>" +
        '<td class="num" data-rotulo="Consultas hoje">' + n.consultas + '<span class="tabela__sub">' + n.atendidas + " atendidas</span></td>" +
        '<td class="num" data-rotulo="Ocupação da semana"><span class="medidor' + (pct >= 85 ? " medidor--alto" : "") + '"><span class="medidor__trilho" aria-hidden="true"><i style="--v:' + n.ocupacao.toFixed(2) + '"></i></span>' + pct + "%</span></td>" +
        '<td class="num" data-rotulo="Na fila">' + (n.fila ? '<a class="link-acao" href="lista-espera.html#' + m + '" aria-label="' + n.fila + " na fila de " + md.nome + '">' + n.fila + "</a>" : '<span class="tabela__traco">0</span>') + "</td>" +
        '<td data-rotulo="Próximo horário livre">' + (n.livre
          ? '<a class="link-acao" href="nova-consulta.html?medico=' + m + "&dia=" + n.livre.dia + "&hora=" + C.txt(n.livre.ini) + '">' + K.curtoData(n.livre.dia) + " · " + C.txt(n.livre.ini) + "</a>"
          : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td data-rotulo="Sala e contato">' + contatoHTML(md) + "</td>" +
        '<td class="tabela__acao">' + botaoEditar(md) + "</td>" +
        "</tr>";
    }).join("");

    const sem = D.medicos.filter((md) => !C.MEDICOS.includes(md.id));
    $("#meta-sem").textContent = sem.length + (sem.length === 1 ? " médico" : " médicos");
    $("#linhas-sem").innerHTML = sem.length
      ? sem.map((md) =>
          '<tr data-id="' + md.id + '"><td>' + quemHTML(md) + '</td><td data-rotulo="Especialidade">' + K.esp(md.esp).nome + "</td>" +
          '<td data-rotulo="Sala e contato">' + contatoHTML(md) + "</td>" +
          '<td class="tabela__acao"><a class="link-acao" href="horarios.html#' + md.id + '">' + I("clock", "ic-sm") + "Cadastrar horário</a> " + botaoEditar(md) + "</td></tr>"
        ).join("")
      : '<tr><td colspan="4" class="tabela__traco">Todos os médicos do cadastro já têm horário.</td></tr>';
  }

  function contatoHTML(md) {
    return (md.sala ? '<span class="contato__sala">' + A.esc(md.sala) + "</span>" : '<span class="tabela__traco">Sala não informada</span>') +
      '<span class="tabela__sub contato__tel">' + (md.tel ? A.esc(md.tel) : "Sem telefone") + "</span>";
  }
  function botaoEditar(md) {
    return '<button type="button" class="link-acao" data-editar="' + md.id + '" aria-label="Editar dados de ' + A.esc(md.nome) + '">Editar</button>';
  }

  /* ─── Cadastrar e editar (o mesmo diálogo) ─── */
  const dlg = $("#dlg-medico");
  const form = $("#form-medico");
  let editando = null;
  $("#f-esp").innerHTML = Object.keys(D.especialidades).map((id) => '<option value="' + id + '">' + D.especialidades[id].nome + "</option>").join("");

  function limparErros() {
    form.querySelectorAll(".campo--erro").forEach((c) => c.classList.remove("campo--erro"));
    form.querySelectorAll(".campo__erro").forEach((e) => e.remove());
    form.querySelectorAll("[aria-describedby]").forEach((i) => i.removeAttribute("aria-describedby"));
  }
  function erro(campo, entrada, texto) {
    const c = $(campo);
    c.classList.add("campo--erro");
    c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="' + entrada.id + '-erro">' + texto + "</span>");
    entrada.setAttribute("aria-describedby", entrada.id + "-erro");
    entrada.focus();
    M.tremer(entrada);
  }

  function abrir(md) {
    editando = md || null;
    form.reset();
    limparErros();
    $("#t-dlg").textContent = md ? "Editar médico" : "Cadastrar médico";
    $("#dlg-texto").textContent = md
      ? "Mude o que for preciso. O expediente se edita em Horários."
      : "Depois do cadastro, defina o expediente em Horários para abrir a agenda.";
    $("#dlg-ok").textContent = md ? "Salvar alterações" : "Cadastrar";
    if (md) {
      form.nome.value = md.nome;
      form.esp.value = md.esp;
      form.tel.value = md.tel || "";
      form.sala.value = md.sala || "";
    }
    K.abrirDialogo(dlg);
  }

  $("#cadastrar").addEventListener("click", () => abrir(null));
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-editar]");
    if (b) abrir(K.medico(b.dataset.editar));
  });

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    limparErros();
    let nome = form.nome.value.trim().replace(/\s+/g, " ");
    const semTitulo = nome.replace(/^(Dra?\.?|Dr\(a\)\.)\s+/i, "");
    if (semTitulo.split(" ").length < 2) { erro("#c-nome", form.nome, "Escreva o nome e o sobrenome."); return; }
    const digitos = form.tel.value.replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 11)) { erro("#c-tel", form.tel, "Use o DDD e o número, com 10 ou 11 dígitos."); return; }
    if (!/^(Dra?\.|Dr\(a\)\.)/.test(nome)) nome = "Dr(a). " + semTitulo;
    const tel = digitos ? "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, -4) + "-" + digitos.slice(-4) : "";
    const campos = { nome, esp: form.esp.value, tel, sala: form.sala.value.trim() };

    if (editando) {
      const md = editando;
      const antes = { nome: md.nome, esp: md.esp, tel: md.tel || "", sala: md.sala || "" };
      Object.assign(md, campos);
      K.guardar.edicaoMedico(md.id, campos);
      K.fecharDialogo(dlg);
      desenhar();
      const linha = document.querySelector('[data-editar="' + md.id + '"]');
      if (linha && !M.reduzido()) linha.closest("tr").animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 900, easing: "ease" });
      K.toast({
        titulo: "Dados de " + md.nome + " atualizados",
        texto: "Ficam guardados neste navegador.",
        icone: "stethoscope",
        acao: { rotulo: "Desfazer", fazer: () => { Object.assign(md, antes); K.guardar.edicaoMedico(md.id, antes); desenhar(); } },
      });
      return;
    }

    const id = "novo" + Date.now().toString(36);
    const md = Object.assign({ id, cor: CORES[D.medicos.length % CORES.length] }, campos);
    D.medicos.push(md);
    K.guardar.medicoNovo(md);
    K.fecharDialogo(dlg);
    desenhar();
    const linha = document.querySelector('#linhas-sem tr[data-id="' + id + '"]');
    if (linha) {
      linha.scrollIntoView({ block: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
      if (!M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease" });
    }
    K.toast({ titulo: nome + " cadastrado", texto: "Agora defina o expediente em Horários. Fica guardado neste navegador.", icone: "stethoscope" });
  });

  desenhar();
})();
