/* AgendaPro Saúde — Clínica e equipe, pela API. O responsável muda os dados da clínica e cadastra recepcionistas;
   a recepção vê tudo, mas não altera. A tela só esconde o que a pessoa não pode fazer: quem barra de verdade é a
   API (PUT /api/clinicas/{id} e POST/DELETE /api/clinicas/{id}/equipe só aceitam o dono, e só da própria clínica).
   A clínica vem de GET /api/clinicas/{id} (L1), buscada de novo a cada carga por CLINICA.iniciar. */
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
  const eu = API.usuarioAtual();
  if (!eu || !CL.clinica || (eu.papel !== "dono" && eu.papel !== "recepcao")) {
    $(".ajustes").innerHTML = '<p class="painel">Esta página é da equipe da clínica. <a href="login.html">Entrar com a conta da clínica</a></p>';
    return;
  }
  const dono = eu.papel === "dono";
  const clinica = () => CL.clinica;

  function desenharTopo() {
    $("#subtitulo").innerHTML = "<b>" + A.esc(clinica().nome) + "</b> · " + (dono ? "você é o responsável" : "só o responsável altera estes dados");
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
    const c = clinica();
    fc.nome.value = c.nome || "";
    fc.telefone.value = c.telefone || "";
    fc.endereco.value = c.endereco || "";
    fc.cidade.value = c.cidade || "";
    fc.uf.value = c.uf || "";
    fc.cnpj.value = c.cnpj ? API.formatarCNPJ(c.cnpj) : "";
    $("#f-publica").checked = !!c.publica;
    $("#codigo").textContent = c.codigo || "";
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
    if (!dono) return;
    limpar(fc);
    const tel = fc.telefone.value.replace(/\D/g, "");
    if (fc.nome.value.trim().length < 3) return erro("#c-nome", fc.nome, "Escreva o nome da clínica.");
    if (tel.length < 10 || tel.length > 11) return erro("#c-tel", fc.telefone, "Use o DDD e o número, com 10 ou 11 dígitos.");
    if (fc.endereco.value.trim().length < 5) return erro("#c-endereco", fc.endereco, "Escreva rua, número e bairro.");
    if (!fc.cidade.value.trim()) return erro("#c-cidade", fc.cidade, "Informe a cidade.");
    /* UF: 2 letras maiúsculas e uma sigla de estado de verdade (Clinica.UF) */
    if (!API.validarUF(fc.uf.value)) return erro("#c-uf", fc.uf, API.ERRO_UF);
    const botao = fc.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      CL.clinica = await API.atualizarClinica({
        nome: fc.nome.value, telefone: fc.telefone.value, endereco: fc.endereco.value,
        cidade: fc.cidade.value, uf: fc.uf.value, publica: $("#f-publica").checked,
      });
      preencher();
      desenharTopo();
      K.atualizar();
      carimbo("#salvo-clinica", "Salvo agora");
      K.toast({ titulo: "Dados da clínica salvos", texto: "O novo nome já aparece nas telas da recepção, do médico e no app.", icone: "check" });
    } catch (e) {
      K.toast({ titulo: "Não deu para salvar", texto: e.message, icone: "info" });
    } finally {
      botao.disabled = false;
    }
  });

  $("#copiar").addEventListener("click", async () => {
    const codigo = clinica().codigo || "";
    try {
      await navigator.clipboard.writeText(codigo);
      K.toast({ titulo: "Código copiado", texto: codigo, icone: "check", duracao: 2600 });
    } catch (e) {
      K.toast({ titulo: "Copie o código à mão", texto: codigo, icone: "info" });
    }
  });

  /* ─── Equipe: GET /api/clinicas/{id}/equipe → [{ idUsuario, nome, email, papel }] ─── */
  const COR = { dono: "#a8e6cf", medico: "#f7d9dc", recepcao: "#d4f3e6" };
  async function desenharEquipe() {
    let lista;
    try {
      lista = await API.listarEquipe();
    } catch (e) {
      $("#equipe").innerHTML = '<li class="pessoa-equipe">' + A.esc(e.message) + "</li>";
      return;
    }
    $("#equipe").innerHTML = lista.map((u) => {
      const voce = A.mesmoId(u.id, eu.id);
      const podeRemover = dono && !voce && u.papel === "recepcao";
      const nome = u.nome || u.email || "";
      return '<li class="pessoa-equipe" data-id="' + A.esc(u.id) + '">' +
        '<span class="avatar-iniciais" style="--tam: 40px; background: ' + (COR[u.papel] || COR.recepcao) + '" aria-hidden="true">' + (nome ? A.esc(A.iniciais(nome)) : "") + "</span>" +
        '<span class="pessoa-equipe__texto"><b>' + A.esc(nome) + (voce ? ' <span class="pessoa-equipe__voce">você</span>' : "") + "</b><span>" + A.esc(u.email) + "</span></span>" +
        '<span class="selo">' + A.esc(API.PAPEIS[u.papel] || u.papel) + "</span>" +
        (podeRemover ? '<button type="button" class="botao botao--texto-perigo botao--pequeno" data-remover="' + A.esc(u.id) + '">Remover</button>' : "") +
        "</li>";
    }).join("");
  }
  $("#equipe").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-remover]");
    if (!b) return;
    const li = b.closest("li");
    const nome = li.querySelector("b").firstChild.textContent;
    const original = li.innerHTML;
    li.insertAdjacentHTML("beforeend", '<div class="pessoa-equipe__confirma"><span>Remover <b>' + A.esc(nome) + '</b> da equipe? Essa pessoa perde o acesso na hora.</span>' +
      '<button type="button" class="botao botao--secundario botao--pequeno" data-manter>Manter</button>' +
      '<button type="button" class="botao botao--perigo botao--pequeno" data-sim>Sim, remover</button></div>');
    b.hidden = true;
    li.querySelector("[data-manter]").focus();
    li.querySelector("[data-manter]").addEventListener("click", () => { li.innerHTML = original; li.querySelector("[data-remover]").focus(); });
    li.querySelector("[data-sim]").addEventListener("click", async (e2) => {
      e2.currentTarget.disabled = true;
      try {
        await API.removerDaEquipe(b.dataset.remover);
        await desenharEquipe();
        K.toast({ titulo: nome + " saiu da equipe", texto: "O acesso foi encerrado.", icone: "check" });
      } catch (e) {
        li.innerHTML = original;
        K.toast({ titulo: "Não deu para remover", texto: e.message, icone: "info" });
      }
    });
  });

  /* ─── Nova recepcionista: POST /api/clinicas/{id}/equipe → { usuario, senhaProvisoria } (aparece uma vez) ─── */
  const fn = $("#form-nova");
  fn.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!dono) return;
    limpar(fn);
    $("#credencial").hidden = true;
    $("#credencial").innerHTML = "";
    const nome = fn.nome.value.trim().replace(/\s+/g, " ");
    const email = fn.email.value.trim();
    if (nome.split(" ").length < 2) return erro("#c-nova-nome", fn.nome, "Escreva o nome e o sobrenome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro("#c-nova-email", fn.email, "Confira o e-mail: falta o @ ou o domínio.");
    const botao = fn.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const r = await API.cadastrarRecepcionista({ nome, email });
      fn.reset();
      const cred = $("#credencial");
      cred.hidden = false;
      cred.innerHTML = "<p><b>" + A.esc(r.usuario.nome) + " já pode entrar.</b> Passe estes dados à pessoa:</p>" +
        '<dl><div><dt>E-mail</dt><dd>' + A.esc(r.usuario.email) + '</dd></div><div><dt>Senha provisória</dt><dd class="num">' + A.esc(r.senhaProvisoria) + "</dd></div></dl>" +
        '<p class="campo__dica">A senha provisória aparece só desta vez. A pessoa troca a senha em Minha conta.</p>';
      await desenharEquipe();
      K.toast({ titulo: r.usuario.nome + " entrou na equipe", texto: "Função: Recepção", icone: "user-check" });
    } catch (e) {
      erro("#c-nova-email", fn.email, e.message);
    } finally {
      botao.disabled = false;
    }
  });

  desenharTopo();
  desenharEquipe();
  }
})();
