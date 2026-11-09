/* AgendaPro Saúde — cadastro de clínica: os dados da empresa e o acesso do responsável, num formulário só. */
(function () {
  "use strict";

  const A = window.AP;
  const API = window.API;
  const $ = (s) => document.querySelector(s);
  const form = $("#form-clinica");
  const botao = $("#btn-cadastrar");

  document.querySelectorAll("[data-marca]").forEach((el) => { el.innerHTML = A.marca(Number(el.dataset.marca)); });

  function anunciar(t) {
    const a = $("#anunciador");
    a.textContent = "";
    setTimeout(() => { a.textContent = t; }, 30);
  }

  /* ─── Máscaras ─── */
  const cnpj = $("#cnpj");
  cnpj.addEventListener("input", () => { cnpj.value = API.formatarCNPJ(cnpj.value); });
  const tel = $("#telefone");
  tel.addEventListener("blur", () => { tel.value = API.formatarTelefone(tel.value); });
  const uf = $("#uf");
  uf.addEventListener("input", () => { uf.value = uf.value.replace(/[^a-zA-Z]/g, "").toUpperCase(); });
  $("#ver-senha").addEventListener("change", (ev) => {
    ["#senha", "#confirmar"].forEach((s) => { $(s).type = ev.target.checked ? "text" : "password"; });
  });

  /* ─── Erros ─── */
  function limpar() {
    form.querySelectorAll(".campo__entrada--erro").forEach((el) => { el.classList.remove("campo__entrada--erro"); el.removeAttribute("aria-invalid"); });
    form.querySelectorAll(".campo__erro").forEach((el) => { el.textContent = ""; });
    $("#erro-geral").classList.remove("erro-geral--visivel");
  }
  let primeiroErro = null;
  function erro(id, texto) {
    const el = $("#" + id);
    el.classList.add("campo__entrada--erro");
    el.setAttribute("aria-invalid", "true");
    $("#erro-" + id).textContent = texto;
    if (!primeiroErro) primeiroErro = el;
  }
  function erroGeral(texto) {
    $("#erro-geral-texto").textContent = texto;
    $("#erro-geral").classList.add("erro-geral--visivel");
    anunciar(texto);
  }
  form.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el.classList.contains("campo__entrada--erro")) return;
    el.classList.remove("campo__entrada--erro");
    el.removeAttribute("aria-invalid");
    const msg = $("#erro-" + el.id);
    if (msg) msg.textContent = "";
  });

  /* ─── Envio ─── */
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpar();
    primeiroErro = null;
    const v = (id) => $("#" + id).value.trim();
    const telDigitos = v("telefone").replace(/\D/g, "");
    const senha = $("#senha").value;

    if (v("nome-clinica").length < 3) erro("nome-clinica", "Escreva o nome da clínica.");
    if (!v("cnpj")) erro("cnpj", "Informe o CNPJ.");
    else if (!API.validarCNPJ(v("cnpj"))) erro("cnpj", "CNPJ inválido. Confira os 14 números.");
    if (telDigitos.length < 10 || telDigitos.length > 11) erro("telefone", "Use o DDD e o número.");
    if (v("endereco").length < 5) erro("endereco", "Escreva rua, número e bairro.");
    if (!v("cidade")) erro("cidade", "Informe a cidade.");
    if (!/^[A-Z]{2}$/.test(v("uf"))) erro("uf", "Use a sigla, como SP.");
    if (v("nome-dono").split(/\s+/).length < 2) erro("nome-dono", "Escreva o nome e o sobrenome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) erro("email", "Confira o e-mail: falta o @ ou o domínio.");
    if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) erro("senha", "Pelo menos 8 caracteres, com letras e números.");
    else if ($("#confirmar").value !== senha) erro("confirmar", "As duas senhas não estão iguais.");

    if (primeiroErro) {
      primeiroErro.focus();
      anunciar("Corrija os campos destacados.");
      return;
    }

    botao.classList.add("btn--carregando");
    botao.textContent = "Cadastrando...";
    try {
      const r = await API.cadastrarClinica({
        clinica: { nome: v("nome-clinica"), cnpj: v("cnpj"), telefone: v("telefone"), endereco: v("endereco"), cidade: v("cidade"), uf: v("uf"), publica: $("#publica").checked },
        dono: { nome: v("nome-dono"), email: v("email"), senha },
      });
      $("#cartao").hidden = true;
      $("#pronto").hidden = false;
      $("#pronto-texto").textContent = r.clinica.nome + " já está no AgendaPro Saúde, e você entra como responsável. " +
        (r.clinica.publica ? "Os pacientes acham a clínica pela busca ou por este código:" : "Passe este código aos pacientes para eles encontrarem a clínica:");
      $("#pronto-codigo").textContent = r.clinica.codigo;
      $("#pronto-titulo").focus();
      anunciar("Clínica cadastrada. Código " + r.clinica.codigo.split("").join(" "));
    } catch (e) {
      erroGeral(e.message);
      if (/CNPJ/.test(e.message)) erro("cnpj", e.message);
      if (/e-mail/i.test(e.message)) erro("email", e.message);
    } finally {
      botao.classList.remove("btn--carregando");
      botao.textContent = "Cadastrar clínica";
    }
  });
})();
