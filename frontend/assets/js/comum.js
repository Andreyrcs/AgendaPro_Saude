/* AgendaPro Saúde — utilidades compartilhadas (datas, folhinha, avatares, ícones) */
(function () {
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  function data(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2] || 1);
  }

  function hoje() {
    var d = new Date();
    return window.DADOS && window.DADOS.hoje ? data(window.DADOS.hoje) : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function diasAte(iso) {
    return Math.round((data(iso) - hoje()) / 86400000);
  }

  function relativo(iso) {
    var n = diasAte(iso);
    if (n === 0) return "hoje";
    if (n === 1) return "amanhã";
    if (n === -1) return "ontem";
    if (n > 1) return "em " + n + " dias";
    return "há " + -n + " dias";
  }

  function extenso(iso, comSemana) {
    var d = data(iso);
    var t = d.getDate() + " de " + MESES_LONGOS[d.getMonth()];
    return comSemana === false ? t : SEMANA[d.getDay()] + ", " + t;
  }

  function curto(iso) {
    var d = data(iso);
    return SEMANA_CURTA[d.getDay()] + ", " + d.getDate() + " " + MESES[d.getMonth()];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icone(nome, classe) {
    return '<svg class="ic ' + (classe || "") + '" aria-hidden="true" focusable="false"><use href="#i-' + nome + '"/></svg>';
  }

  /* A folha do dia */
  function folha(iso, opcoes) {
    opcoes = opcoes || {};
    var d = data(iso);
    var classes = ["folha"];
    if (opcoes.pequena) classes.push("folha--pequena");
    if (opcoes.menta) classes.push("folha--menta");
    var feriado = window.DADOS && (window.DADOS.feriados || []).some(function (f) { return f.data === iso; });
    if (d.getDay() === 0 || feriado) classes.push("folha--domingo");
    var html =
      '<span class="' + classes.join(" ") + '" aria-hidden="true">' +
      '<span class="folha__mes">' + MESES[d.getMonth()].toUpperCase() + "</span>" +
      '<span class="folha__dia">' + d.getDate() + "</span>" +
      '<span class="folha__semana">' + SEMANA_CURTA[d.getDay()] + "</span>" +
      "</span>";
    return opcoes.bloco ? '<span class="bloco">' + html + "</span>" : html;
  }

  /* Folha de mês (calendário de prevenção) */
  function folhaMes(mesIso, opcoes) {
    opcoes = opcoes || {};
    var d = data(mesIso + "-01");
    return (
      '<span class="folha folha--mes' + (opcoes.menta ? " folha--menta" : "") + '" aria-hidden="true">' +
      '<span class="folha__mes">' + d.getFullYear() + "</span>" +
      '<span class="folha__dia">' + MESES[d.getMonth()].toUpperCase() + "</span>" +
      '<span class="folha__semana">' + MESES_LONGOS[d.getMonth()] + "</span>" +
      "</span>"
    );
  }

  /* Ilustração de pessoa (SVG próprio). Quem foi cadastrado sem ilustração recebe a padrão. */
  var contadorAvatar = 0;
  var AVATAR_PADRAO = { pele: "#b5703f", cabelo: "cacheado", corCabelo: "#2b1b12", roupa: "#2f6f9f" };
  function avatar(p, tamanho, rotulo) {
    contadorAvatar += 1;
    var a = p.avatar || AVATAR_PADRAO;
    var id = "av" + contadorAvatar;
    var pele = a.pele, cab = a.corCabelo;
    var tras = "", frente = "";
    if (a.cabelo === "crespo") {
      tras = '<circle cx="32" cy="23" r="17.5" fill="' + cab + '"/><circle cx="18.5" cy="30" r="8.5" fill="' + cab + '"/><circle cx="45.5" cy="30" r="8.5" fill="' + cab + '"/>';
      frente = '<path d="M21 25c1-7 6-11 11-11s10 4 11 11c-3-3-7-5-11-5s-8 2-11 5z" fill="' + cab + '"/>';
    } else if (a.cabelo === "cacheado") {
      frente = [[22, 21, 4.6], [26, 16.5, 4.8], [32, 14.5, 5], [38, 16.5, 4.8], [42, 21, 4.6], [29, 19, 4], [35, 19, 4]]
        .map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + cab + '"/>'; }).join("");
    } else if (a.cabelo === "trancas") {
      tras = '<rect x="17.5" y="21" width="6" height="31" rx="3" fill="' + cab + '"/><rect x="40.5" y="21" width="6" height="31" rx="3" fill="' + cab + '"/><rect x="21" y="23" width="5" height="26" rx="2.5" fill="' + cab + '"/><rect x="38" y="23" width="5" height="26" rx="2.5" fill="' + cab + '"/>';
      frente = '<path d="M20.5 27C20 15 26 13 32 13s12 2 11.5 14c-2.5-5-6.5-7.5-11.5-7.5S23 22 20.5 27z" fill="' + cab + '"/>';
    } else if (a.cabelo === "grisalho") {
      frente = '<path d="M20.5 27.5C19 15 25 12.5 32 12.5S45 15 43.5 27.5c-1.8-5.2-5.6-8-11.5-8s-9.7 2.8-11.5 8z" fill="' + cab + '"/>' +
        [[21.5, 22, 3.6], [25.5, 17, 3.8], [32, 15, 4], [38.5, 17, 3.8], [42.5, 22, 3.6]]
          .map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + cab + '"/>'; }).join("");
    } else if (a.cabelo === "calvo") {
      frente = '<ellipse cx="21" cy="27.5" rx="2.6" ry="5" fill="' + cab + '"/><ellipse cx="43" cy="27.5" rx="2.6" ry="5" fill="' + cab + '"/>';
    }
    var oculos = a.oculos
      ? '<g fill="none" stroke="#1d2a36" stroke-width="1.5"><circle cx="27.6" cy="29.2" r="3.9"/><circle cx="36.4" cy="29.2" r="3.9"/><path d="M31.5 29h1"/></g>'
      : "";
    var titulo = rotulo ? '<title>' + esc(rotulo) + "</title>" : "";
    return (
      '<svg class="avatar" width="' + tamanho + '" height="' + tamanho + '" viewBox="0 0 64 64" ' +
      (rotulo ? 'role="img" aria-label="' + esc(rotulo) + '"' : 'aria-hidden="true"') + ">" + titulo +
      '<defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="32"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' +
      '<rect width="64" height="64" style="fill:' + p.cor + '"/>' +
      tras +
      '<path d="M9 66c0-13 10-21 23-21s23 8 23 21z" fill="' + a.roupa + '"/>' +
      '<rect x="27" y="36" width="10" height="11" rx="4" fill="' + pele + '"/>' +
      '<ellipse cx="32" cy="28.5" rx="11" ry="12.5" fill="' + pele + '"/>' +
      frente +
      '<circle cx="27.8" cy="29.3" r="1.35" fill="#140c08"/><circle cx="36.2" cy="29.3" r="1.35" fill="#140c08"/>' +
      '<path d="M28.6 34.4q3.4 2.8 6.8 0" fill="none" stroke="#2a150c" stroke-width="1.5" stroke-linecap="round"/>' +
      oculos +
      "</g></svg>"
    );
  }

  function iniciais(nome) {
    var partes = nome.replace(/^(Dra?\.|Psic\.)\s+/, "").split(" ").filter(Boolean);
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  }

  function avatarMedico(m, tamanho) {
    return '<span class="avatar-iniciais" style="--tam:' + tamanho + "px;background:" + m.cor + '" aria-hidden="true">' + iniciais(m.nome) + "</span>";
  }

  /* Marca: uma folha de destacar com a cruz da saúde */
  function marca(tamanho) {
    return (
      '<svg class="marca" width="' + tamanho + '" height="' + tamanho + '" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="2" y="4" width="28" height="26" rx="7" fill="#12263f"/>' +
      '<path d="M2 12v-1a7 7 0 0 1 7-7h14a7 7 0 0 1 7 7v1z" fill="#a8e6cf"/>' +
      '<rect x="8.5" y="1.5" width="3.4" height="6.5" rx="1.7" fill="#12263f"/>' +
      '<rect x="20.1" y="1.5" width="3.4" height="6.5" rx="1.7" fill="#12263f"/>' +
      '<rect x="14.2" y="14.5" width="3.6" height="11.5" rx="1.2" fill="#fff"/>' +
      '<rect x="10.25" y="18.45" width="11.5" height="3.6" rx="1.2" fill="#fff"/>' +
      "</svg>"
    );
  }

  /* Selo no menu lateral: em qual clínica a pessoa está e com qual função.
     Fica logo acima das seções; com o menu recolhido, vira só o ícone (o nome aparece na dica). */
  var FUNCOES = { dono: "Responsável", recepcao: "Recepção", medico: "Médico", paciente: "Paciente" };
  function seloClinica(lateral, papel, opcoes) {
    if (!lateral || !window.DADOS || lateral.querySelector(".lateral__clinica")) return null;
    opcoes = opcoes || {};
    var c = window.DADOS.clinica;
    var nav = lateral.querySelector("nav");
    if (!nav) return null;
    var el = document.createElement(opcoes.href ? "a" : "div");
    el.className = "lateral__clinica";
    if (opcoes.href) el.href = opcoes.href;
    var funcao = FUNCOES[papel] || "";
    var linha = papel === "paciente" ? (opcoes.acao || "Trocar de clínica") : funcao + " · " + c.unidade;
    el.dataset.dicaLateral = c.nome + " · " + funcao;
    el.setAttribute("aria-label", (papel === "paciente" ? "Sua clínica: " : "Clínica em que você atua: ") + c.nome + ", " + linha);
    el.innerHTML =
      '<span class="lateral__clinica-icone">' + icone("building", "ic-sm") + "</span>" +
      '<span class="lateral__rotulo lateral__clinica-texto" aria-hidden="true"><small>' + (papel === "paciente" ? "Sua clínica" : "Você atua em") + "</small>" +
      "<b>" + esc(c.nome) + "</b><span>" + esc(linha) + "</span></span>";
    nav.insertAdjacentElement("beforebegin", el);
    return el;
  }

  function ordinal(n, genero) {
    return n + (genero === "f" ? "ª" : "º");
  }

  window.AP = {
    MESES: MESES, MESES_LONGOS: MESES_LONGOS, SEMANA: SEMANA, SEMANA_CURTA: SEMANA_CURTA,
    data: data, hoje: hoje, diasAte: diasAte, relativo: relativo, extenso: extenso, curto: curto,
    esc: esc, icone: icone, folha: folha, folhaMes: folhaMes, avatar: avatar,
    avatarMedico: avatarMedico, iniciais: iniciais, marca: marca, ordinal: ordinal, seloClinica: seloClinica,
    movimentoReduzido: function () {
      return document.documentElement.dataset.movimento === "reduzido" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
  };
})();

