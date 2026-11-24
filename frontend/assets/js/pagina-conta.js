/* AgendaPro Saúde — Minha conta, do dono e da recepção, pela API.
   Nome e e-mail vêm da sessão (token do login) e ficam só para leitura: a API ainda não tem rota para a equipe
   mudar os próprios dados (pendência registrada no plano de integração). A senha troca por
   PUT /api/usuarios/{id}/senha. As preferências mudam na hora e ficam só neste computador. */
(function () {
  "use strict";

  const A = window.AP;
  const M = window.MOV;
  const K = window.CASCA;
  const CL = window.CLINICA;
  const $ = (s) => document.querySelector(s);

  CL.iniciar(iniciar);
  function iniciar() {
  const dono = K.conta.papel === "dono";
  const nomeClinica = () => (CL.clinica && CL.clinica.nome) || "";

  const PERMISSOES = [
    "Marcar, remarcar e cancelar consultas",
    "Registrar a chegada e chamar pacientes",
    "Oferecer vagas e organizar a lista de espera",
    "Cadastrar e editar médicos, especialidades e horários",
  ].concat(dono ? ["Mudar o nome e os dados da clínica", "Cadastrar e remover recepcionistas"] : []);

  function desenharTopo() {
    $("#conta-avatar").textContent = K.conta.nome ? A.iniciais(K.conta.nome) : "";
    $("#subtitulo").innerHTML = "<b>" + A.esc(K.conta.nome) + "</b> · " + A.esc(K.conta.funcao) + " da " + A.esc(nomeClinica());
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

  /* ─── Dados pessoais (só leitura) ─── */
  $("#f-nome").value = K.conta.nome;
  $("#f-email").value = K.conta.email;
  $("#dados-nota").textContent = dono
    ? "Por enquanto, o nome e o e-mail da conta não mudam pelo sistema."
    : "Para mudar o nome ou o e-mail, fale com o responsável pela clínica.";

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
    const botao = fs.querySelector('button[type="submit"]');
    botao.disabled = true;
    window.API.trocarSenha(fs.atual.value, nova).then(() => {
      fs.reset();
      carimbo("#salvo-senha", "Senha trocada");
      K.toast({ titulo: "Senha trocada", texto: "Use a nova senha no próximo login.", icone: "check" });
    }).catch((e) => erro("#c-atual", fs.atual, e.message)).finally(() => { botao.disabled = false; });
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
    const ordem = ["normal", "grande", "muito-grande"];
    const v = ordem[(ordem.indexOf(K.pref.texto) + (ev.key === "ArrowRight" ? 1 : 2)) % 3];
    K.mudarPref("texto", v);
    desenharPref();
    $('#seg-texto [data-texto="' + v + '"]').focus();
  });
  $("#sw-mov").addEventListener("click", () => { K.mudarPref("movimento", K.pref.movimento === "reduzido" ? "sistema" : "reduzido"); desenharPref(); });
  $("#sw-menu").addEventListener("click", () => { K.mudarPref("menu", K.pref.menu === "recolhido" ? "aberto" : "recolhido"); desenharPref(); });
  /* o botão do próprio menu também muda essa preferência */
  document.querySelector(".lateral").addEventListener("click", (ev) => { if (ev.target.closest(".lateral__recolher")) desenharPref(); });

  /* ─── Acesso: médicos na agenda = os da clínica que já têm expediente (GET /api/clinicas/{id}/medicos) ─── */
  const naAgenda = CL.medicos.filter((m) => m.expediente).length;
  $("#acesso").innerHTML =
    "<div><dt>Função</dt><dd>" + A.esc(K.conta.funcao) + "</dd></div>" +
    "<div><dt>Clínica</dt><dd>" + A.esc(nomeClinica()) + "</dd></div>" +
    "<div><dt>Médicos na agenda</dt><dd>" + naAgenda + "</dd></div>";
  $("#permissoes").innerHTML = PERMISSOES.map((p) => "<li>" + A.icone("check", "ic-sm") + "<span>" + A.esc(p) + "</span></li>").join("");

  $("#sair").addEventListener("click", async () => {
    await window.API.sair();
    location.href = "login.html";
  });

  desenharTopo();
  desenharPref();
  }
})();
