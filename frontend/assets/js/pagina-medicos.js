/* AgendaPro Saúde — Médicos da clínica, pela API.
   Quem atende nesta clínica e como está a agenda de cada um: expediente de hoje, consultas, ocupação da semana, fila
   e o próximo horário livre. Todos os números vêm da agenda e do expediente (CLINICA).
   Cadastrar: POST /api/clinicas/{id}/medicos (F15) → a senha provisória aparece uma única vez.
   Editar: PUT /api/medicos/{id} (o telefone é o da conta do médico). Remover: DELETE /api/medicos/{id} (L6): a conta
   é desativada, o histórico fica, e a API recusa enquanto houver consulta marcada ou gente na fila dele. */
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
  const ocupa = (k) => CL.horarioDe(k) === "ocupado" || CL.horarioDe(k) === "oferecido";
  const SEG = CL.segunda(CL.hoje);
  const SEMANA = [0, 1, 2, 3, 4, 5].map((i) => CL.somaDias(SEG, i));
  const naFila = (m) => { const f = CL.filaDoMedico(m); return f ? (f.pessoas || []).length : 0; };

  /* minutos de atendimento possíveis no dia, sem o almoço */
  function capacidade(m, dia) {
    const e = CL.expediente(m, dia);
    if (!e) return 0;
    const a = CL.almocoDe(m);
    return e[1] - e[0] - (a ? Math.max(0, Math.min(e[1], a[1]) - Math.max(e[0], a[0])) : 0);
  }

  function numeros(m) {
    const hoje = CL.consultas.filter((k) => k.medico === m && k.data === CL.hoje && CL.ativa(k));
    const consultas = hoje.filter(CL.ehConsulta);
    const cap = SEMANA.reduce((t, d) => t + capacidade(m, d), 0);
    const ocup = CL.consultas.filter((k) => k.medico === m && SEMANA.includes(k.data) && ocupa(k)).reduce((t, k) => t + k.dur, 0);
    let livre = null;
    for (let d = CL.hoje; d <= K.ULTIMO_DIA && !livre; d = CL.somaDias(d, 1)) {
      const l = K.livres(m, d);
      if (l.length) livre = { dia: d, ini: l[0].ini };
    }
    return {
      consultas: consultas.length,
      atendidas: consultas.filter((k) => k.status === "atendida").length,
      ocupacao: cap ? Math.min(1, ocup / cap) : 0,
      fila: naFila(m),
      expediente: CL.expediente(m, CL.hoje),
      livre,
    };
  }

  function quemHTML(md) {
    return '<span class="quem">' + A.avatarMedico(md, 36) + '<span class="quem__texto"><span class="quem__nome">' + A.esc(md.nome) +
      '</span><span class="tabela__sub">' + A.esc(K.esp(md.esp).nome) + (md.crm ? " · " + A.esc(md.crm) : "") + "</span></span></span>";
  }

  function desenhar() {
    const dados = CL.MEDICOS.map((m) => ({ m, md: K.medico(m), n: numeros(m) }));

    const cheio = dados.slice().sort((a, b) => b.n.ocupacao - a.n.ocupacao)[0];
    $("#subtitulo").innerHTML = dados.length
      ? "<b>" + dados.length + (dados.length === 1 ? " médico" : " médicos") + "</b> com agenda na " + A.esc(CL.clinica.nome) + ". " +
        "Agenda mais cheia da semana: " + A.esc(cheio.md.nome) + ", " + Math.round(cheio.n.ocupacao * 100) + "% ocupada" +
        (cheio.n.fila ? " e " + cheio.n.fila + (cheio.n.fila === 1 ? " pessoa" : " pessoas") + " na fila." : ".")
      : CL.medicos.length
        ? "Nenhum médico com expediente ainda. Defina o horário de cada um em Horários para abrir a agenda."
        : "Nenhum médico cadastrado ainda. Use “Cadastrar médico” para começar.";
    $("#meta-semana").textContent = "Semana de " + CL.data(SEG).getDate() + " a " + CL.data(SEMANA[5]).getDate() + " de " + A.MESES_LONGOS[CL.data(SEMANA[5]).getMonth()];

    $("#linhas").innerHTML = dados.length ? dados.map(({ m, md, n }) => {
      const pct = Math.round(n.ocupacao * 100);
      const id = encodeURIComponent(m);
      return '<tr data-id="' + A.esc(m) + '">' +
        "<td>" + quemHTML(md) + "</td>" +
        '<td data-rotulo="Expediente hoje">' + (n.expediente
          ? '<span class="num">' + CL.txt(n.expediente[0]) + "–" + CL.txt(n.expediente[1]) + "</span>"
          : '<span class="tabela__traco">Não atende hoje</span>') + "</td>" +
        '<td class="num" data-rotulo="Consultas hoje">' + n.consultas + '<span class="tabela__sub">' + n.atendidas + " atendidas</span></td>" +
        '<td class="num" data-rotulo="Ocupação da semana"><span class="medidor' + (pct >= 85 ? " medidor--alto" : "") + '"><span class="medidor__trilho" aria-hidden="true"><i style="--v:' + n.ocupacao.toFixed(2) + '"></i></span>' + pct + "%</span></td>" +
        '<td class="num" data-rotulo="Na fila">' + (n.fila ? '<a class="link-acao" href="lista-espera.html#' + id + '" aria-label="' + n.fila + " na fila de " + A.esc(md.nome) + '">' + n.fila + "</a>" : '<span class="tabela__traco">0</span>') + "</td>" +
        '<td data-rotulo="Próximo horário livre">' + (n.livre
          ? '<a class="link-acao" href="nova-consulta.html?medico=' + id + "&dia=" + n.livre.dia + "&hora=" + CL.txt(n.livre.ini) + '">' + K.curtoData(n.livre.dia) + " · " + CL.txt(n.livre.ini) + "</a>"
          : '<span class="tabela__traco">—</span>') + "</td>" +
        '<td data-rotulo="Sala e contato">' + contatoHTML(md) + "</td>" +
        '<td class="tabela__acao">' + botaoEditar(md) + "</td>" +
        "</tr>";
    }).join("")
      : '<tr><td colspan="8"><p class="vazio">Nenhum médico com agenda nesta clínica ainda.</p></td></tr>';

    const sem = CL.medicos.filter((md) => !md.expediente);
    $("#meta-sem").textContent = sem.length + (sem.length === 1 ? " médico" : " médicos");
    $("#linhas-sem").innerHTML = sem.length
      ? sem.map((md) =>
          '<tr data-id="' + A.esc(md.id) + '"><td>' + quemHTML(md) + '</td><td data-rotulo="Especialidade">' + A.esc(K.esp(md.esp).nome) + "</td>" +
          '<td data-rotulo="Sala e contato">' + contatoHTML(md) + "</td>" +
          '<td class="tabela__acao"><a class="link-acao" href="horarios.html#' + encodeURIComponent(md.id) + '">' + I("clock", "ic-sm") + "Cadastrar horário</a> " + botaoEditar(md) + "</td></tr>"
        ).join("")
      : '<tr><td colspan="4" class="tabela__traco">' + (CL.medicos.length ? "Todos os médicos do cadastro já têm horário." : "Ninguém no cadastro ainda.") + "</td></tr>";
  }

  /* o telefone do médico é o da conta dele (Usuarios.Telefone), como vem da API */
  function contatoHTML(md) {
    return (md.sala ? '<span class="contato__sala">' + A.esc(md.sala) + "</span>" : '<span class="tabela__traco">Sala não informada</span>') +
      '<span class="tabela__sub contato__tel">' + (md.telefone ? A.esc(md.telefone) : "Sem telefone") + "</span>";
  }
  function botaoEditar(md) {
    return '<button type="button" class="link-acao" data-editar="' + A.esc(md.id) + '" aria-label="Editar dados de ' + A.esc(md.nome) + '">Editar</button>';
  }

  /* ─── Cadastrar, editar e remover (o mesmo diálogo) ─── */
  const dlg = $("#dlg-medico");
  const form = $("#form-medico");
  const ok = $("#dlg-ok");
  const remover = $("#dlg-remover");
  let editando = null;
  let confirmandoRemocao = false;

  function opcoesEsp() {
    $("#f-esp").innerHTML = Object.keys(CL.especialidades)
      .sort((a, b) => CL.especialidades[a].nome.localeCompare(CL.especialidades[b].nome, "pt-BR"))
      .map((id) => '<option value="' + A.esc(id) + '">' + A.esc(CL.especialidades[id].nome) + "</option>").join("");
  }

  function limparErros() {
    form.querySelectorAll(".campo--erro").forEach((c) => c.classList.remove("campo--erro"));
    form.querySelectorAll(".campo .campo__erro").forEach((e) => e.remove());
    form.querySelectorAll("[aria-describedby]").forEach((i) => i.removeAttribute("aria-describedby"));
    $("#e-medico").hidden = true;
    $("#e-medico").textContent = "";
  }
  function erro(campo, entrada, texto) {
    const c = $(campo);
    c.classList.add("campo--erro");
    c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="' + entrada.id + '-erro">' + A.esc(texto) + "</span>");
    entrada.setAttribute("aria-describedby", entrada.id + "-erro");
    entrada.focus();
    M.tremer(entrada);
  }
  /* a mensagem da API vai para o campo de que ela fala; as outras, para a linha de erro do diálogo */
  function erroDaApi(texto) {
    const t = K.semAcento(texto);
    if (t.includes("e-mail")) return erro("#c-email", form.email, texto);
    if (t.includes("crm")) return erro("#c-crm", form.crm, texto);
    if (t.includes("telefone")) return erro("#c-tel", form.tel, texto);
    if (t.includes("nome")) return erro("#c-nome", form.nome, texto);
    const e = $("#e-medico");
    e.textContent = texto;
    e.hidden = false;
    M.tremer(e);
  }

  function abrir(md) {
    if (!Object.keys(CL.especialidades).length) {
      K.toast({ titulo: "Cadastre uma especialidade primeiro", texto: "Cada médico atende uma especialidade da clínica. Crie em Especialidades.", icone: "heart-pulse", duracao: 6000 });
      return;
    }
    editando = md || null;
    confirmandoRemocao = false;
    opcoesEsp();
    form.reset();
    limparErros();
    $("#t-dlg").textContent = md ? "Editar médico" : "Cadastrar médico";
    $("#dlg-texto").textContent = md
      ? "Mude o que for preciso. O expediente se edita em Horários."
      : "Depois do cadastro, defina o expediente em Horários para abrir a agenda.";
    ok.textContent = md ? "Salvar alterações" : "Cadastrar";
    remover.hidden = !md;
    remover.textContent = "Remover médico";
    $("#aviso-remover").hidden = true;
    /* o e-mail de acesso só é pedido no cadastro: ele cria a conta do médico */
    $("#c-email").hidden = !!md;
    if (md) {
      form.nome.value = md.nome;
      form.crm.value = md.crm || "";
      form.esp.value = md.esp;
      form.tel.value = md.telefone || "";
      form.sala.value = md.sala || "";
    }
    K.abrirDialogo(dlg);
  }

  $("#cadastrar").addEventListener("click", () => abrir(null));
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-editar]");
    if (b) abrir(K.medico(b.dataset.editar));
  });

  /* corpo de PUT /api/medicos/{id} a partir de um médico do modelo (para o "Desfazer") */
  const corpoDe = (md) => ({ nome: md.nome, crm: md.crm, especialidade: Number(md.esp), sala: md.sala || null, telefone: md.telefone || null });

  function destacar(id) {
    const linha = document.querySelector('tr[data-id="' + CSS.escape(id) + '"]');
    if (!linha) return;
    linha.scrollIntoView({ block: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
    if (!M.reduzido()) linha.animate([{ backgroundColor: "#d4f3e6" }, { backgroundColor: "transparent" }], { duration: 1200, easing: "ease" });
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    limparErros();
    let nome = form.nome.value.trim().replace(/\s+/g, " ");
    const semTitulo = nome.replace(/^(Dra?\.?|Dr\(a\)\.)\s+/i, "");
    if (semTitulo.split(" ").length < 2) { erro("#c-nome", form.nome, "Escreva o nome e o sobrenome."); return; }
    /* CRM: obrigatório e único (coluna Medicos.CRM); a API confere de novo, inclusive contra os desativados */
    const crm = form.crm.value.trim().toUpperCase().replace(/\s+/g, " ");
    if (!/^CRM\/[A-Z]{2} ?\d{4,7}$/.test(crm)) { erro("#c-crm", form.crm, "Use o formato CRM/UF e o número, como CRM/SP 123456."); return; }
    if (CL.medicos.some((x) => x !== editando && (x.crm || "").replace(/\s/g, "") === crm.replace(/\s/g, ""))) { erro("#c-crm", form.crm, "Já existe um médico com este CRM."); return; }
    const email = form.email.value.trim().toLowerCase();
    if (!editando && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro("#c-email", form.email, "Informe o e-mail que o médico vai usar para entrar."); return; }
    const digitos = form.tel.value.replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 11)) { erro("#c-tel", form.tel, "Use o DDD e o número, com 10 ou 11 dígitos."); return; }
    if (!/^(Dra?\.|Dr\(a\)\.)/.test(nome)) nome = "Dr(a). " + semTitulo;
    const tel = digitos ? "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, -4) + "-" + digitos.slice(-4) : null;
    const corpo = {
      nome, crm: crm.replace(/^CRM\/([A-Z]{2}) ?/, "CRM/$1 "), especialidade: Number(form.esp.value),
      sala: form.sala.value.trim() || null, telefone: tel,
    };

    ok.disabled = true;
    try {
      if (editando) {
        const md = editando;
        const antes = corpoDe(md);
        await API.chamar("PUT", "/api/medicos/" + md.id, corpo);
        await CL.recarregar(["medicos", "agenda"]);
        K.fecharDialogo(dlg);
        desenhar();
        destacar(md.id);
        K.toast({
          titulo: "Dados de " + corpo.nome + " atualizados",
          texto: "Já valem em todas as telas da clínica.",
          icone: "stethoscope",
          acao: {
            rotulo: "Desfazer",
            fazer: async () => {
              try {
                await API.chamar("PUT", "/api/medicos/" + md.id, antes);
                await CL.recarregar(["medicos", "agenda"]);
                desenhar();
                K.anunciar("Alteração desfeita.");
              } catch (e) { if (e.status !== 401) K.toast({ titulo: "Não deu para desfazer", texto: e.message, icone: "info" }); }
            },
          },
        });
        return;
      }

      const r = await API.chamar("POST", "/api/clinicas/" + CL.clinica.id + "/medicos", Object.assign({ email }, corpo));
      await CL.recarregar(["medicos"]);
      K.fecharDialogo(dlg);
      desenhar();
      destacar(String(r.medico.id));
      /* a senha provisória aparece só aqui, uma vez (não vai para o toast nem fica guardada) */
      const cred = $("#credencial");
      cred.hidden = false;
      cred.innerHTML = "<p><b>" + A.esc(r.medico.nome) + " já pode entrar.</b> Passe estes dados ao médico:</p>" +
        "<dl><div><dt>E-mail</dt><dd>" + A.esc(r.usuario.email) + '</dd></div><div><dt>Senha provisória</dt><dd class="num">' + A.esc(r.senhaProvisoria) + "</dd></div></dl>" +
        '<p class="campo__dica">A senha provisória aparece só desta vez; se perder, o dono gera outra em Clínica e equipe. O médico troca a senha em Meu perfil. Agora defina o expediente em <a href="horarios.html#' +
        encodeURIComponent(String(r.medico.id)) + '">Horários</a>.</p>';
      cred.scrollIntoView({ block: "nearest", behavior: M.reduzido() ? "auto" : "smooth" });
      K.toast({ titulo: r.medico.nome + " cadastrado", texto: "Os dados de acesso estão no alto da página.", icone: "stethoscope" });
    } catch (e) {
      if (e.status !== 401) erroDaApi(e.message);
    } finally {
      ok.disabled = false;
    }
  });

  /* Remover (L6): o primeiro clique mostra o aviso, o segundo confirma */
  remover.addEventListener("click", async () => {
    if (!editando || remover.disabled) return;
    if (!confirmandoRemocao) {
      confirmandoRemocao = true;
      $("#aviso-remover").hidden = false;
      remover.textContent = "Sim, remover " + editando.nome;
      remover.focus();
      return;
    }
    const md = editando;
    remover.disabled = true;
    try {
      await API.chamar("DELETE", "/api/medicos/" + md.id);
      await CL.recarregar(["medicos", "agenda", "fila"]);
      K.fecharDialogo(dlg);
      desenhar();
      K.toast({ titulo: md.nome + " foi removido", texto: "Saiu da agenda e das opções de agendamento. O histórico continua.", icone: "info" });
    } catch (e) {
      if (e.status !== 401) erroDaApi(e.message);
    } finally {
      remover.disabled = false;
    }
  });

  desenhar();
  }
})();
