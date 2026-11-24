/* AgendaPro Saúde — escolher o paciente pelo id (nova consulta e lista de espera).
   A recepção digita o nome ou o CPF; a busca é GET /api/clinicas/{id}/pacientes?busca= (3 ou mais números = CPF).
   Só aparecem pessoas de contas vinculadas à clínica: a API não marca consulta nem fila para quem não é da clínica.
   Uso: const s = ESCOLHER_PACIENTE(caixa, { prefixo, aoEscolher(pessoa | null) });
        s.escolhido() → { id, nome, idConta, cpf, nascimento, relacao } | null;  s.definirPorId(id);  s.limpar(). */
(function () {
  "use strict";

  const A = window.AP;
  const API = window.API;
  const CL = window.CLINICA;
  const MOSTRAR = 8;

  /* CPF só com os 2 últimos números (a busca pode usar o CPF inteiro) */
  const cpfMascarado = (cpf) => { const d = String(cpf || "").replace(/\D/g, ""); return d ? "•••.•••.•••-" + d.slice(-2) : ""; };
  function idade(nascimento) {
    if (!nascimento) return null;
    const [a, m, d] = nascimento.split("-").map(Number);
    const h = new Date();
    let n = h.getFullYear() - a;
    if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) n -= 1;
    return n;
  }
  const pessoaDaApi = (p) => ({ id: String(p.id), nome: p.nome, idConta: String(p.idConta), cpf: p.cpf, nascimento: p.nascimento, relacao: p.relacao });
  const detalhe = (p) => {
    const i = idade(p.nascimento);
    return [cpfMascarado(p.cpf) ? "CPF " + cpfMascarado(p.cpf) : "", i === null ? "" : i + (i === 1 ? " ano" : " anos"), p.relacao || ""].filter(Boolean).join(" · ");
  };

  /* uma busca por vez: a resposta de uma busca velha não apaga a da nova */
  async function buscar(termo) {
    const q = termo ? "?busca=" + encodeURIComponent(termo) : "";
    return (await API.chamar("GET", "/api/clinicas/" + CL.clinica.id + "/pacientes" + q)) || [];
  }

  function ESCOLHER_PACIENTE(caixa, opcoes) {
    const o = Object.assign({ prefixo: "pac", aoEscolher: () => {} }, opcoes);
    const id = (s) => o.prefixo + "-" + s;
    let atual = null;
    let pedido = 0;
    let relogio = null;

    caixa.classList.add("escolher-paciente");
    caixa.innerHTML =
      '<div class="campo" id="' + id("c") + '">' +
      '<label for="' + id("busca") + '">Paciente (nome ou CPF)</label>' +
      '<input id="' + id("busca") + '" type="search" autocomplete="off" spellcheck="false" placeholder="Digite parte do nome ou do CPF" aria-describedby="' + id("dica") + '" aria-controls="' + id("lista") + '" />' +
      '<span class="campo__dica" id="' + id("dica") + '">Aparecem só os pacientes que já escolheram esta clínica (pelo código ou pela busca no site).</span>' +
      "</div>" +
      '<p class="escolher-paciente__estado" id="' + id("estado") + '" role="status"></p>' +
      '<div class="escolhas escolhas--lista" id="' + id("lista") + '" role="radiogroup" aria-label="Pacientes encontrados"></div>' +
      '<div class="escolher-paciente__escolhido" id="' + id("escolhido") + '" hidden></div>';
    const $ = (s) => caixa.querySelector("#" + id(s));
    const entrada = $("busca");

    function mostrarEscolhido() {
      const e = $("escolhido");
      if (!atual) { e.hidden = true; e.innerHTML = ""; $("c").hidden = false; return; }
      $("c").hidden = true;
      $("lista").innerHTML = "";
      $("estado").textContent = "";
      e.hidden = false;
      e.innerHTML = '<span><b>' + A.esc(atual.nome) + "</b><small>" + A.esc(detalhe(atual)) + "</small></span>" +
        '<button type="button" class="link-acao" data-trocar-paciente>Trocar paciente</button>';
    }
    function escolher(p) {
      atual = p;
      mostrarEscolhido();
      o.aoEscolher(atual);
    }

    async function procurar() {
      const termo = entrada.value.trim();
      const digitos = termo.replace(/\D/g, "");
      $("lista").innerHTML = "";
      if (termo.length < 3 && digitos.length < 3) {
        $("estado").textContent = termo ? "Digite pelo menos 3 letras ou números." : "";
        return;
      }
      const meu = ++pedido;
      $("estado").textContent = "Procurando…";
      try {
        const achados = await buscar(termo);
        if (meu !== pedido) return;
        const lista = achados.map(pessoaDaApi);
        if (!lista.length) {
          $("estado").textContent = "Ninguém com esse nome ou CPF entre os pacientes da clínica.";
          return;
        }
        $("estado").textContent = lista.length > MOSTRAR
          ? "Mostrando " + MOSTRAR + " de " + lista.length + ". Digite mais para encontrar a pessoa."
          : lista.length + (lista.length === 1 ? " paciente encontrado." : " pacientes encontrados.");
        $("lista").innerHTML = lista.slice(0, MOSTRAR).map((p) =>
          '<div class="escolha"><input type="radio" name="' + id("pessoa") + '" id="' + id("p-" + p.id) + '" value="' + A.esc(p.id) + '" />' +
          '<label for="' + id("p-" + p.id) + '"><span><b>' + A.esc(p.nome) + "</b><small>" + A.esc(detalhe(p)) + "</small></span></label></div>"
        ).join("");
        $("lista")._pessoas = lista;
      } catch (e) {
        if (meu === pedido && e.status !== 401) $("estado").textContent = e.message;
      }
    }

    entrada.addEventListener("input", () => { clearTimeout(relogio); relogio = setTimeout(procurar, 300); });
    entrada.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); clearTimeout(relogio); procurar(); } });
    $("lista").addEventListener("change", (ev) => {
      const p = ($("lista")._pessoas || []).find((x) => A.mesmoId(x.id, ev.target.value));
      if (p) { escolher(p); const b = caixa.querySelector("[data-trocar-paciente]"); if (b) b.focus(); }
    });
    caixa.addEventListener("click", (ev) => {
      if (!ev.target.closest("[data-trocar-paciente]")) return;
      atual = null;
      mostrarEscolhido();
      o.aoEscolher(null);
      entrada.focus();
      entrada.select();
    });

    return {
      escolhido: () => atual,
      focar: () => (atual ? caixa.querySelector("[data-trocar-paciente]") : entrada).focus(),
      limpar() { atual = null; entrada.value = ""; $("lista").innerHTML = ""; $("estado").textContent = ""; mostrarEscolhido(); },
      /* vindo de outra tela com ?paciente={id}: procura na lista da clínica */
      async definirPorId(idPessoa) {
        try {
          const p = (await buscar("")).map(pessoaDaApi).find((x) => A.mesmoId(x.id, idPessoa));
          if (p) escolher(p);
          return p || null;
        } catch (e) { return null; }
      },
    };
  }

  ESCOLHER_PACIENTE.cpfMascarado = cpfMascarado;
  ESCOLHER_PACIENTE.idade = idade;
  window.ESCOLHER_PACIENTE = ESCOLHER_PACIENTE;
})();
