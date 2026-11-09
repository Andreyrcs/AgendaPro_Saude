/* AgendaPro Saúde — Clínica e equipe. O responsável muda os dados da clínica e cadastra recepcionistas;
   a recepção vê tudo, mas não altera. As regras de quem pode o quê também ficam no api.js,
   onde o backend vai conferi-las de novo. */
(function () {
  "use strict";

  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const API = window.API;
  const $ = (s) => document.querySelector(s);

  API.garantirSessaoDemo("recepcao").then(iniciar);
  function iniciar() {
  const eu = API.usuarioAtual();
  const clinica = API.clinicaAtual();
  if (!eu || !clinica || eu.papel === "paciente" || eu.papel === "medico") {
    $(".ajustes").innerHTML = '<p class="painel">Esta página é da equipe da clínica. <a href="login.html">Entrar com a conta da clínica</a></p>';
    return;
  }
  const dono = eu.papel === "dono";

  function desenharTopo() {
    $("#subtitulo").innerHTML = "<b>" + A.esc(clinica.nome) + "</b> · " + A.esc(clinica.unidade) + " · " + (dono ? "você é o responsável" : "só o responsável altera estes dados");
  }

  /* ─── Erros de campo (mesmo padrão de Minha conta) ─── */
  function limpar(form) {
    form.querySelectorAll(".campo--erro").forEach((c) => c.classList.remove("campo--erro"));
    form.querySelectorAll(".campo__erro").forEach((e) => e.remove());
  }
  function erro(campo, entrada, texto) {
    const c = $(campo);
    c.classList.add("campo--erro");
    c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="' + entrada.id + '-erro">' + A.esc(texto) + "</span>");
    entrada.setAttribute("aria-describedby", entrada.id + "-erro");
    entrada.focus();
    M.tremer(entrada);
  }
  function carimbo(id, texto) {
    const el = $(id);
    el.textContent = texto;
    if (!M.reduzido()) el.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: M.EASE_OUT });
  }

  /* ─── Dados da clínica ─── */
  const fc = $("#form-clinica");
  function preencher() {
    fc.nome.value = clinica.nome;
    fc.unidade.value = clinica.unidade;
    fc.telefone.value = clinica.telefone;
    fc.endereco.value = clinica.endereco;
    fc.cidade.value = clinica.cidade;
    fc.uf.value = clinica.uf;
    fc.cnpj.value = clinica.cnpj;
    $("#f-publica").checked = !!clinica.publica;
    $("#codigo").textContent = clinica.codigo;
  }
  preencher();
  if (!dono) {
    $("#grupo-clinica").disabled = true;
    $("#acoes-clinica").hidden = true;
    $("#clinica-nota").textContent = "Só o responsável pela clínica altera estes dados. Se algo estiver errado, avise quem administra a clínica.";
    $("#secao-nova").hidden = true;
  }
  fc.addEventListener("input", () => { $("#salvo-clinica").textContent = ""; });
  fc.uf.addEventListener("input", () => { fc.uf.value = fc.uf.value.replace(/[^a-zA-Z]/g, "").toUpperCase(); });
  fc.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpar(fc);
    const tel = fc.telefone.value.replace(/\D/g, "");
    if (fc.nome.value.trim().length < 3) return erro("#c-nome", fc.nome, "Escreva o nome da clínica.");
    if (tel.length < 10 || tel.length > 11) return erro("#c-tel", fc.telefone, "Use o DDD e o número, com 10 ou 11 dígitos.");
    if (fc.endereco.value.trim().length < 5) return erro("#c-endereco", fc.endereco, "Escreva rua, número e bairro.");
    if (!fc.cidade.value.trim()) return erro("#c-cidade", fc.cidade, "Informe a cidade.");
    if (!/^[A-Z]{2}$/.test(fc.uf.value)) return erro("#c-uf", fc.uf, "Use a sigla, como SP.");
    try {
      await API.atualizarClinica({
        nome: fc.nome.value, unidade: fc.unidade.value, telefone: fc.telefone.value, endereco: fc.endereco.value,
        cidade: fc.cidade.value, uf: fc.uf.value, publica: $("#f-publica").checked,
      });
      Object.assign(clinica, API.clinicaAtual());
      preencher();
      desenharTopo();
      carimbo("#salvo-clinica", "Salvo agora");
      K.toast({ titulo: "Dados da clínica salvos", texto: "O novo nome já aparece nas telas da recepção, do médico e no app.", icone: "check" });
    } catch (e) {
      K.toast({ titulo: "Não deu para salvar", texto: e.message, icone: "info" });
    }
  });

  $("#copiar").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(clinica.codigo);
      K.toast({ titulo: "Código copiado", texto: clinica.codigo, icone: "check", duracao: 2600 });
    } catch (e) {
      K.toast({ titulo: "Copie o código à mão", texto: clinica.codigo, icone: "info" });
    }
  });

  /* ─── Equipe ─── */
  async function desenharEquipe() {
    const lista = await API.listarEquipe();
    $("#equipe").innerHTML = lista.map((u) => {
      const voce = u.id === eu.id;
      const podeRemover = dono && !voce && u.papel === "recepcao";
      return '<li class="pessoa-equipe" data-id="' + u.id + '">' +
        '<span class="avatar-iniciais" style="--tam: 40px; background: ' + (u.papel === "dono" ? "#a8e6cf" : u.papel === "medico" ? "#f7d9dc" : "#d4f3e6") + '" aria-hidden="true">' + A.iniciais(u.nome) + "</span>" +
        '<span class="pessoa-equipe__texto"><b>' + A.esc(u.nome) + (voce ? ' <span class="pessoa-equipe__voce">você</span>' : "") + "</b><span>" + A.esc(u.email) + "</span></span>" +
        '<span class="selo">' + A.esc(API.PAPEIS[u.papel]) + (u.provisoria ? " · senha provisória" : "") + "</span>" +
        (podeRemover ? '<button type="button" class="botao botao--texto-perigo botao--pequeno" data-remover="' + u.id + '">Remover</button>' : "") +
        "</li>";
    }).join("");
  }
  $("#equipe").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-remover]");
    if (!b) return;
    const li = b.closest("li");
    const nome = li.querySelector("b").firstChild.textContent;
    const original = li.innerHTML;
    li.insertAdjacentHTML("beforeend", '<div class="pessoa-equipe__confirma"><span>Remover <b>' + A.esc(nome) + '</b> da equipe? Ela perde o acesso na hora.</span>' +
      '<button type="button" class="botao botao--secundario botao--pequeno" data-manter>Manter</button>' +
      '<button type="button" class="botao botao--perigo botao--pequeno" data-sim>Sim, remover</button></div>');
    b.hidden = true;
    li.querySelector("[data-manter]").focus();
    li.querySelector("[data-manter]").addEventListener("click", () => { li.innerHTML = original; li.querySelector("[data-remover]").focus(); });
    li.querySelector("[data-sim]").addEventListener("click", async () => {
      try {
        await API.removerDaEquipe(b.dataset.remover);
        await desenharEquipe();
        K.toast({ titulo: nome + " saiu da equipe", texto: "O acesso dela foi encerrado.", icone: "check" });
      } catch (e) {
        K.toast({ titulo: "Não deu para remover", texto: e.message, icone: "info" });
      }
    });
  });

  /* ─── Nova recepcionista ─── */
  const fn = $("#form-nova");
  fn.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpar(fn);
    const nome = fn.nome.value.trim().replace(/\s+/g, " ");
    const email = fn.email.value.trim();
    if (nome.split(" ").length < 2) return erro("#c-nova-nome", fn.nome, "Escreva o nome e o sobrenome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro("#c-nova-email", fn.email, "Confira o e-mail: falta o @ ou o domínio.");
    try {
      const r = await API.cadastrarRecepcionista({ nome, email });
      fn.reset();
      const cred = $("#credencial");
      cred.hidden = false;
      cred.innerHTML = "<p><b>" + A.esc(r.usuario.nome) + " já pode entrar.</b> Passe estes dados para ela:</p>" +
        '<dl><div><dt>E-mail</dt><dd>' + A.esc(r.usuario.email) + '</dd></div><div><dt>Senha provisória</dt><dd class="num">' + A.esc(r.senhaProvisoria) + "</dd></div></dl>" +
        '<p class="campo__dica">No sistema real, a senha provisória vai por e-mail. Aqui ela aparece só uma vez.</p>';
      await desenharEquipe();
      K.toast({ titulo: r.usuario.nome + " entrou na equipe", texto: "Função: Recepção", icone: "user-check" });
    } catch (e) {
      erro("#c-nova-email", fn.email, e.message);
    }
  });

  desenharTopo();
  desenharEquipe();
  }
})();
