/* AgendaPro Saúde — Pacientes da clínica, pela API.
   Quem tem a conta vinculada à clínica: GET /api/clinicas/{id}/pacientes devolve cada pessoa com a ficha pronta
   (F3: consultas, filas, retornos, exames e o número de faltas). A lista vem uma vez; a busca (nome ou CPF), os filtros
   e as páginas são feitos na tela. Ao abrir a ficha: GET /api/clinicas/{id}/faltas?paciente= (histórico, inclusive as
   retiradas) e GET /api/pacientes/{idConta}/situacao (F5: a restrição vale para a conta inteira).
   Retirar falta: PUT /api/faltas/{id}/retirar { motivo }. Exame feito: PUT /api/exames/{id} { status: "realizado" }. */
(function () {
  "use strict";

  const D = window.DADOS; /* só os rótulos de status */
  const A = window.AP;
  const K = window.CASCA;
  const API = window.API;
  const CL = window.CLINICA;
  const $ = (s) => document.querySelector(s);

  CL.iniciar(iniciar);
  function iniciar() {
  const POR_PAGINA = 20;
  const ROTULO = D.STATUS_CONSULTA;
  const FUTURO = ["confirmada", "na_recepcao", "em_atendimento"];
  const HOJE = CL.hoje;
  const ordemK = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0);
  const cpfFormatado = (c) => API.formatarCPF(c || "");

  let pacientes = [];
  function montar(lista) {
    pacientes = (lista || []).map((x) => {
      const p = Object.assign({}, x, { id: String(x.id), idConta: String(x.idConta) });
      p.consultas = (x.consultas || []).slice().sort(ordemK);
      p.proxima = p.consultas.find((k) => FUTURO.includes(k.status) && k.data >= HOJE) || null;
      p.passadas = p.consultas.filter((k) => k.status === "atendida" || k.status === "faltou" || k.status === "cancelada");
      p.ultima = p.passadas[p.passadas.length - 1] || null;
      p.hoje = p.consultas.some((k) => k.data === HOJE && k.status !== "cancelada");
      p.app = (x.filas || []).some((f) => f.usaApp);
      p.chave = K.semAcento(p.nome);
      return p;
    });
    /* quem tem consulta marcada primeiro (a mais próxima no topo), depois pela última visita, depois pelo nome */
    pacientes.sort((a, b) => {
      if (a.proxima && b.proxima) return ordemK(a.proxima, b.proxima);
      if (a.proxima || b.proxima) return a.proxima ? -1 : 1;
      if (a.ultima && b.ultima) return -ordemK(a.ultima, b.ultima);
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }
  async function buscarLista() {
    montar(await API.chamar("GET", "/api/clinicas/" + CL.clinica.id + "/pacientes"));
  }

  const FILTROS = [
    { id: "todos", rotulo: "Todos", teste: () => true },
    { id: "hoje", rotulo: "Com consulta hoje", teste: (p) => p.hoje },
    { id: "fila", rotulo: "Na lista de espera", teste: (p) => p.filas.length },
    { id: "faltas", rotulo: "Já faltaram", teste: (p) => p.faltas > 0 },
  ];
  const est = { filtro: "todos", busca: "", pagina: 1, escolhido: null, ficha: null };

  const quando = (k) => K.curtoData(k.data) + " · " + k.hora;
  const curto = (nome) => String(nome || "").split(" ").slice(0, 2).join(" ");

  /* busca por nome OU CPF (com ou sem pontos: só os números contam) */
  function filtrados() {
    const f = FILTROS.find((x) => x.id === est.filtro);
    const termo = K.semAcento(est.busca);
    const digitos = est.busca.replace(/\D/g, "");
    const porCPF = digitos.length >= 3 && /^[\d.\-\s]+$/.test(est.busca);
    return pacientes.filter((p) => f.teste(p) && (!termo || (porCPF ? String(p.cpf).includes(digitos) : p.chave.includes(termo))));
  }

  function desenharFiltros() {
    $("#filtros").innerHTML = FILTROS.map((f) => {
      const n = pacientes.filter(f.teste).length;
      return '<button type="button" data-filtro="' + f.id + '" aria-pressed="' + (f.id === est.filtro) + '">' + f.rotulo + '<span class="num">' + n + "</span></button>";
    }).join("");
  }

  function desenharLista() {
    const lista = filtrados();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    est.pagina = Math.min(est.pagina, paginas);
    const ini = (est.pagina - 1) * POR_PAGINA;
    const mostrados = lista.slice(ini, ini + POR_PAGINA);
    $("#meta").textContent = lista.length === pacientes.length
      ? pacientes.length + (pacientes.length === 1 ? " paciente" : " pacientes")
      : lista.length + (lista.length === 1 ? " encontrado" : " encontrados");
    $("#linhas").innerHTML = mostrados.length
      ? mostrados.map((p) => {
          const sub = [p.app ? "usa o app" : "", p.filas.length ? "na fila de " + p.filas.map((f) => curto(f.medico.nome)).join(" e ") : ""].filter(Boolean).join(" · ");
          return '<tr class="linha-clicavel" data-id="' + A.esc(p.id) + '" aria-selected="' + (p === est.escolhido) + '">' +
            '<td><button type="button" class="botao-nome" data-ver="' + A.esc(p.id) + '">' + A.esc(p.nome) + "</button>" + (sub ? '<span class="tabela__sub">' + A.esc(sub) + "</span>" : "") + "</td>" +
            '<td data-rotulo="Próxima consulta">' + (p.proxima
              ? '<span class="num">' + quando(p.proxima) + '</span><span class="tabela__sub">' + A.esc(curto(p.proxima.medico.nome)) + "</span>"
              : '<span class="tabela__traco">—</span>') + "</td>" +
            '<td data-rotulo="Última consulta">' + (p.ultima ? '<span class="num">' + K.curtoData(p.ultima.data) + "</span>" : '<span class="tabela__traco">—</span>') + "</td>" +
            '<td class="num" data-rotulo="Consultas">' + p.consultas.length + "</td>" +
            '<td class="num" data-rotulo="Faltas">' + (p.faltas ? p.faltas : '<span class="tabela__traco">0</span>') + "</td></tr>";
        }).join("")
      : '<tr><td colspan="5"><p class="vazio">' + (pacientes.length
          ? "Ninguém com esse nome ou CPF" + (est.filtro !== "todos" ? " neste filtro" : "") + ". Confira o que foi digitado."
          : "Nenhum paciente ainda. Os pacientes aparecem aqui quando escolhem esta clínica no app ou no site, pelo código " + A.esc(CL.clinica.codigo || "") + ".") + "</p></td></tr>";
    desenharPaginacao(lista.length, paginas, ini, mostrados.length);
  }

  /* páginas: 1 … 4 5 6 … 47, sempre com a primeira, a última e as vizinhas da atual */
  function numerosDePagina(atual, total) {
    const n = new Set([1, total, atual - 1, atual, atual + 1]);
    if (atual <= 3) [2, 3, 4].forEach((x) => n.add(x));
    if (atual >= total - 2) [total - 1, total - 2, total - 3].forEach((x) => n.add(x));
    const lista = Array.from(n).filter((x) => x >= 1 && x <= total).sort((a, b) => a - b);
    const saida = [];
    lista.forEach((x, i) => { if (i && x - lista[i - 1] > 1) saida.push("…"); saida.push(x); });
    return saida;
  }

  function desenharPaginacao(total, paginas, ini, quantos) {
    const nav = $("#paginacao");
    if (!total) { nav.innerHTML = ""; return; }
    const p = est.pagina;
    const botao = (alvo, rotulo, aria, extra) =>
      '<button type="button" data-pagina="' + alvo + '"' + (aria ? ' aria-label="' + aria + '"' : "") + (extra || "") + ">" + rotulo + "</button>";
    nav.innerHTML =
      '<p class="paginacao__faixa num">' + (ini + 1) + "–" + (ini + quantos) + " de " + total + "</p>" +
      (paginas > 1
        ? '<div class="paginacao__botoes">' +
          botao(p - 1, A.icone("chevron-left", "ic-sm") + '<span>Anterior</span>', "Página anterior", p === 1 ? " disabled" : "") +
          numerosDePagina(p, paginas).map((x) => x === "…"
            ? '<span class="paginacao__reticencias" aria-hidden="true">…</span>'
            : botao(x, x, "Página " + x, x === p ? ' aria-current="page"' : "")).join("") +
          botao(p + 1, '<span>Próxima</span>' + A.icone("chevron-right", "ic-sm"), "Próxima página", p === paginas ? " disabled" : "") +
          "</div>"
        : "");
  }

  /* ─── Ficha ─── */
  function desenharFicha() {
    const p = est.escolhido;
    const ficha = $("#ficha");
    if (!p) {
      ficha.innerHTML = '<h2 id="t-ficha">Ficha do paciente</h2><p class="vazio" style="margin-top:12px">' +
        (pacientes.length ? "Escolha um paciente na lista para ver as consultas." : "Quando houver pacientes, a ficha aparece aqui.") + "</p>";
      return;
    }
    const futuras = p.consultas.filter((k) => FUTURO.includes(k.status) && k.data >= HOJE);
    const historico = p.passadas.slice(-6).reverse();
    const linhaK = (k) => '<li><span class="historico__quando">' + quando(k) + '</span><span class="historico__quem">' + A.esc(k.medico.nome) + " · " + A.esc(k.especialidade.nome) + "</span>" +
      '<span class="selo selo--' + A.esc(k.status) + '">' + A.esc(ROTULO[k.status] || k.status) + "</span>" + (k.presencaConfirmada && k.status === "confirmada" ? ' <span class="tabela__sub">presença confirmada</span>' : "") + "</li>";
    ficha.innerHTML =
      '<div class="ficha__cab"><div><h2 id="t-ficha">' + A.esc(p.nome) + "</h2>" +
      '<p class="painel__titulo-sub">CPF <span class="num">' + A.esc(cpfFormatado(p.cpf)) + "</span>" + (p.relacao ? " · " + A.esc(p.relacao) : "") + "</p>" +
      (p.app ? '<p class="painel__titulo-sub">Usa o app AgendaPro: os avisos chegam por lá</p>' : "") + "</div></div>" +
      '<dl class="ficha__numeros"><div><dt>Consultas</dt><dd class="num">' + p.consultas.length + '</dd></div><div><dt>Faltas</dt><dd class="num">' + p.faltas +
      '</dd></div><div><dt>Na fila</dt><dd class="num">' + p.filas.length + "</dd></div></dl>" +
      faltasHTML(p) +
      retornosExamesHTML(p) +
      (p.filas.length
        ? '<p class="ficha__secao">Lista de espera</p><ul class="historico">' + p.filas.map((f) =>
            '<li><span class="historico__quando">Posição ' + f.posicao + '</span><span class="historico__quem">' + A.esc(f.medico.nome) + " · desde " + A.extenso(f.desde, false) + "</span>" +
            '<a class="link-acao" href="lista-espera.html#' + encodeURIComponent(f.medico.id) + '" style="grid-row:1/span 2;grid-column:2;align-self:center">Ver fila</a></li>').join("") + "</ul>"
        : "") +
      '<p class="ficha__secao">Próximas consultas</p>' +
      (futuras.length ? '<ul class="historico">' + futuras.map(linhaK).join("") + "</ul>" : '<p class="tabela__traco" style="margin-top:6px">Nenhuma consulta marcada.</p>') +
      '<p class="ficha__secao">Histórico</p>' +
      (historico.length ? '<ul class="historico">' + historico.map(linhaK).join("") + "</ul>" : '<p class="tabela__traco" style="margin-top:6px">Ainda sem consultas atendidas.</p>') +
      '<div class="ficha__acoes"><a class="botao botao--secundario botao--pequeno" href="nova-consulta.html?paciente=' + encodeURIComponent(p.id) + '">Marcar consulta</a></div>';
  }

  /* Faltas (tabela Faltas) e a restrição da conta (vw_SituacaoConta). A recepção retira a falta justificada informando
     o motivo; a retirada fica no histórico. */
  function faltasHTML(p) {
    const f = est.ficha;
    if (!f || f.id !== p.id) return '<p class="ficha__secao">Faltas registradas</p><p class="tabela__traco" role="status">Carregando as faltas…</p>';
    if (f.erro) return '<p class="ficha__secao">Faltas registradas</p><p class="ficha__restricao" role="alert">' + A.esc(f.erro) + "</p>";
    const s = f.situacao;
    const aviso = s && s.restricao === "so_fila" ? "A conta desta família só pode marcar pela lista de espera até " + A.extenso(s.ate, false) + ". A recepção pode marcar mesmo assim."
      : s && s.restricao === "so_recepcao" ? "A conta desta família só agenda com a recepção até " + A.extenso(s.ate, false) + " e não pode entrar na lista de espera." : "";
    if (!f.faltas.length && !aviso) return "";
    return '<p class="ficha__secao">Faltas registradas</p>' +
      (aviso ? '<p class="ficha__restricao">' + aviso + "</p>" : "") +
      (f.faltas.length ? '<ul class="historico">' + f.faltas.map((x) => {
        const id = A.esc(x.id);
        return '<li><span class="historico__quando">' + K.curtoData(x.data) + " · " + A.esc(x.hora) + (x.retirada ? " · retirada" : "") + "</span>" +
          '<span class="historico__quem">' + A.esc(x.motivo) + " · " + A.esc(x.medico.nome) + (x.por ? " · registrada por " + A.esc(x.por) : "") +
          (x.confirmou ? " · tinha confirmado presença" : " · sem confirmação (não conta)") +
          (x.retirada ? "<br>Retirada por " + A.esc(x.retiradaPor || "recepção") + (x.motivoRetirada ? ": " + A.esc(x.motivoRetirada) : "") : "") + "</span>" +
          (x.retirada ? "" :
            '<button type="button" class="link-acao" data-retirar="' + id + '" style="grid-row:1/span 2;grid-column:2;align-self:center">Retirar (justificada)</button>' +
            '<form class="retirar" data-form-retirar="' + id + '" hidden>' +
            '<label for="mot-' + id + '">Motivo da justificativa</label>' +
            '<input id="mot-' + id + '" maxlength="300" placeholder="Ex.: atestado médico apresentado" required />' +
            '<span style="display:flex;gap:8px"><button type="submit" class="botao botao--principal botao--pequeno">Retirar falta</button>' +
            '<button type="button" class="botao botao--secundario botao--pequeno" data-cancelar-retirar>Cancelar</button></span></form>') +
          "</li>";
      }).join("") + "</ul>" : "");
  }

  /* Retornos e exames pedidos pelo médico (tabelas Retornos e Exames) */
  const SITUACAO_RETORNO = { encaminhado: "Encaminhado à recepção", agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" };
  function retornosExamesHTML(p) {
    const retornos = p.retornos || [];
    const exames = p.exames || [];
    if (!retornos.length && !exames.length) return "";
    return '<p class="ficha__secao">Retornos e exames</p><ul class="historico">' +
      retornos.map((r) =>
        '<li><span class="historico__quando">Retorno' + (r.data ? " · " + K.curtoData(r.data) : "") + '</span><span class="historico__quem">' +
        A.esc(r.medico.nome) + " · " + A.esc(SITUACAO_RETORNO[r.status] || r.status) + (r.nota ? "<br>" + A.esc(r.nota) : "") + "</span>" +
        (r.status === "encaminhado" ? '<a class="link-acao" href="nova-consulta.html?paciente=' + encodeURIComponent(p.id) + '" style="grid-row:1/span 2;grid-column:2;align-self:center">Marcar</a>' : "") + "</li>"
      ).join("") +
      exames.map((e) =>
        '<li><span class="historico__quando">Exame · ' + A.esc(e.nome) + '</span><span class="historico__quem">' + (e.medico ? A.esc(e.medico.nome) + " · " : "") +
        (e.status === "realizado" ? "Realizado" : "Pendente") + "</span>" +
        (e.status === "realizado" ? "" : '<button type="button" class="link-acao" data-exame-feito="' + A.esc(e.id) + '" style="grid-row:1/span 2;grid-column:2;align-self:center">Marcar como realizado</button>') + "</li>"
      ).join("") + "</ul>";
  }

  /* busca as faltas e a situação da conta da pessoa escolhida */
  let pedidoFicha = 0;
  async function carregarFicha(p) {
    const meu = ++pedidoFicha;
    try {
      const [faltas, situacao] = await Promise.all([
        API.chamar("GET", "/api/clinicas/" + CL.clinica.id + "/faltas?paciente=" + encodeURIComponent(p.id)),
        API.chamar("GET", "/api/pacientes/" + encodeURIComponent(p.idConta) + "/situacao"),
      ]);
      if (meu !== pedidoFicha) return;
      est.ficha = { id: p.id, faltas: (faltas || []).slice().sort((a, b) => (a.data < b.data ? 1 : -1)), situacao };
    } catch (e) {
      if (meu !== pedidoFicha || e.status === 401) return;
      est.ficha = { id: p.id, erro: "Não deu para carregar as faltas: " + e.message };
    }
    if (est.escolhido && est.escolhido.id === p.id) desenharFicha();
  }

  function escolher(id, focar) {
    est.escolhido = pacientes.find((p) => A.mesmoId(p.id, id)) || null;
    document.querySelectorAll("#linhas tr[data-id]").forEach((tr) => tr.setAttribute("aria-selected", String(A.mesmoId(tr.dataset.id, id))));
    if (!est.escolhido) { desenharFicha(); return; }
    if (!est.ficha || est.ficha.id !== est.escolhido.id) est.ficha = null;
    desenharFicha();
    carregarFicha(est.escolhido);
    if (focar && window.matchMedia("(max-width: 1240px)").matches) $("#ficha").scrollIntoView({ block: "start" });
  }

  /* depois de mudar algo (falta retirada, exame feito): a lista e a ficha vêm de novo da API */
  async function recarregar() {
    const id = est.escolhido ? est.escolhido.id : null;
    await buscarLista();
    desenharFiltros();
    desenharLista();
    est.ficha = null;
    escolher(id, false);
  }

  /* ─── Eventos ─── */
  $("#busca").addEventListener("input", (ev) => {
    est.busca = ev.target.value.trim();
    est.pagina = 1;
    desenharLista();
  });
  $("#filtros").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-filtro]");
    if (!b || b.dataset.filtro === est.filtro) return;
    est.filtro = b.dataset.filtro;
    est.pagina = 1;
    desenharFiltros();
    desenharLista();
    $('#filtros [data-filtro="' + est.filtro + '"]').focus();
  });
  let ocupado = false;
  $("#ficha").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-retirar]");
    if (b) {
      const f = document.querySelector('[data-form-retirar="' + CSS.escape(b.dataset.retirar) + '"]');
      f.hidden = false;
      b.hidden = true;
      f.querySelector("input").focus();
      return;
    }
    if (ev.target.closest("[data-cancelar-retirar]")) { desenharFicha(); return; }
    const feito = ev.target.closest("[data-exame-feito]");
    if (feito && !ocupado) {
      ocupado = true;
      feito.disabled = true;
      try {
        await API.chamar("PUT", "/api/exames/" + encodeURIComponent(feito.dataset.exameFeito), { status: "realizado" });
        await recarregar();
        K.toast({ titulo: "Exame marcado como realizado", icone: "check" });
      } catch (e) {
        if (e.status !== 401) K.toast({ titulo: "Não deu para marcar o exame", texto: e.message, icone: "info" });
        feito.disabled = false;
      } finally { ocupado = false; }
    }
  });
  $("#ficha").addEventListener("submit", async (ev) => {
    const f = ev.target.closest("[data-form-retirar]");
    if (!f || !est.escolhido) return;
    ev.preventDefault();
    const motivo = f.querySelector("input").value.trim();
    if (!motivo) { f.querySelector("input").focus(); return; }
    if (ocupado) return;
    ocupado = true;
    const botao = f.querySelector('button[type="submit"]');
    botao.disabled = true;
    const nome = est.escolhido.nome;
    try {
      await API.chamar("PUT", "/api/faltas/" + encodeURIComponent(f.dataset.formRetirar) + "/retirar", { motivo });
      await recarregar();
      K.toast({ titulo: "Falta retirada", texto: "Ela não conta mais para " + nome + ".", icone: "check" });
    } catch (e) {
      if (e.status !== 401) K.toast({ titulo: "Não deu para retirar a falta", texto: e.message, icone: "info" });
      botao.disabled = false;
    } finally { ocupado = false; }
  });
  $("#linhas").addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr[data-id]");
    if (tr) escolher(tr.dataset.id, true);
  });
  $("#paginacao").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-pagina]");
    if (!b || b.disabled) return;
    est.pagina = Number(b.dataset.pagina);
    desenharLista();
    /* volta ao começo da tabela e mantém o foco na paginação, no mesmo botão ou na página atual */
    const caixa = document.querySelector(".tabela-caixa");
    if (caixa.getBoundingClientRect().top < 0) caixa.scrollIntoView({ block: "start" });
    const foco = $('#paginacao [data-pagina][aria-label="' + b.getAttribute("aria-label") + '"]:not(:disabled)') || $('#paginacao [aria-current="page"]');
    if (foco) foco.focus({ preventScroll: true });
    K.anunciar("Página " + est.pagina);
  });

  /* ─── Primeira carga ─── */
  $("#linhas").innerHTML = '<tr><td colspan="5"><p class="vazio" role="status">Carregando os pacientes…</p></td></tr>';
  buscarLista().then(() => {
    const hoje = pacientes.filter((p) => p.hoje).length;
    $("#subtitulo").innerHTML = "<b>" + pacientes.length + (pacientes.length === 1 ? " paciente" : " pacientes") + "</b> com a conta vinculada a esta clínica. " +
      hoje + (hoje === 1 ? " tem consulta hoje." : " têm consulta hoje.");
    /* vindo de outra tela com ?paciente={id} já abre a ficha */
    const pedido = new URLSearchParams(location.search).get("paciente");
    desenharFiltros();
    desenharLista();
    const primeiro = filtrados()[0];
    escolher(pedido && pacientes.some((p) => A.mesmoId(p.id, pedido)) ? pedido : primeiro ? primeiro.id : null, false);
  }).catch((e) => {
    if (e.status === 401) return;
    $("#linhas").innerHTML = '<tr><td colspan="5"><p class="vazio" role="alert">Não deu para carregar os pacientes: ' + A.esc(e.message) + "</p></td></tr>";
  });
  }
})();
