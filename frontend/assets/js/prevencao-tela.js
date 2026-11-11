/* AgendaPro Saúde — a tela de Prevenção do paciente (lista por mês, filtro por pessoa, "Marcar", "Já fiz",
   "Desfazer" e o diálogo "Incluir na prevenção"), igual à do app e usada no computador e no celular.
   Os dados e as regras ficam em paciente-servicos.js. */
(function () {
  "use strict";

  const D = window.DADOS;
  const A = window.AP;
  const I = A.icone;
  const P = window.PACIENTE;

  const pessoa = (id) => D.pessoas.find((p) => p.id === id);
  const quem = (p) => (p.id === D.titular ? "Você" : p.curto);
  const quemMinusculo = (p) => (p.id === D.titular ? "você" : p.curto);
  const nomeDoMes = (mes) => { const t = A.MESES_LONGOS[A.data(mes + "-01").getMonth()]; return t.charAt(0).toUpperCase() + t.slice(1) + " de " + mes.slice(0, 4); };
  const contar = (id) => D.prevencao.reduce((s, m) => s + m.itens.filter((i) => id === "todos" || i.pessoa === id).length, 0);

  /* o topo da tela: título com o botão "+" (op.titulo é a função de cabeçalho de cada página) */
  function html(op) {
    return (
      op.titulo("Prevenção", "Check-ups e exames de rotina do ano") +
      '<div class="prev-topo"><button type="button" class="botao botao--principal botao--pequeno" id="prev-incluir">' +
      I("plus") + "Incluir alguém na prevenção</button></div>" +
      '<div class="filtros" role="group" aria-label="Filtrar por pessoa" id="prev-filtros"></div>' +
      '<div id="prev-meses"></div>'
    );
  }

  function itemHTML(it) {
    const p = pessoa(it.pessoa);
    let acoes = "";
    if (it.status === "agendado") acoes = '<span class="selo selo--feito">' + I("check") + "Agendado</span>";
    if (it.status === "feito") {
      acoes = '<span class="selo selo--feito">' + I("check") + "Feito</span>" +
        '<button type="button" class="botao botao--secundario botao--pequeno" data-prev-status="pendente" data-id="' + it.id + '"' +
        ' aria-label="Desfazer: ' + A.esc(it.titulo) + ' volta a ficar pendente">Desfazer</button>';
    }
    if (it.status === "pendente") {
      acoes = (it.esp
        ? '<a class="botao botao--principal botao--pequeno" href="#agendar/' + it.esp + "/" + it.pessoa + "/" + it.id + '"' +
          ' aria-label="Marcar ' + A.esc(it.titulo) + " para " + quemMinusculo(p) + '">' + I("calendar-days") + "Marcar</a>"
        : "") +
        '<button type="button" class="botao botao--secundario botao--pequeno" data-prev-status="feito" data-id="' + it.id + '"' +
        ' aria-label="Já fiz: ' + A.esc(it.titulo) + " de " + quemMinusculo(p) + '">Já fiz</button>';
    }
    return (
      '<div class="prev-item">' + A.avatar(p, 36) +
      '<div class="item__corpo"><p class="prev-item__titulo">' + A.esc(it.titulo) + "</p>" +
      '<p class="prev-item__nota">' + quem(p) + " · " + A.esc(it.nota) + "</p>" +
      '<div class="prev-item__acao">' + acoes + "</div></div></div>"
    );
  }

  function montar(el, op) {
    const filtros = el.querySelector("#prev-filtros");
    const meses = el.querySelector("#prev-meses");

    function desenhar() {
      const f = op.estado.prevFiltro || "todos";
      filtros.innerHTML = [{ id: "todos", rotulo: "Todos" }].concat(D.pessoas.map((p) => ({ id: p.id, rotulo: quem(p), p })))
        .map((x) => '<button type="button" class="filtro" aria-pressed="' + (f === x.id) + '" data-f="' + x.id + '"' +
          ' aria-label="' + A.esc(x.rotulo) + ", " + contar(x.id) + ' lembretes">' + (x.p ? A.avatar(x.p, 28) : "") +
          A.esc(x.rotulo) + ' <span class="filtro__n">' + contar(x.id) + "</span></button>").join("");
      const visiveis = D.prevencao
        .map((m) => Object.assign({}, m, { itens: m.itens.filter((i) => f === "todos" || i.pessoa === f) }))
        .filter((m) => m.itens.length);
      meses.innerHTML = visiveis.length
        ? visiveis.map((mes, i) =>
            '<section class="mes-bloco" aria-labelledby="prev-mes-' + mes.mes + '">' +
            '<div class="container--folha">' + A.folhaMes(mes.mes, { menta: i === 0 }) + "</div>" +
            '<div class="mes-bloco__corpo"><h2 class="mes-bloco__campanha" id="prev-mes-' + mes.mes + '">' + nomeDoMes(mes.mes) + "</h2>" +
            (mes.campanha ? '<span class="selo">' + A.esc(mes.campanha) + "</span>" : "") +
            '<p class="mes-bloco__tema">' + A.esc(mes.tema) + "</p>" +
            '<div class="cartao">' + mes.itens.map(itemHTML).join("") + "</div></div></section>"
          ).join("")
        : '<div class="cartao" style="padding:20px"><p><b>Nenhum lembrete de prevenção</b></p>' +
          '<p class="item__sub">Toque no + lá em cima para incluir alguém da sua família numa campanha.</p></div>';
    }

    /* ─── Incluir na prevenção: quem → campanha → exame ─── */
    function abrirIncluir() {
      const escolha = { pessoa: null, mes: null, titulo: null };
      const radios = (grupo, itens) => itens.map((x) =>
        '<button type="button" role="radio" aria-checked="false" data-grupo="' + grupo + '" data-valor="' + A.esc(x.valor) + '"' +
        (x.rotulo ? ' aria-label="' + A.esc(x.rotulo) + '"' : "") + ">" + x.html + "</button>").join("");
      const sugestoes = () => {
        const m = D.prevencao.find((x) => x.mes === escolha.mes);
        return m ? P.sugestoesDoMes(m) : [];
      };
      op.abrirGaveta(
        '<h2 class="gaveta__titulo" id="gaveta-titulo">Incluir na prevenção</h2>' +
        '<p class="gaveta__texto">Escolha quem, a campanha e o exame</p>' +
        '<form id="form-prev" class="formulario" novalidate>' +
        '<div class="campo"><span class="campo__rotulo" id="prev-quem">Quem vai entrar?</span>' +
        '<div class="opcoes preven_family" role="radiogroup" aria-labelledby="prev-quem">' +
        radios("pessoa", D.pessoas.map((p) => ({ valor: p.id, rotulo: p.id === D.titular ? "Você" : p.curto + ", " + p.relacao, html: A.avatar(p, 24) + " " + quem(p) }))) +
        "</div></div>" +
        '<div class="campo"><span class="campo__rotulo" id="prev-campanha">Em qual campanha?</span>' +
        '<div class="opcoes opcoes--lista" role="radiogroup" aria-labelledby="prev-campanha">' +
        radios("mes", D.prevencao.map((m) => ({ valor: m.mes, html: "<b>" + A.esc(m.campanha || m.tema) + "</b><small>" + nomeDoMes(m.mes) + (m.campanha ? " · " + A.esc(m.tema) : "") + "</small>" }))) +
        "</div></div>" +
        '<div class="campo" id="prev-exames" hidden><span class="campo__rotulo" id="prev-exame">Qual exame ou check-up?</span>' +
        '<div class="opcoes opcoes--lista" role="radiogroup" aria-labelledby="prev-exame" id="prev-exames-lista"></div></div>' +
        '<p class="campo__erro" id="prev-erro" role="alert" hidden></p>' +
        '<div class="gaveta__acoes"><button type="submit" class="botao botao--principal">' + I("heart-pulse") + "Incluir na prevenção</button>" +
        '<button type="button" class="botao botao--secundario" data-fechar>Cancelar</button></div></form>',
        {
          montar: (g) => {
            const marcar = (grupo, valor) => {
              escolha[grupo] = valor;
              g.querySelectorAll('[data-grupo="' + grupo + '"]').forEach((b) => b.setAttribute("aria-checked", String(b.dataset.valor === valor)));
            };
            const desenharExames = () => {
              const caixa = g.querySelector("#prev-exames");
              caixa.hidden = !escolha.mes;
              g.querySelector("#prev-exames-lista").innerHTML = radios("titulo", sugestoes().map((s) => ({ valor: s.titulo, html: "<b>" + A.esc(s.titulo) + "</b><small>" + A.esc(s.nota) + "</small>" })));
            };
            g.addEventListener("click", (ev) => {
              const b = ev.target.closest("[data-grupo]");
              if (!b) return;
              marcar(b.dataset.grupo, b.dataset.valor);
              if (b.dataset.grupo === "mes") { escolha.titulo = null; desenharExames(); } /* cada campanha tem os seus exames */
            });
            /* setas mudam a escolha dentro de cada grupo (padrão de radiogroup) */
            g.addEventListener("keydown", (ev) => {
              const b = ev.target.closest("[data-grupo]");
              if (!b || !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(ev.key)) return;
              ev.preventDefault();
              const lista = Array.from(g.querySelectorAll('[data-grupo="' + b.dataset.grupo + '"]'));
              const j = (lista.indexOf(b) + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1) + lista.length) % lista.length;
              lista[j].focus();
              lista[j].click();
            });
            g.querySelector("#form-prev").addEventListener("submit", (ev) => {
              ev.preventDefault();
              const erro = g.querySelector("#prev-erro");
              const sugestao = sugestoes().find((s) => s.titulo === escolha.titulo);
              const mostrar = (t) => { erro.textContent = t; erro.hidden = false; };
              if (!escolha.pessoa || !escolha.mes || !sugestao) { mostrar("Escolha quem vai entrar, a campanha e o exame."); return; }
              try {
                P.incluirNaPrevencao(Object.assign({ mes: escolha.mes, pessoa: escolha.pessoa }, sugestao));
              } catch (e) { mostrar(e.message); return; }
              op.fecharGaveta();
              desenhar();
              op.anunciar(sugestao.titulo + " incluído na prevenção.");
            });
          },
        }
      );
    }

    desenhar();
    el.addEventListener("click", (ev) => {
      const bf = ev.target.closest("[data-f]");
      if (bf) { op.estado.prevFiltro = bf.dataset.f; desenhar(); el.querySelector('[data-f="' + bf.dataset.f + '"]').focus(); return; }
      if (ev.target.closest("#prev-incluir")) { abrirIncluir(); return; }
      const bs = ev.target.closest("[data-prev-status]");
      if (bs) {
        const it = P.marcarItemPrevencao(bs.dataset.id, bs.dataset.prevStatus);
        desenhar();
        op.anunciar(it.titulo + (it.status === "feito" ? " marcado como feito." : " voltou a ficar pendente."));
      }
    });
  }

  window.PREVENCAO_TELA = { html, montar };
})();
