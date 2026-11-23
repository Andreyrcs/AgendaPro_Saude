/* AgendaPro Saúde — o paciente escolhe a clínica: pela busca (nome ou cidade) ou pelo código que a recepção passa. */
(function () {
  "use strict";

  const A = window.AP;
  const API = window.API;
  const $ = (s) => document.querySelector(s);

  document.querySelectorAll("[data-marca]").forEach((el) => { el.innerHTML = A.marca(Number(el.dataset.marca)); });

  function anunciar(t) {
    const a = $("#anunciador");
    a.textContent = "";
    setTimeout(() => { a.textContent = t; }, 30);
  }

  const eu = API.usuarioAtual();
  if (!eu || eu.papel !== "paciente") {
    location.replace("login.html");
    return;
  }

  function itemHTML(c, atual) {
    return '<li><button type="button" class="clinica-opcao' + (atual ? " clinica-opcao--atual" : "") + '" data-id="' + c.id + '"' + (atual ? ' aria-current="true"' : "") + ">" +
      '<span class="clinica-opcao__icone">' + A.icone("building", "ic-sm") + "</span>" +
      '<span class="clinica-opcao__texto"><b>' + A.esc(c.nome) + "</b><span>" + A.esc(c.endereco) + " · " + A.esc(c.cidade) + "/" + A.esc(c.uf) + "</span></span>" +
      '<span class="clinica-opcao__acao">' + (atual ? "Você está aqui" : "Escolher") + "</span></button></li>";
  }

  let minhas = [];
  async function desenharMinhas() {
    try {
      minhas = await API.clinicasDoPaciente();
    } catch (e) {
      minhas = [];
      anunciar(e.message);
    }
    $("#minhas").hidden = !minhas.length;
    if (!minhas.length) return;
    const atual = API.clinicaAtual();
    $("#titulo").textContent = "Trocar de clínica";
    $("#subtitulo").textContent = "Escolha uma das suas clínicas ou procure outra. O app mostra os horários e as consultas da clínica escolhida.";
    $("#lista-minhas").innerHTML = minhas.map((c) => itemHTML(c, atual && atual.id === c.id)).join("");
  }

  let pedido = 0;
  async function buscar() {
    const termo = $("#busca").value;
    const meu = ++pedido;
    let lista;
    try {
      lista = await API.buscarClinicas(termo);
    } catch (e) {
      if (meu !== pedido) return;
      $("#resultados").innerHTML = "";
      $("#conta").textContent = e.message;
      return;
    }
    if (meu !== pedido) return;
    const atual = API.clinicaAtual();
    $("#resultados").innerHTML = lista.map((c) => itemHTML(c, atual && atual.id === c.id)).join("");
    $("#conta").textContent = lista.length
      ? (termo.trim() ? lista.length + (lista.length === 1 ? " clínica encontrada" : " clínicas encontradas") : "Clínicas no AgendaPro Saúde")
      : "Nenhuma clínica com esse nome ou cidade. Confira a escrita, ou peça o código à recepção da sua clínica.";
  }

  /* Uma das minhas clínicas: só abre (pode ser privada, e o vínculo por id só vale para as públicas).
     Uma clínica da busca: vincula pelo id. Pelo código: vincula pelo código (pública ou privada). */
  async function escolher(escolha) {
    try {
      const minha = escolha.clinicaId && minhas.find((c) => A.mesmoId(c.id, escolha.clinicaId));
      const c = minha ? API.usarClinica(minha) : await API.vincularClinica(escolha);
      anunciar("Clínica escolhida: " + c.nome);
      location.href = "paciente-desktop.html";
      return true;
    } catch (e) {
      anunciar(e.message);
      throw e;
    }
  }

  document.addEventListener("click", (ev) => {
    const b = ev.target.closest(".clinica-opcao");
    if (b) escolher({ clinicaId: b.dataset.id }).catch(() => { /* a mensagem já foi anunciada */ });
  });
  $("#busca").addEventListener("input", buscar);

  const codigo = $("#codigo");
  codigo.addEventListener("input", () => {
    let t = codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (t.length > 3) t = t.slice(0, 3) + "-" + t.slice(3, 7);
    codigo.value = t;
    codigo.classList.remove("campo__entrada--erro");
    $("#erro-codigo").textContent = "";
  });
  $("#form-codigo").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      await escolher({ codigo: codigo.value });
    } catch (e) {
      codigo.classList.add("campo__entrada--erro");
      codigo.setAttribute("aria-invalid", "true");
      $("#erro-codigo").textContent = e.message;
      codigo.focus();
    }
  });

  desenharMinhas();
  buscar();
})();
