/* AgendaPro Saúde v2 — calendário do paciente
   - Mês como folhinha de parede; cada dia com compromisso é uma folha de papel.
   - Tocar num dia: a folha vira (rotateY) e cresce até virar o painel do dia (FLIP).
   - Trocar de mês: a página vira como numa folhinha, pelos botões (380ms), arrastando
     (segue o dedo) ou pelo teclado (PageUp/PageDown, sem animação, só um fade).
   - Vaga da lista de espera "chega" ao dia com mola; consulta confirmada ganha carimbo.
   Com "reduzir movimento", tudo vira transição de opacidade. */
(function () {
    'use strict';

    const A = window.AP;
    const M = window.MOV;
    const I = A.icone;

    const TIPOS = {
        consulta: { rotulo: 'Consulta', icone: 'stethoscope' },
        exame: { rotulo: 'Exame', icone: 'flask-conical' },
        prevencao: { rotulo: 'Prevenção', icone: 'calendar-heart' },
        retorno: { rotulo: 'Retorno', icone: 'repeat' },
        oferecido: { rotulo: 'Vaga para você', icone: 'bell-ring' },
        atendida: { rotulo: 'Atendida', icone: 'check' },
        cancelada: { rotulo: 'Cancelada', icone: 'x' },
    };
    const ORDEM_SELO = ['oferecido', 'retorno', 'exame', 'prevencao'];

    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) =>
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const somaMes = (m, n) => {
        const d = A.data(m + '-01');
        d.setMonth(d.getMonth() + n);
        return iso(d).slice(0, 7);
    };
    const somaDias = (dia, n) => {
        const d = A.data(dia);
        d.setDate(d.getDate() + n);
        return iso(d);
    };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    function criar(raiz, op) {
        const D = op.D;
        const estado =
            op.estado; /* { mes, filtro, foco } — sobrevive à navegação */
        const pessoa = (id) => D.pessoas.find((p) => p.id === id);
        const medico = (id) => D.medicos.find((m) => m.id === id);
        const esp = (id) => D.especialidades[id];
        const hoje = D.hoje;

        let ocupado = false; /* uma virada por vez */
        let diaAberto = null; /* iso do dia aberto */
        let arrastou = false; /* para não tratar o fim de um arrasto como toque */

        /* ─── Eventos do calendário ─── */
        function eventos() {
            const lista = [];
            D.consultas.forEach((c) => {
                const m = medico(c.medico);
                lista.push({
                    tipo: c.tipo || 'consulta',
                    id: c.id,
                    data: c.data,
                    hora: c.hora,
                    pessoa: c.pessoa,
                    titulo: c.titulo || esp(m.esp).nome,
                    sub: m.nome + ' · ' + c.sala,
                    href: '#consulta/' + c.id,
                    carimbado: !!c.carimbado,
                });
            });
            D.passadas.forEach((c) => {
                const m = medico(c.medico);
                lista.push({
                    tipo: c.status === 'cancelada' ? 'cancelada' : 'atendida',
                    id: c.id,
                    data: c.data,
                    hora: c.hora,
                    pessoa: c.pessoa,
                    titulo: esp(m.esp).nome,
                    sub: m.nome + ' · ' + (D.STATUS_CONSULTA[c.status] || 'Atendida').toLowerCase(),
                    href: '#consulta/' + c.id,
                });
            });
            D.acompanhamento.retornos.forEach((r) => {
                lista.push({
                    tipo: 'retorno',
                    id: r.id,
                    data: r.prazo,
                    hora: null,
                    pessoa: r.pessoa,
                    titulo: 'Último dia para marcar o retorno',
                    sub: r.titulo + ' · ' + medico(r.medico).nome,
                    href: '#agendar/' + r.esp + '/' + r.pessoa,
                });
            });
            const e = D.espera;
            if (e && e.oferta && !e.resolvida) {
                const m = medico(e.medico);
                lista.push({
                    tipo: 'oferecido',
                    id: 'oferecido',
                    data: e.vaga.data,
                    hora: e.vaga.hora,
                    pessoa: e.pessoa,
                    titulo: esp(m.esp).nome,
                    sub: m.nome + ' · confirme em até 30 minutos',
                    href: null,
                });
            }
            return lista;
        }
        function porDia() {
            const mapa = {};
            eventos().forEach((ev) => {
                (mapa[ev.data] = mapa[ev.data] || []).push(ev);
            });
            Object.keys(mapa).forEach((k) =>
                mapa[k].sort((a, b) =>
                    (a.hora || '99').localeCompare(b.hora || '99'),
                ),
            );
            return mapa;
        }
        const passaFiltro = (ev) =>
            estado.filtro === 'todos' || ev.pessoa === estado.filtro;
        const feriado = (dia) => (D.feriados || []).find((f) => f.data === dia);
        const nomeDe = (id) => {
            const p = pessoa(id);
            return p.id === D.titular ? 'Você' : p.curto;
        };
        const paraQuem = (id) => {
            const p = pessoa(id);
            return p.id === D.titular ? 'você' : p.tratamento;
        };

        raiz.innerHTML =
            '<div class="cal-filtros" role="group" aria-label="Mostrar compromissos de"></div>' +
            '<section class="cal" aria-labelledby="cal-titulo">' +
            '<div class="cal-cabeca sobre-noite">' +
            '<button type="button" class="botao-icone" data-mes="-1" aria-label="Mês anterior">' +
            I('chevron-left') +
            '</button>' +
            '<h2 class="cal-cabeca__titulo" id="cal-titulo" aria-live="polite"></h2>' +
            '<button type="button" class="botao-icone" data-mes="1" aria-label="Próximo mês">' +
            I('chevron-right') +
            '</button>' +
            '</div>' +
            '<div class="cal-area">' +
            '<div class="cal-pagina" role="grid" aria-labelledby="cal-titulo"></div>' +
            '<div class="cal-aberto" role="region" tabindex="-1" hidden></div>' +
            '<div class="cal-sombra" aria-hidden="true"></div>' +
            '</div>' +
            '<ul class="cal-legenda" aria-label="Legenda">' +
            '<li><span class="cal-legenda__ponto" aria-hidden="true"></span>Consulta (cor da pessoa)</li>' +
            '<li>' +
            I('flask-conical') +
            'Exame</li>' +
            '<li>' +
            I('calendar-heart') +
            'Prevenção</li>' +
            '<li>' +
            I('repeat') +
            'Prazo de retorno</li>' +
            '</ul>' +
            '</section>' +
            '<p class="cal-dica">Toque num dia para ver os compromissos. Para trocar de mês, use as setas ou arraste a folha para o lado.</p>' +
            '<section class="secao" aria-labelledby="t-neste-mes"><div class="secao__cabeca"><h2 class="secao__titulo" id="t-neste-mes"></h2></div><div class="mes-lista"></div></section>';

        const filtros = raiz.querySelector('.cal-filtros');
        const titulo = raiz.querySelector('#cal-titulo');
        const area = raiz.querySelector('.cal-area');
        const pagina = raiz.querySelector('.cal-pagina');
        const aberto = raiz.querySelector('.cal-aberto');
        const sombra = raiz.querySelector('.cal-sombra');
        const btAnt = raiz.querySelector('[data-mes="-1"]');
        const btProx = raiz.querySelector('[data-mes="1"]');
        const tituloLista = raiz.querySelector('#t-neste-mes');
        const lista = raiz.querySelector('.mes-lista');

        const dentro = (m) => m >= op.limites[0] && m <= op.limites[1];

        /* ─── Filtros por pessoa ─── */
        function desenharFiltros() {
            const evs = eventos().filter(
                (ev) => ev.data.slice(0, 7) === estado.mes,
            );
            const conta = (id) =>
                evs.filter((ev) => id === 'todos' || ev.pessoa === id).length;
            const n = (k) =>
                (k === 0
                    ? 'nenhum compromisso'
                    : k === 1
                      ? '1 compromisso'
                      : k + ' compromissos') + ' neste mês';
            filtros.innerHTML =
                '<button type="button" class="cal-pessoa" aria-pressed="' +
                (estado.filtro === 'todos') +
                '" data-filtro="todos" aria-label="Família inteira, ' +
                n(conta('todos')) +
                '">' +
                '<span class="cal-pessoa__todos">' +
                I('users') +
                '</span><span>Todos</span></button>' +
                D.pessoas
                    .map(
                        (p) =>
                            '<button type="button" class="cal-pessoa" aria-pressed="' +
                            (estado.filtro === p.id) +
                            '" data-filtro="' +
                            p.id +
                            '" aria-label="' +
                            A.esc(nomeDe(p.id) + ', ' + n(conta(p.id))) +
                            '">' +
                            A.avatar(p, 44) +
                            '<span>' +
                            nomeDe(p.id) +
                            '</span></button>',
                    )
                    .join('');
        }

        /* ─── Uma página do mês ─── */
        function rotuloDia(dia, evs) {
            const vis = evs.filter(passaFiltro);
            const f = feriado(dia);
            let t = cap(A.extenso(dia));
            if (dia === hoje) t += ', hoje';
            if (f) t += '. Feriado: ' + f.nome;
            if (!vis.length) return t + '. Nada marcado.';
            return (
                t +
                '. ' +
                vis.length +
                (vis.length === 1 ? ' compromisso: ' : ' compromissos: ') +
                vis
                    .map(
                        (ev) =>
                            nomeDe(ev.pessoa) +
                            ', ' +
                            TIPOS[ev.tipo].rotulo.toLowerCase() +
                            (ev.tipo === 'consulta' || ev.tipo === 'atendida' || ev.tipo === 'cancelada'
                                ? ' de ' + ev.titulo
                                : '') +
                            (ev.hora ? ' às ' + ev.hora : ''),
                    )
                    .join('; ') +
                '.'
            );
        }

        function celulaHTML(dia, evs, foco) {
            const d = A.data(dia);
            const vis = evs.filter(passaFiltro);
            const cls = ['cal-dia'];
            if (evs.length) cls.push('cal-dia--com');
            if (evs.length && !vis.length) cls.push('cal-dia--filtrado');
            if (dia < hoje) cls.push('cal-dia--passado');
            if (dia === hoje) cls.push('cal-dia--hoje');
            if (d.getDay() === 0 || feriado(dia)) cls.push('cal-dia--domingo');
            if (evs.some((ev) => ev.tipo === 'oferecido')) cls.push('cal-dia--oferecido');
            const selo = ORDEM_SELO.find((t) =>
                evs.some((ev) => ev.tipo === t && passaFiltro(ev)),
            );
            const marcas = evs
                .slice(0, 4)
                .map(
                    (ev) =>
                        '<span class="cal-marca' +
                        (passaFiltro(ev) ? '' : ' oculta') +
                        '" data-pessoa="' +
                        ev.pessoa +
                        '" style="--cor:var(--id-' +
                        ev.pessoa +
                        ')"></span>',
                )
                .join('');
            const carimbo = evs.some((ev) => ev.carimbado)
                ? '<span class="cal-dia__carimbo">' + I('check') + '</span>'
                : '';
            return (
                '<div role="gridcell"><button type="button" class="' +
                cls.join(' ') +
                '" data-dia="' +
                dia +
                '" tabindex="' +
                (foco ? 0 : -1) +
                '" aria-expanded="false" aria-label="' +
                A.esc(rotuloDia(dia, evs)) +
                '">' +
                '<span class="cal-dia__faixa" aria-hidden="true"></span>' +
                '<span class="cal-dia__num" aria-hidden="true">' +
                d.getDate() +
                '</span>' +
                '<span class="cal-dia__marcas" aria-hidden="true">' +
                (selo && selo !== 'oferecido'
                    ? '<svg class="ic cal-selo-mini" aria-hidden="true"><use href="#i-' +
                      TIPOS[selo].icone +
                      '"/></svg>'
                    : '') +
                (selo === 'oferecido'
                    ? '<svg class="ic cal-selo-mini" aria-hidden="true"><use href="#i-bell-ring"/></svg>'
                    : '') +
                marcas +
                '</span>' +
                carimbo +
                '</button></div>'
            );
        }

        function paginaHTML(mes) {
            const mapa = porDia();
            const d0 = A.data(mes + '-01');
            const ano = d0.getFullYear(),
                m = d0.getMonth();
            const dias = new Date(ano, m + 1, 0).getDate();
            const vazio = d0.getDay();
            const foco =
                estado.foco && estado.foco.slice(0, 7) === mes
                    ? estado.foco
                    : hoje.slice(0, 7) === mes
                      ? hoje
                      : mes + '-01';
            let html =
                '<div class="cal-linha" role="row">' +
                A.SEMANA_CURTA.map(
                    (s, i) =>
                        '<span class="cal-sem' +
                        (i === 0 ? ' cal-sem--dom' : '') +
                        '" role="columnheader" aria-label="' +
                        A.SEMANA[i] +
                        '">' +
                        s +
                        '</span>',
                ).join('') +
                '</div>';
            const total = Math.ceil((vazio + dias) / 7) * 7;
            for (let i = 0; i < total; i++) {
                if (i % 7 === 0) html += '<div class="cal-linha" role="row">';
                const n = i - vazio + 1;
                if (n < 1 || n > dias)
                    html +=
                        '<div role="gridcell"><span class="cal-dia cal-dia--fora"></span></div>';
                else {
                    const dia = ano + '-' + pad(m + 1) + '-' + pad(n);
                    html += celulaHTML(dia, mapa[dia] || [], dia === foco);
                }
                if (i % 7 === 6) html += '</div>';
            }
            return html;
        }

        function desenharTitulo() {
            const d = A.data(estado.mes + '-01');
            titulo.innerHTML =
                '<span class="cal-cabeca__mes">' +
                cap(A.MESES_LONGOS[d.getMonth()]) +
                '</span><span class="cal-cabeca__ano">' +
                d.getFullYear() +
                '</span>';
            btAnt.disabled = !dentro(somaMes(estado.mes, -1));
            btProx.disabled = !dentro(somaMes(estado.mes, 1));
        }

        /* ─── Lista do mês: a mesma informação em texto, para quem prefere ler ─── */
        function desenharLista() {
            const d = A.data(estado.mes + '-01');
            tituloLista.textContent = 'Em ' + A.MESES_LONGOS[d.getMonth()];
            const evs = eventos()
                .filter(
                    (ev) =>
                        ev.data.slice(0, 7) === estado.mes && passaFiltro(ev),
                )
                .sort((a, b) =>
                    (a.data + (a.hora || '99')).localeCompare(
                        b.data + (b.hora || '99'),
                    ),
                );
            const prev = (
                D.prevencao.find((x) => x.mes === estado.mes) || { itens: [] }
            ).itens.filter(
                (it) =>
                    passaFiltro({ pessoa: it.pessoa }) &&
                    it.status === 'pendente',
            );
            let html = evs
                .map((ev) => {
                    const p = pessoa(ev.pessoa);
                    const tag = ev.href ? 'a' : 'div';
                    return (
                        '<' +
                        tag +
                        ' class="cartao agenda-item' +
                        (ev.href ? ' pressionavel' : '') +
                        '"' +
                        (ev.href ? ' href="' + ev.href + '"' : '') +
                        '>' +
                        A.folha(ev.data, {
                            pequena: true,
                            menta: ev.tipo === 'oferecido',
                        }) +
                        '<span class="consulta-cartao__corpo">' +
                        '<span class="selo-tipo selo-tipo--' +
                        ev.tipo +
                        '">' +
                        I(TIPOS[ev.tipo].icone) +
                        TIPOS[ev.tipo].rotulo +
                        '</span>' +
                        '<span class="cda-item__titulo">' +
                        ev.titulo +
                        '</span>' +
                        '<span class="cda-item__sub">' +
                        (ev.hora
                            ? '<span class="num">' + ev.hora + '</span> · '
                            : '') +
                        ev.sub +
                        '</span>' +
                        '<span class="pessoa-chip">' +
                        A.avatar(p, 28) +
                        nomeDe(p.id) +
                        '</span>' +
                        '</span>' +
                        (ev.href ? I('chevron-right', 'item__seta') : '') +
                        '</' +
                        tag +
                        '>'
                    );
                })
                .join('');
            if (prev.length) {
                html +=
                    '<div class="cartao" style="margin-top:10px">' +
                    prev
                        .map(
                            (it) =>
                                '<div class="mes-lista__prev">' +
                                A.avatar(pessoa(it.pessoa), 36) +
                                '<div class="item__corpo"><span class="selo-tipo selo-tipo--prevencao">' +
                                I('calendar-heart') +
                                'Prevenção</span>' +
                                '<p class="prev-item__titulo" style="margin-top:6px">' +
                                it.titulo +
                                '</p><p class="prev-item__nota">Ainda sem data · ' +
                                it.nota +
                                '</p></div></div>',
                        )
                        .join('') +
                    '</div>';
            }
            lista.innerHTML =
                html ||
                '<p class="cartao">Nada marcado neste mês' +
                    (estado.filtro === 'todos'
                        ? ''
                        : ' para ' + paraQuem(estado.filtro)) +
                    '.</p>';
        }

        function desenharTudo() {
            desenharTitulo();
            desenharFiltros();
            pagina.innerHTML = paginaHTML(estado.mes);
            desenharLista();
        }

        /* ─── Filtro: as marcas das outras pessoas somem com um fade rápido ─── */
        function aplicarFiltro(id) {
            estado.filtro = id;
            filtros
                .querySelectorAll('[data-filtro]')
                .forEach((b) =>
                    b.setAttribute(
                        'aria-pressed',
                        String(b.dataset.filtro === id),
                    ),
                );
            const mapa = porDia();
            pagina.querySelectorAll('.cal-dia[data-dia]').forEach((cel) => {
                const evs = mapa[cel.dataset.dia] || [];
                cel.querySelectorAll('.cal-marca').forEach((mk) =>
                    mk.classList.toggle(
                        'oculta',
                        !(id === 'todos' || mk.dataset.pessoa === id),
                    ),
                );
                cel.classList.toggle(
                    'cal-dia--filtrado',
                    evs.length > 0 && !evs.some(passaFiltro),
                );
                const selo = ORDEM_SELO.find((t) =>
                    evs.some((ev) => ev.tipo === t && passaFiltro(ev)),
                );
                const mini = cel.querySelector('.cal-selo-mini');
                if (mini) mini.style.opacity = selo ? '' : '0';
                cel.setAttribute('aria-label', rotuloDia(cel.dataset.dia, evs));
            });
            desenharLista();
            if (diaAberto) preencherAberto(diaAberto);
            op.anunciar(
                id === 'todos'
                    ? 'Mostrando a família inteira'
                    : 'Mostrando só ' +
                          (id === D.titular
                              ? 'os seus compromissos'
                              : 'os compromissos de ' + pessoa(id).curto),
            );
        }

        /* ─── Painel do dia ─── */
        function preencherAberto(dia) {
            const evs = porDia()[dia] || [];
            const vis = evs.filter(passaFiltro);
            const escondidos = evs.length - vis.length;
            const f = feriado(dia);
            const quantos = vis.length
                ? vis.length +
                  (vis.length === 1 ? ' compromisso' : ' compromissos')
                : 'Nada marcado';
            aberto.setAttribute('aria-label', cap(A.extenso(dia)));
            aberto.innerHTML =
                '<div class="cda-cabeca">' +
                A.folha(dia, {
                    menta: dia === hoje || evs.some((ev) => ev.tipo === 'oferecido'),
                }) +
                '<div class="cda-cabeca__texto"><h3 class="cda-cabeca__titulo" tabindex="-1">' +
                cap(A.extenso(dia)) +
                '</h3>' +
                '<p class="cda-cabeca__sub">' +
                (dia === hoje ? 'Hoje · ' : '') +
                (f ? 'Feriado: ' + f.nome + ' · ' : '') +
                quantos +
                '</p></div>' +
                '<button type="button" class="botao-icone pressionavel" data-fechar-dia aria-label="Voltar ao mês">' +
                I('x') +
                '</button></div>' +
                '<div class="cda-lista">' +
                vis
                    .map((ev) => {
                        const p = pessoa(ev.pessoa);
                        const selo =
                            '<span class="selo-tipo selo-tipo--' +
                            ev.tipo +
                            '">' +
                            I(TIPOS[ev.tipo].icone) +
                            TIPOS[ev.tipo].rotulo +
                            '</span>';
                        const corpo =
                            '<span class="cda-item__corpo"><span class="cda-item__linha"><span class="cda-item__hora">' +
                            (ev.hora || 'Até hoje') +
                            '</span>' +
                            selo +
                            '</span>' +
                            '<span class="cda-item__titulo">' +
                            ev.titulo +
                            '</span>' +
                            '<span class="cda-item__sub">' +
                            ev.sub +
                            ' · para ' +
                            paraQuem(p.id) +
                            '</span>';
                        if (ev.tipo === 'oferecido') {
                            return (
                                '<div class="cda-item cda-item--oferecido">' +
                                A.avatar(p, 44) +
                                corpo +
                                '<button type="button" class="botao botao--principal botao--largo" data-confirmar-vaga>Ver e confirmar a vaga</button></span></div>'
                            );
                        }
                        return (
                            '<a class="cda-item" href="' +
                            ev.href +
                            '">' +
                            A.avatar(p, 44) +
                            corpo +
                            '</span>' +
                            I('chevron-right', 'item__seta') +
                            '</a>'
                        );
                    })
                    .join('') +
                (vis.length
                    ? ''
                    : '<div class="cda-vazio"><p>' +
                      (f
                          ? 'A clínica não abre neste dia.'
                          : 'Nada marcado ' +
                            (estado.filtro === 'todos'
                                ? ''
                                : 'para ' + paraQuem(estado.filtro) + ' ') +
                            'neste dia.') +
                      '</p>' +
                      (f || dia < hoje
                          ? ''
                          : '<a class="botao botao--secundario botao--pequeno" href="#assistente">' +
                            I('message-circle-heart') +
                            'Marcar uma consulta</a>') +
                      '</div>') +
                (escondidos
                    ? '<p class="cda-nota">' +
                      escondidos +
                      (escondidos === 1
                          ? ' compromisso de outra pessoa está escondido. '
                          : ' compromissos de outras pessoas estão escondidos. ') +
                      '<button type="button" data-filtro="todos">Mostrar todos</button></p>'
                    : '') +
                '</div>';
        }

        function celula(dia) {
            return pagina.querySelector('.cal-dia[data-dia="' + dia + '"]');
        }

        function frenteHTML(cel, s) {
            const mod = cel.classList.contains('cal-dia--oferecido')
                ? ' giro__frente--oferecido'
                : cel.classList.contains('cal-dia--hoje')
                  ? ' giro__frente--hoje'
                  : '';
            return (
                '<div class="giro__face giro__frente' +
                mod +
                '" style="--s:' +
                s +
                '"><span class="giro__frente-faixa"></span><span class="giro__frente-num">' +
                cel.querySelector('.cal-dia__num').textContent +
                '</span></div>'
            );
        }

        function abrirDia(dia) {
            if (ocupado) return;
            const cel = celula(dia);
            if (!cel) return;
            estado.foco = dia;
            diaAberto = dia;
            preencherAberto(dia);
            aberto.hidden = false;
            aberto.style.minHeight = pagina.offsetHeight + 'px';
            pagina
                .querySelectorAll('[aria-expanded="true"]')
                .forEach((b) => b.setAttribute('aria-expanded', 'false'));
            cel.setAttribute('aria-expanded', 'true');
            const focar = () => {
                const h = aberto.querySelector('h3');
                if (h) h.focus({ preventScroll: true });
            };

            if (M.reduzido()) {
                pagina.style.visibility = 'hidden';
                aberto.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: 160,
                    easing: 'ease',
                });
                focar();
                return;
            }
            ocupado = true;
            const ra = area.getBoundingClientRect();
            const rp = aberto.getBoundingClientRect();
            const rc = cel.getBoundingClientRect();
            const sx = rc.width / rp.width,
                sy = rc.height / rp.height;
            const giro = document.createElement('div');
            giro.className = 'giro';
            giro.setAttribute('aria-hidden', 'true');
            giro.style.cssText =
                'left:' +
                (rp.left - ra.left) +
                'px;top:' +
                (rp.top - ra.top) +
                'px;width:' +
                rp.width +
                'px;height:' +
                rp.height +
                'px';
            giro.innerHTML =
                '<div class="giro__sombra"></div><div class="giro__cartao">' +
                frenteHTML(cel, Math.sqrt(sx * sy)) +
                '<div class="giro__face giro__verso">' +
                aberto.innerHTML +
                '</div></div>';
            area.appendChild(giro);
            aberto.style.visibility = 'hidden';
            cel.style.visibility = 'hidden';

            const dur = 340;
            const de =
                'translate(' +
                (rc.left - rp.left) +
                'px,' +
                (rc.top - rp.top) +
                'px) scale(' +
                sx +
                ',' +
                sy +
                ')';
            const ag = giro.animate(
                [{ transform: de }, { transform: 'none' }],
                { duration: dur, easing: M.EASE_IN_OUT },
            );
            giro.querySelector('.giro__cartao').animate(
                [
                    { transform: 'rotateY(0deg)' },
                    { transform: 'rotateY(180deg)' },
                ],
                { duration: dur, easing: M.EASE_IN_OUT },
            );
            giro.querySelector('.giro__sombra').animate(
                [{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }],
                { duration: dur, easing: 'ease' },
            );
            pagina
                .animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: 200,
                    delay: 60,
                    easing: 'ease',
                    fill: 'forwards',
                })
                .finished.then(() => {
                    pagina.style.visibility = 'hidden';
                });
            const fim = () => {
                aberto.style.visibility = '';
                cel.style.visibility = '';
                giro.remove();
                pagina.getAnimations().forEach((a) => a.cancel());
                ocupado = false;
                focar();
            };
            ag.finished.then(fim, fim);
            op.anunciar(cap(A.extenso(dia)) + ' aberto.');
        }

        function fecharDia(imediato) {
            if (!diaAberto) return;
            const dia = diaAberto;
            diaAberto = null;
            const cel = celula(dia);
            if (cel) cel.setAttribute('aria-expanded', 'false');
            const terminar = () => {
                aberto.hidden = true;
                aberto.innerHTML = '';
                aberto.style.visibility = '';
                pagina.style.visibility = '';
                if (cel && !imediato) cel.focus({ preventScroll: true });
            };
            if (imediato || M.reduzido() || !cel) {
                pagina.style.visibility = '';
                if (!imediato)
                    pagina.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 160,
                        easing: 'ease',
                    });
                terminar();
                return;
            }
            ocupado = true;
            pagina.style.visibility = '';
            const ra = area.getBoundingClientRect();
            const rp = aberto.getBoundingClientRect();
            const rc = cel.getBoundingClientRect();
            const sx = rc.width / rp.width,
                sy = rc.height / rp.height;
            const giro = document.createElement('div');
            giro.className = 'giro';
            giro.setAttribute('aria-hidden', 'true');
            giro.style.cssText =
                'left:' +
                (rp.left - ra.left) +
                'px;top:' +
                (rp.top - ra.top) +
                'px;width:' +
                rp.width +
                'px;height:' +
                rp.height +
                'px';
            giro.innerHTML =
                '<div class="giro__sombra"></div><div class="giro__cartao">' +
                frenteHTML(cel, Math.sqrt(sx * sy)) +
                '<div class="giro__face giro__verso">' +
                aberto.innerHTML +
                '</div></div>';
            area.appendChild(giro);
            aberto.hidden = true;
            cel.style.visibility = 'hidden';
            const dur = 240; /* fechar é mais rápido que abrir */
            const para =
                'translate(' +
                (rc.left - rp.left) +
                'px,' +
                (rc.top - rp.top) +
                'px) scale(' +
                sx +
                ',' +
                sy +
                ')';
            const ag = giro.animate(
                [{ transform: 'none' }, { transform: para }],
                { duration: dur, easing: M.EASE_IN_OUT, fill: 'forwards' },
            );
            giro.querySelector('.giro__cartao').animate(
                [
                    { transform: 'rotateY(180deg)' },
                    { transform: 'rotateY(0deg)' },
                ],
                { duration: dur, easing: M.EASE_IN_OUT, fill: 'forwards' },
            );
            giro.querySelector('.giro__sombra').animate(
                [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
                { duration: dur },
            );
            pagina.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 200,
                easing: 'ease',
            });
            const fim = () => {
                giro.remove();
                cel.style.visibility = '';
                ocupado = false;
                terminar();
            };
            ag.finished.then(fim, fim);
        }

        /* ─── Virar a página do mês ─── */
        function trocarSemAnimacao(novo, focoDia) {
            estado.mes = novo;
            if (focoDia) estado.foco = focoDia;
            desenharTitulo();
            desenharFiltros();
            pagina.innerHTML = paginaHTML(novo);
            desenharLista();
            pagina.animate([{ opacity: 0.25 }, { opacity: 1 }], {
                duration: 150,
                easing: 'ease',
            });
        }

        function montarVirada(delta) {
            /* delta > 0: a página atual vira para a esquerda e revela o mês seguinte.
         delta < 0: o mês anterior volta da esquerda por cima da página atual. */
            const novo = somaMes(estado.mes, delta);
            const virador = document.createElement('div');
            virador.className = 'virador';
            virador.setAttribute('aria-hidden', 'true');
            const folhaPag = document.createElement('div');
            folhaPag.className = 'cal-pagina';
            if (delta > 0) {
                folhaPag.innerHTML = pagina.innerHTML;
            } else {
                folhaPag.innerHTML = paginaHTML(novo);
            }
            folhaPag
                .querySelectorAll('[tabindex]')
                .forEach((b) => b.setAttribute('tabindex', '-1'));
            virador.innerHTML = '<div class="virador__verso"></div>';
            virador.appendChild(folhaPag);
            const luz = document.createElement('div');
            luz.className = 'virador__luz';
            virador.appendChild(luz);
            area.appendChild(virador);

            const mesAntigo = estado.mes;
            estado.mes = novo;
            if (delta > 0) pagina.innerHTML = paginaHTML(novo);
            desenharTitulo();

            const sai = delta > 0;
            const giro = sai
                ? [
                      { transform: 'rotateY(0deg)', opacity: 1 },
                      { transform: 'rotateY(-70deg)', opacity: 1, offset: 0.7 },
                      { transform: 'rotateY(-104deg)', opacity: 0 },
                  ]
                : [
                      { transform: 'rotateY(-104deg)', opacity: 0 },
                      { transform: 'rotateY(-70deg)', opacity: 1, offset: 0.3 },
                      { transform: 'rotateY(0deg)', opacity: 1 },
                  ];
            const tempo = { duration: 380, easing: 'linear', fill: 'both' };
            const anims = [
                virador.animate(giro, tempo),
                luz.animate(
                    sai
                        ? [{ opacity: 0 }, { opacity: 1 }]
                        : [{ opacity: 1 }, { opacity: 0 }],
                    tempo,
                ),
                sombra.animate(
                    sai
                        ? [{ opacity: 1 }, { opacity: 0 }]
                        : [{ opacity: 0 }, { opacity: 1 }],
                    tempo,
                ),
            ];
            anims.forEach((a) => a.pause());

            return {
                anims,
                progresso(p) {
                    anims.forEach((a) => {
                        a.currentTime = Math.max(0, Math.min(1, p)) * 380;
                    });
                },
                concluir(easing, duracao) {
                    return new Promise((ok) => {
                        anims.forEach((a) => {
                            a.effect.updateTiming({
                                easing: easing || 'linear',
                            });
                            if (duracao) a.updatePlaybackRate(380 / duracao);
                            a.play();
                        });
                        anims[0].finished.then(() => {
                            if (!sai) pagina.innerHTML = paginaHTML(novo);
                            virador.remove();
                            anims.forEach((a) => a.cancel());
                            desenharFiltros();
                            desenharLista();
                            ok();
                        });
                    });
                },
                desfazer() {
                    return new Promise((ok) => {
                        anims.forEach((a) => {
                            a.updatePlaybackRate(-2.2);
                            a.play();
                        });
                        anims[0].finished.then(() => {
                            estado.mes = mesAntigo;
                            pagina.innerHTML = paginaHTML(mesAntigo);
                            desenharTitulo();
                            virador.remove();
                            anims.forEach((a) => a.cancel());
                            ok();
                        });
                    });
                },
            };
        }

        function mudarMes(delta, modo) {
            const novo = somaMes(estado.mes, delta);
            if (!dentro(novo)) {
                M.tremer(delta > 0 ? btProx : btAnt);
                return;
            }
            if (ocupado) return;
            if (diaAberto) fecharDia(true);
            const d = A.data(novo + '-01');
            const nome =
                A.MESES_LONGOS[d.getMonth()] + ' de ' + d.getFullYear();
            if (modo === 'teclado' || M.reduzido()) {
                trocarSemAnimacao(
                    novo,
                    novo === hoje.slice(0, 7) ? hoje : novo + '-01',
                );
                if (modo === 'teclado') {
                    const c = pagina.querySelector('[tabindex="0"]');
                    if (c) c.focus({ preventScroll: true });
                }
                op.anunciar(cap(nome));
                return;
            }
            ocupado = true;
            estado.foco = null;
            const v = montarVirada(delta);
            v.concluir(M.EASE_IN_OUT, 380).then(() => {
                ocupado = false;
            });
            op.anunciar(cap(nome));
        }

        /* ─── Arrastar a folha para o lado (segue o dedo) ─── */
        (function arrasto() {
            let x0 = 0,
                y0 = 0,
                t0 = 0,
                ativo = false,
                decidido = false,
                virada = null,
                delta = 0,
                largura = 1,
                ponteiro = null;
            const amostras = [];
            area.addEventListener('pointerdown', (ev) => {
                if (
                    ocupado ||
                    diaAberto ||
                    (ev.pointerType === 'mouse' && ev.button !== 0) ||
                    ponteiro !== null
                )
                    return;
                ponteiro = ev.pointerId;
                x0 = ev.clientX;
                y0 = ev.clientY;
                t0 = performance.now();
                ativo = true;
                decidido = false;
                virada = null;
                arrastou = false;
                amostras.length = 0;
                largura = area.getBoundingClientRect().width;
            });
            area.addEventListener('pointermove', (ev) => {
                if (!ativo || ev.pointerId !== ponteiro) return;
                const dx = ev.clientX - x0,
                    dy = ev.clientY - y0;
                if (!decidido) {
                    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
                    decidido = true;
                    if (Math.abs(dy) > Math.abs(dx)) {
                        ativo = false;
                        ponteiro = null;
                        return;
                    }
                    delta = dx < 0 ? 1 : -1;
                    if (!dentro(somaMes(estado.mes, delta)) || M.reduzido()) {
                        ativo = false;
                        ponteiro = null;
                        return;
                    }
                    area.setPointerCapture(ev.pointerId);
                    arrastou = true;
                    ocupado = true;
                    virada = montarVirada(delta);
                }
                if (!virada) return;
                amostras.push({ x: ev.clientX, t: performance.now() });
                if (amostras.length > 6) amostras.shift();
                /* resistência suave perto do fim */
                const p = Math.min(1, Math.abs(dx) / (largura * 0.85));
                virada.progresso(delta > 0 ? (dx < 0 ? p : 0) : dx > 0 ? p : 0);
            });
            function soltar(ev) {
                if (ev.pointerId !== ponteiro) return;
                ponteiro = null;
                if (!ativo) return;
                ativo = false;
                if (!virada) return;
                const dx = ev.clientX - x0;
                const p = Math.min(1, Math.abs(dx) / (largura * 0.85));
                const a = amostras[0],
                    b = amostras[amostras.length - 1];
                const vel =
                    a && b && b.t > a.t ? Math.abs(b.x - a.x) / (b.t - a.t) : 0;
                const certo = delta > 0 ? dx < 0 : dx > 0;
                const v = virada;
                virada = null;
                if (certo && (p > 0.35 || vel > 0.45)) {
                    const resto = Math.max(140, (1 - p) * 300);
                    v.concluir('linear', resto).then(() => {
                        ocupado = false;
                        const d = A.data(estado.mes + '-01');
                        op.anunciar(
                            cap(
                                A.MESES_LONGOS[d.getMonth()] +
                                    ' de ' +
                                    d.getFullYear(),
                            ),
                        );
                    });
                } else {
                    v.desfazer().then(() => {
                        ocupado = false;
                    });
                }
                setTimeout(() => {
                    arrastou = false;
                }, 0);
                void t0;
            }
            area.addEventListener('pointerup', soltar);
            area.addEventListener('pointercancel', soltar);
        })();

        /* ─── Teclado na grade: setas, Home/End, PageUp/PageDown ─── */
        pagina.addEventListener('keydown', (ev) => {
            const cel = ev.target.closest('.cal-dia[data-dia]');
            if (!cel) return;
            const passos = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
            };
            let alvo = null;
            if (passos[ev.key] != null)
                alvo = somaDias(cel.dataset.dia, passos[ev.key]);
            else if (ev.key === 'Home')
                alvo = somaDias(
                    cel.dataset.dia,
                    -A.data(cel.dataset.dia).getDay(),
                );
            else if (ev.key === 'End')
                alvo = somaDias(
                    cel.dataset.dia,
                    6 - A.data(cel.dataset.dia).getDay(),
                );
            else if (ev.key === 'PageDown' || ev.key === 'PageUp') {
                ev.preventDefault();
                mudarMes(ev.key === 'PageDown' ? 1 : -1, 'teclado');
                return;
            } else return;
            ev.preventDefault();
            const mesAlvo = alvo.slice(0, 7);
            if (mesAlvo !== estado.mes) {
                if (!dentro(mesAlvo)) return;
                trocarSemAnimacao(mesAlvo, alvo);
            }
            estado.foco = alvo;
            pagina
                .querySelectorAll('.cal-dia[tabindex="0"]')
                .forEach((b) => b.setAttribute('tabindex', '-1'));
            const nova = celula(alvo);
            if (nova) {
                nova.setAttribute('tabindex', '0');
                nova.focus({ preventScroll: false });
            }
        });

        /* ─── Cliques ─── */
        raiz.addEventListener('click', (ev) => {
            if (arrastou) {
                ev.preventDefault();
                return;
            }
            const bm = ev.target.closest('[data-mes]');
            if (bm) {
                mudarMes(Number(bm.dataset.mes), 'botao');
                return;
            }
            const bf = ev.target.closest('[data-filtro]');
            if (bf) {
                aplicarFiltro(bf.dataset.filtro);
                return;
            }
            if (ev.target.closest('[data-fechar-dia]')) {
                fecharDia();
                return;
            }
            if (ev.target.closest('[data-confirmar-vaga]')) {
                if (op.aoConfirmarVaga) op.aoConfirmarVaga();
                return;
            }
            const cel = ev.target.closest('.cal-dia[data-dia]');
            if (cel) {
                pagina
                    .querySelectorAll('.cal-dia[tabindex="0"]')
                    .forEach((b) => b.setAttribute('tabindex', '-1'));
                cel.setAttribute('tabindex', '0');
                abrirDia(cel.dataset.dia);
            }
        });
        raiz.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape' && diaAberto) {
                ev.stopPropagation();
                fecharDia();
            }
        });

        /* ─── Momentos de destaque ─── */
        function irParaMes(mes) {
            if (mes === estado.mes) return Promise.resolve();
            if (diaAberto) fecharDia(true);
            const delta = mes > estado.mes ? 1 : -1;
            if (
                M.reduzido() ||
                Math.abs(
                    (A.data(mes + '-01') - A.data(estado.mes + '-01')) / 2.6e9,
                ) > 1.5
            ) {
                trocarSemAnimacao(mes);
                return Promise.resolve();
            }
            ocupado = true;
            return montarVirada(delta)
                .concluir(M.EASE_IN_OUT, 380)
                .then(() => {
                    ocupado = false;
                });
        }

        /* A vaga desce sobre o dia certo e assenta com mola; um halo se apaga em volta. */
        function chegarVaga() {
            const e = D.espera;
            if (!e || !e.oferta) return Promise.resolve();
            const dia = e.vaga.data;
            estado.filtro = 'todos';
            return irParaMes(dia.slice(0, 7)).then(() => {
                desenharFiltros();
                pagina.innerHTML = paginaHTML(estado.mes);
                desenharLista();
                const cel = celula(dia);
                if (!cel) return;
                cel.scrollIntoView({
                    block: 'center',
                    behavior: M.reduzido() ? 'auto' : 'smooth',
                });
                op.anunciar(
                    'Vaga para você: ' +
                        A.extenso(dia) +
                        ', às ' +
                        e.vaga.hora +
                        '. Confirme em até 30 minutos.',
                );
                if (M.reduzido()) {
                    cel.animate([{ opacity: 0.3 }, { opacity: 1 }], {
                        duration: 240,
                    });
                    return;
                }
                return M.esperar(260).then(() => {
                    const ra = area.getBoundingClientRect();
                    const rc = cel.getBoundingClientRect();
                    const voando = document.createElement('div');
                    voando.className = 'vaga-voando';
                    voando.setAttribute('aria-hidden', 'true');
                    voando.style.cssText =
                        'left:' +
                        (rc.left - ra.left) +
                        'px;top:' +
                        (rc.top - ra.top) +
                        'px;width:' +
                        rc.width +
                        'px;height:' +
                        rc.height +
                        'px';
                    voando.innerHTML =
                        '<span class="vaga-voando__faixa"></span><span class="vaga-voando__num">' +
                        A.data(dia).getDate() +
                        '</span>' +
                        I('bell-ring');
                    area.appendChild(voando);
                    cel.style.visibility = 'hidden';
                    const mola = M.mola({ duracao: 0.6, bounce: 0.28 });
                    const queda = voando.animate(
                        [
                            {
                                transform:
                                    'translateY(-150px) rotate(-14deg) scale(1.35)',
                                opacity: 0,
                            },
                            {
                                transform:
                                    'translateY(-150px) rotate(-14deg) scale(1.35)',
                                opacity: 1,
                                offset: 0.05,
                            },
                            { transform: 'none', opacity: 1 },
                        ],
                        {
                            duration: mola.duracao,
                            easing: mola.easing,
                            fill: 'both',
                        },
                    );
                    return queda.finished.then(() => {
                        cel.style.visibility = '';
                        voando.remove();
                        const halo = document.createElement('div');
                        halo.className = 'cal-halo';
                        halo.style.cssText =
                            'left:' +
                            (rc.left - ra.left) +
                            'px;top:' +
                            (rc.top - ra.top) +
                            'px;width:' +
                            rc.width +
                            'px;height:' +
                            rc.height +
                            'px';
                        area.appendChild(halo);
                        cel.animate(
                            [
                                { transform: 'scale(0.92)' },
                                { transform: 'scale(1)' },
                            ],
                            { duration: 220, easing: M.EASE_OUT },
                        );
                        const h1 = halo.animate(
                            [
                                { transform: 'scale(1)', opacity: 0.9 },
                                { transform: 'scale(1.6)', opacity: 0 },
                            ],
                            { duration: 900, easing: M.EASE_OUT },
                        );
                        halo.animate(
                            [
                                { transform: 'scale(1)', opacity: 0.7 },
                                { transform: 'scale(1.35)', opacity: 0 },
                            ],
                            {
                                duration: 900,
                                delay: 180,
                                easing: M.EASE_OUT,
                                fill: 'both',
                            },
                        ).finished.then(() => halo.remove());
                        return h1.finished;
                    });
                });
            });
        }

        /* O dia ganha o carimbo de "marcada" (depois de confirmar um agendamento). */
        function carimbar(dia) {
            return irParaMes(dia.slice(0, 7)).then(() => {
                D.consultas.forEach((c) => {
                    if (c.data === dia && c.novo) c.carimbado = true;
                });
                pagina.innerHTML = paginaHTML(estado.mes);
                desenharFiltros();
                desenharLista();
                const cel = celula(dia);
                if (!cel) return;
                cel.scrollIntoView({
                    block: 'center',
                    behavior: M.reduzido() ? 'auto' : 'smooth',
                });
                const marca = cel.querySelector('.cal-dia__carimbo');
                if (!marca) return;
                if (M.reduzido()) {
                    marca.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 200,
                    });
                    return;
                }
                const mola = M.mola({ duracao: 0.42, bounce: 0.3 });
                marca.animate(
                    [
                        { transform: 'rotate(-30deg) scale(2.6)', opacity: 0 },
                        { transform: 'rotate(-12deg) scale(1)', opacity: 1 },
                    ],
                    {
                        duration: mola.duracao,
                        delay: 300,
                        easing: mola.easing,
                        fill: 'backwards',
                    },
                );
                cel.animate(
                    [
                        { transform: 'scale(1)' },
                        { transform: 'scale(0.9)' },
                        { transform: 'scale(1)' },
                    ],
                    {
                        duration: 240,
                        delay: 300 + mola.duracao * 0.35,
                        easing: M.EASE_OUT,
                    },
                );
            });
        }

        desenharTudo();

        return {
            chegarVaga,
            carimbar,
            atualizar() {
                desenharTudo();
                if (diaAberto) preencherAberto(diaAberto);
            },
            fecharDia: () => fecharDia(true),
        };
    }

    window.CalPaciente = { criar, TIPOS };
})();