/* Menu do celular: em telas até 900px a barra lateral vira um topo com o botão de três barras
   no canto superior direito, que abre e fecha a lista de seções (vale para clínica, médico e paciente). */
(function () {
  function montar() {
    var lateral = document.querySelector(".lateral");
    var nav = lateral && lateral.querySelector("nav");
    if (!nav || lateral.querySelector(".lateral__hamburguer")) return;
    if (!nav.id) nav.id = "menu-secoes";
    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "lateral__hamburguer";
    botao.setAttribute("aria-controls", nav.id);
    botao.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<rect class="h1" x="3" y="5" width="18" height="2.6" rx="1.3"/><rect class="h2" x="3" y="10.7" width="18" height="2.6" rx="1.3"/><rect class="h3" x="3" y="16.4" width="18" height="2.6" rx="1.3"/></svg>';
    lateral.appendChild(botao);

    /* fechar: o painel sobe e some (lateral.css, estado "fechando") e só depois é escondido */
    var tempoFechar = null;
    function abrir(sim) {
      clearTimeout(tempoFechar);
      var estava = lateral.dataset.menu;
      if (!sim && estava === "aberto") {
        lateral.dataset.menu = "fechando";
        tempoFechar = setTimeout(function () { lateral.dataset.menu = "fechado"; }, 200);
      } else if (sim || estava !== "fechando") {
        lateral.dataset.menu = sim ? "aberto" : "fechado";
      }
      /* cada item entra um pouco depois do anterior */
      if (sim) nav.querySelectorAll("li").forEach(function (li, i) { li.style.setProperty("--i", i); });
      botao.setAttribute("aria-expanded", String(sim));
      botao.setAttribute("aria-label", sim ? "Fechar o menu" : "Abrir o menu");
    }
    abrir(false);
    botao.addEventListener("click", function () { abrir(lateral.dataset.menu !== "aberto"); });
    /* escolheu uma seção, apertou Esc ou tocou fora: fecha */
    nav.addEventListener("click", function (ev) { if (ev.target.closest("a")) abrir(false); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && lateral.dataset.menu === "aberto") { abrir(false); botao.focus(); }
    });
    document.addEventListener("click", function (ev) {
      if (lateral.dataset.menu === "aberto" && !lateral.contains(ev.target)) abrir(false);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
