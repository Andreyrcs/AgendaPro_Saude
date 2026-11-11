/* AgendaPro Saúde — painel do médico: a agenda do médico que entrou, o detalhe de cada consulta
   (iniciar e finalizar atendimento, ausência, retorno) e o histórico. Tudo grava em clinica-dados.js. */
(function () {
    'use strict';

    const D = window.DADOS;
    const C = window.CLIDADOS;
    const A = window.AP;
    const I = A.icone;

    /* o médico da sessão (login): a conta de médico guarda qual médico da clínica ela é */
    const SESSAO = (window.API && window.API.sessao()) || {};
    const MEDICO_ID =
        SESSAO.medicoId ||
        (D.medicos.find((m) => m.nome === SESSAO.nome) || {}).id ||
        null;
    if (!MEDICO_ID || !D.medicos.some((m) => m.id === MEDICO_ID)) {
        const main = document.querySelector('main') || document.body;
        main.innerHTML =
            '<p class="painel" style="margin:32px">Esta conta de médico ainda não está ligada a um médico da clínica. Peça à recepção para conferir o cadastro em Médicos.</p>';
        return;
    }
    const PX = 1.5;
    const INICIO = C.INICIO;
    const agora = () => C.minutoAgora();

    const est = { vista: 'dia', dia: D.hoje, semana: segunda(D.hoje), mesInicio: D.hoje.slice(0, 7) };
    const $ = (s) => document.querySelector(s);
    const anunciador = $('#anunciador');

    function anunciar(texto) {
        anunciador.textContent = '';
        setTimeout(() => {
            anunciador.textContent = texto;
        }, 30);
    }

    /* ─── Toast ─── */
    function toast(titulo, sub, icone) {
        const caixa = $('#toasts');
        if (!caixa) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.innerHTML =
            (icone ? I(icone) : '') +
            '<p>' +
            A.esc(titulo) +
            (sub ? '<small>' + A.esc(sub) + '</small>' : '') +
            '</p>';
        caixa.appendChild(el);
        const semMov = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        el.animate(
            semMov
                ? [{ opacity: 0 }, { opacity: 1 }]
                : [
                      { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
                      { opacity: 1, transform: 'none' },
                  ],
            { duration: 260, easing: 'cubic-bezier(0.23,1,0.32,1)' },
        );
        setTimeout(() => {
            if (!el.isConnected) return;
            el.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 180,
                easing: 'ease',
                fill: 'forwards',
            }).finished.then(() => el.remove());
        }, 4800);
        anunciar(titulo + (sub ? '. ' + sub : ''));
    }

    /* ─── Dialogs ─── */
    function abrirDlg(dlg) {
        if (dlg.open) return; /* já aberto: só o conteúdo foi redesenhado */
        const semMov = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        dlg.showModal();
        if (!semMov)
            dlg.animate(
                [
                    { opacity: 0, transform: 'scale(0.96)' },
                    { opacity: 1, transform: 'none' },
                ],
                { duration: 200, easing: 'cubic-bezier(0.23,1,0.32,1)' },
            );
    }
    function fecharDlg(dlg) {
        if (!dlg.open) return;
        const semMov = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (semMov) {
            dlg.close();
            return;
        }
        dlg.animate(
            [{ opacity: 1 }, { opacity: 0, transform: 'scale(0.98)' }],
            { duration: 140, easing: 'ease', fill: 'forwards' },
        ).finished.then(() => {
            dlg.close();
            dlg.getAnimations().forEach((a) => a.cancel());
        });
    }
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-fechar]');
        if (btn) fecharDlg(document.getElementById(btn.dataset.fechar));
        if (ev.target.tagName === 'DIALOG') {
            const r = ev.target.getBoundingClientRect();
            if (
                ev.clientX < r.left ||
                ev.clientX > r.right ||
                ev.clientY < r.top ||
                ev.clientY > r.bottom
            )
                fecharDlg(ev.target);
        }
    });
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            const dlg = document.querySelector('dialog[open]');
            if (dlg) {
                ev.preventDefault();
                fecharDlg(dlg);
            }
        }
    });

    /* ─── Navegação entre seções ─── */
    const SECOES = {
        agenda: 'secao-agenda',
        historico: 'secao-historico',
        perfil: 'secao-perfil',
    };
    let secaoAtual = 'agenda';

    function irPara(secao) {
        if (!SECOES[secao]) return;
        secaoAtual = secao;
        Object.keys(SECOES).forEach((s) => {
            const el = document.getElementById(SECOES[s]);
            if (el) el.hidden = s !== secao;
        });
        // atualizar aria-current no menu
        document
            .querySelectorAll('.lateral__menu a[data-secao]')
            .forEach((a) => {
                a.setAttribute(
                    'aria-current',
                    a.dataset.secao === secao ? 'page' : 'false',
                );
            });
        const pe = document.querySelector('.lateral__pe[data-secao]');
        if (pe)
            pe.setAttribute(
                'aria-current',
                pe.dataset.secao === secao ? 'page' : 'false',
            );
        // atualizar header
        const titulos = {
            agenda: 'Minha agenda',
            historico: 'Histórico',
            perfil: 'Meu perfil',
        };
        const tEl = document.getElementById('titulo-pagina');
        if (tEl) tEl.textContent = titulos[secao] || '';
        const vistas = document.getElementById('vistas-agenda');
        if (vistas) vistas.hidden = secao !== 'agenda';
        if (secao === 'historico') renderHistorico('todos');
        if (secao === 'perfil') renderPerfil();
    }

    document.addEventListener('click', (ev) => {
        const a = ev.target.closest('[data-secao]');
        if (!a) return;
        const secao = a.dataset.secao;
        if (!SECOES[secao]) return;
        ev.preventDefault();
        irPara(secao);
    });

    /* ─── Lógica da agenda ─── */
    function segunda(dia) {
        const d = C.data(dia);
        const dow = d.getDay() || 7;
        return C.somaDias(dia, 1 - dow);
    }

    function minhasConsultas(dia) {
        return C.consultas.filter(
            (k) =>
                k.medico === MEDICO_ID &&
                k.data === dia &&
                C.ativa(k),
        );
    }

    function todasMinhasConsultas() {
        return C.consultas.filter((k) => k.medico === MEDICO_ID && C.ehConsulta(k));
    }

    function colunas() {
        if (est.vista === 'dia') return [{ data: est.dia }];
        const cols = [];
        for (let i = 0; i < 6; i++)
            cols.push({ data: C.somaDias(est.semana, i) });
        return cols;
    }

    /* os mesmos nomes da recepção, do app e do banco (dados.js) */
    const ESTADOS = Object.assign({}, D.STATUS_CONSULTA, {
        livre: 'Horário livre',
        oferecido: D.ESTADO_HORARIO.oferecido,
    });
    const chave = (k) => k.horario || k.status;

    function chaveConsulta(k) {
        return k.data + '|' + k.ini;
    }

    function rotuloBloco(k) {
        const status = ESTADOS[chave(k)] || chave(k);
        const quem = k.horario === 'livre' ? 'Horário livre' : k.paciente;
        return (
            quem +
            ', ' +
            C.txt(k.ini) +
            ' a ' +
            C.txt(k.ini + k.dur) +
            '. ' +
            status +
            '.'
        );
    }

    function blocoHTML(k, c) {
        const nome = k.horario === 'livre' ? 'Horário livre' : k.paciente;
        const clicavel = !k.horario;
        return (
            '<div class="cbloco cbloco--' +
            chave(k) +
            (clicavel ? ' cbloco--clicavel' : '') +
            '" style="--c:' +
            c +
            ';--ini:' +
            k.ini +
            ';--dur:' +
            k.dur +
            '"' +
            (clicavel
                ? ' role="button" tabindex="0" data-chave="' +
                  chaveConsulta(k) +
                  '"'
                : ' role="listitem"') +
            ' aria-label="' +
            A.esc(rotuloBloco(k)) +
            '">' +
            '<span class="cbloco__texto"><span class="cbloco__nome">' +
            A.esc(nome) +
            '</span>' +
            '<span class="cbloco__hora">' +
            C.txt(k.ini) +
            '</span></span></div>'
        );
    }

    function fundoHTML(n) {
        let h = '';
        for (let t = INICIO; t <= C.FIM; t += 30) {
            const y = (t - INICIO) * PX;
            h +=
                '<div class="grade__linha' +
                (t % 60 ? ' grade__linha--meia' : '') +
                '" style="top:' +
                y +
                'px"></div>';
        }
        /* o almoço deste médico (Horários), se ele para */
        const almoco = C.almocoDe(MEDICO_ID);
        if (almoco)
            h +=
                '<div class="grade__almoco" style="top:' +
                (almoco[0] - INICIO) * PX +
                'px;height:' +
                (almoco[1] - almoco[0]) * PX +
                'px">Almoço</div>';
        for (let i = 1; i < n; i++) {
            h +=
                '<div class="grade__sep grade__sep--dia" style="left:calc(' +
                i +
                ' * 100% / ' +
                n +
                ')"></div>';
        }
        return h;
    }

    function horasHTML() {
        let h = '';
        for (let t = INICIO + 60; t < C.FIM; t += 60) {
            h +=
                '<span class="grade__hora" style="top:' +
                (t - INICIO) * PX +
                'px">' +
                C.txt(t) +
                '</span>';
        }
        return h;
    }

    function curtoData(dia) {
        const d = C.data(dia);
        return (
            A.SEMANA_CURTA[d.getDay()] +
            ', ' +
            d.getDate() +
            '/' +
            String(d.getMonth() + 1).padStart(2, '0')
        );
    }

    function cabecalhoDia() {
        const md = D.medicos.find((m) => m.id === MEDICO_ID);
        return (
            '<div class="grade__colunas">' +
            '<div class="grade__medico" style="--cor:' +
            md.cor +
            '">' +
            '<span class="grade__medico-texto">' +
            '<span class="grade__medico-nome">' +
            md.nome +
            '</span>' +
            '<span class="grade__medico-esp">' +
            D.especialidades[md.esp].nome +
            '</span>' +
            '</span></div></div>'
        );
    }

    function cabecalhoSemana() {
        return (
            '<div class="grade__dias">' +
            colunas()
                .map((col) => {
                    const f = (D.feriados || []).find(
                        (x) => x.data === col.data,
                    );
                    return (
                        '<div class="grade__dia-cab' +
                        (col.data === D.hoje ? ' grade__dia-cab--hoje' : '') +
                        '">' +
                        '<span class="grade__dia-nome">' +
                        curtoData(col.data) +
                        (f ? ' · ' + f.nome : '') +
                        (col.data === D.hoje
                            ? '<span class="visualmente-oculto">, hoje</span>'
                            : '') +
                        '</span></div>'
                    );
                })
                .join('') +
            '</div>'
        );
    }

    function vistaGrade() {
        const cols = colunas();
        const n = cols.length;
        const semana = est.vista === 'semana';
        const cab = semana ? cabecalhoSemana() : cabecalhoDia();
        const blocos = cols
            .flatMap((col, c) =>
                minhasConsultas(col.data).map((k) => blocoHTML(k, c)),
            )
            .join('');
        const vistaEl = $('#vista');
        vistaEl.setAttribute(
            'aria-labelledby',
            semana ? 'aba-semana' : 'aba-dia',
        );
        vistaEl.innerHTML =
            '<div class="grade' +
            (semana ? ' grade--semana' : '') +
            '" style="--n:' +
            n +
            '" role="list" aria-label="Consultas">' +
            '<div class="grade__cabeca"><span></span>' +
            cab +
            '</div>' +
            '<div class="grade__rolagem" id="rolagem"><div class="grade__corpo">' +
            '<div class="grade__horas" aria-hidden="true">' +
            horasHTML() +
            '</div>' +
            '<div class="grade__pista" id="pista">' +
            fundoHTML(n) +
            blocos +
            '<div class="agora" id="agora" hidden><span class="agora__rotulo"></span></div>' +
            '</div></div></div></div>';
        posicionarAgora(true);
        const rol = $('#rolagem');
        if (rol) rol.scrollTop = Math.max(0, (agora() - 90 - INICIO) * PX);
    }

    function posicionarAgora(primeira) {
        const linha = $('#agora');
        if (!linha) return;
        const cols = colunas();
        const n = cols.length;
        const idx = cols.findIndex((c) => c.data === D.hoje);
        if (idx < 0) {
            linha.hidden = true;
            return;
        }
        linha.hidden = false;
        if (primeira) linha.style.transition = 'none';
        linha.style.left = 'calc(' + idx + ' * 100% / ' + n + ')';
        linha.style.width = 'calc(100% / ' + n + ')';
        linha.style.transform = 'translateY(' + (agora() - INICIO) * PX + 'px)';
        linha.querySelector('.agora__rotulo').textContent = C.txt(
            Math.floor(agora()),
        );
        if (primeira)
            requestAnimationFrame(() => {
                linha.style.transition = '';
            });
    }

    setInterval(() => posicionarAgora(false), 1000);


    /* ─── Vista mensal (calendário de 2 meses) ─── */
    function gerarMesHTML(ano, mes) {
        var SEMANA_MIN = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
        var primeiro = new Date(ano, mes, 1);
        var dow = primeiro.getDay();
        var offsetSeg = (dow === 0 ? 6 : dow - 1);
        var diasNoMes = new Date(ano, mes + 1, 0).getDate();

        var h = '<div class="cal__mes">';
        h += '<div class="cal__titulo">' + A.MESES_LONGOS[mes].charAt(0).toUpperCase() + A.MESES_LONGOS[mes].slice(1) +
             ' <span>' + ano + '</span></div>';
        h += '<div class="cal__semana">' + SEMANA_MIN.map(function(s) {
            return '<span>' + s + '</span>';
        }).join('') + '</div>';
        h += '<div class="cal__grade">';

        // empty cells before first day
        for (var e = 0; e < offsetSeg; e++) {
            h += '<div class="cal__dia cal__dia--fora"></div>';
        }

        for (var d = 1; d <= diasNoMes; d++) {
            var iso = ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var dObj = new Date(ano, mes, d);
            var dowD = dObj.getDay();
            var isDom = dowD === 0;
            var isHoje = iso === D.hoje;
            var feriado = (D.feriados || []).find(function(f) { return f.data === iso; });
            var consultas = minhasConsultas(iso);
            var livres = consultas.filter(function(k) { return !!k.horario; }).length;
            var total = consultas.length;
            var temFila = consultas.some(function(k) { return k.horario === 'oferecido'; });

            var classes = 'cal__dia';
            if (isHoje) classes += ' cal__dia--hoje';
            if (isDom) classes += ' cal__dia--domingo';
            if (feriado && !total) classes += ' cal__dia--fechado';
            if (total && !livres && !feriado) classes += ' cal__dia--livre';

            if (isDom || (feriado && !total)) {
                // não clicável
                h += '<div class="' + classes + '">' +
                     '<span class="cal__n">' + d + '</span>' +
                     (feriado ? '<span class="cal__nota">feriado</span>' : '') +
                     '</div>';
            } else {
                var nota = '';
                if (feriado) {
                    nota = 'feriado';
                } else if (total > 0) {
                    var pacientes = total - livres;
                    nota = pacientes + ' consulta' + (pacientes !== 1 ? 's' : '');
                }

                h += '<div class="' + classes + ' cal__dia--livre">' +
                     '<input type="radio" name="cal-dia" value="' + iso + '" id="cd-' + iso + '"' +
                     (isHoje ? ' checked' : '') + '>' +
                     '<label for="cd-' + iso + '">' +
                     (temFila ? '<span class="cal__ponto"></span>' : '') +
                     '<span class="cal__n">' + d + '</span>' +
                     (nota ? '<span class="cal__nota">' + nota + '</span>' : '') +
                     '</label></div>';
            }
        }

        h += '</div></div>';
        return h;
    }

    function vistaMes() {
        var vistaEl = $('#vista');
        vistaEl.setAttribute('aria-labelledby', 'aba-mes');

        var p = est.mesInicio.split('-').map(Number);
        var ano1 = p[0], mes1 = p[1] - 1;
        var mes2 = mes1 + 1, ano2 = ano1;
        if (mes2 > 11) { mes2 = 0; ano2++; }

        var h = '<div class="cal__meses cal__meses--2">' +
                gerarMesHTML(ano1, mes1) +
                gerarMesHTML(ano2, mes2) +
                '</div>';

        // consultas do dia selecionado
        h += '<div class="med-cal-detalhe" id="med-cal-detalhe"></div>';

        vistaEl.innerHTML = h;

        // render detail for today or first checked
        var checked = vistaEl.querySelector('input[name="cal-dia"]:checked');
        if (checked) renderCalDetalhe(checked.value);

        // listen for day selection
        vistaEl.addEventListener('change', function handler(ev) {
            if (ev.target.name === 'cal-dia') renderCalDetalhe(ev.target.value);
        });
    }

    function renderCalDetalhe(dia) {
        var el = $('#med-cal-detalhe');
        if (!el) return;
        var consultas = minhasConsultas(dia).sort(function(a, b) { return a.ini - b.ini; });
        var pacientes = consultas.filter(function(k) { return !k.horario; });

        var tituloData = A.extenso(dia, true);

        if (!pacientes.length) {
            el.innerHTML = '<div class="med-cal-detalhe__cab"><h3>' + tituloData + '</h3></div>' +
                '<p class="hist-vazio">Nenhuma consulta neste dia.</p>';
            return;
        }

        el.innerHTML = '<div class="med-cal-detalhe__cab"><h3>' + tituloData + '</h3>' +
            '<span class="painel__meta">' + pacientes.length + ' paciente' + (pacientes.length !== 1 ? 's' : '') + '</span></div>' +
            '<ol class="hist-lista">' +
            pacientes.map(function(k) {
                var emAtendimento = k.status === 'em_atendimento';
                return '<li class="hist-item' + (emAtendimento ? ' hist-item--destaque' : '') + '" data-chave="' + chaveConsulta(k) + '" role="button" tabindex="0">' +
                    '<div class="hist-item__principal">' +
                    '<span class="hist-item__nome">' + A.esc(k.paciente) + '</span>' +
                    '<span class="hist-item__hora">' + C.txt(k.ini) + ' – ' + C.txt(k.ini + k.dur) + '</span>' +
                    '</div>' +
                    '<div class="hist-item__direita">' + seloStatus(k.status) + '</div></li>';
            }).join('') + '</ol>' +
            '<button type="button" class="botao botao--secundario botao--pequeno med-cal-ver-dia" data-cal-dia="' + dia + '">' +
            I('calendar', 'ic-sm') + 'Ver dia completo</button>';
    }

    function atualizarContadores() {
        const consultas = minhasConsultas(D.hoje);
        const atendidas = consultas.filter(
            (k) => k.status === 'atendida' || k.status === 'em_atendimento',
        ).length;
        const restantes = consultas.filter(
            (k) => k.status === 'confirmada' || k.status === 'na_recepcao',
        ).length;
        const set = (id, v) => {
            const el = $(id);
            if (el) el.textContent = v;
        };
        set('#n-consultas', consultas.length);
        set('#s-consultas', consultas.length === 1 ? 'consulta' : 'consultas');
        set('#n-atendidas', atendidas);
        set('#n-restantes', restantes);
    }

    /* ─── Lista de pacientes do dia ─── */
    function renderPacientesDia() {
        const lista = $('#pacientes-dia-lista');
        const meta = $('#meta-pacientes-dia');
        if (!lista) return;

        const consultas = minhasConsultas(est.dia).sort(
            (a, b) => a.ini - b.ini,
        );
        const pacientes = consultas.filter(
            (k) => !k.horario,
        );

        if (meta)
            meta.textContent =
                pacientes.length +
                ' paciente' +
                (pacientes.length !== 1 ? 's' : '');

        if (!pacientes.length) {
            lista.innerHTML =
                '<li class="hist-vazio">Nenhum paciente agendado para este dia.</li>';
            return;
        }

        lista.innerHTML = pacientes
            .map((k) => {
                const emAtendimento = k.status === 'em_atendimento';
                return (
                    '<li class="hist-item' +
                    (emAtendimento ? ' hist-item--destaque' : '') +
                    '" data-chave="' +
                    chaveConsulta(k) +
                    '" role="button" tabindex="0">' +
                    '<div class="hist-item__principal">' +
                    '<span class="hist-item__nome">' +
                    A.esc(k.paciente) +
                    '</span>' +
                    '<span class="hist-item__hora">' +
                    C.txt(k.ini) +
                    ' – ' +
                    C.txt(k.ini + k.dur) +
                    '</span>' +
                    '</div>' +
                    '<div class="hist-item__direita">' +
                    seloStatus(k.status) +
                    '</div>' +
                    '</li>'
                );
            })
            .join('');
    }

    function atualizarTitulo() {
        const t = $('#t-agenda');
        if (!t) return;
        if (est.vista === 'dia') {
            t.textContent = A.extenso(est.dia, true);
        } else if (est.vista === 'semana') {
            const fim = C.somaDias(est.semana, 5);
            const d0 = C.data(est.semana);
            const d1 = C.data(fim);
            t.textContent =
                d0.getDate() +
                ' a ' +
                d1.getDate() +
                '/' +
                String(d1.getMonth() + 1).padStart(2, '0');
        } else if (est.vista === 'mes') {
            var p = est.mesInicio.split('-').map(Number);
            var m2 = p[1] + 1 > 12 ? 1 : p[1] + 1;
            var nome1 = A.MESES_LONGOS[p[1] - 1];
            var nome2 = A.MESES_LONGOS[m2 - 1];
            t.textContent = nome1.charAt(0).toUpperCase() + nome1.slice(1) + ' – ' + nome2.charAt(0).toUpperCase() + nome2.slice(1) + ' ' + (m2 === 1 ? p[0] + 1 : p[0]);
        }
    }

    function atualizarAbas() {
        document.querySelectorAll('[data-vista]').forEach((b) => {
            b.setAttribute(
                'aria-selected',
                String(b.dataset.vista === est.vista),
            );
        });
    }

    function redesenhar() {
        atualizarTitulo();
        atualizarAbas();
        atualizarContadores();
        if (est.vista === 'mes') {
            vistaMes();
            // hide pacientes-dia in month view, show consultas-dia-mes instead
            var pdEl = $('.pacientes-dia');
            if (pdEl) pdEl.hidden = true;
        } else {
            vistaGrade();
            var pdEl2 = $('.pacientes-dia');
            if (pdEl2) pdEl2.hidden = false;
            renderPacientesDia();
        }
    }

    /* ─── Detalhe da consulta ─── */
    function seloStatus(status) {
        const cores = {
            atendida: 'menta',
            em_atendimento: 'noite',
            na_recepcao: 'ambar',
            confirmada: 'neutro',
            faltou: 'perigo',
            cancelada: 'perigo',
        };
        const cor = cores[status] || 'neutro';
        return (
            '<span class="med-selo med-selo--' +
            cor +
            '">' +
            (ESTADOS[status] || status) +
            '</span>'
        );
    }

    function abrirConsulta(chave) {
        const [data, ini] = chave.split('|');
        const k = C.consultas.find(
            (x) =>
                x.medico === MEDICO_ID &&
                x.data === data &&
                String(x.ini) === ini,
        );
        if (!k) return;

        const corpo = document.getElementById('dlg-consulta-corpo');
        const acoes = document.getElementById('dlg-consulta-acoes');
        const titulo = document.getElementById('dlg-consulta-titulo');

        titulo.textContent = k.paciente;

        corpo.innerHTML =
            '<div class="med-dlg__info">' +
            '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Horário</span><span>' +
            C.txt(k.ini) +
            ' – ' +
            C.txt(k.ini + k.dur) +
            '</span></div>' +
            '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Data</span><span>' +
            A.extenso(k.data) +
            '</span></div>' +
            '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Status</span>' +
            seloStatus(k.status) +
            '</div>' +
            (k.sala
                ? '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Sala</span><span>' +
                  k.sala +
                  '</span></div>'
                : '') +
            (k.motivo
                ? '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Motivo</span><span>' +
                  A.esc(k.motivo) +
                  '</span></div>'
                : '') +
            (k.presencaConfirmada
                ? '<div class="med-dlg__linha"><span class="med-dlg__rotulo">Presença</span><span>Confirmada pelo paciente</span></div>'
                : '') +
            '</div>';

        /* exames pedidos nesta consulta, e o campo para pedir outro (atendimento em andamento ou concluído) */
        const exames = C.examesDe(k.paciente).filter((e) => e.consulta === k.id);
        if (exames.length) {
            corpo.innerHTML +=
                '<div class="med-dlg__notas"><h3>Exames pedidos</h3>' +
                exames.map((e) => '<div class="med-nota"><span class="med-nota__data">' + A.esc(e.nome) + ' · ' + (e.status === 'realizado' ? 'realizado' : 'pendente') + '</span></div>').join('') +
                '</div>';
        }
        if (k.status === 'em_atendimento' || k.status === 'atendida') {
            corpo.innerHTML +=
                '<form class="med-dlg__exame" id="form-exame" novalidate>' +
                '<label for="f-exame">Pedir exame</label>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="f-exame" maxlength="150" placeholder="Ex.: Hemograma completo" style="flex:1 1 180px;min-height:44px" />' +
                '<button type="submit" class="botao botao--secundario botao--pequeno">Pedir</button></div></form>';
            corpo.querySelector('#form-exame').addEventListener('submit', (ev) => {
                ev.preventDefault();
                const nome = corpo.querySelector('#f-exame').value.trim();
                if (!nome) { corpo.querySelector('#f-exame').focus(); return; }
                C.registrarExame({ paciente: k.paciente, medico: MEDICO_ID, consulta: k.id, nome });
                toast('Exame pedido', nome + ' · ' + k.paciente, 'check-circle');
                abrirConsulta(chave);
            });
        }

        // Notas de retorno salvas
        const retornos = lerRetornos().filter((r) => r.paciente === k.paciente);
        if (retornos.length) {
            corpo.innerHTML +=
                '<div class="med-dlg__notas"><h3>Notas de acompanhamento</h3>' +
                retornos
                    .map(
                        (r) =>
                            '<div class="med-nota"><span class="med-nota__data">' +
                            (r.data || 'sem data') +
                            '</span>' +
                            (r.nota
                                ? '<p class="med-nota__texto">' +
                                  A.esc(r.nota) +
                                  '</p>'
                                : '') +
                            '</div>',
                    )
                    .join('') +
                '</div>';
        }

        // Ações disponíveis por status
        acoes.innerHTML = '';
        if (k.data === D.hoje && (k.status === 'na_recepcao' || k.status === 'confirmada')) {
            const btnIniciar = document.createElement('button');
            btnIniciar.type = 'button';
            btnIniciar.className = 'botao botao--principal';
            btnIniciar.innerHTML = I('stethoscope', 'ic-sm') + 'Iniciar atendimento';
            btnIniciar.addEventListener('click', () => iniciarConsulta(k));
            acoes.appendChild(btnIniciar);
        }
        if (
            k.status === 'em_atendimento' ||
            k.status === 'na_recepcao' ||
            k.status === 'confirmada'
        ) {
            const btnFinalizar = document.createElement('button');
            btnFinalizar.type = 'button';
            btnFinalizar.className = 'botao botao--menta';
            btnFinalizar.innerHTML =
                I('check', 'ic-sm') + 'Finalizar atendimento';
            btnFinalizar.addEventListener('click', () => finalizarConsulta(k));
            acoes.appendChild(btnFinalizar);
        }

        if (k.status === 'atendida' || k.status === 'em_atendimento') {
            const btnRetorno = document.createElement('button');
            btnRetorno.type = 'button';
            btnRetorno.className = 'botao botao--secundario';
            btnRetorno.innerHTML =
                '<i class="fa-regular fa-calendar-days"></i> Marcar retorno';
            btnRetorno.addEventListener('click', () => {
                fecharDlg(document.getElementById('dlg-consulta'));
                abrirRetorno(k);
            });
            acoes.appendChild(btnRetorno);
        }

        if (k.status === 'confirmada' || k.status === 'na_recepcao') {
            const btnFaltou = document.createElement('button');
            btnFaltou.type = 'button';
            btnFaltou.className = 'botao botao--texto';
            btnFaltou.innerHTML = I('user-x', 'ic-sm') + 'Registrar ausência';
            btnFaltou.addEventListener('click', () => registrarFaltou(k));
            acoes.appendChild(btnFaltou);
        }

        abrirDlg(document.getElementById('dlg-consulta'));
    }

    function iniciarConsulta(k) {
        k.status = 'em_atendimento';
        C.salvar();
        fecharDlg(document.getElementById('dlg-consulta'));
        redesenhar();
        toast('Atendimento iniciado', k.paciente + ' · ' + C.txt(k.ini), 'stethoscope');
    }

    function finalizarConsulta(k) {
        k.status = 'atendida';
        C.salvar();
        // Notificar recepção via localStorage
        try {
            const notifs = JSON.parse(
                localStorage.getItem('medico.notif') || '[]',
            );
            notifs.push({
                tipo: 'atendimento_finalizado',
                medico: MEDICO_ID,
                paciente: k.paciente,
                horario: C.txt(k.ini),
                data: k.data,
                ts: Date.now(),
            });
            localStorage.setItem('medico.notif', JSON.stringify(notifs));
        } catch (e) {}
        fecharDlg(document.getElementById('dlg-consulta'));
        redesenhar();
        toast(
            'Atendimento finalizado',
            'Recepção notificada · ' + k.paciente,
            'check-circle',
        );
    }

    /* só o médico ou a recepção marcam falta; atraso não é falta */
    function registrarFaltou(k) {
        k.status = 'faltou';
        C.registrarFalta(k, 'Não compareceu', D.medicos.find((m) => m.id === MEDICO_ID).nome);
        fecharDlg(document.getElementById('dlg-consulta'));
        redesenhar();
        toast(
            'Ausência registrada',
            k.paciente + (k.presencaConfirmada ? ' · tinha confirmado presença' : ''),
            'user-x',
        );
    }

    /* ─── Retorno com nota ─── */
    /* retornos e exames ficam na agenda da clínica (clinica-dados.js): a recepção e o paciente também veem */
    function lerRetornos() {
        return C.retornosDe(C.consultas.map((k) => k.paciente).filter(Boolean)).filter((r) => r.medico === MEDICO_ID);
    }

    function abrirRetorno(k) {
        document.getElementById('ret-paciente').value = k.paciente;
        // pré-preencher com 30 dias à frente
        const d = new Date(C.data(k.data));
        d.setDate(d.getDate() + 30);
        document.getElementById('ret-data').value = d
            .toISOString()
            .slice(0, 10);
        document.getElementById('ret-nota').value = '';
        // resetar para "data" selecionado
        const radioData = document.querySelector(
            'input[name="ret-tipo"][value="data"]',
        );
        if (radioData) radioData.checked = true;
        atualizarRetornoTipo();
        abrirDlg(document.getElementById('dlg-retorno'));
    }

    function atualizarRetornoTipo() {
        const tipo = document.querySelector('input[name="ret-tipo"]:checked');
        const campoData = document.getElementById('ret-campo-data');
        const btnSubmit = document.getElementById('ret-btn-submit');
        const inputData = document.getElementById('ret-data');
        if (!tipo || !campoData) return;
        const isRecepcao = tipo.value === 'recepcao';
        campoData.hidden = isRecepcao;
        if (inputData) inputData.required = !isRecepcao;
        if (btnSubmit) {
            btnSubmit.innerHTML = isRecepcao
                ? I('send', 'ic-sm') + 'Encaminhar para recepção'
                : I('calendar-plus', 'ic-sm') + 'Confirmar retorno';
        }
    }

    document.querySelectorAll('input[name="ret-tipo"]').forEach((r) => {
        r.addEventListener('change', atualizarRetornoTipo);
    });

    document.getElementById('form-retorno').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const paciente = document.getElementById('ret-paciente').value;
        const tipo = document.querySelector('input[name="ret-tipo"]:checked');
        const isRecepcao = tipo && tipo.value === 'recepcao';
        const data = isRecepcao
            ? ''
            : document.getElementById('ret-data').value;
        const nota = document.getElementById('ret-nota').value.trim();

        /* Retornos: "encaminhado" (a recepção marca a data) ou "agendado" (o médico já indicou a data) */
        C.registrarRetorno({
            medico: MEDICO_ID,
            paciente,
            data,
            nota,
            status: isRecepcao ? 'encaminhado' : 'agendado',
        });

        // Notificar recepção via localStorage
        try {
            const notifs = JSON.parse(
                localStorage.getItem('medico.notif') || '[]',
            );
            notifs.push({
                tipo: isRecepcao ? 'retorno_recepcao' : 'retorno_agendado',
                medico: MEDICO_ID,
                paciente,
                data: data || 'a definir pela recepção',
                nota,
                ts: Date.now(),
            });
            localStorage.setItem('medico.notif', JSON.stringify(notifs));
        } catch (e) {}

        fecharDlg(document.getElementById('dlg-retorno'));
        if (isRecepcao) {
            toast(
                'Retorno encaminhado',
                'Recepção notificada · ' + paciente,
                'send',
            );
        } else {
            toast(
                'Retorno agendado',
                paciente + (data ? ' · ' + data : ''),
                'calendar-plus',
            );
        }
    });

    /* ─── Histórico ─── */
    const HIST_POR_PAGINA = 10;
    const histEst = { filtro: 'todos', data: '', pagina: 1 };

    function renderHistorico(filtro) {
        if (filtro !== undefined) {
            histEst.filtro = filtro;
            histEst.pagina = 1;
        }

        // atualizar botões de filtro
        document.querySelectorAll('.filtro-hist').forEach((b) => {
            b.classList.toggle(
                'filtro-hist--ativo',
                b.dataset.filtro === histEst.filtro,
            );
        });

        const todas = todasMinhasConsultas();
        const realizadas = todas.filter((k) => k.status === 'atendida').length;
        const canceladas = todas.filter((k) => k.status === 'cancelada').length;
        const ausencias = todas.filter((k) => k.status === 'faltou').length;

        const set = (id, v) => {
            const el = $(id);
            if (el) el.textContent = v;
        };
        set('#hist-realizadas', realizadas);
        set('#hist-canceladas', canceladas);
        set('#hist-ausencias', ausencias);

        let filtradas =
            histEst.filtro === 'todos'
                ? todas
                : todas.filter((k) => k.status === histEst.filtro);

        // filtro por data
        if (histEst.data) {
            filtradas = filtradas.filter((k) => k.data === histEst.data);
        }

        const ordenadas = [...filtradas].sort(
            (a, b) => b.data.localeCompare(a.data) || b.ini - a.ini,
        );

        // paginação
        const total = ordenadas.length;
        const paginas = Math.max(1, Math.ceil(total / HIST_POR_PAGINA));
        if (histEst.pagina > paginas) histEst.pagina = paginas;
        const ini = (histEst.pagina - 1) * HIST_POR_PAGINA;
        const paginados = ordenadas.slice(ini, ini + HIST_POR_PAGINA);

        const lista = document.getElementById('hist-lista');
        if (!lista) return;

        if (!total) {
            lista.innerHTML =
                '<li class="hist-vazio">Nenhuma consulta encontrada' +
                (histEst.data ? ' nesta data' : '') +
                '.</li>';
            desenharHistPaginacao(0, 1, 0, 0);
            return;
        }

        lista.innerHTML = paginados
            .map((k) => {
                const retornos = lerRetornos().filter(
                    (r) => r.paciente === k.paciente,
                );
                return (
                    '<li class="hist-item" data-chave="' +
                    chaveConsulta(k) +
                    '" role="button" tabindex="0">' +
                    '<div class="hist-item__principal">' +
                    '<span class="hist-item__nome">' +
                    A.esc(k.paciente) +
                    '</span>' +
                    '<span class="hist-item__hora">' +
                    C.txt(k.ini) +
                    ' · ' +
                    A.extenso(k.data) +
                    '</span>' +
                    '</div>' +
                    '<div class="hist-item__direita">' +
                    seloStatus(k.status) +
                    (retornos.length
                        ? '<span class="hist-item__nota-badge">' +
                          I('file-text', 'ic-sm') +
                          retornos.length +
                          '</span>'
                        : '') +
                    '</div>' +
                    '</li>'
                );
            })
            .join('');

        desenharHistPaginacao(total, paginas, ini, paginados.length);
    }

    function histNumerosPagina(atual, total) {
        const n = new Set([1, total, atual - 1, atual, atual + 1]);
        if (atual <= 3) [2, 3, 4].forEach((x) => n.add(x));
        if (atual >= total - 2)
            [total - 1, total - 2, total - 3].forEach((x) => n.add(x));
        const lista = Array.from(n)
            .filter((x) => x >= 1 && x <= total)
            .sort((a, b) => a - b);
        const saida = [];
        lista.forEach((x, i) => {
            if (i && x - lista[i - 1] > 1) saida.push('…');
            saida.push(x);
        });
        return saida;
    }

    function desenharHistPaginacao(total, paginas, ini, quantos) {
        const nav = $('#hist-paginacao');
        if (!nav) return;
        if (!total || paginas <= 1) {
            nav.innerHTML = '';
            return;
        }
        const p = histEst.pagina;
        const btn = (alvo, rotulo, aria, extra) =>
            '<button type="button" data-hist-pag="' +
            alvo +
            '"' +
            (aria ? ' aria-label="' + aria + '"' : '') +
            (extra || '') +
            '>' +
            rotulo +
            '</button>';
        nav.innerHTML =
            '<p class="paginacao__faixa num">' +
            (ini + 1) +
            '–' +
            (ini + quantos) +
            ' de ' +
            total +
            '</p>' +
            '<div class="paginacao__botoes">' +
            btn(
                p - 1,
                I('chevron-left', 'ic-sm') + '<span>Anterior</span>',
                'Página anterior',
                p === 1 ? ' disabled' : '',
            ) +
            histNumerosPagina(p, paginas)
                .map((x) =>
                    x === '…'
                        ? '<span class="paginacao__reticencias" aria-hidden="true">…</span>'
                        : btn(
                              x,
                              x,
                              'Página ' + x,
                              x === p ? ' aria-current="page"' : '',
                          ),
                )
                .join('') +
            btn(
                p + 1,
                '<span>Próxima</span>' + I('chevron-right', 'ic-sm'),
                'Próxima página',
                p === paginas ? ' disabled' : '',
            ) +
            '</div>';
    }

    // Filtro por status
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.filtro-hist');
        if (btn) renderHistorico(btn.dataset.filtro);
    });

    // Paginação do histórico
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-hist-pag]');
        if (!btn || btn.disabled) return;
        histEst.pagina = Number(btn.dataset.histPag);
        renderHistorico();
        const caixa = document.querySelector('#hist-lista');
        if (caixa && caixa.getBoundingClientRect().top < 0)
            caixa.scrollIntoView({ block: 'start' });
        anunciar('Página ' + histEst.pagina);
    });

    // Filtro por data
    const histDataInput = $('#hist-data');
    const histLimparBtn = $('#hist-limpar-data');
    if (histDataInput) {
        histDataInput.addEventListener('change', () => {
            histEst.data = histDataInput.value;
            histEst.pagina = 1;
            if (histLimparBtn) histLimparBtn.hidden = !histEst.data;
            renderHistorico();
        });
    }
    if (histLimparBtn) {
        histLimparBtn.addEventListener('click', () => {
            histEst.data = '';
            histDataInput.value = '';
            histLimparBtn.hidden = true;
            histEst.pagina = 1;
            renderHistorico();
        });
    }

    /* ─── Perfil ─── */
    function renderPerfil() {
        const md = D.medicos.find((m) => m.id === MEDICO_ID);
        if (!md) return;
        const esp = D.especialidades[md.esp];
        const dur =
            C.DURACAO && C.DURACAO[MEDICO_ID]
                ? C.DURACAO[MEDICO_ID] + ' min'
                : '30 min';

        const set = (id, v) => {
            const el = $(id);
            if (el) el.textContent = v;
        };
        set('#perfil-nome', (md.titulo || 'Dr.') + ' ' + md.nome);
        set('#perfil-esp', esp ? esp.nome : '');
        set('#perfil-crm', md.crm || '—');
        set('#perfil-espec', esp ? esp.nome : '—');
        set('#perfil-sala', md.sala || 'Sala 3');
        set('#perfil-dur', dur);

        // avatar
        document.querySelectorAll('.perfil-avatar').forEach((el) => {
            el.textContent = A.iniciais
                ? A.iniciais(md.nome)
                : md.nome.slice(0, 2).toUpperCase();
        });

        // stats do perfil
        const todas = todasMinhasConsultas();
        const realizadas = todas.filter((k) => k.status === 'atendida').length;
        const hoje = minhasConsultas(D.hoje).length;
        const retornos = lerRetornos().filter(
            (r) => r.medico === MEDICO_ID,
        ).length;
        const statsEl = $('#perfil-stats');
        if (statsEl) {
            statsEl.innerHTML =
                '<div class="perfil-stat"><span class="perfil-stat__n">' +
                realizadas +
                '</span><span class="perfil-stat__rotulo">Realizadas</span></div>' +
                '<div class="perfil-stat"><span class="perfil-stat__n">' +
                hoje +
                '</span><span class="perfil-stat__rotulo">Hoje</span></div>' +
                '<div class="perfil-stat"><span class="perfil-stat__n">' +
                retornos +
                '</span><span class="perfil-stat__rotulo">Retornos</span></div>';
        }

        // expediente
        const expEl = $('#perfil-expediente');
        if (expEl) {
            const DIAS = ['Segunda a sexta', 'Sábado'];
            const exp = C.EXPEDIENTE && C.EXPEDIENTE[MEDICO_ID];
            if (exp) {
                let html = '';
                if (exp.semana) {
                    html +=
                        '<div class="perfil-linha"><dt>' +
                        DIAS[0] +
                        '</dt><dd>' +
                        exp.semana[0] +
                        ' – ' +
                        exp.semana[1] +
                        '</dd></div>';
                }
                if (exp.sabado) {
                    html +=
                        '<div class="perfil-linha"><dt>' +
                        DIAS[1] +
                        '</dt><dd>' +
                        exp.sabado[0] +
                        ' – ' +
                        exp.sabado[1] +
                        '</dd></div>';
                } else {
                    html +=
                        '<div class="perfil-linha"><dt>' +
                        DIAS[1] +
                        '</dt><dd style="color:var(--tinta-3)">Não atende</dd></div>';
                }
                expEl.innerHTML = html;
            } else {
                expEl.innerHTML =
                    '<div class="perfil-linha"><dt>Horário</dt><dd>08:00 – 16:40</dd></div>';
            }
        }

        // próximas consultas (futuras ou de hoje em diante)
        const proximas = C.consultas
            .filter(
                (k) =>
                    k.medico === MEDICO_ID &&
                    k.data >= D.hoje &&
                    k.status !== 'cancelada' &&
                    k.status !== 'faltou',
            )
            .sort((a, b) => a.data.localeCompare(b.data) || a.ini - b.ini)
            .slice(0, 8);

        const metaProx = $('#meta-proximos');
        if (metaProx)
            metaProx.textContent =
                proximas.length +
                ' agendamento' +
                (proximas.length !== 1 ? 's' : '');

        const lista = document.getElementById('proximos-lista');
        if (!lista) return;
        if (!proximas.length) {
            lista.innerHTML =
                '<li class="hist-vazio">Nenhum atendimento futuro.</li>';
            return;
        }
        lista.innerHTML = proximas
            .map(
                (k) =>
                    '<li class="hist-item" data-chave="' +
                    chaveConsulta(k) +
                    '" role="button" tabindex="0">' +
                    '<div class="hist-item__principal">' +
                    '<span class="hist-item__nome">' +
                    A.esc(k.paciente) +
                    '</span>' +
                    '<span class="hist-item__hora">' +
                    C.txt(k.ini) +
                    ' · ' +
                    A.extenso(k.data) +
                    '</span>' +
                    '</div>' +
                    '<div class="hist-item__direita">' +
                    seloStatus(k.status) +
                    '</div>' +
                    '</li>',
            )
            .join('');
    }

    /* ─── Click nos blocos (agenda e listas) ─── */
    document.addEventListener('click', (ev) => {
        const bloco = ev.target.closest('[data-chave]');
        if (bloco) abrirConsulta(bloco.dataset.chave);
    });
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            const bloco = ev.target.closest('[data-chave]');
            if (bloco) {
                ev.preventDefault();
                abrirConsulta(bloco.dataset.chave);
            }
        }
    });

    /* ─── Navegação da agenda ─── */
    function mudarMes(delta) {
        var p = est.mesInicio.split('-').map(Number);
        var d = new Date(p[0], p[1] - 1 + delta, 1);
        est.mesInicio = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    document.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-secao]')) return; // já tratado

        // "Ver dia completo" no calendário mensal
        var calDia = ev.target.closest('[data-cal-dia]');
        if (calDia) {
            est.dia = calDia.dataset.calDia;
            est.vista = 'dia';
            redesenhar();
            anunciar(A.extenso(est.dia, true));
            return;
        }

        const bv = ev.target.closest('[data-vista]');
        if (bv && bv.dataset.vista !== est.vista) {
            est.vista = bv.dataset.vista;
            if (est.vista === 'semana') est.semana = segunda(est.dia);
            if (est.vista === 'mes') est.mesInicio = D.hoje.slice(0, 7);
            redesenhar();
            anunciar('Visão de ' + bv.textContent.trim().toLowerCase());
            return;
        }
        if (ev.target.closest('#hoje')) {
            est.dia = D.hoje;
            est.semana = segunda(D.hoje);
            est.mesInicio = D.hoje.slice(0, 7);
            redesenhar();
            anunciar('Hoje, ' + A.extenso(D.hoje, true));
            return;
        }
        if (ev.target.closest('#ant')) {
            if (est.vista === 'dia') est.dia = C.somaDias(est.dia, -1);
            else if (est.vista === 'semana') est.semana = C.somaDias(est.semana, -7);
            else mudarMes(-1);
            redesenhar();
            return;
        }
        if (ev.target.closest('#prox')) {
            if (est.vista === 'dia') est.dia = C.somaDias(est.dia, 1);
            else if (est.vista === 'semana') est.semana = C.somaDias(est.semana, 7);
            else mudarMes(1);
            redesenhar();
            return;
        }
    });

    /* ─── Sidebar: botão de recolher ─── */
    (function () {
        const lateral = document.querySelector('.lateral');
        if (!lateral) return;
        const CHAVE = 'medico-menu';

        function aplicarEstado() {
            const v = localStorage.getItem(CHAVE);
            document.documentElement.dataset.lateral =
                v === 'recolhido' ? 'recolhida' : 'aberta';
        }
        aplicarEstado();

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lateral__recolher';
        btn.innerHTML = I('chevron-left', 'ic-sm');

        function atualizar() {
            const rec =
                document.documentElement.dataset.lateral === 'recolhida';
            btn.setAttribute('aria-expanded', String(!rec));
            btn.setAttribute(
                'aria-label',
                rec ? 'Expandir o menu' : 'Recolher o menu',
            );
            btn.dataset.dicaLateral = rec
                ? 'Expandir o menu'
                : 'Recolher o menu';
        }

        lateral
            .querySelector('.lateral__marca')
            .insertAdjacentElement('afterend', btn);
        atualizar();

        btn.addEventListener('click', () => {
            const dica = document.querySelector('.lateral__dica');
            if (dica) dica.hidden = true;
            const rec =
                document.documentElement.dataset.lateral === 'recolhida';
            localStorage.setItem(CHAVE, rec ? 'aberto' : 'recolhido');
            aplicarEstado();
            atualizar();
        });

        // tooltip ao recolher
        const dica = document.createElement('div');
        dica.className = 'lateral__dica';
        dica.setAttribute('aria-hidden', 'true');
        dica.hidden = true;
        document.body.appendChild(dica);

        const mostrar = (ev) => {
            const alvo = ev.target.closest('[data-dica-lateral]');
            if (
                !alvo ||
                document.documentElement.dataset.lateral !== 'recolhida' ||
                window.innerWidth <= 900
            ) {
                dica.hidden = true;
                return;
            }
            const r = alvo.getBoundingClientRect();
            dica.textContent = alvo.dataset.dicaLateral;
            dica.hidden = false;
            dica.style.left = r.right + 10 + 'px';
            dica.style.top = r.top + r.height / 2 + 'px';
        };
        lateral.addEventListener('pointerover', mostrar);
        lateral.addEventListener('focusin', mostrar);
        lateral.addEventListener('pointerleave', () => {
            dica.hidden = true;
        });
        lateral.addEventListener('focusout', () => {
            dica.hidden = true;
        });
    })();

    /* ─── Inicialização ─── */
    document.querySelectorAll('[data-marca]').forEach((el) => {
        el.outerHTML = A.marca(Number(el.dataset.marca));
    });
    const folhaEl = document.getElementById('folha-hoje');
    if (folhaEl) folhaEl.innerHTML = A.folha(D.hoje);
    const subEl = document.getElementById('subtitulo');
    const md = D.medicos.find((m) => m.id === MEDICO_ID);
    if (subEl && md)
        subEl.textContent = md.nome + ' · ' + D.especialidades[md.esp].nome;
    redesenhar();
    irPara(location.hash.slice(1));
    A.seloClinica(document.querySelector('.lateral'), 'medico');
    /* a recepção marcou chegada ou cancelou em outra aba: a agenda do médico acompanha */
    C.aoMudar(() => redesenhar());
})();
