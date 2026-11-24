/* AgendaPro Saúde — Especialidades da clínica, pela API.
   O que a clínica oferece, com quem, e onde falta horário: horários livres até sábado contra quantas pessoas esperam
   na fila. Criar: POST /api/clinicas/{id}/especialidades { nome, duracao }; editar: PUT /api/especialidades/{id} (L5).
   O banco não tem descrição (F16): a tela pede só o nome e a duração. */
(function () {
  "use strict";

  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const API = window.API;
  const CL = window.CLINICA;
  const $ = (s) => document.querySelector(s);

  CL.iniciar(iniciar);
  function iniciar() {
  /* de hoje até o sábado desta semana */
  const DIAS = [];
  for (let d = CL.hoje; CL.data(d).getDay() !== 0; d = CL.somaDias(d, 1)) DIAS.push(d);

  const naFila = (m) => { const f = CL.filaDoMedico(m); return f ? (f.pessoas || []).length : 0; };

  function numeros(id) {
    const naAgenda = CL.MEDICOS.filter((m) => A.mesmoId(K.medico(m).esp, id));
    const semHorario = CL.medicos.filter((md) => A.mesmoId(md.esp, id) && !md.expediente);
    return {
      naAgenda,
      semHorario,
      /* a duração é da especialidade (Especialidades.DuracaoPadrao), igual para todos os médicos dela */
      duracao: CL.especialidades[id].duracao || 30,
      livres: naAgenda.reduce((t, m) => t + DIAS.reduce((s, d) => s + K.livres(m, d).length, 0), 0),
      fila: naAgenda.reduce((t, m) => t + naFila(m), 0),
    };
  }

  /* um médico: o nome. Dois ou mais: a contagem, e a lista aparece no mouse ou no foco do teclado */
  function medicosHTML(n) {
    const todos = n.naAgenda.map((m) => ({ md: K.medico(m), agenda: true })).concat(n.semHorario.map((md) => ({ md, agenda: false })));
    if (!todos.length) return "";
    if (todos.length === 1) {
      const { md, agenda } = todos[0];
      return '<span class="quem">' + A.avatarMedico(md, 28) + '<span class="quem__texto">' + A.esc(md.nome) +
        (agenda ? "" : '<span class="tabela__sub">sem horário aqui</span>') + "</span></span>";
    }
    const nomes = todos.map((x) => x.md.nome + (x.agenda ? "" : " (sem horário aqui)")).join(", ");
    return '<span class="contagem"><button type="button" class="contagem__botao" aria-label="' + todos.length + " médicos: " + A.esc(nomes) + '">' +
      '<span class="contagem__avatares" aria-hidden="true">' + todos.slice(0, 3).map((x) => A.avatarMedico(x.md, 28)).join("") + "</span>" +
      todos.length + " médicos</button>" +
      '<ul class="contagem__lista" aria-hidden="true">' + todos.map(({ md, agenda }) =>
        "<li>" + A.avatarMedico(md, 28) + "<span><b>" + A.esc(md.nome) + "</b><small>" +
        (agenda ? "Com agenda nesta clínica" : "Sem horário nesta clínica") + (md.sala ? " · " + A.esc(md.sala) : "") + "</small></span></li>"
      ).join("") + "</ul></span>";
  }

  function desenhar() {
    const lista = Object.keys(CL.especialidades).map((id) => ({ id, e: CL.especialidades[id], n: numeros(id) }));
    lista.sort((a, b) => (b.n.naAgenda.length > 0) - (a.n.naAgenda.length > 0) || b.n.fila - a.n.fila || a.e.nome.localeCompare(b.e.nome, "pt-BR"));
    const com = lista.filter((x) => x.n.naAgenda.length);

    const aperto = com.slice().sort((a, b) => b.n.fila - a.n.fila || a.n.livres - b.n.livres)[0];
    $("#subtitulo").innerHTML = lista.length
      ? "<b>" + com.length + " de " + lista.length + "</b> especialidades com médico na agenda desta clínica." +
        (aperto && aperto.n.fila
          ? " Onde mais falta horário: " + A.esc(aperto.e.nome) + ", com " + aperto.n.fila + (aperto.n.fila === 1 ? " pessoa" : " pessoas") + " na fila e " +
            aperto.n.livres + (aperto.n.livres === 1 ? " horário livre" : " horários livres") + " até sábado."
          : "")
      : "Nenhuma especialidade cadastrada ainda. Crie a primeira para cadastrar os médicos.";
    $("#meta").textContent = lista.length + (lista.length === 1 ? " especialidade" : " especialidades");

    $("#linhas").innerHTML = lista.length ? lista.map(({ id, e, n }) => {
      const medicos = medicosHTML(n);
      return '<tr data-id="' + A.esc(id) + '">' +
        '<td><span class="quem__nome">' + A.esc(e.nome) + "</span></td>" +
        '<td data-rotulo="Médicos">' + (medicos || '<span class="tabela__traco">Nenhum médico</span>') + "</td>" +
        '<td class="num" data-rotulo="Consulta">' + n.duracao + " min</td>" +
        '<td class="num" data-rotulo="Horários livres até sábado">' + (n.naAgenda.length ? n.livres : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td class="num" data-rotulo="Na fila">' + (n.naAgenda.length ? n.fila : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td class="tabela__acao">' + (n.naAgenda.length
          ? '<a class="link-acao" href="nova-consulta.html?esp=' + encodeURIComponent(id) + '">Marcar consulta</a>'
          : '<a class="link-acao link-acao--discreto" href="' + (n.semHorario.length ? "horarios.html#" + encodeURIComponent(n.semHorario[0].id) : "medicos.html") + '">' +
            (n.semHorario.length ? "Cadastrar horário" : "Cadastrar médico") + "</a>") +
          ' <button type="button" class="link-acao" data-editar="' + A.esc(id) + '" aria-label="Editar ' + A.esc(e.nome) + '">Editar</button></td></tr>';
    }).join("")
      : '<tr><td colspan="6"><p class="vazio">Nenhuma especialidade ainda. Use "Nova especialidade" para criar a primeira.</p></td></tr>';
  }

  /* ─── Nova especialidade e edição (o mesmo diálogo) ───
     O nome não se repete na mesma clínica, mas pode existir em outra (UQ_Especialidades_Clinica_Nome). */
  const dlg = $("#dlg-esp");
  const form = $("#form-esp");
  const ok = $("#dlg-ok");
  let editando = null;

  function tirarErro() {
    $("#c-nome").classList.remove("campo--erro");
    const e = $("#c-nome .campo__erro");
    if (e) e.remove();
    form.nome.removeAttribute("aria-describedby");
  }
  function mostrarErro(texto) {
    const c = $("#c-nome");
    tirarErro();
    c.classList.add("campo--erro");
    c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="e-nome">' + A.esc(texto) + "</span>");
    form.nome.setAttribute("aria-describedby", "e-nome");
    form.nome.focus();
    M.tremer(form.nome);
  }
  /* a duração gravada pode não estar entre as opções (por exemplo 15 min): entra como opção */
  function escolherDuracao(min) {
    const v = String(min || 30);
    if (!Array.from(form.dur.options).some((o) => o.value === v)) form.dur.insertAdjacentHTML("beforeend", '<option value="' + A.esc(v) + '">' + A.esc(v) + " minutos</option>");
    form.dur.value = v;
  }

  function abrir(id) {
    editando = id || null;
    form.reset();
    tirarErro();
    $("#t-dlg").textContent = id ? "Editar especialidade" : "Nova especialidade";
    ok.textContent = id ? "Salvar alterações" : "Criar especialidade";
    if (id) {
      const esp = CL.especialidades[id];
      form.nome.value = esp.nome;
      escolherDuracao(esp.duracao);
    }
    K.abrirDialogo(dlg);
  }
  $("#nova").addEventListener("click", () => abrir(null));
  $("#linhas").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-editar]");
    if (b) abrir(b.dataset.editar);
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    let nome = form.nome.value.trim().replace(/\s+/g, " ");
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    if (nome.length < 3) { mostrarErro("Escreva o nome da especialidade."); return; }
    if (Object.keys(CL.especialidades).some((k) => k !== editando && K.semAcento(CL.especialidades[k].nome) === K.semAcento(nome))) {
      mostrarErro("Essa especialidade já existe nesta clínica.");
      return;
    }
    const corpo = { nome, duracao: Number(form.dur.value) || 30 };
    ok.disabled = true;
    try {
      const r = editando
        ? await API.chamar("PUT", "/api/especialidades/" + editando, corpo)
        : await API.chamar("POST", "/api/clinicas/" + CL.clinica.id + "/especialidades", corpo);
      await CL.recarregar(["especialidades"]);
      const id = String(r.id);
      K.fecharDialogo(dlg);
      desenhar();
      const linha = document.querySelector('#linhas tr[data-id="' + CSS.escape(id) + '"]');
      if (linha) {
        linha.scrollIntoView({ block: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
        if (!M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease" });
      }
      K.toast(editando
        ? { titulo: r.nome + " atualizada", texto: "A duração nova vale para as consultas marcadas daqui para a frente.", icone: "heart-pulse" }
        : { titulo: r.nome + " criada", texto: "Cadastre um médico para abrir a agenda.", icone: "heart-pulse" });
    } catch (e) {
      if (e.status !== 401) mostrarErro(e.message);
    } finally {
      ok.disabled = false;
    }
  });

  desenhar();
  }
})();
