/* AgendaPro Saúde — app do paciente (protótipo navegável, dados fictícios) */
(function () {
  "use strict";

  const D = window.DADOS;
  const A = window.AP;
  const I = A.icone;

  const viewport = document.getElementById("viewport");
  const nav = document.querySelector(".nav-inferior");
  const avisos = document.getElementById("avisos");
  const gavetaCamada = document.getElementById("gaveta");
  const anunciador = document.getElementById("anunciador");

  const TOPO = ["inicio", "agenda", "familia", "perfil"];
  const SEM_NAV = ["assistente", "agendar"];

  const estado = {
    primeiraVez: true,
    pilha: [],
    rolagem: {},
    aba: "inicio",
    chat: [],
    notifLidas: false,
    agendaAba: "calendario",
    cal: { mes: "2026-10", filtro: "todos", foco: null },
    calAtivo: null,
    pendente: null,
    prevFiltro: "todos",
  };

  /* ─── Preferências (tamanho do texto, movimento) ─── */
  function lerPref(chave, padrao) {
    try {
      const v = localStorage.getItem("ap-" + chave);
      return v === null ? padrao : v;
    } catch (e) {
      return padrao;
    }
  }
  function gravarPref(chave, valor) {
    try { localStorage.setItem("ap-" + chave, valor); } catch (e) { /* sem armazenamento: segue a sessão */ }
  }
  function aplicarPrefs() {
    const raiz = document.documentElement;
    const texto = lerPref("texto", "normal");
    if (texto === "normal") delete raiz.dataset.texto; else raiz.dataset.texto = texto;
    if (lerPref("movimento", "sistema") === "reduzido") raiz.dataset.movimento = "reduzido";
    else delete raiz.dataset.movimento;
  }
  aplicarPrefs();

  /* ─── Dados ─── */
  const pessoa = (id) => D.pessoas.find((p) => p.id === id);
  const medico = (id) => D.medicos.find((m) => m.id === id);
  const esp = (id) => D.especialidades[id];
  const medicosDa = (espId) => D.medicos.filter((m) => m.esp === espId);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const nomeCurto = (p) => (p.id === D.titular ? "Você" : p.curto);
  const ordenar = (lista) => lista.slice().sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  function proximas() {
    return ordenar(D.consultas).filter((c) => A.diasAte(c.data) >= 0);
  }

  function primeiroHorario(espId) {
    let melhor = null;
    medicosDa(espId).forEach((m) => {
      (D.horarios[m.id] || []).forEach((dia) => {
        dia.horas.forEach((h) => {
          const chave = dia.data + h;
          if (!melhor || chave < melhor.chave) melhor = { chave, data: dia.data, hora: h, medico: m };
        });
      });
    });
    return melhor;
  }

  function textoFila(pos) {
    const frente = pos - 1;
    if (frente <= 0) return "Você é a próxima";
    return frente === 1 ? "1 pessoa na sua frente" : frente + " pessoas na sua frente";
  }

  function filaHTML(pos, total) {
    const lugares = Math.min(Math.max(total, pos + 3), 6);
    let html = '<div class="fila" aria-hidden="true">';
    for (let i = 1; i <= lugares; i++) {
      const tipo = i < pos ? "frente" : i === pos ? "voce" : "depois";
      html += '<span class="fila__lugar fila__lugar--' + tipo + '"></span>';
    }
    return html + '<span class="fila__legenda">' + textoFila(pos) + "</span></div>";
  }

  function barra(titulo, sub) {
    return (
      '<header class="barra-tela">' +
      '<button class="botao-icone botao-icone--sem-fundo pressionavel" type="button" data-voltar aria-label="Voltar">' + I("arrow-left") + "</button>" +
      '<div><h1 class="barra-tela__titulo" tabindex="-1">' + titulo + "</h1>" +
      (sub ? '<p class="barra-tela__sub">' + sub + "</p>" : "") +
      "</div></header>"
    );
  }

  function cabecaSecao(titulo, link, rotulo, id) {
    return (
      '<div class="secao__cabeca"><h2 class="secao__titulo"' + (id ? ' id="' + id + '"' : "") + ">" + titulo + "</h2>" +
      (link ? '<a class="secao__link" href="' + link + '">' + rotulo + "</a>" : "") +
      "</div>"
    );
  }

  function ligarClinica(rotulo) {
    return '<a class="botao botao--secundario botao--pequeno" href="tel:' + D.clinica.telefoneLink + '">' + I("phone") + rotulo + "</a>";
  }

  function seloPrazo(iso) {
    const n = A.diasAte(iso);
    return '<span class="selo selo--alerta">' + I("clock") + (n <= 0 ? "Prazo hoje" : "Faltam " + n + " dias") + "</span>";
  }

  function rotuloConsulta(c) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    return esp(m.esp).nome + " com " + m.nome + ", " + A.extenso(c.data) + ", às " + c.hora + ", para " + (p.id === D.titular ? "você" : p.tratamento);
  }

  function linhaConsulta(c, passada) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    return (
      '<a class="cartao agenda-item pressionavel" href="#consulta/' + c.id + '" aria-label="' + A.esc(rotuloConsulta(c)) + '">' +
      A.folha(c.data) +
      '<span class="consulta-cartao__corpo">' +
      '<span class="consulta-cartao__esp">' + esp(m.esp).nome + "</span>" +
      '<span class="consulta-cartao__medico">' + m.nome + "</span>" +
      '<span class="meta">' + I("clock") + '<span class="num">' + c.hora + "</span>" + (passada ? " · Realizada" : " · " + A.relativo(c.data)) + "</span>" +
      '<span class="pessoa-chip">' + A.avatar(p, 28) + nomeCurto(p) + "</span>" +
      "</span>" +
      I("chevron-right", "item__seta") +
      "</a>"
    );
  }

  /* ─── Telas ─── */

  function telaInicio() {
    const t = pessoa(D.titular);
    const prox = proximas()[0];
    const e = D.espera;
    let html = '<div class="' + (estado.primeiraVez ? "entrada" : "") + '">';

    html +=
      '<header class="topo anima" style="--i:0">' +
      '<div class="marca-app">' + A.marca(30) + "<span>AgendaPro <b>Saúde</b></span></div>" +
      '<a class="botao-icone pressionavel" href="#notificacoes" aria-label="Notificações' + (estado.notifLidas ? "" : ", 2 novas") + '">' + I("bell") +
      (estado.notifLidas ? "" : '<span class="contador" aria-hidden="true">2</span>') + "</a>" +
      "</header>";

    html +=
      '<div class="anima" style="--i:1"><p class="saudacao">Olá, ' + t.curto + '</p>' +
      '<h1 class="titulo-tela" tabindex="-1">Como você está se sentindo hoje?</h1></div>';


    html +=
      '<section class="assistente sobre-noite anima" style="--i:2" aria-labelledby="t-assistente">' +
      '<div class="assistente__cabeca">' + I("message-circle-heart") + '<h2 id="t-assistente" style="font-size:1rem">Assistente de saúde</h2></div>' +
      '<div class="conversa-previa">' +
      '<p class="balao balao--eu">O Davi está com dor de ouvido desde ontem.</p>' +
      '<p class="balao balao--ele">Para dor de ouvido em criança, procure:</p>' +
      "</div>" +
      '<div class="chips">' +
      '<a class="chip-esp pressionavel" href="#agendar/pediatria/davi">Pediatria' + I("chevron-right") + "</a>" +
      '<a class="chip-esp pressionavel" href="#agendar/otorrino/davi">Ouvido e garganta' + I("chevron-right") + "</a>" +
      "</div>" +
      '<a class="campo-falso pressionavel" href="#assistente"><span>Conte o que você está sentindo</span><span class="campo-falso__enviar">' + I("send") + "</span></a>" +
      '<div class="assistente__rodape"><p class="assistente__aviso">Orienta, mas não faz diagnóstico.</p>' +
      '<a class="assistente__192 pressionavel" href="tel:192" aria-label="Emergência: ligar 192, SAMU">' + I("phone") + "Ligar 192</a></div>" +
      "</section>";

    if (prox) {
      const m = medico(prox.medico), p = pessoa(prox.pessoa);
      html +=
        '<section class="secao anima" style="--i:3">' +
        cabecaSecao("Próxima consulta", "#agenda", "Ver agenda") +
        '<a class="cartao consulta-cartao pressionavel" href="#consulta/' + prox.id + '" aria-label="Próxima consulta: ' + A.esc(rotuloConsulta(prox)) + '">' +
        A.folha(prox.data, { bloco: true }) +
        '<span class="consulta-cartao__corpo">' +
        '<span class="consulta-cartao__topo"><span class="consulta-cartao__esp">' + esp(m.esp).nome + '</span><span class="selo selo--menta">' + cap(A.relativo(prox.data)) + "</span></span>" +
        '<span class="consulta-cartao__medico">' + m.nome + "</span>" +
        '<span class="meta">' + I("clock") + '<span class="num">' + prox.hora + "</span> · " + prox.sala + "</span>" +
        '<span class="pessoa-chip">' + A.avatar(p, 30) + "Para " + (p.id === D.titular ? "você" : p.tratamento) + "</span>" +
        "</span></a></section>";
    }

    if (lerPref("texto", "") === "" && lerPref("dica-texto", "") === "") {
      html +=
        '<section class="dica-texto anima" style="--i:4" aria-labelledby="t-dica">' +
        '<h2 id="t-dica" class="dica-texto__titulo">' + I("type") + "Prefere letras maiores?</h2>" +
        '<div class="segmentado" role="group" aria-labelledby="t-dica">' +
        [["normal", "A", "Normal"], ["grande", "A+", "Grande"], ["muito-grande", "A++", "Extra"]]
          .map(([v, a, n]) => '<button type="button" data-dica="' + v + '"><span aria-hidden="true">' + a + "</span>" + n + "</button>").join("") +
        "</div>" +
        '<p class="dica-texto__nota">Você pode mudar quando quiser em Perfil.</p>' +
        "</section>";
    }
    html += '<section class="secao anima" style="--i:4">' + cabecaSecao("Lista de espera");
    if (e && !e.resolvida && e.posicao > 0) {
      const m = medico(e.medico);
      const ord = A.ordinal(e.posicao, pessoa(e.pessoa).genero);
      html +=
        '<a class="cartao espera-cartao pressionavel" href="#espera" aria-label="Lista de espera: você é a ' + ord + " da fila para " + esp(m.esp).nome + " com " + m.nome + ". " + textoFila(e.posicao) + ". Aviso de vaga " + (e.notificar ? "ativado" : "desativado") + '.">' +
        '<span class="espera-cartao__topo"><span class="espera-cartao__rotulo">Aguardando vaga</span>' +
        (e.notificar
          ? '<span class="selo selo--branco">' + I("bell-ring") + "Aviso ativado</span>"
          : '<span class="selo selo--branco">' + I("bell") + "Aviso desligado</span>") +
        "</span>" +
        '<span class="espera-cartao__meio"><span class="posicao">' + ord + '</span><span class="espera-cartao__texto"><strong>Você é a ' + ord + " da fila</strong><span>" + esp(m.esp).nome + " · " + m.nome + "</span></span></span>" +
        filaHTML(e.posicao, e.naFila) +
        "</a>";
    } else {
      html += '<p class="cartao">Você não está em nenhuma fila agora. Quando não houver horário com o médico que você quer, é só entrar na lista de espera.</p>';
    }
    html += "</section>";

    html +=
      '<section class="secao anima" style="--i:5">' +
      cabecaSecao("Família", "#familia", "Gerenciar") +
      '<ul class="familia-linha">' +
      D.pessoas.map((p) => '<li><a class="membro pressionavel" href="#pessoa/' + p.id + '">' + A.avatar(p, 64) + "<span>" + nomeCurto(p) + "</span></a></li>").join("") +
      '<li><a class="membro pressionavel" href="#familia/novo"><span class="membro__adicionar">' + I("plus") + "</span><span>Adicionar</span></a></li>" +
      "</ul></section>";

    const r = D.acompanhamento.retornos[0];
    const ex = D.acompanhamento.exames;
    html +=
      '<section class="secao anima" style="--i:6">' +
      cabecaSecao("Depois da consulta", "#acompanhamento", "Ver tudo") +
      '<div class="cartao lista-cartao">' +
      (r
        ? '<a class="item" href="#agendar/' + r.esp + "/" + r.pessoa + '">' + A.avatar(pessoa(r.pessoa), 40) +
          '<span class="item__corpo"><span class="item__titulo">' + r.titulo + '</span><span class="item__sub" style="display:block">' + pessoa(r.pessoa).curto + " · marcar até " + A.extenso(r.prazo, false) + "</span></span>" +
          I("chevron-right", "item__seta") + "</a>"
        : "") +
      ex.map((x) => {
        const p = pessoa(x.pessoa);
        const c = x.consulta ? D.consultas.find((k) => k.id === x.consulta) : null;
        return (
          '<a class="item" href="#acompanhamento">' + A.avatar(p, 40) +
          '<span class="item__corpo"><span class="item__titulo">' + x.titulo + '</span><span class="item__sub" style="display:block">' +
          p.curto + " · " + (c ? A.curto(c.data) + ", " + c.hora : x.obs) + "</span>" +
          (x.status === "agendado"
            ? '<span class="selo selo--feito" style="margin-top:6px">' + I("check") + "Marcado</span>"
            : '<span class="selo selo--alerta" style="margin-top:6px">Não marcado</span>') +
          "</span>" + I("chevron-right", "item__seta") + "</a>"
        );
      }).join("") +
      "</div></section>";

    html +=
      '<section class="secao anima" style="--i:7">' +
      cabecaSecao("Prevenção", "#prevencao", "Ver o ano") +
      '<ul class="meses-linha">' +
      D.prevencao.slice(0, 4).map((mes, i) => {
        const d = A.data(mes.mes + "-01");
        return (
          '<li style="display:contents"><a class="mes-cartao pressionavel' + (i === 0 ? " mes-cartao--atual" : "") + '" href="#prevencao">' +
          '<span class="mes-cartao__faixa"><span class="mes-cartao__mes">' + cap(A.MESES_LONGOS[d.getMonth()]) + '</span><span class="mes-cartao__ano">' + (i === 0 ? "Este mês" : d.getFullYear()) + "</span></span>" +
          '<span class="mes-cartao__corpo"><span class="mes-cartao__campanha">' + (mes.campanha || mes.tema) + "</span>" +
          mes.itens.map((it) => '<span class="mes-cartao__item">' + A.avatar(pessoa(it.pessoa), 28) + "<span>" + it.titulo + "</span></span>").join("") +
          "</span></a></li>"
        );
      }).join("") +
      "</ul></section>";

    html += "</div>";

    function montar(el) {
      el.querySelectorAll("[data-dica]").forEach((b) =>
        b.addEventListener("click", () => {
          gravarPref("texto", b.dataset.dica);
          gravarPref("dica-texto", "ok");
          aplicarPrefs();
          const card = el.querySelector(".dica-texto");
          card.innerHTML = '<p class="dica-texto__titulo">' + I("check") + "Pronto. Dá para mudar em Perfil.</p>";
          anunciar("Tamanho do texto: " + b.textContent.replace(/^A\+*/, ""));
          setTimeout(() => { if (card.isConnected) card.remove(); }, 2600);
        })
      );
    }
    return { titulo: "Início", html, montar };
  }

  /* Assistente de saúde */
  const RAPIDAS = [
    { t: "O Davi está com dor de ouvido" },
    { t: "Estou com dor de cabeça e febre" },
    { t: "Minha mãe com a pressão alta" },
    { t: "Dor no peito e falta de ar", alerta: true },
  ];

  const analisar = window.TRIAGEM.analisar;

  function respostaHTML(r) {
    if (r.tipo === "emergencia") {
      return (
        '<div class="emergencia" role="alert">' +
        '<p class="emergencia__titulo">' + I("triangle-alert") + "Isso pode ser uma emergência</p>" +
        "<p>Dor no peito, falta de ar, desmaio ou fraqueza de um lado do corpo precisam de atendimento <b>agora</b>. Não espere por uma consulta.</p>" +
        '<div class="acoes">' +
        '<a class="botao botao--perigo botao--largo" href="tel:192">' + I("phone") + "Ligar 192 (SAMU)</a>" +
        '<a class="botao botao--secundario botao--largo" href="https://www.google.com/maps/search/pronto-socorro" target="_blank" rel="noopener">' + I("map-pin") + "Pronto-socorro mais perto</a>" +
        "</div></div>"
      );
    }
    if (r.tipo === "cvv") {
      return (
        '<div class="emergencia" role="alert">' +
        '<p class="emergencia__titulo">' + I("heart-pulse") + "Você não está sozinha</p>" +
        "<p>Converse agora com alguém do CVV, de graça, 24 horas por dia. Se houver risco imediato, ligue para o SAMU.</p>" +
        '<div class="acoes">' +
        '<a class="botao botao--perigo botao--largo" href="tel:188">' + I("phone") + "Ligar 188 (CVV)</a>" +
        '<a class="botao botao--secundario botao--largo" href="tel:192">' + I("phone") + "Ligar 192 (SAMU)</a>" +
        "</div></div>"
      );
    }
    const p = pessoa(r.quem);
    const intro = p.id === D.titular
      ? "Entendi. Pelo que você contou, estas especialidades podem ajudar:"
      : "Entendi. Para " + p.tratamento + ", estas especialidades podem ajudar:";
    const itens = r.esps.map((id) => {
      const h = primeiroHorario(id);
      const sub = h
        ? "Próximo horário: " + A.relativo(h.data) + ", " + h.hora + " com " + h.medico.nome
        : "Sem horário livre agora. Você pode entrar na lista de espera.";
      return (
        '<a class="sugestao pressionavel" href="#agendar/' + id + "/" + r.quem + '">' +
        '<span><span class="sugestao__esp" style="display:block">' + esp(id).nome + '</span><span class="sugestao__desc" style="display:block">' + esp(id).desc + '</span><span class="sugestao__sub" style="display:block">' + sub + "</span></span>" +
        I("chevron-right") + "</a>"
      );
    }).join("");
    return (
      '<p class="balao balao--ele">' + intro + "</p>" +
      '<div class="sugestoes">' + itens + "</div>" +
      '<p class="balao balao--ele">Isto é uma orientação, não um diagnóstico. Se piorar, ou se aparecer febre alta, falta de ar ou dor forte, procure um pronto-socorro.</p>'
    );
  }

  function telaAssistente() {
    const inicial =
      '<div class="aviso-ia">' + I("info") + "<p>Eu ajudo a descobrir a especialidade certa e a marcar a consulta. <b>Não faço diagnóstico.</b> Em emergência, <a href=\"tel:192\">ligue 192 (SAMU)</a>.</p></div>" +
      '<p class="balao balao--ele">Olá, ' + pessoa(D.titular).curto + "! O que você ou alguém da família está sentindo? Pode escrever do seu jeito.</p>";
    const rapidas =
      '<div class="respostas-rapidas" id="rapidas">' +
      RAPIDAS.map((r) => '<button type="button" class="resposta-rapida pressionavel' + (r.alerta ? " resposta-rapida--alerta" : "") + '">' + r.t + "</button>").join("") +
      "</div>";
    const html =
      barra("Assistente de saúde", "Orienta, não faz diagnóstico") +
      '<div class="conversa" id="conversa" aria-live="polite">' + inicial + (estado.chat.length ? estado.chat.join("") : rapidas) + "</div>" +
      '<form class="compositor" id="compositor">' +
      '<label class="visualmente-oculto" for="mensagem">Mensagem para o assistente</label>' +
      '<textarea id="mensagem" rows="1" placeholder="Escreva o que está sentindo" autocomplete="off"></textarea>' +
      '<button class="botao-icone pressionavel" type="submit" aria-label="Enviar">' + I("send") + "</button>" +
      "</form>";

    function montar(el) {
      const conversa = el.querySelector("#conversa");
      const campo = el.querySelector("#mensagem");
      const descer = () => { conversa.scrollTop = conversa.scrollHeight; };
      descer();

      function enviar(texto) {
        texto = texto.trim();
        if (!texto) return;
        const rap = conversa.querySelector("#rapidas");
        if (rap) rap.remove();
        const eu = '<p class="balao balao--eu">' + A.esc(texto) + "</p>";
        conversa.insertAdjacentHTML("beforeend", eu);
        estado.chat.push(eu);
        const dig = document.createElement("div");
        dig.className = "digitando";
        dig.setAttribute("aria-label", "O assistente está escrevendo");
        dig.innerHTML = "<span></span><span></span><span></span>";
        conversa.appendChild(dig);
        descer();
        setTimeout(() => {
          dig.remove();
          const resp = respostaHTML(analisar(texto));
          conversa.insertAdjacentHTML("beforeend", resp);
          estado.chat.push(resp);
          descer();
        }, A.movimentoReduzido() ? 350 : 800);
      }

      conversa.addEventListener("click", (ev) => {
        const b = ev.target.closest(".resposta-rapida");
        if (b) enviar(b.textContent);
      });
      el.querySelector("#compositor").addEventListener("submit", (ev) => {
        ev.preventDefault();
        enviar(campo.value);
        campo.value = "";
        campo.style.height = "";
      });
      campo.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          el.querySelector("#compositor").requestSubmit();
        }
      });
      campo.addEventListener("input", () => {
        campo.style.height = "auto";
        campo.style.height = Math.min(campo.scrollHeight, 120) + "px";
      });
    }
    return { titulo: "Assistente de saúde", html, coluna: true, montar };
  }

  /* Agendar */
  function telaAgendar(espId, pessoaId) {
    const e = esp(espId) ? espId : "clinica";
    const elegivel = (p) => (e === "pediatria" ? p.idade < 18 : true);
    let quem = pessoa(pessoaId) && elegivel(pessoa(pessoaId)) ? pessoaId : (D.pessoas.find(elegivel) || pessoa(D.titular)).id;
    let escolha = null;

    function horariosHTML() {
      const h = primeiroHorario(e);
      const primeiro = h
        ? '<button type="button" class="primeiro-livre pressionavel" data-primeiro data-medico="' + h.medico.id + '" data-data="' + h.data + '" data-hora="' + h.hora + '">' +
          A.folha(h.data, { pequena: true }) +
          '<span class="primeiro-livre__texto"><span class="primeiro-livre__rotulo">Primeiro horário livre</span><span class="primeiro-livre__valor">' + cap(A.relativo(h.data)) + ", " + h.hora + '</span><span class="primeiro-livre__sub">' + h.medico.nome + "</span></span>" +
          I("chevron-right") + "</button>"
        : "";
      return (
        primeiro +
        '<h3 class="secao__titulo" style="margin-top:22px">' + (h ? "Ou escolha outro horário" : "Horários") + "</h3>" +
        medicosDa(e).map((m) => {
          const dias = D.horarios[m.id] || [];
          const naFila = D.espera && !D.espera.resolvida && D.espera.medico === m.id;
          return (
            '<div class="cartao medico">' +
            '<div class="medico__cabeca">' + A.avatarMedico(m, 48) +
            '<div><p class="medico__nome">' + m.nome + '</p><p class="meta">' + I("map-pin") + D.clinica.nome + " · " + D.clinica.unidade + "</p></div></div>" +
            (dias.length
              ? dias.map((d) =>
                  '<div class="dia-horarios">' + A.folha(d.data, { pequena: true }) +
                  '<div class="horas">' +
                  d.horas.map((hh) => '<button type="button" class="hora pressionavel" aria-pressed="false" data-medico="' + m.id + '" data-data="' + d.data + '" data-hora="' + hh + '" aria-label="' + A.extenso(d.data) + " às " + hh + " com " + m.nome + '">' + hh + "</button>").join("") +
                  "</div></div>"
                ).join("")
              : '<div class="sem-horario"><p><b>Sem horários nas próximas 4 semanas.</b> Entre na lista de espera e avisamos quando abrir uma vaga.</p>' +
                (naFila
                  ? '<p style="margin-top:6px">Você já está na fila: <b>' + A.ordinal(D.espera.posicao, "f") + " posição</b>.</p>" +
                    '<a class="botao botao--menta botao--pequeno" href="#espera">' + I("list-ordered") + "Ver minha posição</a>"
                  : '<button type="button" class="botao botao--menta botao--pequeno" data-fila="' + m.id + '">' + I("list-ordered") + "Entrar na lista de espera</button>") +
                "</div>") +
            "</div>"
          );
        }).join("")
      );
    }

    const html =
      barra("Agendar consulta", esp(e).nome) +
      '<div class="rolagem">' +
      '<p class="subtitulo-tela" style="margin-top:4px">' + esp(e).desc + "</p>" +
      '<section class="secao" style="margin-top:20px"><h2 class="secao__titulo" id="t-quem">Para quem é a consulta?</h2>' +
      '<div class="escolha-pessoa" role="radiogroup" aria-labelledby="t-quem" style="margin-top:10px">' +
      D.pessoas.map((p) => {
        const ok = elegivel(p);
        return '<button type="button" role="radio" aria-checked="' + (p.id === quem) + '" data-pessoa="' + p.id + '"' + (ok ? "" : " disabled") + ">" + A.avatar(p, 40) + "<span>" + nomeCurto(p) + (ok ? "" : '<small class="escolha-pessoa__nao">Fora da idade</small>') + "</span></button>";
      }).join("") +
      "</div>" +
      (e === "pediatria" ? '<p class="item__sub" style="margin-top:8px">A pediatria atende crianças e adolescentes até 18 anos.</p>' : "") +
      "</section>" +
      '<section class="secao" style="margin-top:22px"><h2 class="secao__titulo">Escolha o horário</h2><div id="horarios" style="margin-top:10px">' + horariosHTML() + "</div></section></div>" +
      '<div class="barra-confirmar">' +
      '<p class="barra-confirmar__resumo" id="resumo" aria-live="polite">Escolha um horário acima.</p>' +
      '<button type="button" class="botao botao--principal botao--largo" id="confirmar" disabled>Confirmar consulta</button>' +
      "</div>";

    function montar(el) {
      const resumo = el.querySelector("#resumo");
      const botao = el.querySelector("#confirmar");

      function atualizar() {
        if (!escolha) return;
        const p = pessoa(quem);
        resumo.classList.remove("barra-confirmar__resumo--erro");
        resumo.innerHTML = "<b>" + cap(A.extenso(escolha.data)) + ", às " + escolha.hora + "</b><br>" + medico(escolha.medico).nome + " · para " + (p.id === D.titular ? "você" : p.curto);
        botao.disabled = false;
      }

      function marcar(alvo) {
        el.querySelectorAll(".hora, [data-primeiro]").forEach((b) => {
          const mesmo = b.dataset.medico === alvo.medico && b.dataset.data === alvo.data && b.dataset.hora === alvo.hora;
          if (b.matches(".hora")) b.setAttribute("aria-pressed", String(mesmo));
          else b.classList.toggle("ativo", mesmo);
        });
      }

      el.addEventListener("click", (ev) => {
        const bp = ev.target.closest("[data-pessoa]");
        if (bp) {
          if (bp.disabled) return;
          quem = bp.dataset.pessoa;
          el.querySelectorAll("[data-pessoa]").forEach((b) => b.setAttribute("aria-checked", String(b === bp)));
          atualizar();
          return;
        }
        const bh = ev.target.closest(".hora, [data-primeiro]");
        if (bh) {
          escolha = { medico: bh.dataset.medico, data: bh.dataset.data, hora: bh.dataset.hora };
          marcar(escolha);
          atualizar();
          return;
        }
        const bf = ev.target.closest("[data-fila]");
        if (bf) {
          const m = medico(bf.dataset.fila);
          abrirGaveta(
            '<div class="gaveta__ok">' + I("list-ordered") + "</div>" +
            '<h2 class="gaveta__titulo" id="gaveta-titulo">Você entrou na fila</h2>' +
            '<p class="gaveta__texto">Você é a <b>5ª</b> da fila de ' + m.nome + ". Se alguém cancelar, mandamos uma notificação e você tem 30 minutos para confirmar.</p>" +
            '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Entendi</button></div>'
          );
        }
      });

      el.querySelectorAll('[role="radio"]').forEach((r) => {
        r.addEventListener("keydown", (ev) => {
          if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(ev.key)) return;
          ev.preventDefault();
          const lista = Array.from(el.querySelectorAll('[role="radio"]:not([disabled])'));
          const i = lista.indexOf(r) + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1);
          const alvo = lista[(i + lista.length) % lista.length];
          alvo.focus();
          alvo.click();
        });
      });

      function tirarHorario(x) {
        const dia = (D.horarios[x.medico] || []).find((d) => d.data === x.data);
        if (dia) dia.horas = dia.horas.filter((h) => h !== x.hora);
        D.horarios[x.medico] = (D.horarios[x.medico] || []).filter((d) => d.horas.length);
      }

      botao.addEventListener("click", () => {
        if (!escolha) return;
        const disp = D.horarioDisputado;
        if (disp && disp.medico === escolha.medico && disp.data === escolha.data && disp.hora === escolha.hora) {
          tirarHorario(escolha);
          D.horarioDisputado = null;
          el.querySelector("#horarios").innerHTML = horariosHTML();
          resumo.classList.add("barra-confirmar__resumo--erro");
          resumo.innerHTML = "<b>Esse horário acabou de ser ocupado por outra pessoa.</b><br>Escolha outro horário. A lista já foi atualizada.";
          escolha = null;
          botao.disabled = true;
          anunciar("Esse horário acabou de ser ocupado. Escolha outro horário.");
          return;
        }
        const nova = { id: "n" + Date.now(), pessoa: quem, medico: escolha.medico, data: escolha.data, hora: escolha.hora, sala: "Sala 3", status: "confirmada", motivo: "Marcada pelo app" };
        D.consultas.push(nova);
        tirarHorario(escolha);
        sucessoConsulta(nova);
      });
    }

    return { titulo: "Agendar consulta", html, coluna: true, montar };
  }

  /* Sucesso: a folha do dia é carimbada ("Marcada"). Momento raro, então pode ter mola. */
  function sucessoConsulta(c, titulo) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    c.novo = true;
    abrirGaveta(
      '<div class="carimbo-palco" aria-hidden="true">' + A.folha(c.data) + '<span class="carimbo">Marcada</span></div>' +
      '<h2 class="gaveta__titulo" id="gaveta-titulo" style="text-align:center">' + (titulo || "Consulta marcada!") + "</h2>" +
      '<div class="gaveta__resumo"><div><b>' + cap(A.extenso(c.data)) + ', às <span class="num">' + c.hora + "</span></b><br>" + esp(m.esp).nome + " com " + m.nome + "<br>" + D.clinica.nome + " · para " + (p.id === D.titular ? "você" : p.tratamento) + "</div></div>" +
      '<p class="gaveta__texto">Vamos lembrar você um dia antes. Se precisar, dá para remarcar pela Agenda.</p>' +
      '<div class="gaveta__acoes"><a class="botao botao--principal" href="#agenda" data-ver-carimbo="' + c.data + '">' + I("calendar-days") + "Ver no calendário</a>" +
      '<a class="botao botao--secundario" href="#inicio">Voltar ao início</a></div>',
      {
        montar: (g) => {
          g.querySelector("[data-ver-carimbo]").addEventListener("click", (ev) => {
            estado.agendaAba = "calendario";
            if (atual && atual.nome === "agenda" && estado.calAtivo) {
              /* já estamos na Agenda: o hash não muda, então carimbamos aqui mesmo */
              ev.preventDefault();
              fecharGaveta();
              const cal = estado.calAtivo;
              setTimeout(() => cal.carimbar(c.data), MOV.reduzido() ? 0 : 200);
              return;
            }
            estado.pendente = { tipo: "carimbo", data: c.data };
          });
          const folha = g.querySelector(".carimbo-palco .folha");
          const carimbo = g.querySelector(".carimbo-palco .carimbo");
          anunciar((titulo || "Consulta marcada") + ": " + A.extenso(c.data) + ", às " + c.hora + ".");
          if (MOV.reduzido()) { carimbo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 120, fill: "backwards" }); return; }
          const mola = MOV.mola({ duracao: 0.45, bounce: 0.3 });
          carimbo.animate(
            [{ transform: "rotate(-30deg) scale(2.4)", opacity: 0 }, { transform: "rotate(-12deg) scale(1)", opacity: 1 }],
            { duration: mola.duracao, delay: 380, easing: mola.easing, fill: "backwards" }
          );
          folha.animate([{ transform: "scale(1)" }, { transform: "scale(0.94) rotate(-1deg)" }, { transform: "scale(1)" }],
            { duration: 260, delay: 380 + mola.duracao * 0.3, easing: MOV.EASE_OUT });
        },
      }
    );
  }

  /* ─── Lista de espera: a vaga aberta (vem da clínica ou da simulação) ─── */
  function oferecerVaga() {
    const e = D.espera;
    if (!e || e.resolvida) return;
    const m = medico(e.medico);
    e.posicao = 1;
    e.oferta = true;
    if (estado.calAtivo) estado.calAtivo.atualizar();
    aviso({
      cabeca: "AgendaPro Saúde · agora",
      titulo: "Abriu uma vaga para você!",
      texto: esp(m.esp).nome + " com " + m.nome + ", " + A.extenso(e.vaga.data) + ", às " + e.vaga.hora + ". Confirme em até 30 minutos.",
      icone: "bell-ring",
      acoes: [
        { rotulo: "Ver no calendário", classe: "botao--menta", acao: verVagaNoCalendario },
        { rotulo: "Confirmar", classe: "botao--secundario", acao: abrirVaga },
      ],
    });
  }

  function verVagaNoCalendario() {
    estado.agendaAba = "calendario";
    if (atual && atual.nome === "agenda" && estado.calAtivo) { estado.calAtivo.chegarVaga(); return; }
    estado.pendente = { tipo: "vaga" };
    location.hash = "#agenda";
  }

  function abrirVaga() {
    const e = D.espera;
    if (!e || e.resolvida) return;
    const m = medico(e.medico);
    const v = e.vaga;
    let resta = 30 * 60;
    let timer = null;
    const fmt = (seg) => Math.floor(seg / 60) + " min " + String(seg % 60).padStart(2, "0") + " s";
    const recusaHTML = '<button type="button" class="botao botao--texto-perigo" id="vaga-nao">Não quero esta vaga</button><p>A vaga vai para a próxima pessoa da fila.</p>';
    abrirGaveta(
      '<h2 class="gaveta__titulo" id="gaveta-titulo">Abriu uma vaga para você</h2>' +
      '<div class="gaveta__resumo">' + A.folha(v.data, { menta: true }) + "<div><b>" + esp(m.esp).nome + "</b><br>" + m.nome + '<br><span class="num">' + v.hora + "</span> · " + D.clinica.nome + "</div></div>" +
      '<p class="contagem">' + I("clock") + '<span>Confirme em até <b class="num" id="contagem">' + fmt(resta) + "</b></span></p>" +
      '<div class="gaveta__acoes"><button type="button" class="botao botao--principal botao--largo" id="vaga-sim">Confirmar vaga</button></div>' +
      '<div class="gaveta__recusa" id="recusa">' + recusaHTML + "</div>",
      {
        montar: (g) => {
          const saida = g.querySelector("#contagem");
          timer = setInterval(() => {
            if (!saida.isConnected) { clearInterval(timer); return; }
            resta = Math.max(0, resta - 1);
            saida.textContent = fmt(resta);
          }, 1000);
          g.querySelector("#vaga-sim").addEventListener("click", () => {
            clearInterval(timer);
            const c = { id: "v" + Date.now(), pessoa: e.pessoa, medico: e.medico, data: v.data, hora: v.hora, sala: "Sala 6", status: "confirmada", motivo: "Vaga da lista de espera" };
            D.consultas.push(c);
            e.resolvida = true;
            e.oferta = false;
            fecharGaveta(true);
            if (estado.calAtivo) estado.calAtivo.atualizar();
            MOV.canal.enviar({ tipo: "vaga-confirmada", pessoa: "Juliana Santos" });
            sucessoConsulta(c, "Vaga confirmada!");
          });
          function ligarRecusa() {
            g.querySelector("#vaga-nao").addEventListener("click", () => {
              const r = g.querySelector("#recusa");
              r.innerHTML =
                "<p><b>Recusar esta vaga?</b> Você continua na 1ª posição para a próxima.</p>" +
                '<div class="gaveta__acoes"><button type="button" class="botao botao--secundario" id="vaga-voltar">Voltar</button>' +
                '<button type="button" class="botao botao--texto-perigo" id="vaga-nao-sim">Sim, recusar esta vaga</button></div>';
              g.querySelector("#vaga-voltar").addEventListener("click", () => { r.innerHTML = recusaHTML; ligarRecusa(); g.querySelector("#vaga-nao").focus(); });
              g.querySelector("#vaga-nao-sim").addEventListener("click", () => {
                clearInterval(timer);
                e.oferta = false;
                if (estado.calAtivo) estado.calAtivo.atualizar();
                fecharGaveta();
                aviso({ titulo: "Vaga recusada", texto: "Ela passou para a próxima pessoa. Você continua na 1ª posição.", icone: "info" });
              });
              g.querySelector("#vaga-voltar").focus();
            });
          }
          ligarRecusa();
        },
      }
    );
  }

  /* Lista de espera */
  function telaEspera() {
    const e = D.espera;
    if (!e || e.resolvida) {
      return {
        titulo: "Lista de espera",
        html: barra("Lista de espera") +
          '<div class="cartao" style="margin-top:12px"><p><b>Você não está em nenhuma fila agora.</b></p><p class="item__sub">Quando não houver horário com o médico que você quer, toque em “Entrar na lista de espera” na tela de agendamento.</p></div>',
      };
    }
    const m = medico(e.medico);
    const g = pessoa(e.pessoa).genero;
    const ord = A.ordinal(e.posicao, g);

    const html =
      barra("Lista de espera", esp(m.esp).nome) +
      '<section class="espera-painel" aria-labelledby="pos-frase">' +
      '<div class="espera-painel__linha"><span class="posicao" id="pos" aria-hidden="true">' + ord + "</span>" +
      '<p class="espera-painel__frase" id="pos-frase">Você é a <span id="pos-txt">' + ord + "</span><br>da fila</p></div>" +
      '<p class="espera-painel__detalhe"><b>' + esp(m.esp).nome + "</b> · " + m.nome + "<br>Na fila desde " + A.extenso(e.desde, false) + "</p>" +
      '<div id="fila">' + filaHTML(e.posicao, e.naFila) + "</div>" +
      "</section>" +
      '<section class="secao">' + cabecaSecao("Como funciona") +
      '<ol class="passos cartao">' +
      "<li><span>Se alguém cancelar, a vaga vai para a primeira pessoa da fila.</span></li>" +
      "<li><span>Você recebe uma notificação e tem <b>30 minutos</b> para confirmar.</span></li>" +
      "<li><span>Se não confirmar a tempo, a vaga passa para a próxima pessoa.</span></li>" +
      "</ol></section>" +
      '<section class="secao">' + cabecaSecao("Como avisar você") +
      '<div class="cartao lista-cartao">' +
      interruptor("notificar", "Notificação no celular", "Recomendado: é o aviso mais rápido", e.notificar) +
      interruptor("sms", "Mensagem de texto (SMS)", "Para o número terminado em 4471", e.sms) +
      "</div></section>" +
      '<div class="demo"><p>Demonstração para a apresentação: simula alguém da fila cancelando a consulta.</p>' +
      '<button type="button" class="botao botao--secundario botao--largo" id="simular">' + I("repeat") + "Simular cancelamento</button></div>" +
      '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="sair-fila">Sair da fila</button><p>Você perde a sua posição.</p></div>';

    function montar(el) {
      el.addEventListener("click", (ev) => {
        const sw = ev.target.closest('[role="switch"]');
        if (sw) {
          const ligado = sw.getAttribute("aria-checked") !== "true";
          sw.setAttribute("aria-checked", String(ligado));
          e[sw.dataset.chave] = ligado;
        }
      });

      el.querySelector("#simular").addEventListener("click", (ev) => {
        if (e.posicao > 1) {
          e.posicao -= 1;
          e.naFila -= 1;
          const novo = A.ordinal(e.posicao, g);
          rolar(el.querySelector("#pos"), novo);
          el.querySelector("#pos-txt").textContent = novo;
          el.querySelector("#fila").innerHTML = filaHTML(e.posicao, e.naFila);
          anunciar("Alguém cancelou. Agora você é a " + novo + " da fila.");
          if (e.posicao === 1) ev.currentTarget.lastChild.textContent = "Simular nova vaga";
        } else {
          oferecerVaga();
        }
      });

      el.querySelector("#sair-fila").addEventListener("click", () => {
        abrirGaveta(
          '<h2 class="gaveta__titulo" id="gaveta-titulo">Sair da lista de espera?</h2>' +
          '<p class="gaveta__texto">Você vai perder a ' + A.ordinal(e.posicao, g) + " posição na fila de " + m.nome + ". Se quiser voltar depois, entra no fim da fila.</p>" +
          '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Continuar na fila</button></div>' +
          '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-sair">Sair da fila</button></div>',
          {
            montar: (g2) => g2.querySelector("#confirmar-sair").addEventListener("click", () => {
              e.resolvida = true;
              fecharGaveta();
              aviso({ titulo: "Você saiu da fila", texto: "Sua vaga passou para a próxima pessoa.", icone: "info" });
              location.hash = "#inicio";
            }),
          }
        );
      });
    }

    return { titulo: "Lista de espera", html, montar };
  }

  function interruptor(chave, titulo, desc, ligado) {
    const id = "sw-" + chave;
    return (
      '<div class="interruptor-linha"><div class="interruptor-linha__texto"><strong id="' + id + '">' + titulo + "</strong><span>" + desc + "</span></div>" +
      '<button type="button" class="interruptor" role="switch" aria-checked="' + ligado + '" aria-labelledby="' + id + '" data-chave="' + chave + '"></button></div>'
    );
  }

  /* Família */
  function telaFamilia(sub) {
    const html =
      '<header class="topo"><h1 class="titulo-tela" tabindex="-1">Família</h1></header>' +
      '<p class="subtitulo-tela">Você cuida das consultas de ' + D.pessoas.length + " pessoas.</p>" +
      '<div class="cartao lista-cartao" style="margin-top:16px">' +
      D.pessoas.map((p) => {
        const c = proximas().find((k) => k.pessoa === p.id);
        return (
          '<a class="pessoa-linha" href="#pessoa/' + p.id + '">' + A.avatar(p, 56) +
          '<span class="item__corpo"><span class="pessoa-linha__nome" style="display:block">' + p.curto + (p.id === D.titular ? " (você)" : "") + "</span>" +
          '<span class="pessoa-linha__rel" style="display:block">' + p.relacao + " · " + p.idade + " anos</span>" +
          '<span class="pessoa-linha__prox">' + (c ? I("calendar-days") + esp(medico(c.medico).esp).nome + " · " + A.curto(c.data) : "Nenhuma consulta marcada") + "</span></span>" +
          I("chevron-right", "item__seta") + "</a>"
        );
      }).join("") +
      "</div>" +
      '<button type="button" class="botao botao--secundario botao--largo" id="adicionar" style="margin-top:16px">' + I("plus") + "Adicionar familiar</button>" +
      '<p class="nota-rodape">Cada pessoa tem uma cor própria. Ela aparece em todas as consultas e lembretes dessa pessoa, para não confundir de quem é cada compromisso.</p>';

    function abrirAdicionar() {
      abrirGaveta(
        '<h2 class="gaveta__titulo" id="gaveta-titulo">Adicionar familiar</h2>' +
        '<p class="gaveta__texto">Depois de adicionar, você pode marcar consultas para essa pessoa.</p>' +
        '<form id="form-familiar" class="formulario">' +
        '<div class="campo"><label for="f-nome">Nome completo</label><input id="f-nome" type="text" autocomplete="off" placeholder="Ex.: Ana Beatriz Santos"></div>' +
        '<div class="campo"><span class="campo__rotulo" id="f-rel">Parentesco</span><div class="opcoes" role="radiogroup" aria-labelledby="f-rel">' +
        ["Filho ou filha", "Mãe ou pai", "Avó ou avô", "Outra pessoa"].map((o, i) => '<button type="button" role="radio" aria-checked="' + (i === 0) + '">' + o + "</button>").join("") +
        "</div></div>" +
        '<div class="campo"><label for="f-nasc">Data de nascimento</label><input id="f-nasc" type="text" inputmode="numeric" placeholder="dd/mm/aaaa"></div>' +
        '<div class="gaveta__acoes"><button type="submit" class="botao botao--principal">Adicionar</button><button type="button" class="botao botao--secundario" data-fechar>Cancelar</button></div>' +
        "</form>",
        {
          montar: (g) => {
            g.querySelectorAll('.opcoes [role="radio"]').forEach((b) =>
              b.addEventListener("click", () => g.querySelectorAll('.opcoes [role="radio"]').forEach((x) => x.setAttribute("aria-checked", String(x === b))))
            );
            g.querySelector("#form-familiar").addEventListener("submit", (ev) => {
              ev.preventDefault();
              const nome = g.querySelector("#f-nome").value.trim();
              if (!nome) {
                const campo = g.querySelector("#f-nome");
                campo.setAttribute("aria-invalid", "true");
                if (!g.querySelector(".campo__erro")) campo.insertAdjacentHTML("afterend", '<p class="campo__erro">Escreva o nome da pessoa para continuar.</p>');
                campo.focus();
                return;
              }
              fecharGaveta();
              aviso({ titulo: "Prontinho: " + nome.split(" ")[0] + " agora está na família", texto: "No protótipo nada é salvo: é só uma demonstração.", icone: "users" });
            });
          },
        }
      );
    }

    function montar(el) {
      el.querySelector("#adicionar").addEventListener("click", abrirAdicionar);
      if (sub === "novo") setTimeout(abrirAdicionar, 280);
    }
    return { titulo: "Família", html, montar };
  }

  function telaPessoa(id) {
    const p = pessoa(id) || pessoa(D.titular);
    const consultas = proximas().filter((c) => c.pessoa === p.id);
    const lembretes = [];
    D.prevencao.forEach((mes) => mes.itens.forEach((it) => { if (it.pessoa === p.id) lembretes.push({ mes, it }); }));
    const espPadrao = p.idade < 18 ? "pediatria" : "clinica";
    const retornos = D.acompanhamento.retornos.filter((r) => r.pessoa === p.id);
    const exames = D.acompanhamento.exames.filter((x) => x.pessoa === p.id && x.status !== "agendado");
    const ret = retornos[0];
    const precisa = retornos.length || exames.length
      ? '<section class="secao">' + cabecaSecao("Precisa marcar") +
        '<div class="cartao lista-cartao">' +
        retornos.map((r) =>
          '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' + r.titulo + '</p><p class="prev-item__nota">Com ' + medico(r.medico).nome + ". " + r.origem + ".</p>" +
          '<div class="prev-item__acao">' + seloPrazo(r.prazo) + "</div></div></div>"
        ).join("") +
        exames.map((x) =>
          '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' + x.titulo + '</p><p class="prev-item__nota">' + x.obs + ". Exames são marcados pelo telefone da clínica.</p>" +
          '<div class="prev-item__acao">' + ligarClinica("Ligar para marcar") + "</div></div></div>"
        ).join("") +
        "</div></section>"
      : "";
    const cta = ret
      ? ["#agendar/" + ret.esp + "/" + p.id, "Marcar " + ret.titulo.charAt(0).toLowerCase() + ret.titulo.slice(1)]
      : ["#agendar/" + espPadrao + "/" + p.id, "Marcar consulta para " + (p.id === D.titular ? "mim" : p.curto)];
    const html =
      barra(p.curto, p.relacao) +
      '<div class="pessoa-topo">' + A.avatar(p, 112) +
      '<div><p class="titulo-tela" style="font-size:1.5rem">' + p.nome + '</p><p class="subtitulo-tela" style="margin-top:2px">' + p.relacao + " · " + p.idade + " anos</p></div></div>" +
      precisa +
      '<section class="secao">' + cabecaSecao("Próximas consultas") +
      (consultas.length
        ? consultas.map((c) => linhaConsulta(c)).join("")
        : '<p class="cartao">Nenhuma consulta marcada para ' + (p.id === D.titular ? "você" : p.tratamento) + ".</p>") +
      '<a class="botao botao--principal botao--largo" style="margin-top:12px" href="' + cta[0] + '">' + I("plus") + cta[1] + "</a>" +
      "</section>" +
      (lembretes.length
        ? '<section class="secao">' + cabecaSecao("Prevenção", "#prevencao", "Ver o ano") +
          '<div class="cartao lista-cartao">' +
          lembretes.map(({ mes, it }) =>
            '<div class="prev-item"><span class="item__corpo"><span class="prev-item__titulo" style="display:block">' + it.titulo + '</span><span class="prev-item__nota" style="display:block">' + cap(A.MESES_LONGOS[A.data(mes.mes + "-01").getMonth()]) + " · " + it.nota + "</span></span></div>"
          ).join("") +
          "</div></section>"
        : "") +
      '<section class="secao">' + cabecaSecao("Dados de saúde") +
      '<dl class="cartao lista-cartao ficha">' +
      "<div><dt>Cartão do SUS</dt><dd>" + p.sus + "</dd></div>" +
      "<div><dt>Alergias</dt><dd>" + p.alergias + "</dd></div>" +
      "</dl></section>";
    return { titulo: p.curto, html };
  }

  /* Prevenção */
  function telaPrevencao() {
    const html =
      barra("Calendário de prevenção", "Check-ups e exames de rotina") +
      '<div class="filtros" role="group" aria-label="Filtrar por pessoa" id="filtros"></div>' +
      '<div id="meses"></div>' +
      '<p class="nota-rodape">Sugestões feitas com base na idade de cada pessoa e nas campanhas do Ministério da Saúde. Elas não substituem a orientação do seu médico.</p>';

    function montar(el) {
      const filtros = el.querySelector("#filtros");
      const meses = el.querySelector("#meses");

      function desenhar() {
        const f = estado.prevFiltro;
        const conta = (id) => D.prevencao.reduce((s, m) => s + m.itens.filter((it) => id === "todos" || it.pessoa === id).length, 0);
        filtros.innerHTML =
          '<button type="button" class="filtro" aria-pressed="' + (f === "todos") + '" data-f="todos">Todos <span class="filtro__n">' + conta("todos") + "</span></button>" +
          D.pessoas.map((p) => '<button type="button" class="filtro" aria-pressed="' + (f === p.id) + '" data-f="' + p.id + '">' + A.avatar(p, 28) + nomeCurto(p) + ' <span class="filtro__n">' + conta(p.id) + "</span></button>").join("");

        meses.innerHTML = D.prevencao.map((mes, i) => {
          const itens = mes.itens.filter((it) => f === "todos" || it.pessoa === f);
          if (!itens.length) return "";
          return (
            '<div class="mes-bloco">' + A.folhaMes(mes.mes, { menta: i === 0 }) +
            '<div class="mes-bloco__corpo"><h2 class="mes-bloco__campanha">' + (mes.campanha || cap(A.MESES_LONGOS[A.data(mes.mes + "-01").getMonth()])) + '</h2><p class="mes-bloco__tema">' + mes.tema + "</p>" +
            '<div class="cartao">' +
            itens.map((it) => {
              const p = pessoa(it.pessoa);
              const feito = it.status === "agendado" || it.status === "feito";
              return (
                '<div class="prev-item">' + A.avatar(p, 36) +
                '<div class="item__corpo"><p class="prev-item__titulo">' + it.titulo + '</p><p class="prev-item__nota">Para ' + (p.id === D.titular ? "você" : p.tratamento) + " · " + it.nota + "</p>" +
                '<div class="prev-item__acao">' +
                (feito
                  ? '<span class="selo selo--feito">' + I("check") + (it.status === "feito" ? "Feito" : "Marcado") + "</span>" +
                    (it.status === "feito" ? '<button type="button" class="botao botao--texto-perigo botao--pequeno" data-desfazer="' + mes.mes + "|" + it.pessoa + "|" + it.titulo + '">Desfazer</button>' : "")
                  : '<span class="selo selo--alerta">Não marcado</span>' +
                    (it.esp
                      ? '<a class="botao botao--secundario botao--pequeno" href="#agendar/' + it.esp + "/" + it.pessoa + '">Agendar</a>'
                      : '<button type="button" class="botao botao--secundario botao--pequeno" data-feito="' + mes.mes + "|" + it.pessoa + "|" + it.titulo + '">Já fiz</button>')) +
                "</div></div></div>"
              );
            }).join("") +
            "</div></div></div>"
          );
        }).join("");
      }

      desenhar();
      el.addEventListener("click", (ev) => {
        const bf = ev.target.closest("[data-f]");
        if (bf) { estado.prevFiltro = bf.dataset.f; desenhar(); return; }
        const bd = ev.target.closest("[data-desfazer]");
        if (bd) {
          const [mesId, pid, titulo] = bd.dataset.desfazer.split("|");
          D.prevencao.find((x) => x.mes === mesId).itens.find((x) => x.pessoa === pid && x.titulo === titulo).status = "pendente";
          desenhar();
          anunciar(titulo + " voltou para não marcado.");
          return;
        }
        const bk = ev.target.closest("[data-feito]");
        if (bk) {
          const [mesId, pid, titulo] = bk.dataset.feito.split("|");
          const it = D.prevencao.find((m) => m.mes === mesId).itens.find((x) => x.pessoa === pid && x.titulo === titulo);
          it.status = "feito";
          desenhar();
          anunciar(titulo + " marcado como feito.");
        }
      });
    }
    return { titulo: "Calendário de prevenção", html, montar };
  }

  /* Agenda */
  function telaAgenda() {
    const html =
      '<header class="topo"><h1 class="titulo-tela" tabindex="-1">Agenda</h1>' +
      '<a class="botao-icone pressionavel" href="#assistente" aria-label="Marcar uma consulta">' + I("plus") + "</a></header>" +
      '<div class="abas abas--agenda" role="tablist" aria-label="Como ver a agenda">' +
      '<button type="button" role="tab" id="aba-cal" aria-controls="painel-agenda" aria-selected="' + (estado.agendaAba === "calendario") + '" data-aba="calendario">' + I("calendar-days") + "Calendário</button>" +
      '<button type="button" role="tab" id="aba-lista" aria-controls="painel-agenda" aria-selected="' + (estado.agendaAba === "lista") + '" data-aba="lista">' + I("list") + "Lista</button>" +
      "</div>" +
      '<div id="painel-agenda" role="tabpanel"></div>' +
      '<section class="secao">' + cabecaSecao("Depois da consulta") +
      '<a class="cartao item pressionavel" href="#acompanhamento" style="padding:14px 16px">' +
      '<span class="notif__icone">' + I("repeat") + '</span><span class="item__corpo"><span class="item__titulo" style="display:block">Retornos e exames pedidos</span><span class="item__sub" style="display:block">1 retorno e 2 exames para acompanhar</span></span>' +
      I("chevron-right", "item__seta") + "</a></section>";

    function montar(el) {
      const painel = el.querySelector("#painel-agenda");
      function desenhar() {
        const cal = estado.agendaAba === "calendario";
        el.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === estado.agendaAba)));
        painel.setAttribute("aria-labelledby", cal ? "aba-cal" : "aba-lista");
        estado.calAtivo = null;
        if (cal) {
          estado.calAtivo = window.CalPaciente.criar(painel, {
            D, estado: estado.cal, limites: ["2026-09", "2027-04"], anunciar, aoConfirmarVaga: abrirVaga,
          });
          return;
        }
        const itens = proximas().map((c) => ({ data: c.data, html: linhaConsulta(c) }));
        (D.feriados || []).filter((f) => A.diasAte(f.data) >= 0).forEach((f) => {
          itens.push({
            data: f.data,
            html: '<div class="cartao agenda-item agenda-item--feriado">' + A.folha(f.data) +
              '<span class="consulta-cartao__corpo"><span class="consulta-cartao__esp">Feriado: ' + f.nome + '</span><span class="consulta-cartao__medico">A clínica não abre neste dia.</span></span></div>',
          });
        });
        itens.sort((a, b) => a.data.localeCompare(b.data));
        const passadas = ordenar(D.passadas).reverse();
        painel.innerHTML =
          '<section class="secao" style="margin-top:18px" aria-labelledby="t-prox">' + cabecaSecao("Próximas", null, null, "t-prox") +
          (itens.length ? itens.map((x) => x.html).join("") : '<p class="cartao">Nenhuma consulta marcada.</p>') + "</section>" +
          '<section class="secao" aria-labelledby="t-pass">' + cabecaSecao("Já realizadas", null, null, "t-pass") +
          (passadas.length ? passadas.map((c) => linhaConsulta(c, true)).join("") : '<p class="cartao">Nenhuma consulta realizada.</p>') + "</section>";
      }
      desenhar();
      el.querySelectorAll('[role="tab"]').forEach((b) => b.addEventListener("click", () => {
        if (estado.agendaAba === b.dataset.aba) return;
        estado.agendaAba = b.dataset.aba;
        desenhar();
        painel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease" });
      }));
      /* momento pendente: vaga chegando ou carimbo de consulta marcada */
      const p = estado.pendente;
      estado.pendente = null;
      if (p && estado.calAtivo) {
        const cal = estado.calAtivo;
        setTimeout(() => {
          if (!el.isConnected) return;
          if (p.tipo === "vaga") cal.chegarVaga();
          if (p.tipo === "carimbo") cal.carimbar(p.data);
        }, MOV.reduzido() ? 60 : 420);
      }
    }
    return { titulo: "Agenda", html, montar };
  }

  function telaConsulta(id) {
    const c = D.consultas.find((k) => k.id === id) || D.passadas.find((k) => k.id === id);
    if (!c) return telaAgenda();
    const passada = D.passadas.includes(c);
    const m = medico(c.medico), p = pessoa(c.pessoa);
    const html =
      barra("Consulta", passada ? "Realizada" : cap(A.relativo(c.data))) +
      '<div class="cartao consulta-cartao" style="margin-top:8px">' + A.folha(c.data, { bloco: true }) +
      '<span class="consulta-cartao__corpo"><span class="consulta-cartao__esp">' + esp(m.esp).nome + '</span><span class="consulta-cartao__medico">' + m.nome + "</span>" +
      '<span class="pessoa-chip">' + A.avatar(p, 30) + "Para " + (p.id === D.titular ? "você" : p.tratamento) + "</span></span></div>" +
      '<dl class="cartao lista-cartao ficha" style="margin-top:12px">' +
      "<div><dt>Data</dt><dd>" + cap(A.extenso(c.data)) + "</dd></div>" +
      '<div><dt>Horário</dt><dd class="num">' + c.hora + "</dd></div>" +
      "<div><dt>Local</dt><dd>" + D.clinica.nome + ", " + c.sala + "<br>" + D.clinica.endereco + "</dd></div>" +
      "<div><dt>Motivo</dt><dd>" + c.motivo + "</dd></div>" +
      (c.gerou ? "<div><dt>Depois</dt><dd>" + c.gerou + "</dd></div>" : "") +
      "</dl>" +
      (passada
        ? ""
        : '<div class="gaveta__acoes" style="margin-top:16px">' +
          '<a class="botao botao--principal" href="https://www.google.com/maps/search/' + encodeURIComponent(D.clinica.endereco) + '" target="_blank" rel="noopener">' + I("map-pin") + "Como chegar</a>" +
          '<a class="botao botao--secundario" href="#agendar/' + m.esp + "/" + p.id + '">' + I("calendar-days") + "Remarcar</a>" +
          '<a class="botao botao--secundario" href="tel:' + D.clinica.telefoneLink + '">' + I("phone") + "Ligar para a clínica " + D.clinica.telefone + "</a></div>" +
          '<p class="aviso-falta">' + I("info") + "<span>Se não puder ir, cancele ou remarque antes. Quem passa de " + D.politica.toleranciaMin + " minutos de atraso é marcado como falta, com multa de <b>" + A.reais(D.politica.multa) + "</b>.</span></p>" +
          '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="cancelar">Cancelar consulta</button><p>A vaga vai para quem está na lista de espera.</p></div>');

    function montar(el) {
      const b = el.querySelector("#cancelar");
      if (!b) return;
      b.addEventListener("click", () => {
        abrirGaveta(
          '<h2 class="gaveta__titulo" id="gaveta-titulo">Cancelar esta consulta?</h2>' +
          '<p class="gaveta__texto">' + esp(m.esp).nome + " com " + m.nome + ", " + A.extenso(c.data) + ", às " + c.hora + ".</p>" +
          '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Manter consulta</button></div>' +
          '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-cancelar">Sim, cancelar consulta</button></div>',
          {
            montar: (g) => g.querySelector("#confirmar-cancelar").addEventListener("click", () => {
              D.consultas = D.consultas.filter((k) => k !== c);
              fecharGaveta();
              aviso({ titulo: "Consulta cancelada", texto: "A vaga foi oferecida a quem está na lista de espera.", icone: "info" });
              location.hash = "#agenda";
            }),
          }
        );
      });
    }
    return { titulo: "Consulta", html, montar };
  }

  /* Depois da consulta */
  function telaAcompanhamento() {
    const ac = D.acompanhamento;
    const html =
      barra("Depois da consulta", "Retornos, exames e próximas consultas") +
      '<section class="secao" style="margin-top:12px">' + cabecaSecao("Retornos") +
      '<div class="cartao lista-cartao">' +
      ac.retornos.map((r) => {
        const p = pessoa(r.pessoa);
        return (
          '<div class="prev-item">' + A.avatar(p, 40) +
          '<div class="item__corpo"><p class="prev-item__titulo">' + r.titulo + '</p><p class="prev-item__nota">' + p.curto + " · com " + medico(r.medico).nome + "<br>" + r.origem + ". Marcar até " + A.extenso(r.prazo, false) + ".</p>" +
          '<div class="prev-item__acao">' + seloPrazo(r.prazo) + '<a class="botao botao--principal botao--pequeno" href="#agendar/' + r.esp + "/" + r.pessoa + '">Agendar retorno</a></div></div></div>'
        );
      }).join("") +
      "</div></section>" +
      '<section class="secao">' + cabecaSecao("Exames pedidos") +
      '<div class="cartao lista-cartao">' +
      ac.exames.map((x) => {
        const p = pessoa(x.pessoa);
        const c = x.consulta ? D.consultas.find((k) => k.id === x.consulta) : null;
        return (
          '<div class="prev-item">' + A.avatar(p, 40) +
          '<div class="item__corpo"><p class="prev-item__titulo">' + x.titulo + '</p><p class="prev-item__nota">' + p.curto + " · pedido por " + medico(x.pedidoPor).nome + "<br>" + x.obs + ".</p>" +
          '<div class="prev-item__acao">' +
          (c
            ? '<span class="selo selo--feito">' + I("check") + "Marcado: " + A.curto(c.data) + ", " + c.hora + "</span>"
            : '<span class="selo selo--alerta">Não marcado</span>' + ligarClinica("Ligar para marcar")) +
          "</div></div></div>"
        );
      }).join("") +
      "</div></section>" +
      '<section class="secao">' + cabecaSecao("Próximas consultas", "#agenda", "Ver agenda") +
      proximas().slice(0, 3).map((c) => linhaConsulta(c)).join("") +
      "</section>";
    return { titulo: "Depois da consulta", html };
  }

  /* Perfil e acessibilidade */
  function telaPerfil() {
    const t = pessoa(D.titular);
    const texto = lerPref("texto", "normal");
    const reduzido = lerPref("movimento", "sistema") === "reduzido";
    const html =
      '<header class="topo"><h1 class="titulo-tela" tabindex="-1">Perfil</h1></header>' +
      '<div class="cartao item" style="margin-top:12px;padding:14px 16px">' + A.avatar(t, 64) +
      '<span class="item__corpo"><span class="item__titulo" style="display:block;font-size:1.125rem">' + t.nome + '</span><span class="item__sub" style="display:block">juliana.santos@exemplo.com</span></span></div>' +
      '<section class="secao">' + cabecaSecao("Acessibilidade", null, null, "t-acess") +
      '<div class="cartao"><p class="item__titulo" id="t-texto">Tamanho do texto</p>' +
      '<div class="segmentado" role="radiogroup" aria-labelledby="t-texto">' +
      [["normal", "A", "Normal"], ["grande", "A+", "Grande"], ["muito-grande", "A++", "Extra"]]
        .map(([v, s, n]) => '<button type="button" role="radio" aria-checked="' + (texto === v) + '" data-texto="' + v + '"><span aria-hidden="true">' + s + "</span>" + n + "</button>").join("") +
      "</div>" +
      '<p class="item__sub" style="margin-top:10px">Assim fica o texto em todas as telas do app.</p>' +
      '<div class="lista-cartao" style="padding:0;margin-top:6px">' +
      interruptor("movimento", "Reduzir movimento", "Desliga os deslizes entre telas. O app também segue a opção do seu celular.", reduzido) +
      "</div></div></section>" +
      '<section class="secao">' + cabecaSecao("Avisos") +
      '<div class="cartao lista-cartao">' +
      interruptor("lembrete", "Lembrete de consulta", "Um dia antes e duas horas antes", true) +
      interruptor("fila", "Vagas da lista de espera", "Avisamos assim que abrir uma vaga", true) +
      interruptor("prev", "Calendário de prevenção", "No começo de cada mês", true) +
      "</div></section>" +
      '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="sair">' + I("log-out") + "Sair da conta</button></div>";

    function montar(el) {
      el.querySelectorAll("[data-texto]").forEach((b) =>
        b.addEventListener("click", () => {
          gravarPref("texto", b.dataset.texto);
          aplicarPrefs();
          el.querySelectorAll("[data-texto]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
          anunciar("Tamanho do texto: " + b.textContent.replace(/^A\+*/, ""));
        })
      );
      el.addEventListener("click", (ev) => {
        const sw = ev.target.closest('[role="switch"]');
        if (!sw) return;
        const ligado = sw.getAttribute("aria-checked") !== "true";
        sw.setAttribute("aria-checked", String(ligado));
        if (sw.dataset.chave === "movimento") {
          gravarPref("movimento", ligado ? "reduzido" : "sistema");
          aplicarPrefs();
        }
      });
      el.querySelector("#sair").addEventListener("click", () => {
        aviso({ titulo: "Saída desativada no protótipo", texto: "Na versão final, você voltaria para a tela de login.", icone: "info" });
      });
    }
    return { titulo: "Perfil", html, montar };
  }

  function telaNotificacoes() {
    const destinos = { lembrete: "#consulta/c1", fila: "#espera", retorno: "#acompanhamento", prevencao: "#prevencao" };
    const html =
      barra("Notificações") +
      '<div class="cartao lista-cartao" style="margin-top:8px">' +
      D.notificacoes.map((n) =>
        '<a class="notif' + (n.nova && !estado.notifLidas ? " notif--nova" : "") + '" href="' + destinos[n.tipo] + '" style="text-decoration:none">' +
        '<span class="notif__icone">' + I(n.icone) + "</span>" +
        '<span class="item__corpo"><span class="notif__texto" style="display:block">' + n.texto + '</span><span class="notif__quando" style="display:block">' +
        (n.nova && !estado.notifLidas ? '<span class="notif__nova">Nova</span> · ' : "") + n.quando + "</span></span></a>"
      ).join("") +
      "</div>";
    return { titulo: "Notificações", html, montar: () => { estado.notifLidas = true; } };
  }

  const TELAS = {
    inicio: telaInicio,
    assistente: telaAssistente,
    agendar: telaAgendar,
    espera: telaEspera,
    familia: telaFamilia,
    pessoa: telaPessoa,
    prevencao: telaPrevencao,
    agenda: telaAgenda,
    consulta: telaConsulta,
    acompanhamento: telaAcompanhamento,
    perfil: telaPerfil,
    notificacoes: telaNotificacoes,
  };

  /* ─── Avisos (notificação que desce do topo) ─── */
  function aviso(o) {
    avisos.querySelectorAll(".aviso").forEach((v) => v.remove());
    const el = document.createElement("div");
    el.className = "aviso";
    el.setAttribute("role", o.acoes ? "alertdialog" : "status");
    el.setAttribute("aria-label", o.titulo);
    el.innerHTML =
      '<p class="aviso__cabeca">' + I(o.icone || "bell-ring") + (o.cabeca || "AgendaPro Saúde") + "</p>" +
      '<p class="aviso__titulo">' + o.titulo + "</p>" +
      (o.texto ? '<p class="aviso__texto">' + o.texto + "</p>" : "") +
      (o.acoes ? '<div class="aviso__acoes">' + o.acoes.map((a, i) => '<button type="button" class="botao ' + a.classe + '" data-i="' + i + '">' + a.rotulo + "</button>").join("") + "</div>" : "");
    avisos.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("visivel")));
    if (o.acoes) {
      el.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-i]");
        if (!b) return;
        fecharAviso(el);
        o.acoes[Number(b.dataset.i)].acao();
      });
      setTimeout(() => { const b = el.querySelector("[data-i='1']"); if (b) b.focus({ preventScroll: true }); }, 60);
    } else {
      setTimeout(() => fecharAviso(el), 4200);
    }
    return el;
  }
  function fecharAviso(el) {
    el.classList.remove("visivel");
    setTimeout(() => el.remove(), 260);
  }

  /* ─── Gaveta ─── */
  let focoAntes = null;
  function abrirGaveta(html, opcoes) {
    opcoes = opcoes || {};
    focoAntes = document.activeElement;
    gavetaCamada.hidden = false;
    gavetaCamada.innerHTML = '<div class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo"><div class="gaveta__puxador" aria-hidden="true"></div>' + html + "</div>";
    const g = gavetaCamada.querySelector(".gaveta");
    requestAnimationFrame(() => requestAnimationFrame(() => gavetaCamada.classList.add("aberta")));
    if (opcoes.montar) opcoes.montar(g);
    setTimeout(() => {
      const alvo = g.querySelector("input, button, a[href]");
      if (alvo) alvo.focus({ preventScroll: true });
    }, 80);
  }
  function fecharGaveta(imediato) {
    if (gavetaCamada.hidden) return;
    gavetaCamada.classList.remove("aberta");
    const fim = () => { gavetaCamada.hidden = true; gavetaCamada.innerHTML = ""; };
    if (imediato) fim(); else setTimeout(fim, 240);
    if (focoAntes && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
  }
  gavetaCamada.addEventListener("click", (ev) => {
    if (ev.target === gavetaCamada || ev.target.closest("[data-fechar]")) fecharGaveta();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !gavetaCamada.hidden) fecharGaveta();
    if (ev.key === "Tab" && !gavetaCamada.hidden) {
      const focaveis = Array.from(gavetaCamada.querySelectorAll("a[href], button, input, textarea"));
      if (!focaveis.length) return;
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
    }
  });

  /* ─── Número que gira (posição na fila) ─── */
  function rolar(el, novo) {
    const velho = el.textContent;
    if (A.movimentoReduzido()) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(() => {
        el.textContent = novo;
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      });
      return;
    }
    el.innerHTML = '<span class="rolo"><span class="rolo__trilho"><span>' + velho + "</span><span>" + novo + "</span></span></span>";
    const rolo = el.querySelector(".rolo");
    const trilho = el.querySelector(".rolo__trilho");
    const h = trilho.firstElementChild.getBoundingClientRect().height;
    rolo.style.height = h + "px";
    trilho.animate([{ transform: "translateY(0)" }, { transform: "translateY(-" + h + "px)" }], {
      duration: 560,
      easing: "cubic-bezier(0.77, 0, 0.175, 1)",
      fill: "forwards",
    }).finished.then(() => { el.textContent = novo; });
  }

  function anunciar(texto) {
    anunciador.textContent = "";
    setTimeout(() => { anunciador.textContent = texto; }, 30);
  }

  /* ─── Navegação ─── */
  function rotaAtual() {
    const hash = location.hash.replace(/^#\/?/, "") || "inicio";
    const partes = hash.split("/");
    const nome = TELAS[partes[0]] ? partes[0] : "inicio";
    return { hash: nome === partes[0] ? hash : "inicio", nome, args: partes.slice(1) };
  }

  let atual = null;

  function rolavel(el) {
    return el.querySelector(".rolagem, .conversa") || el;
  }

  function navegar() {
    const r = rotaAtual();
    fecharGaveta(true);
    const pilha = estado.pilha;
    let direcao;
    if (!atual) { direcao = "nenhuma"; pilha.push(r.hash); }
    else if (r.hash === atual.hash) { return; }
    else if (pilha.length > 1 && pilha[pilha.length - 2] === r.hash) { direcao = "voltar"; pilha.pop(); }
    else if (TOPO.includes(r.hash)) {
      direcao = pilha[0] === r.hash && pilha.length > 1 ? "voltar" : "trocar";
      pilha.length = 0;
      pilha.push(r.hash);
    } else { direcao = "avancar"; pilha.push(r.hash); }

    if (atual) estado.rolagem[atual.hash] = rolavel(atual.el).scrollTop;
    if (TOPO.includes(r.nome)) estado.aba = r.nome;

    const def = TELAS[r.nome].apply(null, r.args);
    viewport.querySelectorAll(".tela.saindo").forEach((t) => t.remove());

    const el = document.createElement("section");
    el.className = "tela" + (def.coluna ? " tela--coluna" : "") + (SEM_NAV.includes(r.nome) ? " sem-nav" : "");
    el.setAttribute("aria-label", def.titulo);
    el.innerHTML = def.html;
    viewport.appendChild(el);
    if (def.montar) def.montar(el);

    if (direcao === "voltar" && estado.rolagem[r.hash]) rolavel(el).scrollTop = estado.rolagem[r.hash];

    nav.classList.toggle("oculta", SEM_NAV.includes(r.nome));
    nav.querySelectorAll("a").forEach((a) => {
      if (a.dataset.aba === estado.aba) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.querySelectorAll(".palco__atalhos a").forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + r.nome)));

    const antiga = atual && atual.el;
    animar(el, antiga, direcao);
    atual = { hash: r.hash, nome: r.nome, el };

    if (r.nome === "inicio") estado.primeiraVez = false;
    if (direcao !== "nenhuma") {
      const h1 = el.querySelector("h1");
      if (h1) h1.focus({ preventScroll: true });
      anunciar(def.titulo);
    }
  }

  function animar(nova, antiga, direcao) {
    if (!antiga) return;
    antiga.classList.add("saindo");
    antiga.style.pointerEvents = "none";
    const reduzido = A.movimentoReduzido();
    const easing = "cubic-bezier(0.23, 1, 0.32, 1)";
    let entra, sai;
    if (reduzido || direcao === "trocar") {
      entra = [{ opacity: 0 }, { opacity: 1 }];
      sai = [{ opacity: 1 }, { opacity: 0 }];
    } else if (direcao === "avancar") {
      entra = [{ opacity: 0, transform: "translateX(36px)" }, { opacity: 1, transform: "translateX(0)" }];
      sai = [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-28px)" }];
    } else {
      entra = [{ opacity: 0, transform: "translateX(-28px)" }, { opacity: 1, transform: "translateX(0)" }];
      sai = [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(36px)" }];
    }
    nova.animate(entra, { duration: reduzido ? 160 : 280, easing, fill: "backwards" });
    const s = antiga.animate(sai, { duration: reduzido ? 120 : 200, easing, fill: "forwards" });
    const remover = () => antiga.remove();
    s.finished.then(remover, remover);
  }

  document.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-voltar]")) {
      if (estado.pilha.length > 1) history.back();
      else location.hash = "#inicio";
    }
  });

  document.querySelectorAll("[data-marca]").forEach((el) => { el.outerHTML = A.marca(Number(el.dataset.marca)); });

  window.addEventListener("hashchange", navegar);
  navegar();
})();
