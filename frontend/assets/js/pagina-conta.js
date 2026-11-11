/* AgendaPro Saúde — Minha conta, da recepção
   Dados pessoais e senha salvam com o botão de cada bloco; as preferências mudam na hora.
   A senha não é guardada em lugar nenhum: no sistema real, isso é trabalho da API. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const $ = (s) => document.querySelector(s);

  const PERMISSOES = [
    "Marcar, remarcar e cancelar consultas",
    "Registrar a chegada e chamar pacientes",
    "Oferecer vagas e organizar a lista de espera",
    "Cadastrar e editar médicos, especialidades e horários",
  ].concat(K.conta.papel === "dono" ? ["Mudar o nome e os dados da clínica", "Cadastrar e remover recepcionistas"] : []);

  function desenharTopo() {
    $("#conta-avatar").textContent = A.iniciais(K.conta.nome);
    $("#subtitulo").innerHTML = "<b>" + A.esc(K.conta.nome) + "</b> · " + A.esc(K.conta.funcao) + " da " + D.clinica.nome + ", " + D.clinica.unidade;
  }

  /* ─── Erros de campo ─── */
  function limpar(form) {
    form.querySelectorAll(".campo--erro").forEach((c) => c.classList.remove("campo--erro"));
    form.querySelectorAll(".campo__erro").forEach((e) => e.remove());
    form.querySelectorAll("[aria-describedby]").forEach((i) => { if (i.id && i.getAttribute("aria-describedby").endsWith("-erro")) i.removeAttribute("aria-describedby"); });
  }
  function erro(campo, entrada, texto) {
    const c = $(campo);
    c.classList.add("campo--erro");
    c.insertAdjacentHTML("beforeend", '<span class="campo__erro" id="' + entrada.id + '-erro">' + texto + "</span>");
    entrada.setAttribute("aria-describedby", entrada.id + "-erro");
    entrada.focus();
    M.tremer(entrada);
  }
  function carimbo(id, texto) {
    const el = $(id);
    el.textContent = texto;
    if (!M.reduzido()) el.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: M.EASE_OUT });
  }

  /* ─── Dados pessoais ─── */
  const fd = $("#form-dados");
  fd.nome.value = K.conta.nome;
  fd.email.value = K.conta.email;
  fd.tel.value = K.conta.tel;
  fd.ramal.value = K.conta.ramal;
  fd.addEventListener("input", () => { $("#salvo-dados").textContent = ""; });
  fd.addEventListener("submit", (ev) => {
    ev.preventDefault();
    limpar(fd);
    const nome = fd.nome.value.trim().replace(/\s+/g, " ");
    const email = fd.email.value.trim();
    const digitos = fd.tel.value.replace(/\D/g, "");
    if (nome.split(" ").length < 2) return erro("#c-nome", fd.nome, "Escreva o nome e o sobrenome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro("#c-email", fd.email, "Confira o e-mail: falta o @ ou o domínio.");
    if (digitos.length < 10 || digitos.length > 11) return erro("#c-tel", fd.tel, "Use o DDD e o número, com 10 ou 11 dígitos.");
    const tel = "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, -4) + "-" + digitos.slice(-4);
    fd.tel.value = tel;
    K.salvarConta({ nome, email, tel, ramal: fd.ramal.value.replace(/\D/g, "") });
    desenharTopo();
    carimbo("#salvo-dados", "Salvo agora");
  });

  /* ─── Senha ─── */
  const fs = $("#form-senha");
  $("#ver-senha").addEventListener("change", (ev) => {
    ["atual", "nova", "repete"].forEach((n) => { fs[n].type = ev.target.checked ? "text" : "password"; });
  });
  fs.addEventListener("input", () => { $("#salvo-senha").textContent = ""; });
  fs.addEventListener("submit", (ev) => {
    ev.preventDefault();
    limpar(fs);
    const nova = fs.nova.value;
    if (!fs.atual.value) return erro("#c-atual", fs.atual, "Digite a senha que você usa hoje.");
    if (nova.length < 8 || !/[a-zA-Z]/.test(nova) || !/\d/.test(nova)) return erro("#c-nova", fs.nova, "Pelo menos 8 caracteres, com letras e números.");
    if (nova === fs.atual.value) return erro("#c-nova", fs.nova, "A nova senha precisa ser diferente da atual.");
    if (fs.repete.value !== nova) return erro("#c-repete", fs.repete, "As duas senhas não estão iguais.");
    window.API.trocarSenha(fs.atual.value, nova).then(() => {
      fs.reset();
      carimbo("#salvo-senha", "Senha trocada");
      K.toast({ titulo: "Senha trocada", texto: "Use a nova senha no próximo login.", icone: "check" });
    }).catch((e) => erro("#c-atual", fs.atual, e.message));
  });

  /* ─── Preferências ─── */
  function desenharPref() {
    document.querySelectorAll("#seg-texto [data-texto]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.texto === K.pref.texto)));
    $("#sw-mov").setAttribute("aria-checked", String(K.pref.movimento === "reduzido"));
    $("#sw-menu").setAttribute("aria-checked", String(K.pref.menu === "recolhido"));
  }
  $("#seg-texto").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-texto]");
    if (!b) return;
    K.mudarPref("texto", b.dataset.texto);
    desenharPref();
    K.anunciar("Tamanho do texto: " + b.textContent);
  });
  $("#seg-texto").addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const v = K.pref.texto === "normal" ? "grande" : "normal";
    K.mudarPref("texto", v);
    desenharPref();
    $('#seg-texto [data-texto="' + v + '"]').focus();
  });
  $("#sw-mov").addEventListener("click", () => { K.mudarPref("movimento", K.pref.movimento === "reduzido" ? "sistema" : "reduzido"); desenharPref(); });
  $("#sw-menu").addEventListener("click", () => { K.mudarPref("menu", K.pref.menu === "recolhido" ? "aberto" : "recolhido"); desenharPref(); });
  /* o botão do próprio menu também muda essa preferência */
  document.querySelector(".lateral").addEventListener("click", (ev) => { if (ev.target.closest(".lateral__recolher")) desenharPref(); });

  /* ─── Acesso ─── */
  $("#acesso").innerHTML =
    "<div><dt>Função</dt><dd>" + A.esc(K.conta.funcao) + "</dd></div>" +
    "<div><dt>Unidade</dt><dd>" + D.clinica.nome + ", " + D.clinica.unidade + "</dd></div>" +
    "<div><dt>Médicos na agenda</dt><dd>" + C.MEDICOS.length + "</dd></div>";
  $("#permissoes").innerHTML = PERMISSOES.map((p) => "<li>" + A.icone("check", "ic-sm") + "<span>" + p + "</span></li>").join("");

  /* ─── Dados guardados neste computador (até a API: depois, ficam no banco) ─── */
  function desenharRestaurar() {
    const caixa = $("#restaurar-caixa");
    caixa.innerHTML = '<p>A agenda, os médicos, os horários e a lista de espera desta clínica estão guardados neste navegador.</p><div class="ajuste__acoes ajuste__acoes--inicio">' +
        '<button type="button" class="botao botao--secundario botao--pequeno" id="restaurar">Voltar à carga inicial</button></div>';
    const b = $("#restaurar");
    if (b) b.addEventListener("click", () => {
      caixa.innerHTML = '<p><b>Apagar as consultas, médicos, horários e mudanças na fila feitos aqui?</b> Isso não pode ser desfeito.</p>' +
        '<div class="ajuste__acoes ajuste__acoes--inicio"><button type="button" class="botao botao--secundario botao--pequeno" id="manter">Manter</button>' +
        '<button type="button" class="botao botao--perigo botao--pequeno" id="apagar">Sim, voltar à carga inicial</button></div>';
      $("#manter").focus();
      $("#manter").addEventListener("click", () => { desenharRestaurar(); $("#restaurar").focus(); });
      $("#apagar").addEventListener("click", () => {
        K.guardar.tudoDeVolta();
        location.reload();
      });
    });
  }

  $("#sair").addEventListener("click", async () => {
    await window.API.sair();
    location.href = "login.html";
  });

  desenharTopo();
  desenharPref();
  desenharRestaurar();
})();
