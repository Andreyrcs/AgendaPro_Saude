/* AgendaPro Saúde — área do paciente na versão para celular. Os dados e as ações vêm da API (paciente-servicos.js);
   a tela só começa depois que os dados chegam. Todo texto que vem da API passa por A.esc() antes de entrar no HTML. */
window.PACIENTE.iniciar(function () {
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
    cal: { mes: D.hoje.slice(0, 7), filtro: "todos", foco: null },
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

  /* ─── Dados ─── (ids da API são números; os do endereço e do HTML chegam como texto: A.mesmoId) */
  const E = A.esc;
  const pessoa = (id) => D.pessoas.find((p) => A.mesmoId(p.id, id));
  const medico = (id) => D.medicos.find((m) => A.mesmoId(m.id, id)) || { id, nome: "", esp: null, cor: "#e2ecf0" };
  const esp = (id) => D.especialidades[id] || { nome: "", desc: "" };
  const medicosDa = (espId) => D.medicos.filter((m) => A.mesmoId(m.esp, espId));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const nomeCurto = (p) => (A.mesmoId(p.id, D.titular) ? "Você" : p.curto);
  /* a especialidade de clínica geral (para "Marcar consulta" sem especialidade escolhida) e a de pediatria, pelo nome */
  const semAcento = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const espPeloNome = (nome) => Object.keys(D.especialidades).find((k) => semAcento(D.especialidades[k].nome) === nome);
  const espPadraoPara = (p) => (p && p.idade !== null && p.idade < 18 && espPeloNome("pediatria")) || espPeloNome("clinica geral") || Object.keys(D.especialidades)[0] || "";
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
    if (frente <= 0) return "Você é a próxima pessoa da fila";
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
      '<div><h1 class="barra-tela__titulo" tabindex="-1">' + E(titulo) + "</h1>" +
      (sub ? '<p class="barra-tela__sub">' + E(sub) + "</p>" : "") +
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
    return '<a class="botao botao--secundario botao--pequeno" href="tel:' + E(D.clinica.telefoneLink) + '">' + I("phone") + rotulo + "</a>";
  }

  function seloPrazo(iso) {
    const n = A.diasAte(iso);
    return '<span class="selo selo--alerta">' + I("clock") + (n <= 0 ? "Prazo hoje" : "Faltam " + n + " dias") + "</span>";
  }

  /* texto puro (sem HTML): quem usa em HTML passa por E() */
  function rotuloConsulta(c) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    return esp(m.esp).nome + " com " + m.nome + ", " + A.extenso(c.data) + ", às " + c.hora + ", para " + (A.mesmoId(p.id, D.titular) ? "você" : p.tratamento);
  }

  function linhaConsulta(c, passada) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    return (
      '<a class="cartao agenda-item pressionavel" href="#consulta/' + c.id + '" aria-label="' + E(rotuloConsulta(c)) + '">' +
      A.folha(c.data) +
      '<span class="consulta-cartao__corpo">' +
      '<span class="consulta-cartao__esp">' + E(esp(m.esp).nome) + "</span>" +
      '<span class="consulta-cartao__medico">' + E(m.nome) + "</span>" +
      '<span class="meta">' + I("clock") + '<span class="num">' + c.hora + "</span>" + (passada ? " · " + D.STATUS_CONSULTA[c.status || "atendida"] : " · " + A.relativo(c.data)) + "</span>" +
      '<span class="pessoa-chip">' + A.avatar(p, 28) + E(nomeCurto(p)) + "</span>" +
      "</span>" +
      I("chevron-right", "item__seta") +
      "</a>"
    );
  }

  /* ─── Telas ─── */

  /* ─── Presença e faltas: cartão "Confirme sua consulta", faltas registradas e restrição ─── */
  function restricaoHTML(r) {
    return '<div class="aviso-regra aviso-regra--forte" role="note">' + I("info") + "<span><b>" + E(r.titulo) + ".</b>" + E(r.texto) +
      (r.tipo === "so_recepcao"
        ? '<br><a class="botao botao--principal" style="margin-top:10px" href="tel:' + E(D.clinica.telefoneLink) + '">' + I("phone") + "Ligar para a clínica · " + E(D.clinica.telefone) + "</a>"
        : "") + "</span></div>";
  }
  function presencaHTML() {
    let h = PACIENTE.paraConfirmar().map((c) => {
      const m = medico(c.medico);
      const p = pessoa(c.pessoa);
      const amanha = c.data > D.hoje;
      return '<section class="confirmar-presenca" aria-label="Confirmar presença">' +
        "<p><b>Confirme sua consulta " + (amanha ? "de amanhã" : "de hoje") + "</b><br>" + E(esp(m.esp).nome) + " com " + E(m.nome) + ", às " + c.hora +
        (A.mesmoId(p.id, D.titular) ? "" : " · para " + E(p.curto)) + ".</p>" +
        (amanha ? '<p style="font-size:0.875rem">Se não puder ir, toque em “Não vou” até o fim de hoje: não há nenhuma consequência.</p>' : "") +
        '<div class="confirmar-presenca__acoes"><button type="button" class="botao botao--principal" data-vou="' + c.id + '">Vou</button>' +
        '<button type="button" class="botao botao--secundario" data-naovou="' + c.id + '">Não vou</button></div></section>';
    }).join("");
    const r = PACIENTE.avisoDeRestricao();
    if (r) h += restricaoHTML(r);
    if (PACIENTE.situacao().faltas) h += '<p class="item__sub" style="margin:0 0 12px">' + PACIENTE.textoDasFaltas() + "</p>";
    return h;
  }

  function telaInicio() {
    const t = pessoa(D.titular);
    const prox = proximas()[0];
    const e = D.espera;
    const novos = PACIENTE.avisosNovos(); /* F27: o número do sino vem dos avisos não lidos */
    let html = '<div class="' + (estado.primeiraVez ? "entrada" : "") + '">';

    html +=
      '<header class="topo anima" style="--i:0">' +
      '<div class="marca-app">' + A.marca(30) + "<span>AgendaPro <b>Saúde</b></span></div>" +
      '<a class="botao-icone pressionavel" href="#notificacoes" aria-label="Notificações' + (novos ? ", " + novos + (novos === 1 ? " nova" : " novas") : "") + '">' + I("bell") +
      (novos ? '<span class="contador" aria-hidden="true">' + novos + "</span>" : "") + "</a>" +
      "</header>";

    html +=
      '<div class="anima" style="--i:1"><p class="saudacao">Olá, ' + E(t ? t.curto : "") + '</p>' +
      '<h1 class="titulo-tela" tabindex="-1">Como você está se sentindo hoje?</h1></div>';
    html += '<div class="anima" style="--i:2">' + presencaHTML() + "</div>";


    html +=
      '<section class="assistente sobre-noite anima" style="--i:2" aria-labelledby="t-assistente">' +
      '<div class="assistente__cabeca">' + I("message-circle-heart") + '<h2 id="t-assistente" style="font-size:1rem">Assistente de saúde</h2></div>' +
      '<p class="assistente__aviso" style="margin:8px 0 12px">Conte o que você ou alguém da família está sentindo e eu indico a especialidade certa.</p>' +
      '<a class="campo-falso pressionavel" href="#assistente"><span>Conte o que você está sentindo</span><span class="campo-falso__enviar">' + I("send") + "</span></a>" +
      '<div class="assistente__rodape"><p class="assistente__aviso">Orienta, mas não faz diagnóstico.</p>' +
      '<a class="assistente__192 pressionavel" href="tel:192" aria-label="Emergência: ligar 192, SAMU">' + I("phone") + "Ligar 192</a></div>" +
      "</section>";

    if (prox) {
      const m = medico(prox.medico), p = pessoa(prox.pessoa);
      html +=
        '<section class="secao anima" style="--i:3">' +
        cabecaSecao("Próxima consulta", "#agenda", "Ver agenda") +
        '<a class="cartao consulta-cartao pressionavel" href="#consulta/' + prox.id + '" aria-label="Próxima consulta: ' + E(rotuloConsulta(prox)) + '">' +
        A.folha(prox.data, { bloco: true }) +
        '<span class="consulta-cartao__corpo">' +
        '<span class="consulta-cartao__topo"><span class="consulta-cartao__esp">' + E(esp(m.esp).nome) + '</span><span class="selo selo--menta">' + cap(A.relativo(prox.data)) + "</span></span>" +
        '<span class="consulta-cartao__medico">' + E(m.nome) + "</span>" +
        '<span class="meta">' + I("clock") + '<span class="num">' + prox.hora + "</span>" + (prox.sala ? " · " + E(prox.sala) : "") + "</span>" +
        '<span class="pessoa-chip">' + A.avatar(p, 30) + "Para " + (A.mesmoId(p.id, D.titular) ? "você" : E(p.tratamento)) + "</span>" +
        "</span></a></section>";
    } else {
      html +=
        '<section class="secao anima" style="--i:3">' + cabecaSecao("Próxima consulta") +
        '<p class="cartao">Nenhuma consulta marcada. Para marcar, conte ao assistente o que está sentindo ou vá em ' +
        '<a href="#agendar/' + espPadraoPara(t) + "/" + (t ? t.id : "") + '">Marcar consulta</a>.</p></section>';
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
    if (e && e.posicao > 0) {
      const m = medico(e.medico);
      html +=
        '<a class="cartao espera-cartao pressionavel" href="#espera" aria-label="' + E("Lista de espera: você está na posição " + e.posicao + " da fila para " + esp(m.esp).nome + " com " + m.nome + ". " + textoFila(e.posicao) + ".") + '">' +
        '<span class="espera-cartao__topo"><span class="espera-cartao__rotulo">' + (e.oferta ? "Vaga oferecida" : "Aguardando vaga") + "</span></span>" +
        '<span class="espera-cartao__meio"><span class="posicao">' + e.posicao + '</span><span class="espera-cartao__texto"><strong>Você está na posição ' + e.posicao + " da fila</strong><span>" + E(esp(m.esp).nome) + " · " + E(m.nome) + "</span></span></span>" +
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
      D.pessoas.map((p) => '<li><a class="membro pressionavel" href="#pessoa/' + p.id + '">' + A.avatar(p, 64) + "<span>" + E(nomeCurto(p)) + "</span></a></li>").join("") +
      '<li><a class="membro pressionavel" href="#familia/novo"><span class="membro__adicionar">' + I("plus") + "</span><span>Adicionar</span></a></li>" +
      "</ul></section>";

    const r = D.acompanhamento.retornos[0];
    const ex = D.acompanhamento.exames;
    html +=
      '<section class="secao anima" style="--i:6">' +
      cabecaSecao("Depois da consulta", "#acompanhamento", "Ver tudo") +
      (r || ex.length
        ? '<div class="cartao lista-cartao">' +
          (r
            ? '<a class="item" href="#agendar/' + r.esp + "/" + r.pessoa + '">' + A.avatar(pessoa(r.pessoa), 40) +
              '<span class="item__corpo"><span class="item__titulo">' + E(r.titulo) + '</span><span class="item__sub" style="display:block">' + E(pessoa(r.pessoa).curto) + " · marcar até " + A.extenso(r.prazo, false) + "</span></span>" +
              I("chevron-right", "item__seta") + "</a>"
            : "") +
          /* F28: o exame pedido pelo médico só é "pendente" ou "realizado" (a API manda só os pendentes) */
          ex.map((x) => {
            const p = pessoa(x.pessoa);
            return (
              '<a class="item" href="#acompanhamento">' + A.avatar(p, 40) +
              '<span class="item__corpo"><span class="item__titulo">' + E(x.titulo) + '</span><span class="item__sub" style="display:block">' +
              E(p.curto) + " · " + E(x.obs) + "</span>" +
              '<span class="selo selo--alerta" style="margin-top:6px">Exame pendente</span>' +
              "</span>" + I("chevron-right", "item__seta") + "</a>"
            );
          }).join("") +
          "</div>"
        : '<p class="cartao">Nada pendente. Quando o médico pedir um retorno ou um exame, ele aparece aqui.</p>') +
      "</section>";

    html +=
      '<section class="secao anima" style="--i:7">' +
      cabecaSecao("Prevenção", "#prevencao", "Ver o ano") +
      '<ul class="meses-linha">' +
      D.prevencao.slice(0, 4).map((mes, i) => {
        const d = A.data(mes.mes + "-01");
        return (
          '<li style="display:contents"><a class="mes-cartao pressionavel' + (i === 0 ? " mes-cartao--atual" : "") + '" href="#prevencao">' +
          '<span class="mes-cartao__faixa"><span class="mes-cartao__mes">' + cap(A.MESES_LONGOS[d.getMonth()]) + '</span><span class="mes-cartao__ano">' + (i === 0 ? "Este mês" : d.getFullYear()) + "</span></span>" +
          '<span class="mes-cartao__corpo"><span class="mes-cartao__campanha">' + E(mes.campanha || mes.tema) + "</span>" +
          mes.itens.map((it) => '<span class="mes-cartao__item">' + A.avatar(pessoa(it.pessoa), 28) + "<span>" + E(it.titulo) + "</span></span>").join("") +
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
    { t: "Meu filho está com dor de ouvido" },
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
    const intro = A.mesmoId(p.id, D.titular)
      ? "Entendi. Pelo que você contou, estas especialidades podem ajudar:"
      : "Entendi. Para " + E(p.tratamento) + ", estas especialidades podem ajudar:";
    /* o assistente sugere NOMES; cada um é procurado nas especialidades desta clínica */
    const ids = r.esps.map((nome) => espPeloNome(semAcento(nome))).filter(Boolean);
    const itens = ids.map((id) => {
      const h = primeiroHorario(id);
      const sub = h
        ? "Próximo horário: " + A.relativo(h.data) + ", " + h.hora + " com " + E(h.medico.nome)
        : "Sem horário livre agora. Você pode entrar na lista de espera.";
      return (
        '<a class="sugestao pressionavel" href="#agendar/' + id + "/" + r.quem + '">' +
        '<span><span class="sugestao__esp" style="display:block">' + E(esp(id).nome) + '</span><span class="sugestao__sub" style="display:block">' + sub + "</span></span>" +
        I("chevron-right") + "</a>"
      );
    }).join("");
    return (
      '<p class="balao balao--ele">' + intro + "</p>" +
      (itens
        ? '<div class="sugestoes">' + itens + "</div>"
        : '<p class="balao balao--ele">Esta clínica não atende ' + E(r.esps.join(" nem ")) + ". Ligue para a clínica para saber onde procurar: " + E(D.clinica.telefone) + ".</p>") +
      '<p class="balao balao--ele">Isto é uma orientação, não um diagnóstico. Se piorar, ou se aparecer febre alta, falta de ar ou dor forte, procure um pronto-socorro.</p>'
    );
  }

  function telaAssistente() {
    const inicial =
      '<div class="aviso-ia">' + I("info") + "<p>Eu ajudo a descobrir a especialidade certa e a marcar a consulta. <b>Não faço diagnóstico.</b> Em emergência, <a href=\"tel:192\">ligue 192 (SAMU)</a>.</p></div>" +
      '<p class="balao balao--ele">Olá, ' + E(pessoa(D.titular).curto) + "! O que você ou alguém da família está sentindo? Pode escrever do seu jeito.</p>";
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
  /* itemId: o item de prevenção que esta consulta resolve (vem do "Marcar" da Prevenção) */
  function telaAgendar(espId, pessoaId, itemId) {
    const temEsp = Object.keys(D.especialidades).length > 0;
    const e = D.especialidades[espId] ? espId : espPadraoPara(pessoa(pessoaId) || pessoa(D.titular));
    /* a pediatria (reconhecida pelo nome) atende só menores de 18 anos */
    const pediatria = PACIENTE.ehPediatria(esp(e).nome);
    const elegivel = (p) => !pediatria || (p.idade !== null && p.idade < 18);
    const alvo = pessoa(pessoaId);
    let quem = (alvo && elegivel(alvo) ? alvo : D.pessoas.find(elegivel) || pessoa(D.titular)).id;
    let escolha = null;
    let enviando = false;

    if (!temEsp) {
      return {
        titulo: "Agendar consulta",
        html: barra("Agendar consulta") +
          '<div class="cartao" style="margin-top:12px"><p><b>A clínica ainda não cadastrou especialidades.</b></p><p class="item__sub">Para marcar agora, ligue para a recepção: ' + E(D.clinica.telefone) + ".</p></div>",
      };
    }

    /* faltas sem aviso podem limitar o agendamento direto (o assistente e o 192 nunca são bloqueados) */
    const restricao = PACIENTE.avisoDeRestricao();

    function horariosHTML() {
      const medicos = medicosDa(e);
      if (!medicos.length) {
        return '<div class="sem-horario"><p><b>Ainda não há médico com agenda nesta especialidade.</b> Ligue para a clínica: ' + E(D.clinica.telefone) + ".</p></div>";
      }
      const h = restricao ? null : primeiroHorario(e);
      const primeiro = h
        ? '<button type="button" class="primeiro-livre pressionavel" data-primeiro data-medico="' + h.medico.id + '" data-data="' + h.data + '" data-hora="' + h.hora + '">' +
          A.folha(h.data, { pequena: true }) +
          '<span class="primeiro-livre__texto"><span class="primeiro-livre__rotulo">Primeiro horário livre</span><span class="primeiro-livre__valor">' + cap(A.relativo(h.data)) + ", " + h.hora + '</span><span class="primeiro-livre__sub">' + E(h.medico.nome) + "</span></span>" +
          I("chevron-right") + "</button>"
        : "";
      return (
        primeiro +
        '<h3 class="secao__titulo" style="margin-top:22px">' + (h ? "Ou escolha outro horário" : "Horários") + "</h3>" +
        medicos.map((m) => {
          const dias = restricao ? [] : D.horarios[m.id] || [];
          const naFila = D.espera && A.mesmoId(D.espera.medico, m.id);
          return (
            '<div class="cartao medico">' +
            '<div class="medico__cabeca">' + A.avatarMedico(m, 48) +
            '<div><p class="medico__nome">' + E(m.nome) + '</p><p class="meta">' + I("map-pin") + E(D.clinica.nome) + (m.sala ? " · " + E(m.sala) : "") + "</p></div></div>" +
            (dias.length
              ? dias.map((d) =>
                  '<div class="dia-horarios">' + A.folha(d.data, { pequena: true }) +
                  '<div class="horas">' +
                  d.horas.map((hh) => '<button type="button" class="hora pressionavel" aria-pressed="false" data-medico="' + m.id + '" data-data="' + d.data + '" data-hora="' + hh + '" aria-label="' + E(A.extenso(d.data) + " às " + hh + " com " + m.nome) + '">' + hh + "</button>").join("") +
                  "</div></div>"
                ).join("")
              : restricao && restricao.tipo === "so_recepcao"
              ? '<div class="sem-horario"><p><b>Agende pela recepção.</b></p></div>'
              : '<div class="sem-horario"><p><b>' + (restricao ? "Agendamento direto indisponível por enquanto." : "Sem horários livres agora.") + "</b> Entre na lista de espera e avisamos quando abrir uma vaga.</p>" +
                (naFila
                  ? '<p style="margin-top:6px">Você já está na fila: <b>posição ' + D.espera.posicao + "</b>.</p>" +
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
      '<section class="secao" style="margin-top:20px"><h2 class="secao__titulo" id="t-quem">Para quem é a consulta?</h2>' +
      '<div class="escolha-pessoa" role="radiogroup" aria-labelledby="t-quem" style="margin-top:10px">' +
      D.pessoas.map((p) => {
        const ok = elegivel(p);
        return '<button type="button" role="radio" aria-checked="' + A.mesmoId(p.id, quem) + '" data-pessoa="' + p.id + '"' + (ok ? "" : " disabled") + ">" + A.avatar(p, 40) + "<span>" + E(nomeCurto(p)) + (ok ? "" : '<small class="escolha-pessoa__nao">Fora da idade</small>') + "</span></button>";
      }).join("") +
      "</div>" +
      (pediatria ? '<p class="item__sub" style="margin-top:8px">A pediatria atende crianças e adolescentes até 18 anos.</p>' : "") +
      "</section>" +
      '<section class="secao" style="margin-top:22px"><h2 class="secao__titulo">Escolha o horário</h2>' +
      (restricao ? restricaoHTML(restricao) : "") +
      '<div id="horarios" style="margin-top:10px">' + horariosHTML() + "</div></section>" +
      '<section class="secao" style="margin-top:22px"><p class="item__sub" style="margin-bottom:8px">' + PACIENTE.textoDasFaltas() + "</p>" +
      '<p class="aviso-regra">' + I("info") + "<span>" + PACIENTE.textoDaRegra() + "</span></p></section></div>" +
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
        resumo.innerHTML = "<b>" + cap(A.extenso(escolha.data)) + ", às " + escolha.hora + "</b><br>" + E(medico(escolha.medico).nome) + " · para " + (A.mesmoId(p.id, D.titular) ? "você" : E(p.curto));
        botao.disabled = enviando;
      }

      function marcar(alvo) {
        el.querySelectorAll(".hora, [data-primeiro]").forEach((b) => {
          const mesmo = b.dataset.medico === alvo.medico && b.dataset.data === alvo.data && b.dataset.hora === alvo.hora;
          if (b.matches(".hora")) b.setAttribute("aria-pressed", String(mesmo));
          else b.classList.toggle("ativo", mesmo);
        });
      }

      el.addEventListener("click", async (ev) => {
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
          bf.disabled = true;
          let fila;
          try {
            fila = await PACIENTE.entrarNaFila(quem, m.id); /* POST /api/lista-espera { pessoa, medico } */
          } catch (e) {
            bf.disabled = false;
            aviso({ titulo: "Não deu para entrar na fila", texto: e.message, icone: "info" });
            return;
          }
          navegar(); /* a tela já mostra a posição na fila */
          abrirGaveta(
            '<div class="gaveta__ok">' + I("list-ordered") + "</div>" +
            '<h2 class="gaveta__titulo" id="gaveta-titulo">Você entrou na fila</h2>' +
            '<p class="gaveta__texto">Você está na <b>posição ' + fila.posicao + "</b> da fila de " + E(m.nome) + ". Quando abrir uma vaga com este médico e for a sua vez, o aviso aparece no app e você tem 30 minutos para confirmar.</p>" +
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
          const alvo2 = lista[(i + lista.length) % lista.length];
          alvo2.focus();
          alvo2.click();
        });
      });

      botao.addEventListener("click", async () => {
        if (!escolha || enviando) return;
        enviando = true;
        botao.disabled = true;
        botao.textContent = "Marcando…";
        /* marcada a partir da Prevenção: a consulta fica ligada ao item */
        const itemPrev = itemId ? PACIENTE.itemPrevencao(itemId) : null;
        try {
          const nova = await PACIENTE.marcar({
            pessoa: quem, medico: escolha.medico, data: escolha.data, hora: escolha.hora,
            motivo: itemPrev ? itemPrev.titulo : null, itemPrevencao: itemPrev ? itemPrev.id : null,
          });
          sucessoConsulta(nova);
        } catch (e) {
          /* outra pessoa pode ter marcado este horário agora há pouco (erro 50008): a lista é atualizada */
          enviando = false;
          botao.textContent = "Confirmar consulta";
          try { await PACIENTE.carregar(); } catch (e2) { /* a mensagem abaixo já explica */ }
          el.querySelector("#horarios").innerHTML = horariosHTML();
          resumo.classList.add("barra-confirmar__resumo--erro");
          resumo.innerHTML = "<b>" + E(e.message) + "</b>" + (e.status === 400 ? "<br>A lista de horários já foi atualizada." : "");
          escolha = null;
          botao.disabled = true;
          anunciar(e.message);
        }
      });
    }

    return { titulo: "Agendar consulta", html, coluna: true, montar };
  }

  /* Sucesso: a folha do dia é carimbada ("Marcada"). Momento raro, então pode ter mola. */
  function sucessoConsulta(c, titulo) {
    const m = medico(c.medico), p = pessoa(c.pessoa);
    abrirGaveta(
      '<div class="carimbo-palco" aria-hidden="true">' + A.folha(c.data) + '<span class="carimbo">Marcada</span></div>' +
      '<h2 class="gaveta__titulo" id="gaveta-titulo" style="text-align:center">' + E(titulo || "Consulta marcada!") + "</h2>" +
      '<div class="gaveta__resumo"><div><b>' + cap(A.extenso(c.data)) + ', às <span class="num">' + c.hora + "</span></b><br>" + E(esp(m.esp).nome) + " com " + E(m.nome) + "<br>" + E(D.clinica.nome) + (c.sala ? " · " + E(c.sala) : "") + " · para " + (A.mesmoId(p.id, D.titular) ? "você" : E(p.tratamento)) + "</div></div>" +
      '<p class="gaveta__texto">Na véspera, o app pede para você confirmar a presença. Se não puder ir, cancele pela Agenda.</p>' +
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

  /* ─── Lista de espera: a vaga oferecida pela API (D.espera.vaga, com o prazo em expiraEm) ─── */
  function oferecerVaga() {
    const e = D.espera;
    if (!e || !e.vaga) return;
    const m = medico(e.medico);
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
    if (!e || !e.vaga) return;
    const m = medico(e.medico);
    const v = e.vaga;
    let timer = null;
    const fmt = (seg) => Math.floor(seg / 60) + " min " + String(seg % 60).padStart(2, "0") + " s";
    const recusaHTML = '<button type="button" class="botao botao--texto-perigo" id="vaga-nao">Não quero esta vaga</button><p>A vaga vai para a próxima pessoa da fila.</p>';
    abrirGaveta(
      '<h2 class="gaveta__titulo" id="gaveta-titulo">Abriu uma vaga para você</h2>' +
      '<div class="gaveta__resumo">' + A.folha(v.data, { menta: true }) + "<div><b>" + E(esp(m.esp).nome) + "</b><br>" + E(m.nome) + '<br><span class="num">' + v.hora + "</span> · " + E(D.clinica.nome) + "</div></div>" +
      '<p class="contagem">' + I("clock") + '<span>Confirme em até <b class="num" id="contagem">' + fmt(PACIENTE.segundosDaVaga()) + "</b></span></p>" +
      '<p class="campo__erro" id="erro-vaga" role="alert" hidden></p>' +
      '<div class="gaveta__acoes"><button type="button" class="botao botao--principal botao--largo" id="vaga-sim">Confirmar vaga</button></div>' +
      '<div class="gaveta__recusa" id="recusa">' + recusaHTML + "</div>",
      {
        montar: (g) => {
          const saida = g.querySelector("#contagem");
          const erro = (texto) => { const x = g.querySelector("#erro-vaga"); x.textContent = texto; x.hidden = false; };
          /* a contagem usa o prazo da API (expiraEm): reabrir a gaveta não zera o tempo */
          timer = setInterval(() => {
            if (!saida.isConnected) { clearInterval(timer); return; }
            const resta = PACIENTE.segundosDaVaga();
            saida.textContent = fmt(resta);
            if (resta <= 0) {
              clearInterval(timer);
              g.querySelector("#vaga-sim").disabled = true;
              erro("O prazo terminou. A vaga foi para a próxima pessoa da fila, e você continua na fila.");
              PACIENTE.carregar().then(() => { if (estado.calAtivo) estado.calAtivo.atualizar(); }).catch(() => {});
            }
          }, 1000);
          g.querySelector("#vaga-sim").addEventListener("click", async (ev) => {
            const b = ev.currentTarget;
            b.disabled = true;
            try {
              const c = await PACIENTE.responderVaga(true); /* PUT /api/lista-espera/{id}/vaga { aceitar: true } */
              clearInterval(timer);
              fecharGaveta(true);
              if (estado.calAtivo) estado.calAtivo.atualizar();
              sucessoConsulta(c, "Vaga confirmada!");
            } catch (e2) {
              b.disabled = false;
              erro(e2.message);
            }
          });
          function ligarRecusa() {
            g.querySelector("#vaga-nao").addEventListener("click", () => {
              const r = g.querySelector("#recusa");
              r.innerHTML =
                "<p><b>Recusar esta vaga?</b> Ela passa para a próxima pessoa e você continua na fila.</p>" +
                '<div class="gaveta__acoes"><button type="button" class="botao botao--secundario" id="vaga-voltar">Voltar</button>' +
                '<button type="button" class="botao botao--texto-perigo" id="vaga-nao-sim">Sim, recusar esta vaga</button></div>';
              g.querySelector("#vaga-voltar").addEventListener("click", () => { r.innerHTML = recusaHTML; ligarRecusa(); g.querySelector("#vaga-nao").focus(); });
              g.querySelector("#vaga-nao-sim").addEventListener("click", async () => {
                try {
                  await PACIENTE.responderVaga(false); /* PUT /api/lista-espera/{id}/vaga { aceitar: false } */
                } catch (e2) {
                  erro(e2.message);
                  return;
                }
                clearInterval(timer);
                if (estado.calAtivo) estado.calAtivo.atualizar();
                fecharGaveta();
                aviso({ titulo: "Vaga recusada", texto: "Ela passou para a próxima pessoa da fila. Você continua na fila.", icone: "info" });
                navegar();
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
    if (!e) {
      return {
        titulo: "Lista de espera",
        html: barra("Lista de espera") +
          '<div class="cartao" style="margin-top:12px"><p><b>Você não está em nenhuma fila agora.</b></p><p class="item__sub">Quando não houver horário com o médico que você quer, toque em “Entrar na lista de espera” na tela de agendamento.</p></div>',
      };
    }
    const m = medico(e.medico);
    const p = pessoa(e.pessoa);
    const ord = String(e.posicao);

    const html =
      barra("Lista de espera", esp(m.esp).nome) +
      (e.vaga
        ? '<div class="cartao" style="margin-top:12px"><p><b>Abriu uma vaga para você!</b> ' + A.extenso(e.vaga.data) + ", às " + e.vaga.hora + '.</p><button type="button" class="botao botao--principal" id="ver-vaga" style="margin-top:8px">Ver a vaga</button></div>'
        : "") +
      '<section class="espera-painel" aria-labelledby="pos-frase">' +
      '<div class="espera-painel__linha"><span class="posicao" id="pos" aria-hidden="true">' + ord + "</span>" +
      '<p class="espera-painel__frase" id="pos-frase">' + (p && !A.mesmoId(p.id, D.titular) ? E(p.curto) + " está" : "Você está") + ' na posição <span id="pos-txt">' + ord + "</span><br>da fila</p></div>" +
      '<p class="espera-painel__detalhe"><b>' + E(esp(m.esp).nome) + "</b> · " + E(m.nome) + "<br>Na fila desde " + A.extenso(e.desde, false) + "</p>" +
      '<div id="fila">' + filaHTML(e.posicao, e.naFila) + "</div>" +
      "</section>" +
      '<section class="secao">' + cabecaSecao("Como funciona") +
      '<ol class="passos cartao">' +
      "<li><span>Se alguém cancelar, a vaga vai para a primeira pessoa da fila.</span></li>" +
      "<li><span>O aviso aparece aqui no app, e você tem <b>30 minutos</b> para confirmar.</span></li>" +
      "<li><span>Se não confirmar a tempo, a vaga passa para a próxima pessoa.</span></li>" +
      "</ol></section>" +
      '<section class="secao"><div class="cartao"><p><b>Como a vaga chega</b></p><p class="item__sub">Quando uma consulta com ' + E(m.nome) + " é cancelada, o horário é oferecido à 1ª pessoa da fila. Se for você, o aviso aparece no Início e em Notificações. O app confere a cada 30 segundos enquanto está aberto.</p></div></section>" +
      '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="sair-fila">Sair da fila</button><p>Você perde a sua posição.</p></div>';

    function montar(el) {
      const vv = el.querySelector("#ver-vaga");
      if (vv) vv.addEventListener("click", abrirVaga);
      el.querySelector("#sair-fila").addEventListener("click", () => {
        abrirGaveta(
          '<h2 class="gaveta__titulo" id="gaveta-titulo">Sair da lista de espera?</h2>' +
          '<p class="gaveta__texto">Você vai perder a posição ' + e.posicao + " na fila de " + E(m.nome) + ". Se quiser voltar depois, entra no fim da fila.</p>" +
          '<p class="campo__erro" id="erro-sair" role="alert" hidden></p>' +
          '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Continuar na fila</button></div>' +
          '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-sair">Sair da fila</button></div>',
          {
            montar: (g2) => g2.querySelector("#confirmar-sair").addEventListener("click", async (ev) => {
              const b = ev.currentTarget;
              b.disabled = true;
              try {
                await PACIENTE.sairDaFila(); /* DELETE /api/lista-espera/{id} */
              } catch (e2) {
                const x = g2.querySelector("#erro-sair");
                x.textContent = e2.message;
                x.hidden = false;
                b.disabled = false;
                return;
              }
              fecharGaveta();
              aviso({ titulo: "Você saiu da fila", texto: "Sua posição passou para a próxima pessoa.", icone: "info" });
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
      '<p class="subtitulo-tela">' + (D.pessoas.length === 1 ? "Por enquanto, só você. Adicione quem você cuida para marcar consultas para essas pessoas." : "Você cuida das consultas de " + D.pessoas.length + " pessoas.") + "</p>" +
      '<div class="cartao lista-cartao" style="margin-top:16px">' +
      D.pessoas.map((p) => {
        const c = proximas().find((k) => A.mesmoId(k.pessoa, p.id));
        return (
          '<a class="pessoa-linha" href="#pessoa/' + p.id + '">' + A.avatar(p, 56) +
          '<span class="item__corpo"><span class="pessoa-linha__nome" style="display:block">' + E(p.curto) + (A.mesmoId(p.id, D.titular) ? " (você)" : "") + "</span>" +
          '<span class="pessoa-linha__rel" style="display:block">' + E(p.relacao) + " · " + p.idade + " anos</span>" +
          '<span class="pessoa-linha__prox">' + (c ? I("calendar-days") + E(esp(medico(c.medico).esp).nome) + " · " + A.curto(c.data) : "Nenhuma consulta marcada") + "</span></span>" +
          I("chevron-right", "item__seta") + "</a>"
        );
      }).join("") +
      "</div>" +
      '<button type="button" class="botao botao--secundario botao--largo" id="adicionar" style="margin-top:16px">' + I("plus") + "Adicionar familiar</button>" +
      '<p class="nota-rodape">Cada pessoa tem uma cor própria. Ela aparece em todas as consultas e lembretes dessa pessoa, para não confundir de quem é cada compromisso.</p>';

    function montar(el) {
      el.querySelector("#adicionar").addEventListener("click", () => abrirFormFamiliar(null));
      if (sub === "novo") setTimeout(() => abrirFormFamiliar(null), 280);
    }
    return { titulo: "Família", html, montar };
  }

  /* Adicionar (p = null) ou editar (p = a pessoa) alguém da família, pela API.
     Os erros da API (como "Este CPF já está cadastrado.") aparecem no campo certo. */
  function abrirFormFamiliar(p) {
    const editar = !!p;
    const titularEmEdicao = editar && p.titular;
    const dataBr = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");
    abrirGaveta(
      '<h2 class="gaveta__titulo" id="gaveta-titulo">' + (editar ? "Editar dados de " + E(p.curto) : "Adicionar familiar") + "</h2>" +
      (editar ? "" : '<p class="gaveta__texto">Depois de adicionar, você pode marcar consultas para essa pessoa.</p>') +
      '<form id="form-familiar" class="formulario" novalidate>' +
      '<div class="campo" id="c-nome"><label for="f-nome">Nome completo</label><input id="f-nome" type="text" autocomplete="off" placeholder="Ex.: Ana Beatriz Santos" value="' + (editar ? E(p.nome) : "") + '"></div>' +
      '<div class="campo" id="c-cpf"><label for="f-cpf">CPF</label><input id="f-cpf" type="text" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14" value="' + (editar ? E(API.formatarCPF(p.cpf)) : "") + '"></div>' +
      (titularEmEdicao
        ? ""
        : '<div class="campo" id="c-rel"><span class="campo__rotulo" id="f-rel">Parentesco (obrigatório)</span><div class="opcoes" role="radiogroup" aria-labelledby="f-rel" aria-required="true">' +
          PACIENTE.PARENTESCOS.map((o) => '<button type="button" role="radio" aria-checked="' + (editar && p.relacao === o) + '">' + E(o) + "</button>").join("") +
          "</div></div>") +
      '<div class="campo" id="c-nasc"><label for="f-nasc">Data de nascimento</label><input id="f-nasc" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" value="' + (editar ? dataBr(p.nascimento) : "") + '"></div>' +
      '<div class="campo"><label for="f-alergias">Alergias (opcional)</label><input id="f-alergias" type="text" placeholder="Ex.: Penicilina, dipirona" value="' + (editar && p.alergiasApi ? E(p.alergiasApi) : "") + '"></div>' +
      '<p class="campo__erro" id="f-erro-geral" role="alert" hidden></p>' +
      '<div class="gaveta__acoes"><button type="submit" class="botao botao--principal">' + (editar ? "Salvar" : "Adicionar") + '</button><button type="button" class="botao botao--secundario" data-fechar>Cancelar</button></div>' +
      "</form>",
      {
        montar: (g) => {
          g.querySelectorAll('.opcoes [role="radio"]').forEach((b) =>
            b.addEventListener("click", () => g.querySelectorAll('.opcoes [role="radio"]').forEach((x) => x.setAttribute("aria-checked", String(x === b))))
          );
          /* máscara do CPF: só números, no formato 000.000.000-00 */
          const cpf = g.querySelector("#f-cpf");
          cpf.addEventListener("input", () => { cpf.value = API.formatarCPF(cpf.value); });
          const form = g.querySelector("#form-familiar");
          const botao = form.querySelector('[type="submit"]');
          form.addEventListener("submit", async (ev) => {
            ev.preventDefault();
            g.querySelectorAll(".campo .campo__erro").forEach((x) => x.remove());
            const geral = g.querySelector("#f-erro-geral");
            geral.hidden = true;
            const dados = {
              nome: g.querySelector("#f-nome").value,
              cpf: cpf.value,
              relacao: titularEmEdicao ? "Titular" : (g.querySelector('.opcoes [aria-checked="true"]') || {}).textContent || "",
              nascimento: g.querySelector("#f-nasc").value,
              alergias: g.querySelector("#f-alergias").value,
              cor: editar ? undefined : null,
            };
            botao.disabled = true;
            let r;
            try {
              r = editar ? await PACIENTE.editarFamiliar(p.id, dados) : await PACIENTE.adicionarFamiliar(dados);
            } catch (e) {
              geral.textContent = e.message;
              geral.hidden = false;
              botao.disabled = false;
              return;
            }
            botao.disabled = false;
            if (!r.familiar) {
              [["#c-nome", r.erros.nome], ["#c-cpf", r.erros.cpf], ["#c-rel", r.erros.relacao], ["#c-nasc", r.erros.nascimento]].forEach(([c, t]) => {
                const campo = g.querySelector(c);
                if (t && campo) campo.insertAdjacentHTML("beforeend", '<p class="campo__erro" role="alert">' + E(t) + "</p>");
              });
              (r.erros.nome ? g.querySelector("#f-nome") : r.erros.cpf ? cpf : r.erros.relacao ? g.querySelector('#c-rel [role="radio"]') : g.querySelector("#f-nasc")).focus();
              return;
            }
            fecharGaveta();
            navegar();
            aviso(editar
              ? { titulo: "Dados salvos", texto: "As mudanças já aparecem em todas as telas.", icone: "check" }
              : { titulo: "Prontinho: " + r.familiar.curto + " agora está na família", texto: "Você já pode marcar consultas para essa pessoa.", icone: "users" });
          });
        },
      }
    );
  }

  function telaPessoa(id) {
    const p = pessoa(id) || pessoa(D.titular);
    const consultas = proximas().filter((c) => A.mesmoId(c.pessoa, p.id));
    const lembretes = [];
    D.prevencao.forEach((mes) => mes.itens.forEach((it) => { if (A.mesmoId(it.pessoa, p.id)) lembretes.push({ mes, it }); }));
    const espPadrao = espPadraoPara(p);
    const retornos = D.acompanhamento.retornos.filter((r) => A.mesmoId(r.pessoa, p.id));
    const exames = D.acompanhamento.exames.filter((x) => A.mesmoId(x.pessoa, p.id) && x.status === "pendente");
    const ret = retornos[0];
    const precisa = retornos.length || exames.length
      ? '<section class="secao">' + cabecaSecao("Precisa marcar") +
        '<div class="cartao lista-cartao">' +
        retornos.map((r) =>
          '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' + E(r.titulo) + '</p><p class="prev-item__nota">Com ' + E(medico(r.medico).nome) + ". " + E(r.origem) + ".</p>" +
          '<div class="prev-item__acao">' + seloPrazo(r.prazo) + "</div></div></div>"
        ).join("") +
        exames.map((x) =>
          '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' + E(x.titulo) + '</p><p class="prev-item__nota">' + E(x.obs) + ". Exames são marcados pelo telefone da clínica.</p>" +
          '<div class="prev-item__acao">' + ligarClinica("Ligar para marcar") + "</div></div></div>"
        ).join("") +
        "</div></section>"
      : "";
    const cta = ret
      ? ["#agendar/" + ret.esp + "/" + p.id, "Marcar " + ret.titulo.charAt(0).toLowerCase() + ret.titulo.slice(1)]
      : ["#agendar/" + espPadrao + "/" + p.id, "Marcar consulta para " + (A.mesmoId(p.id, D.titular) ? "mim" : p.curto)];
    const html =
      barra(p.curto, p.relacao) +
      '<div class="pessoa-topo">' + A.avatar(p, 112) +
      '<div><p class="titulo-tela" style="font-size:1.5rem">' + E(p.nome) + '</p><p class="subtitulo-tela" style="margin-top:2px">' + E(p.relacao) + " · " + p.idade + " anos</p></div></div>" +
      precisa +
      '<section class="secao">' + cabecaSecao("Próximas consultas") +
      (consultas.length
        ? consultas.map((c) => linhaConsulta(c)).join("")
        : '<p class="cartao">Nenhuma consulta marcada para ' + (A.mesmoId(p.id, D.titular) ? "você" : E(p.tratamento)) + ".</p>") +
      (espPadrao ? '<a class="botao botao--principal botao--largo" style="margin-top:12px" href="' + cta[0] + '">' + I("plus") + E(cta[1]) + "</a>" : "") +
      "</section>" +
      (lembretes.length
        ? '<section class="secao">' + cabecaSecao("Prevenção", "#prevencao", "Ver o ano") +
          '<div class="cartao lista-cartao">' +
          lembretes.map(({ mes, it }) =>
            '<div class="prev-item"><span class="item__corpo"><span class="prev-item__titulo" style="display:block">' + E(it.titulo) + '</span><span class="prev-item__nota" style="display:block">' + cap(A.MESES_LONGOS[A.data(mes.mes + "-01").getMonth()]) + " · " + E(it.nota) + "</span></span></div>"
          ).join("") +
          "</div></section>"
        : "") +
      '<section class="secao">' + cabecaSecao("Dados de saúde") +
      '<dl class="cartao lista-cartao ficha">' +
      "<div><dt>Parentesco</dt><dd>" + E(p.relacao) + "</dd></div>" +
      "<div><dt>Nascimento</dt><dd>" + (p.nascimento ? A.extenso(p.nascimento, false) + " de " + p.nascimento.slice(0, 4) : "—") + "</dd></div>" +
      "<div><dt>CPF</dt><dd>" + (p.cpf ? E(API.formatarCPF(p.cpf)) : "—") + "</dd></div>" +
      "<div><dt>Alergias</dt><dd>" + E(p.alergias) + "</dd></div>" +
      "</dl>" +
      '<button type="button" class="botao botao--secundario botao--largo" id="editar-pessoa" style="margin-top:12px">' + I("user-round") + "Editar dados</button>" +
      "</section>";
    function montar(el) {
      el.querySelector("#editar-pessoa").addEventListener("click", () => abrirFormFamiliar(p));
    }
    return { titulo: p.curto, html, montar };
  }

  /* Prevenção: a mesma tela do app (prevencao-tela.js) */
  function telaPrevencao() {
    const op = { titulo: (t, sub) => barra(t, sub), estado, abrirGaveta, fecharGaveta, anunciar };
    return { titulo: "Prevenção", html: PREVENCAO_TELA.html(op), montar: (el) => PREVENCAO_TELA.montar(el, op) };
  }

  /* "1 retorno e 2 exames para acompanhar" contado a partir da API */
  function textoAcompanhamento() {
    const r = D.acompanhamento.retornos.length, x = D.acompanhamento.exames.length;
    if (!r && !x) return "Nada para acompanhar agora";
    const partes = [];
    if (r) partes.push(r + (r === 1 ? " retorno" : " retornos"));
    if (x) partes.push(x + (x === 1 ? " exame" : " exames"));
    return partes.join(" e ") + " para acompanhar";
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
      '<span class="notif__icone">' + I("repeat") + '</span><span class="item__corpo"><span class="item__titulo" style="display:block">Retornos e exames pedidos</span><span class="item__sub" style="display:block">' + textoAcompanhamento() + "</span></span>" +
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
            D, estado: estado.cal, limites: [D.mes(-2), D.mes(6)], anunciar, aoConfirmarVaga: abrirVaga,
          });
          return;
        }
        const itens = proximas().map((c) => ({ data: c.data, html: linhaConsulta(c) }));
        (D.feriados || []).filter((f) => A.diasAte(f.data) >= 0).forEach((f) => {
          itens.push({
            data: f.data,
            html: '<div class="cartao agenda-item agenda-item--feriado">' + A.folha(f.data) +
              '<span class="consulta-cartao__corpo"><span class="consulta-cartao__esp">Feriado: ' + E(f.nome) + '</span><span class="consulta-cartao__medico">A clínica não abre neste dia.</span></span></div>',
          });
        });
        itens.sort((a, b) => a.data.localeCompare(b.data));
        const passadas = ordenar(D.passadas).reverse();
        painel.innerHTML =
          '<section class="secao" style="margin-top:18px" aria-labelledby="t-prox">' + cabecaSecao("Próximas", null, null, "t-prox") +
          (itens.length ? itens.map((x) => x.html).join("") : '<p class="cartao">Nenhuma consulta marcada.</p>') + "</section>" +
          '<section class="secao" aria-labelledby="t-pass">' + cabecaSecao("Histórico", null, null, "t-pass") +
          (passadas.length ? passadas.map((c) => linhaConsulta(c, true)).join("") : '<p class="cartao">Nenhuma consulta no histórico.</p>') + "</section>";
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
    const c = D.consultas.find((k) => A.mesmoId(k.id, id)) || D.passadas.find((k) => A.mesmoId(k.id, id));
    if (!c) return telaAgenda();
    const passada = D.passadas.includes(c);
    const m = medico(c.medico), p = pessoa(c.pessoa);
    const html =
      barra("Consulta", passada ? D.STATUS_CONSULTA[c.status || "atendida"] : cap(A.relativo(c.data))) +
      '<div class="cartao consulta-cartao" style="margin-top:8px">' + A.folha(c.data, { bloco: true }) +
      '<span class="consulta-cartao__corpo"><span class="consulta-cartao__esp">' + E(esp(m.esp).nome) + '</span><span class="consulta-cartao__medico">' + E(m.nome) + "</span>" +
      '<span class="pessoa-chip">' + A.avatar(p, 30) + "Para " + (A.mesmoId(p.id, D.titular) ? "você" : E(p.tratamento)) + "</span></span></div>" +
      '<dl class="cartao lista-cartao ficha" style="margin-top:12px">' +
      "<div><dt>Data</dt><dd>" + cap(A.extenso(c.data)) + "</dd></div>" +
      '<div><dt>Horário</dt><dd class="num">' + c.hora + "</dd></div>" +
      "<div><dt>Local</dt><dd>" + E(D.clinica.nome) + (c.sala ? ", " + E(c.sala) : "") + "<br>" + E(D.clinica.endereco) + "</dd></div>" +
      "<div><dt>Motivo</dt><dd>" + (c.motivo ? E(c.motivo) : "Não informado") + "</dd></div>" +
      "</dl>" +
      (passada
        ? ""
        : '<div class="gaveta__acoes" style="margin-top:16px">' +
          '<a class="botao botao--principal" href="https://www.google.com/maps/search/' + encodeURIComponent(D.clinica.endereco) + '" target="_blank" rel="noopener">' + I("map-pin") + "Como chegar</a>" +
          '<a class="botao botao--secundario" href="tel:' + E(D.clinica.telefoneLink) + '">' + I("phone") + "Ligar para a clínica " + E(D.clinica.telefone) + "</a></div>" +
          '<p class="aviso-falta">' + I("info") + "<span>" + PACIENTE.textoDaRegra() + "</span></p>" +
          '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="cancelar">Cancelar consulta</button><p>Cancelar até o fim do dia anterior não tem nenhuma consequência.</p></div>');

    function montar(el) {
      const b = el.querySelector("#cancelar");
      if (!b) return;
      b.addEventListener("click", () => {
        const contaFalta = PACIENTE.vaiContarFalta(c);
        abrirGaveta(
          '<h2 class="gaveta__titulo" id="gaveta-titulo">Cancelar esta consulta?</h2>' +
          '<p class="gaveta__texto">' + E(esp(m.esp).nome) + " com " + E(m.nome) + ", " + A.extenso(c.data) + ", às " + c.hora + ".</p>" +
          (contaFalta
            ? '<p class="aviso-regra aviso-regra--forte">' + I("info") + "<span>Hoje é o dia da consulta e você confirmou presença: cancelar agora conta como falta sem aviso.</span></p>"
            : '<p class="gaveta__texto">Sem nenhuma consequência: o horário volta para quem precisa.</p>') +
          '<p class="campo__erro" id="erro-cancelar" role="alert" hidden></p>' +
          '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Manter consulta</button></div>' +
          '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-cancelar">Sim, cancelar consulta</button></div>',
          {
            montar: (g) => g.querySelector("#confirmar-cancelar").addEventListener("click", async (ev) => {
              const botao = ev.currentTarget;
              botao.disabled = true;
              let r;
              try {
                r = await PACIENTE.cancelar(c); /* DELETE /api/consultas/{id} → { falta, oferecidoAFila } */
              } catch (e) {
                const erro = g.querySelector("#erro-cancelar");
                erro.textContent = e.message;
                erro.hidden = false;
                botao.disabled = false;
                return;
              }
              fecharGaveta();
              aviso({
                titulo: "Consulta cancelada",
                texto: (r.falta ? "Conta como falta sem aviso. " : "") +
                  (r.oferecidoAFila ? "O horário foi oferecido a quem espera na lista." : "O horário ficou livre para outra pessoa."),
                icone: "info",
              });
              location.hash = "#agenda";
            }),
          }
        );
      });
    }
    return { titulo: "Consulta", html, montar };
  }

  /* Depois da consulta (GET /api/pacientes/{id}/acompanhamento) */
  function telaAcompanhamento() {
    const ac = D.acompanhamento;
    const html =
      barra("Depois da consulta", "Retornos, exames e próximas consultas") +
      '<section class="secao" style="margin-top:12px">' + cabecaSecao("Retornos") +
      (ac.retornos.length
        ? '<div class="cartao lista-cartao">' +
          ac.retornos.map((r) => {
            const p = pessoa(r.pessoa);
            return (
              '<div class="prev-item">' + A.avatar(p, 40) +
              '<div class="item__corpo"><p class="prev-item__titulo">' + E(r.titulo) + '</p><p class="prev-item__nota">' + E(p.curto) + " · com " + E(medico(r.medico).nome) + "<br>" + E(r.origem) + ". Marcar até " + A.extenso(r.prazo, false) + ".</p>" +
              '<div class="prev-item__acao">' + seloPrazo(r.prazo) + (r.esp ? '<a class="botao botao--principal botao--pequeno" href="#agendar/' + r.esp + "/" + r.pessoa + '">Agendar retorno</a>' : "") + "</div></div></div>"
            );
          }).join("") +
          "</div>"
        : '<p class="cartao">Nenhum retorno para marcar.</p>') +
      "</section>" +
      '<section class="secao">' + cabecaSecao("Exames pedidos") +
      (ac.exames.length
        ? '<div class="cartao lista-cartao">' +
          /* F28: o exame só é "pendente" ou "realizado"; a recepção marca o realizado */
          ac.exames.map((x) => {
            const p = pessoa(x.pessoa);
            return (
              '<div class="prev-item">' + A.avatar(p, 40) +
              '<div class="item__corpo"><p class="prev-item__titulo">' + E(x.titulo) + '</p><p class="prev-item__nota">' + E(p.curto) + (x.pedidoPor ? " · pedido por " + E(medico(x.pedidoPor).nome) : "") + "<br>" + E(x.obs) + ".</p>" +
              '<div class="prev-item__acao"><span class="selo selo--alerta">Exame pendente</span>' + ligarClinica("Ligar para marcar") + "</div></div></div>"
            );
          }).join("") +
          "</div>"
        : '<p class="cartao">Nenhum exame pendente.</p>') +
      "</section>" +
      '<section class="secao">' + cabecaSecao("Próximas consultas", "#agenda", "Ver agenda") +
      (proximas().length ? proximas().slice(0, 3).map((c) => linhaConsulta(c)).join("") : '<p class="cartao">Nenhuma consulta marcada.</p>') +
      "</section>";
    return { titulo: "Depois da consulta", html };
  }

  /* Perfil: dados da conta (GET /api/pacientes/{id}), clínica, senha, acessibilidade e sair */
  function telaPerfil() {
    const t = pessoa(D.titular);
    const texto = lerPref("texto", "normal");
    const reduzido = lerPref("movimento", "sistema") === "reduzido";
    const html =
      '<header class="topo"><h1 class="titulo-tela" tabindex="-1">Perfil</h1></header>' +
      '<div class="cartao item" style="margin-top:12px;padding:14px 16px">' + A.avatar(t, 64) +
      '<span class="item__corpo"><span class="item__titulo" style="display:block;font-size:1.125rem">' + E(t.nome) + '</span><span class="item__sub" style="display:block" id="conta-email">' + E(API.usuarioAtual().email || "") + "</span></span></div>" +
      '<section class="secao">' + cabecaSecao("Seus dados") +
      '<dl class="cartao lista-cartao ficha" id="conta-dados" aria-busy="true"><div><dt>Carregando</dt><dd>…</dd></div></dl></section>' +
      '<section class="secao">' + cabecaSecao("Sua clínica") +
      '<div class="cartao"><p class="item__titulo">' + E(D.clinica.nome) + '</p><p class="item__sub">' + E(D.clinica.endereco) + (D.clinica.telefone ? " · " + E(D.clinica.telefone) : "") + "</p>" +
      '<a class="botao botao--secundario botao--pequeno" style="margin-top:10px" href="escolher-clinica.html">Trocar de clínica</a></div></section>' +
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
      '<section class="secao">' + cabecaSecao("Trocar a senha") +
      '<form class="cartao formulario" id="form-senha" novalidate>' +
      '<div class="campo"><label for="s-atual">Senha atual</label><input id="s-atual" type="password" autocomplete="current-password"></div>' +
      '<div class="campo"><label for="s-nova">Nova senha</label><input id="s-nova" type="password" autocomplete="new-password"><span class="item__sub">De 8 a 64 caracteres.</span></div>' +
      '<div class="campo"><label for="s-repete">Repita a nova senha</label><input id="s-repete" type="password" autocomplete="new-password"></div>' +
      '<p class="campo__erro" id="s-erro" role="alert" hidden></p>' +
      '<button type="submit" class="botao botao--secundario">Trocar a senha</button></form></section>' +
      '<div class="zona-perigo"><button type="button" class="botao botao--texto-perigo" id="sair">' + I("log-out") + "Sair da conta</button></div>";

    function montar(el) {
      /* L4: nome, CPF, e-mail, telefone e nascimento da conta */
      const dl = el.querySelector("#conta-dados");
      API.chamar("GET", "/api/pacientes/" + API.usuarioAtual().id).then((c) => {
        const tel = String(c.telefone || "").replace(/\D/g, "");
        dl.innerHTML =
          "<div><dt>Nome</dt><dd>" + E(c.nome) + "</dd></div>" +
          "<div><dt>E-mail</dt><dd>" + E(c.email) + "</dd></div>" +
          "<div><dt>Telefone</dt><dd>" + (tel ? "•••• " + E(tel.slice(-4)) : "Não informado") + "</dd></div>" +
          "<div><dt>CPF</dt><dd>" + E(API.formatarCPF(c.cpf)) + "</dd></div>" +
          "<div><dt>Nascimento</dt><dd>" + A.extenso(c.nascimento, false) + " de " + c.nascimento.slice(0, 4) + "</dd></div>";
        el.querySelector("#conta-email").textContent = c.email;
      }).catch((e) => {
        dl.innerHTML = "<div><dt>Seus dados</dt><dd>" + E(e.message) + "</dd></div>";
      }).finally(() => dl.removeAttribute("aria-busy"));

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
      /* PUT /api/usuarios/{id}/senha { senhaAtual, novaSenha } */
      el.querySelector("#form-senha").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const erro = el.querySelector("#s-erro");
        const atual = el.querySelector("#s-atual").value, nova = el.querySelector("#s-nova").value;
        const mostrar = (t2) => { erro.textContent = t2; erro.hidden = false; };
        erro.hidden = true;
        if (!atual) return mostrar("Digite a senha que você usa hoje.");
        if (nova.length < 8 || nova.length > 64) return mostrar("A nova senha precisa ter de 8 a 64 caracteres.");
        if (nova !== el.querySelector("#s-repete").value) return mostrar("As duas senhas novas não estão iguais.");
        try {
          await API.trocarSenha(atual, nova);
        } catch (e) {
          return mostrar(e.message);
        }
        ev.target.reset();
        aviso({ titulo: "Senha trocada", texto: "Use a nova senha no próximo login.", icone: "check" });
      });
      el.querySelector("#sair").addEventListener("click", async () => {
        await window.API.sair();
        location.href = "login.html";
      });
    }
    return { titulo: "Perfil", html, montar };
  }

  /* Notificações (F27): GET /api/pacientes/{id}/notificacoes; "lidas" por PUT .../notificacoes/lidas */
  function telaNotificacoes() {
    const destinos = { VAGA_OFERECIDA: "#espera", CONSULTA_CONFIRMADA: "#agenda", RESTRICAO: "#agendar" };
    const novos = PACIENTE.avisosNovos();
    const html =
      barra("Notificações") +
      (D.notificacoes.length
        ? (novos ? '<button type="button" class="botao botao--secundario botao--pequeno" id="ler-todos" style="margin-top:8px">' + I("check") + "Marcar todas como lidas</button>" : "") +
          '<div class="cartao lista-cartao" style="margin-top:8px">' +
          D.notificacoes.map((n) =>
            '<a class="notif' + (n.nova ? " notif--nova" : "") + '" href="' + (destinos[n.tipo] || "#inicio") + '" style="text-decoration:none">' +
            '<span class="notif__icone">' + I(n.icone) + "</span>" +
            '<span class="item__corpo"><span class="notif__texto" style="display:block">' + E(n.texto) + '</span><span class="notif__quando" style="display:block">' +
            (n.nova ? '<span class="notif__nova">Nova</span> · ' : "") + E(n.quando) + "</span></span></a>"
          ).join("") +
          "</div>"
        : '<p class="cartao" style="margin-top:8px">Nenhum aviso por enquanto. Vagas da lista de espera, lembretes de presença e mudanças no agendamento aparecem aqui.</p>');
    function montar(el) {
      const b = el.querySelector("#ler-todos");
      if (b) b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          await PACIENTE.lerTodosAvisos();
        } catch (e) {
          b.disabled = false;
          aviso({ titulo: "Não deu para marcar", texto: e.message, icone: "info" });
          return;
        }
        anunciar("Todos os avisos foram marcados como lidos");
        navegar();
      });
    }
    return { titulo: "Notificações", html, montar };
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

  /* ─── Avisos (notificação que desce do topo) ───
     titulo e texto são texto puro (podem ter nome de pessoa ou mensagem da API): passam por E() */
  function aviso(o) {
    avisos.querySelectorAll(".aviso").forEach((v) => v.remove());
    const el = document.createElement("div");
    el.className = "aviso";
    el.setAttribute("role", o.acoes ? "alertdialog" : "status");
    el.setAttribute("aria-label", o.titulo);
    el.innerHTML =
      '<p class="aviso__cabeca">' + I(o.icone || "bell-ring") + E(o.cabeca || "AgendaPro Saúde") + "</p>" +
      '<p class="aviso__titulo">' + E(o.titulo) + "</p>" +
      (o.texto ? '<p class="aviso__texto">' + E(o.texto) + "</p>" : "") +
      (o.acoes ? '<div class="aviso__acoes">' + o.acoes.map((a, i) => '<button type="button" class="botao ' + a.classe + '" data-i="' + i + '">' + E(a.rotulo) + "</button>").join("") + "</div>" : "");
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

  /* "Vou" / "Não vou" no cartão do Início */
  document.addEventListener("click", (ev) => {
    const vou = ev.target.closest("[data-vou]");
    const nao = ev.target.closest("[data-naovou]");
    if (!vou && !nao) return;
    const c = D.consultas.find((k) => A.mesmoId(k.id, vou ? vou.dataset.vou : nao.dataset.naovou));
    if (!c) return;
    (vou || nao).disabled = true;
    /* PUT /api/consultas/{id}/presenca { vou: true | false }; "Não vou" cancela pelas mesmas regras */
    (vou ? PACIENTE.confirmarPresenca(c) : PACIENTE.naoVou(c)).then((r) => {
      if (vou) aviso({ titulo: "Presença confirmada", texto: "A clínica já sabe que você vai. Se não puder mais ir, avise; cancelar no dia da consulta conta como falta.", icone: "circle-check" });
      else aviso({ titulo: "Consulta cancelada", texto: (r.falta ? "Conta como falta sem aviso. " : "Sem nenhuma consequência. ") + (r.oferecidoAFila ? "O horário foi oferecido a quem espera na lista." : "O horário ficou livre para outra pessoa."), icone: "info" });
      navegar();
    }).catch((e) => {
      (vou || nao).disabled = false;
      aviso({ titulo: "Não deu para responder", texto: e.message, icone: "info" });
    });
  });

  /* vaga da lista de espera oferecida (antes de a página abrir, ou enquanto ela está aberta: PACIENTE confere a cada 30 s) */
  if (D.espera && D.espera.oferta) setTimeout(oferecerVaga, 600);
  PACIENTE.aoMudar((novaVaga) => {
    if (novaVaga) oferecerVaga();
    else if (location.hash.startsWith("#espera") || location.hash === "" || location.hash === "#inicio") navegar();
    if (estado.calAtivo) estado.calAtivo.atualizar();
  });
});
