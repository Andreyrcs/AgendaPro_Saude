/* AgendaPro Saúde — Especialidades da clínica
   O que a clínica oferece, com quem, e onde falta horário: horários livres até sábado contra
   quantas pessoas esperam na fila. Os números vêm das consultas e das filas. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const I = A.icone;
  const $ = (s) => document.querySelector(s);

  /* de hoje até o sábado desta semana */
  const DIAS = [];
  for (let d = D.hoje; C.data(d).getDay() !== 0; d = C.somaDias(d, 1)) DIAS.push(d);

  function numeros(id) {
    const naAgenda = C.MEDICOS.filter((m) => K.medico(m).esp === id);
    const semHorario = D.medicos.filter((md) => md.esp === id && !C.MEDICOS.includes(md.id));
    /* a duração é da especialidade (Especialidades.DuracaoPadrao), igual para todos os médicos dela */
    const duracoes = [D.especialidades[id].duracao || 30];
    return {
      naAgenda,
      semHorario,
      duracoes,
      livres: naAgenda.reduce((t, m) => t + DIAS.reduce((s, d) => s + K.livres(m, d).length, 0), 0),
      fila: naAgenda.reduce((t, m) => t + (D.filas[m] || []).length, 0),
    };
  }

  /* um médico: o nome. Dois ou mais: a contagem, e a lista aparece no mouse ou no foco do teclado */
  function medicosHTML(n) {
    const todos = n.naAgenda.map((m) => ({ md: K.medico(m), agenda: true })).concat(n.semHorario.map((md) => ({ md, agenda: false })));
    if (!todos.length) return "";
    if (todos.length === 1) {
      const { md, agenda } = todos[0];
      return '<span class="quem">' + A.avatarMedico(md, 28) + '<span class="quem__texto">' + md.nome +
        (agenda ? "" : '<span class="tabela__sub">sem horário aqui</span>') + "</span></span>";
    }
    const nomes = todos.map((x) => x.md.nome + (x.agenda ? "" : " (sem horário aqui)")).join(", ");
    return '<span class="contagem"><button type="button" class="contagem__botao" aria-label="' + todos.length + " médicos: " + A.esc(nomes) + '">' +
      '<span class="contagem__avatares" aria-hidden="true">' + todos.slice(0, 3).map((x) => A.avatarMedico(x.md, 28)).join("") + "</span>" +
      todos.length + " médicos</button>" +
      '<ul class="contagem__lista" aria-hidden="true">' + todos.map(({ md, agenda }) =>
        "<li>" + A.avatarMedico(md, 28) + "<span><b>" + A.esc(md.nome) + "</b><small>" +
        (agenda ? "Com agenda nesta unidade" : "Sem horário nesta unidade") + (md.sala ? " · " + A.esc(md.sala) : "") + "</small></span></li>"
      ).join("") + "</ul></span>";
  }

  function desenhar() {
    const lista = Object.keys(D.especialidades).map((id) => ({ id, e: D.especialidades[id], n: numeros(id) }));
    lista.sort((a, b) => (b.n.naAgenda.length > 0) - (a.n.naAgenda.length > 0) || b.n.fila - a.n.fila);
    const com = lista.filter((x) => x.n.naAgenda.length);

    const aperto = com.slice().sort((a, b) => b.n.fila - a.n.fila || a.n.livres - b.n.livres)[0];
    $("#subtitulo").innerHTML = "<b>" + com.length + " de " + lista.length + "</b> especialidades com médico na agenda desta unidade." +
      (aperto && aperto.n.fila
        ? " Onde mais falta horário: " + aperto.e.nome + ", com " + aperto.n.fila + " pessoas na fila e " + aperto.n.livres + (aperto.n.livres === 1 ? " horário livre" : " horários livres") + " até sábado."
        : "");
    $("#meta").textContent = lista.length + " especialidades";

    $("#linhas").innerHTML = lista.map(({ id, e, n }) => {
      const medicos = medicosHTML(n);
      return '<tr data-id="' + id + '">' +
        '<td><span class="quem__nome">' + A.esc(e.nome) + '</span><span class="tabela__sub">' + A.esc(e.desc || "") + "</span></td>" +
        '<td data-rotulo="Médicos">' + (medicos || '<span class="tabela__traco">Nenhum médico</span>') + "</td>" +
        '<td class="num" data-rotulo="Consulta">' + (n.duracoes.length ? n.duracoes.join(" e ") + " min" : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td class="num" data-rotulo="Horários livres até sábado">' + (n.naAgenda.length ? n.livres : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td class="num" data-rotulo="Na fila">' + (n.naAgenda.length ? n.fila : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td class="tabela__acao">' + (n.naAgenda.length
          ? '<a class="link-acao" href="nova-consulta.html?esp=' + id + '">Marcar consulta</a>'
          : '<a class="link-acao link-acao--discreto" href="' + (n.semHorario.length ? "horarios.html#" + n.semHorario[0].id : "medicos.html") + '">' +
            (n.semHorario.length ? "Cadastrar horário" : "Cadastrar médico") + "</a>") + "</td></tr>";
    }).join("");
  }

  /* ─── Nova especialidade ─── */
  const dlg = $("#dlg-esp");
  const form = $("#form-esp");
  $("#nova").addEventListener("click", () => {
    form.reset();
    $("#c-nome").classList.remove("campo--erro");
    const e = $("#c-nome .campo__erro");
    if (e) e.remove();
    K.abrirDialogo(dlg);
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim().replace(/\s+/g, " ");
    const id = K.semAcento(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let erro = "";
    if (nome.length < 3) erro = "Escreva o nome da especialidade.";
    else if (Object.values(D.especialidades).some((x) => K.semAcento(x.nome) === K.semAcento(nome))) erro = "Essa especialidade já existe.";
    if (erro) {
      const c = $("#c-nome");
      c.classList.add("campo--erro");
      const velho = c.querySelector(".campo__erro");
      if (velho) velho.remove();
      c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="e-nome">' + erro + "</span>");
      form.nome.setAttribute("aria-describedby", "e-nome");
      form.nome.focus();
      M.tremer(form.nome);
      return;
    }
    D.especialidades[id] = { nome: nome.charAt(0).toUpperCase() + nome.slice(1), desc: form.desc.value.trim(), duracao: Number(form.dur.value) || 30 };
    K.guardar.especialidade(id, D.especialidades[id]);
    K.fecharDialogo(dlg);
    desenhar();
    const linha = document.querySelector('#linhas tr[data-id="' + id + '"]');
    if (linha) {
      linha.scrollIntoView({ block: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
      if (!M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease" });
    }
    K.toast({ titulo: D.especialidades[id].nome + " criada", texto: "Cadastre um médico para abrir a agenda.", icone: "heart-pulse" });
  });

  desenhar();
})();
