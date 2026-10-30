/* AgendaPro Saúde v2 — Pacientes da clínica (protótipo, dados FICTÍCIOS)
   Quem tem consulta no período do protótipo ou está na lista de espera. A busca é o trabalho
   principal: achar a pessoa, ver as próximas consultas e o histórico, e marcar outra. */
(function () {
  "use strict";

  const D = window.DADOS;
  const C = window.CLIDADOS;
  const A = window.AP;
  const K = window.CASCA;
  const $ = (s) => document.querySelector(s);

  const POR_PAGINA = 20;
  const ROTULO = { atendida: "Atendida", em: "Em atendimento", chegou: "Na recepção", confirmada: "Confirmada", faltou: "Faltou", oferecida: "Vaga oferecida" };
  const FUTURO = ["confirmada", "chegou", "em", "oferecida"];
  const ordemK = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ini - b.ini);

  /* ─── Junta consultas e filas por nome ─── */
  const mapa = new Map();
  const pegar = (nome) => {
    if (!mapa.has(nome)) mapa.set(nome, { nome, consultas: [], filas: [], app: false });
    return mapa.get(nome);
  };
  C.consultas.forEach((k) => { if (k.paciente && k.status !== "vaga" && k.status !== "cancelada") pegar(k.paciente).consultas.push(k); });
  Object.keys(D.filas).forEach((m) => D.filas[m].forEach((p, i) => {
    const r = pegar(p.nome);
    r.filas.push({ m, pos: i + 1, desde: p.desde });
    if (p.app) r.app = true;
  }));
  const pacientes = Array.from(mapa.values()).map((p) => {
    p.consultas.sort(ordemK);
    p.proxima = p.consultas.find((k) => FUTURO.includes(k.status) && k.data >= D.hoje) || null;
    p.passadas = p.consultas.filter((k) => k.status === "atendida" || k.status === "faltou");
    p.ultima = p.passadas[p.passadas.length - 1] || null;
    p.faltas = p.consultas.filter((k) => k.status === "faltou").length;
    p.hoje = p.consultas.some((k) => k.data === D.hoje);
    p.chave = K.semAcento(p.nome);
    return p;
  });
  /* quem tem consulta marcada primeiro (a mais próxima no topo), depois pela última visita */
  pacientes.sort((a, b) => {
    if (a.proxima && b.proxima) return ordemK(a.proxima, b.proxima);
    if (a.proxima || b.proxima) return a.proxima ? -1 : 1;
    if (a.ultima && b.ultima) return -ordemK(a.ultima, b.ultima);
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const FILTROS = [
    { id: "todos", rotulo: "Todos", teste: () => true },
    { id: "hoje", rotulo: "Com consulta hoje", teste: (p) => p.hoje },
    { id: "fila", rotulo: "Na lista de espera", teste: (p) => p.filas.length },
    { id: "faltas", rotulo: "Já faltaram", teste: (p) => p.faltas > 0 },
  ];
  const est = { filtro: "todos", busca: "", pagina: 1, escolhido: null };

  const quando = (k) => K.curtoData(k.data) + " · " + C.txt(k.ini);
  const curtoMedico = (id) => K.medico(id).nome.split(" ").slice(0, 2).join(" ");

  function filtrados() {
    const f = FILTROS.find((x) => x.id === est.filtro);
    const termo = K.semAcento(est.busca);
    return pacientes.filter((p) => f.teste(p) && (!termo || p.chave.includes(termo)));
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
      ? pacientes.length + " pacientes"
      : lista.length + (lista.length === 1 ? " encontrado" : " encontrados");
    $("#linhas").innerHTML = mostrados.length
      ? mostrados.map((p) => {
          const sub = [p.app ? "usa o app" : "", p.filas.length ? "na fila de " + p.filas.map((f) => curtoMedico(f.m)).join(" e ") : ""].filter(Boolean).join(" · ");
          return '<tr class="linha-clicavel" data-nome="' + A.esc(p.nome) + '" aria-selected="' + (p === est.escolhido) + '">' +
            '<td><button type="button" class="botao-nome" data-ver="' + A.esc(p.nome) + '">' + A.esc(p.nome) + "</button>" + (sub ? '<span class="tabela__sub">' + sub + "</span>" : "") + "</td>" +
            '<td data-rotulo="Próxima consulta">' + (p.proxima
              ? '<span class="num">' + quando(p.proxima) + '</span><span class="tabela__sub">' + curtoMedico(p.proxima.medico) + "</span>"
              : '<span class="tabela__traco">—</span>') + "</td>" +
            '<td data-rotulo="Última consulta">' + (p.ultima ? '<span class="num">' + K.curtoData(p.ultima.data) + "</span>" : '<span class="tabela__traco">—</span>') + "</td>" +
            '<td class="num" data-rotulo="Consultas">' + p.consultas.length + "</td>" +
            '<td class="num" data-rotulo="Faltas">' + (p.faltas ? p.faltas : '<span class="tabela__traco">0</span>') + "</td></tr>";
        }).join("")
      : '<tr><td colspan="5"><p class="vazio">Ninguém com esse nome' + (est.filtro !== "todos" ? " neste filtro" : "") + ". Confira a grafia.</p></td></tr>";
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

  function desenharFicha() {
    const p = est.escolhido;
    const ficha = $("#ficha");
    if (!p) {
      ficha.innerHTML = '<h2 id="t-ficha">Ficha do paciente</h2><p class="vazio" style="margin-top:12px">Escolha um paciente na lista para ver as consultas.</p>';
      return;
    }
    const futuras = p.consultas.filter((k) => FUTURO.includes(k.status) && k.data >= D.hoje);
    const historico = p.passadas.slice(-6).reverse();
    const linhaK = (k) => '<li><span class="historico__quando">' + quando(k) + '</span><span class="historico__quem">' + K.medico(k.medico).nome + " · " + K.esp(K.medico(k.medico).esp).nome + "</span>" +
      '<span class="selo selo--' + k.status + '">' + ROTULO[k.status] + "</span></li>";
    ficha.innerHTML =
      '<div class="ficha__cab"><div><h2 id="t-ficha">' + A.esc(p.nome) + "</h2>" +
      (p.app ? '<p class="painel__titulo-sub">Usa o app AgendaPro: os avisos chegam por lá</p>' : "") + "</div></div>" +
      '<dl class="ficha__numeros"><div><dt>Consultas</dt><dd class="num">' + p.consultas.length + '</dd></div><div><dt>Faltas</dt><dd class="num">' + p.faltas +
      '</dd></div><div><dt>Na fila</dt><dd class="num">' + p.filas.length + "</dd></div></dl>" +
      (p.filas.length
        ? '<p class="ficha__secao">Lista de espera</p><ul class="historico">' + p.filas.map((f) =>
            '<li><span class="historico__quando">' + f.pos + 'ª posição</span><span class="historico__quem">' + K.medico(f.m).nome + " · desde " + A.extenso(f.desde, false) + "</span>" +
            '<a class="link-acao" href="lista-espera.html#' + f.m + '" style="grid-row:1/span 2;grid-column:2;align-self:center">Ver fila</a></li>').join("") + "</ul>"
        : "") +
      '<p class="ficha__secao">Próximas consultas</p>' +
      (futuras.length ? '<ul class="historico">' + futuras.map(linhaK).join("") + "</ul>" : '<p class="tabela__traco" style="margin-top:6px">Nenhuma consulta marcada.</p>') +
      '<p class="ficha__secao">Histórico</p>' +
      (historico.length ? '<ul class="historico">' + historico.map(linhaK).join("") + "</ul>" : '<p class="tabela__traco" style="margin-top:6px">Ainda sem consultas atendidas.</p>') +
      '<div class="ficha__acoes"><a class="botao botao--secundario botao--pequeno" href="nova-consulta.html?paciente=' + encodeURIComponent(p.nome) + '">Marcar consulta</a></div>';
  }

  function escolher(nome, focar) {
    est.escolhido = pacientes.find((p) => p.nome === nome) || null;
    document.querySelectorAll("#linhas tr[data-nome]").forEach((tr) => tr.setAttribute("aria-selected", String(tr.dataset.nome === nome)));
    desenharFicha();
    if (focar && window.matchMedia("(max-width: 1240px)").matches) $("#ficha").scrollIntoView({ block: "start" });
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
  $("#linhas").addEventListener("click", (ev) => {
    const tr = ev.target.closest("tr[data-nome]");
    if (tr) escolher(tr.dataset.nome, true);
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

  const hoje = pacientes.filter((p) => p.hoje).length;
  const ini = C.consultas.reduce((m, k) => (k.data < m ? k.data : m), D.hoje);
  $("#subtitulo").innerHTML = "<b>" + pacientes.length + " pacientes</b> com consulta entre " + A.extenso(ini, false) + " e " + A.extenso(K.ULTIMO_DIA, false) +
    " ou na lista de espera. " + hoje + " têm consulta hoje.";

  /* vindo de outra tela com ?nome=... já abre a ficha */
  const pedido = new URLSearchParams(location.search).get("nome");
  if (pedido) { est.busca = pedido; $("#busca").value = pedido; }
  desenharFiltros();
  desenharLista();
  const primeiro = filtrados()[0];
  escolher(pedido && mapa.has(pedido) ? pedido : primeiro ? primeiro.nome : null, false);
})();
