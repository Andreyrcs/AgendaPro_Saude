(function () {
    'use strict';

    const D = window.DADOS;
    const A = window.AP;
    const MOV = window.MOV;
    const I = A.icone;

    const pagina = document.getElementById('pagina');
    const gavetaCamada = document.getElementById('gaveta');
    const avisos = document.getElementById('avisos');
    const anunciador = document.getElementById('anunciador');

    const estado = {
        chat: [],
        notifLidas: false,
        agendaAba: 'calendario',
        cal: { mes: '2026-10', filtro: 'todos', foco: null },
        calAtivo: null,
        pendente: null,
        prevFiltro: 'todos',
    };

    function lerPref(chave, padrao) {
        try {
            const v = localStorage.getItem('ap-' + chave);
            return v === null ? padrao : v;
        } catch (e) {
            return padrao;
        }
    }

    function gravarPref(chave, valor) {
        try {
            localStorage.setItem('ap-' + chave, valor);
        } catch (e) {}
    }

    function aplicarPrefs() {
        const raiz = document.documentElement;
        const texto = lerPref('texto', 'normal');
        if (texto === 'normal') delete raiz.dataset.texto;
        else raiz.dataset.texto = texto;
        if (lerPref('movimento', 'sistema') === 'reduzido')
            raiz.dataset.movimento = 'reduzido';
        else delete raiz.dataset.movimento;
    }

    const pessoa = (id) => D.pessoas.find((p) => p.id === id);
    const medico = (id) => D.medicos.find((m) => m.id === id);
    const esp = (id) => D.especialidades[id];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const nomeCurto = (p) => (p.id === D.titular ? 'Você' : p.curto);
    const ordenar = (lista) =>
        lista
            .slice()
            .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

    function proximas() {
        return ordenar(D.consultas).filter((c) => A.diasAte(c.data) >= 0);
    }

    function tituloPagina(titulo, sub) {
        return (
            '<div class="titulo-pagina">' +
            '<h1 tabindex="-1">' +
            titulo +
            '</h1>' +
            (sub ? '<p>' + sub + '</p>' : '') +
            '</div>'
        );
    }

    function cabecaSecao(titulo, link, rotuloLink) {
        return (
            '<div class="grupo__cabeca">' +
            '<h2 class="grupo__titulo">' +
            titulo +
            '</h2>' +
            (link
                ? '<a class="grupo__link" href="' +
                  link +
                  '">' +
                  rotuloLink +
                  '</a>'
                : '') +
            '</div>'
        );
    }

    function rotuloConsulta(c) {
        const m = medico(c.medico),
            p = pessoa(c.pessoa);
        return (
            esp(m.esp).nome +
            ' com ' +
            m.nome +
            ', ' +
            A.extenso(c.data) +
            ', às ' +
            c.hora +
            ', para ' +
            (p.id === D.titular ? 'você' : p.tratamento)
        );
    }

    function linhaConsulta(c, passada) {
        const m = medico(c.medico),
            p = pessoa(c.pessoa);
        return (
            '<a class="cartao agenda-item pressionavel" href="#consulta/' +
            c.id +
            '" aria-label="' +
            A.esc(rotuloConsulta(c)) +
            '">' +
            A.folha(c.data) +
            '<span class="consulta-cartao__corpo">' +
            '<span class="consulta-cartao__esp">' +
            esp(m.esp).nome +
            '</span>' +
            '<span class="consulta-cartao__medico">' +
            m.nome +
            '</span>' +
            '<span class="meta">' +
            I('clock') +
            '<span class="num">' +
            c.hora +
            '</span>' +
            (passada ? ' · Realizada' : ' · ' + A.relativo(c.data)) +
            '</span>' +
            '<span class="pessoa-chip">' +
            A.avatar(p, 28) +
            nomeCurto(p) +
            '</span>' +
            '</span>' +
            I('chevron-right', 'item__seta') +
            '</a>'
        );
    }

    function seloPrazo(iso) {
        const n = A.diasAte(iso);
        return (
            '<span class="selo selo--alerta">' +
            I('clock') +
            (n <= 0 ? 'Prazo hoje' : 'Faltam ' + n + ' dias') +
            '</span>'
        );
    }

    function ligarClinica(rotulo) {
        return (
            '<a class="botao botao--secundario botao--pequeno" href="tel:' +
            D.clinica.telefoneLink +
            '">' +
            I('phone') +
            rotulo +
            '</a>'
        );
    }

    function interruptor(chave, titulo, desc, ligado) {
        const id = 'sw-' + chave;
        return (
            '<div class="interruptor-linha"><div class="interruptor-linha__texto"><strong id="' +
            id +
            '">' +
            titulo +
            '</strong><span>' +
            desc +
            '</span></div>' +
            '<button type="button" class="interruptor" role="switch" aria-checked="' +
            ligado +
            '" aria-labelledby="' +
            id +
            '" data-chave="' +
            chave +
            '"></button></div>'
        );
    }

    function textoFila(pos) {
        const frente = pos - 1;
        if (frente <= 0) return 'Você é a próxima';
        return frente === 1
            ? '1 pessoa na sua frente'
            : frente + ' pessoas na sua frente';
    }

    function filaHTML(pos, total) {
        const lugares = Math.min(Math.max(total, pos + 3), 6);
        let html = '<div class="fila" aria-hidden="true">';
        for (let i = 1; i <= lugares; i++) {
            const tipo = i < pos ? 'frente' : i === pos ? 'voce' : 'depois';
            html +=
                '<span class="fila__lugar fila__lugar--' + tipo + '"></span>';
        }
        return (
            html +
            '<span class="fila__legenda">' +
            textoFila(pos) +
            '</span></div>'
        );
    }

    function renderInicio() {
        const t = pessoa(D.titular);
        const prox = proximas()[0];
        const e = D.espera;

        let html = tituloPagina(
            'Como você está se sentindo hoje?',
            'Olá, ' + t.curto + '.',
        );

        html += '<div class="grade grade--2" style="gap:24px">';

        html +=
            '<div class="Container__chat"><section class="chat" aria-labelledby="t-assistente-ini">' +
            '<div class="chat__corpo" id="chat-corpo-ini">' +
            '<p class="balao balao--ele" style="max-width:none">Olá! Sou o assistente de saúde. Conte o que você está sentindo e eu te ajudo a encontrar o especialista certo.</p>' +
            '</div>' +
            '<div class="chat__rodape">' +
            '<div class="chips-rapidas">' +
            '<button type="button" data-rapida="Dor de cabeça">Dor de cabeça</button>' +
            '<button type="button" data-rapida="Dor no peito">Dor no peito</button>' +
            '<button type="button" data-rapida="Febre">Febre</button>' +
            '<button type="button" data-rapida="Dor nas costas">Dor nas costas</button>' +
            '</div>' +
            '<div class="campo-chat">' +
            '<textarea id="chat-entrada" rows="1" placeholder="Conte o que você está sentindo..." aria-label="Mensagem para o assistente"></textarea>' +
            '<button type="button" class="botao botao--principal" id="chat-enviar" aria-label="Enviar mensagem">' +
            I('send') +
            '</button>' +
            '</div>' +
            '<div class="chat__aviso">' +
            '<span>' +
            I('info') +
            ' Orienta, mas não faz diagnóstico.</span>' +
            '<a class="chat__192" href="tel:192" aria-label="Emergência: ligar 192 SAMU">' +
            I('phone') +
            'Ligar 192</a>' +
            '</div></div></section>';
        if (e && !e.resolvida) {
            const m = medico(e.medico);
            html +=
                '<section class="grupo" aria-labelledby="t-espera-ini">' +
                cabecaSecao('Lista de espera', '#espera', 'Ver fila') +
                '<a class="cartao agenda-item agenda-item--fila pressionavel" href="#espera">' +
                '<span class="notif__icone" aria-hidden="true">' +
                I('list-ordered') +
                '</span>' +
                '<span class="item__corpo"><span class="item__titulo" style="display:block">' +
                esp(m.esp).nome +
                ' · ' +
                m.nome +
                '</span>' +
                '<span class="item__sub" style="display:block">Você é ' +
                A.ordinal(e.posicao, pessoa(e.pessoa).genero) +
                ' da fila</span></span>' +
                I('chevron-right', 'item__seta') +
                '</a></section></div>';
        }
        html +=
            '<div style="display:flex;flex-direction:column;gap:20px">' +
            '<a class="botao botao--principal botao--largo" href="#agendar">' +
            I('calendar-plus') +
            'Marcar consulta</a>';

        if (prox) {
            const m = medico(prox.medico),
                p = pessoa(prox.pessoa);
            html +=
                '<section class="grupo" aria-labelledby="t-prox-ini">' +
                cabecaSecao('Próxima consulta', '#agenda', 'Ver agenda') +
                '<a class="cartao consulta-cartao pressionavel" href="#consulta/' +
                prox.id +
                '" aria-label="' +
                A.esc(rotuloConsulta(prox)) +
                '">' +
                A.folha(prox.data, { bloco: true }) +
                '<span class="consulta-cartao__corpo">' +
                '<span class="consulta-cartao__topo"><span class="consulta-cartao__esp">' +
                esp(m.esp).nome +
                '</span><span class="selo selo--menta">' +
                cap(A.relativo(prox.data)) +
                '</span></span>' +
                '<span class="consulta-cartao__medico">' +
                m.nome +
                '</span>' +
                '<span class="meta">' +
                I('clock') +
                '<span class="num">' +
                prox.hora +
                '</span> · ' +
                prox.sala +
                '</span>' +
                '<span class="pessoa-chip">' +
                A.avatar(p, 30) +
                'Para ' +
                (p.id === D.titular ? 'você' : p.tratamento) +
                '</span>' +
                '</span></a></section>';
        }

        html +=
            '<section class="grupo" aria-labelledby="t-familia-ini">' +
            cabecaSecao('Família', '#familia', 'Ver todos') +
            '<div class="cartao lista-cartao">' +
            D.pessoas
                .map(
                    (p) =>
                        '<a class="pessoa-linha" href="#pessoa/' +
                        p.id +
                        '">' +
                        A.avatar(p, 44) +
                        '<span class="item__corpo"><span class="pessoa-linha__nome" style="display:block">' +
                        p.curto +
                        (p.id === D.titular ? ' (você)' : '') +
                        '</span>' +
                        '<span class="pessoa-linha__rel" style="display:block">' +
                        p.relacao +
                        ' · ' +
                        p.idade +
                        ' anos</span></span>' +
                        I('chevron-right', 'item__seta') +
                        '</a>',
                )
                .join('') +
            '</div></section>';

        html += '</div></div>';

        function montar(el) {
            const corpo = el.querySelector('#chat-corpo-ini');
            const entrada = el.querySelector('#chat-entrada');
            const enviar = el.querySelector('#chat-enviar');

            function processarMensagem(texto) {
                if (!texto.trim()) return;
                const balaoEu = document.createElement('p');
                balaoEu.className = 'balao balao--eu';
                balaoEu.style.maxWidth = 'none';
                balaoEu.textContent = texto;
                corpo.appendChild(balaoEu);
                corpo.scrollTop = corpo.scrollHeight;
                const r = analisar(texto);
                setTimeout(() => {
                    const balaoEle = document.createElement('div');
                    balaoEle.innerHTML = respostaHTML(r);
                    Array.from(balaoEle.children).forEach((c) =>
                        corpo.appendChild(c),
                    );
                    corpo.scrollTop = corpo.scrollHeight;
                }, 700);
            }

            el.querySelectorAll('[data-rapida]').forEach((b) =>
                b.addEventListener('click', () => {
                    if (entrada) entrada.value = b.dataset.rapida;
                    processarMensagem(b.dataset.rapida);
                    if (entrada) entrada.value = '';
                }),
            );

            if (enviar) {
                enviar.addEventListener('click', () => {
                    if (!entrada) return;
                    processarMensagem(entrada.value);
                    entrada.value = '';
                    entrada.style.height = '';
                });
            }

            if (entrada) {
                entrada.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        processarMensagem(entrada.value);
                        entrada.value = '';
                        entrada.style.height = '';
                    }
                });
            }
        }

        return { titulo: 'Início', html, montar };
    }

    const EMERGENCIAS = [
        'dor no peito',
        'falta de ar',
        'infarto',
        'avc',
        'acidente',
        'desmaio',
        'convulsão',
        'sangramento',
        'overdose',
        'intoxicação',
    ];
    const CVV = [
        'suicídio',
        'suicidar',
        'me matar',
        'não quero viver',
        'acabar com tudo',
    ];
    const SUGESTOES = {
        cabeça: [
            { nome: 'Neurologia', esp: 'neuro' },
            { nome: 'Clínica geral', esp: 'clinica' },
        ],
        febre: [
            { nome: 'Clínica geral', esp: 'clinica' },
            { nome: 'Pediatria', esp: 'pediatria' },
        ],
        costas: [{ nome: 'Ortopedia', esp: 'orto' }],
        joelho: [{ nome: 'Ortopedia', esp: 'orto' }],
        pele: [{ nome: 'Dermatologia', esp: 'dermato' }],
        coração: [{ nome: 'Cardiologia', esp: 'cardio' }],
        peito: [
            { nome: 'Cardiologia', esp: 'cardio' },
            { nome: 'Pneumologia', esp: 'pneumo' },
        ],
        pressão: [
            { nome: 'Cardiologia', esp: 'cardio' },
            { nome: 'Clínica geral', esp: 'clinica' },
        ],
        ouvido: [{ nome: 'Otorrinolaringologia', esp: 'otorrino' }],
        garganta: [{ nome: 'Otorrinolaringologia', esp: 'otorrino' }],
        olho: [{ nome: 'Oftalmologia', esp: 'oftalmo' }],
        vista: [{ nome: 'Oftalmologia', esp: 'oftalmo' }],
        barriga: [{ nome: 'Clínica geral', esp: 'clinica' }],
        estômago: [{ nome: 'Clínica geral', esp: 'clinica' }],
        urina: [{ nome: 'Urologia', esp: 'uro' }],
        criança: [{ nome: 'Pediatria', esp: 'pediatria' }],
    };

    function analisar(texto) {
        const t = texto.toLowerCase();
        if (CVV.some((s) => t.includes(s))) return { tipo: 'cvv' };
        if (EMERGENCIAS.some((s) => t.includes(s)))
            return { tipo: 'emergencia' };
        const sugs = [];
        Object.keys(SUGESTOES).forEach((palavra) => {
            if (t.includes(palavra)) {
                SUGESTOES[palavra].forEach((s) => {
                    if (!sugs.find((x) => x.esp === s.esp)) sugs.push(s);
                });
            }
        });
        if (sugs.length) return { tipo: 'sugestoes', sugestoes: sugs };
        return { tipo: 'generico' };
    }

    function respostaHTML(r) {
        if (r.tipo === 'emergencia') {
            return (
                '<div class="emergencia">' +
                '<p class="emergencia__titulo">' +
                I('triangle-alert') +
                ' Isso pode ser uma emergência</p>' +
                '<p>Não aguarde uma consulta. Ligue agora para o SAMU ou vá ao pronto-socorro mais próximo.</p>' +
                '<a href="tel:192">' +
                I('phone') +
                ' Ligar 192 — SAMU</a></div>'
            );
        }
        if (r.tipo === 'cvv') {
            return (
                '<div class="emergencia">' +
                '<p class="emergencia__titulo">' +
                I('heart-handshake') +
                ' Você não está sozinho</p>' +
                '<p>Se estiver pensando em se machucar, ligue para o CVV agora. Eles atendem 24 horas por dia.</p>' +
                '<a href="tel:188">' +
                I('phone') +
                ' Ligar 188 — CVV</a></div>'
            );
        }
        if (r.tipo === 'sugestoes') {
            return (
                '<p class="balao balao--ele" style="max-width:none">Pelo que você descreveu, pode ser indicado consultar:</p>' +
                r.sugestoes
                    .map(
                        (s) =>
                            '<a class="chip-esp pressionavel" href="#agendar/' +
                            s.esp +
                            '/' +
                            D.titular +
                            '">' +
                            s.nome +
                            I('chevron-right') +
                            '</a>',
                    )
                    .join('')
            );
        }
        return (
            '<p class="balao balao--ele" style="max-width:none">Entendi. Para te ajudar melhor, você pode descrever mais detalhes do que está sentindo? Ou, se preferir, podemos marcar uma consulta de clínica geral. <a href="#agendar/clinica/' +
            D.titular +
            '">Agendar clínica geral</a></p>'
        );
    }

    function renderAssistente() {
        const html =
            tituloPagina(
                'Assistente de saúde',
                'Descreva o que está sentindo e encontre o especialista certo.',
            ) +
            '<div class="chat" style="height:calc(100vh - 200px);max-height:700px">' +
            '<div class="chat__corpo" id="chat-corpo" role="log" aria-live="polite" aria-label="Conversa com o assistente">' +
            '<p class="balao balao--ele" style="max-width:none">Olá! Sou o assistente de saúde do AgendaPro. Descreva o que você está sentindo e vou te indicar a especialidade mais adequada.</p>' +
            '<p class="balao balao--ele" style="max-width:none"><b>Lembre-se:</b> eu não faço diagnóstico. Em caso de emergência, ligue imediatamente para o <a href="tel:192"><b>192 (SAMU)</b></a> ou vá ao pronto-socorro.</p>' +
            '</div>' +
            '<div class="chat__rodape">' +
            '<div class="chips-rapidas" id="chips-rapidas">' +
            [
                'Dor de cabeça',
                'Febre',
                'Dor no peito',
                'Dor nas costas',
                'Problema de pele',
                'Problema de visão',
            ]
                .map(
                    (t) =>
                        '<button type="button" data-rapida="' +
                        t +
                        '">' +
                        t +
                        '</button>',
                )
                .join('') +
            '</div>' +
            '<div class="campo-chat">' +
            '<textarea id="chat-entrada" rows="1" placeholder="Conte o que você está sentindo..." aria-label="Mensagem para o assistente"></textarea>' +
            '<button type="button" class="botao botao--principal" id="chat-enviar" aria-label="Enviar mensagem">' +
            I('send') +
            '</button>' +
            '</div>' +
            '<div class="chat__aviso">' +
            '<span>' +
            I('info') +
            ' Orienta, mas não faz diagnóstico médico.</span>' +
            '<a class="chat__192" href="tel:192" aria-label="Emergência: SAMU 192">' +
            I('phone') +
            'Ligar 192</a>' +
            '</div></div></div>';

        function montar(el) {
            const corpo = el.querySelector('#chat-corpo');
            const entrada = el.querySelector('#chat-entrada');
            const enviar = el.querySelector('#chat-enviar');
            const chips = el.querySelector('#chips-rapidas');

            function adicionarMensagem(html, autoral) {
                const el2 = document.createElement('div');
                el2.innerHTML = html;
                Array.from(el2.children).forEach((c) => corpo.appendChild(c));
                corpo.scrollTop = corpo.scrollHeight;
                anunciar(autoral ? '' : corpo.lastElementChild.textContent);
            }

            function enviarMensagem(texto) {
                if (!texto.trim()) return;
                adicionarMensagem(
                    '<p class="balao balao--eu" style="max-width:none">' +
                        A.esc(texto) +
                        '</p>',
                    true,
                );
                if (chips) chips.style.display = 'none';
                const r = analisar(texto);
                setTimeout(
                    () => adicionarMensagem(respostaHTML(r), false),
                    700,
                );
            }

            if (entrada) {
                entrada.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        enviarMensagem(entrada.value);
                        entrada.value = '';
                    }
                });
                entrada.addEventListener('input', () => {
                    entrada.style.height = 'auto';
                    entrada.style.height = entrada.scrollHeight + 'px';
                });
            }

            if (enviar) {
                enviar.addEventListener('click', () => {
                    if (!entrada) return;
                    enviarMensagem(entrada.value);
                    entrada.value = '';
                    entrada.style.height = '';
                });
            }

            el.querySelectorAll('[data-rapida]').forEach((b) =>
                b.addEventListener('click', () => {
                    enviarMensagem(b.dataset.rapida);
                }),
            );
        }

        return { titulo: 'Assistente de saúde', html, montar };
    }

    function renderAgenda() {
        const html =
            tituloPagina('Agenda', null) +
            '<div class="abas abas--agenda" role="tablist" aria-label="Como ver a agenda">' +
            '<button type="button" role="tab" id="aba-cal" aria-controls="painel-agenda" aria-selected="' +
            (estado.agendaAba === 'calendario') +
            '" data-aba="calendario">' +
            I('calendar-days') +
            'Calendário</button>' +
            '<button type="button" role="tab" id="aba-lista" aria-controls="painel-agenda" aria-selected="' +
            (estado.agendaAba === 'lista') +
            '" data-aba="lista">' +
            I('list') +
            'Lista</button>' +
            '</div>' +
            '<div id="painel-agenda" role="tabpanel"></div>' +
            '<div class="grupo" style="margin-top:24px">' +
            cabecaSecao('Depois da consulta', '#acompanhamento', 'Ver tudo') +
            '<a class="cartao item pressionavel" href="#acompanhamento" style="padding:14px 16px">' +
            '<span class="notif__icone">' +
            I('repeat') +
            '</span>' +
            '<span class="item__corpo"><span class="item__titulo" style="display:block">Retornos e exames pedidos</span>' +
            '<span class="item__sub" style="display:block">1 retorno e 2 exames para acompanhar</span></span>' +
            I('chevron-right', 'item__seta') +
            '</a></div>';

        function montar(el) {
            const painel = el.querySelector('#painel-agenda');

            function desenhar() {
                const cal = estado.agendaAba === 'calendario';
                el.querySelectorAll('[role="tab"]').forEach((b) =>
                    b.setAttribute(
                        'aria-selected',
                        String(b.dataset.aba === estado.agendaAba),
                    ),
                );
                painel.setAttribute(
                    'aria-labelledby',
                    cal ? 'aba-cal' : 'aba-lista',
                );
                estado.calAtivo = null;

                if (cal) {
                    const grade = document.createElement('div');
                    grade.className = 'grade grade--lateral';
                    grade.style.marginTop = '16px';
                    const colCal = document.createElement('div');
                    colCal.className = 'col-cal';
                    const colLista = document.createElement('div');
                    painel.innerHTML = '';
                    painel.appendChild(grade);
                    grade.appendChild(colCal);
                    grade.appendChild(colLista);
                    estado.calAtivo = window.CalPaciente.criar(colCal, {
                        D,
                        estado: estado.cal,
                        limites: ['2026-09', '2027-04'],
                        anunciar,
                        aoConfirmarVaga: abrirVaga,
                    });
                    const itens = proximas().map((c) => ({
                        data: c.data,
                        html: linhaConsulta(c),
                    }));
                    itens.sort((a, b) => a.data.localeCompare(b.data));
                    colLista.innerHTML =
                        '<div class="grupo">' +
                        cabecaSecao('Próximas consultas') +
                        (itens.length
                            ? itens.map((x) => x.html).join('')
                            : '<p class="cartao">Nenhuma consulta marcada.</p>') +
                        '<a class="botao botao--principal botao--largo" style="margin-top:12px" href="#agendar">' +
                        I('calendar-plus') +
                        'Marcar nova consulta</a>' +
                        '</div>';
                    const sectionMes = colCal.querySelector('section.secao');
                    if (sectionMes) colLista.appendChild(sectionMes);
                    return;
                }

                const itens = proximas().map((c) => ({
                    data: c.data,
                    html: linhaConsulta(c),
                }));
                itens.sort((a, b) => a.data.localeCompare(b.data));
                const passadas = ordenar(D.passadas).reverse();
                painel.innerHTML =
                    '<div class="grupo" style="margin-top:16px">' +
                    cabecaSecao('Próximas') +
                    (itens.length
                        ? itens.map((x) => x.html).join('')
                        : '<p class="cartao">Nenhuma consulta marcada.</p>') +
                    '</div>' +
                    '<div class="grupo">' +
                    cabecaSecao('Já realizadas') +
                    (passadas.length
                        ? passadas.map((c) => linhaConsulta(c, true)).join('')
                        : '<p class="cartao">Nenhuma consulta realizada.</p>') +
                    '</div>';
            }

            desenhar();

            el.querySelectorAll('[role="tab"]').forEach((b) =>
                b.addEventListener('click', () => {
                    if (estado.agendaAba === b.dataset.aba) return;
                    estado.agendaAba = b.dataset.aba;
                    desenhar();
                    painel.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 160,
                        easing: 'ease',
                    });
                }),
            );

            const pend = estado.pendente;
            estado.pendente = null;
            if (pend && estado.calAtivo) {
                const cal = estado.calAtivo;
                setTimeout(
                    () => {
                        if (!el.isConnected) return;
                        if (pend.tipo === 'vaga') cal.chegarVaga();
                        if (pend.tipo === 'carimbo') cal.carimbar(pend.data);
                    },
                    MOV.reduzido() ? 60 : 420,
                );
            }
        }

        return { titulo: 'Agenda', html, montar };
    }

    function renderFamilia() {
        const html =
            tituloPagina(
                'Família',
                'Você cuida das consultas de ' + D.pessoas.length + ' pessoas.',
            ) +
            '<div class="cartao lista-cartao">' +
            D.pessoas
                .map((p) => {
                    const c = proximas().find((k) => k.pessoa === p.id);
                    return (
                        '<a class="pessoa-linha" href="#pessoa/' +
                        p.id +
                        '">' +
                        A.avatar(p, 56) +
                        '<span class="item__corpo"><span class="pessoa-linha__nome" style="display:block">' +
                        p.curto +
                        (p.id === D.titular ? ' (você)' : '') +
                        '</span>' +
                        '<span class="pessoa-linha__rel" style="display:block">' +
                        p.relacao +
                        ' · ' +
                        p.idade +
                        ' anos</span>' +
                        '<span class="pessoa-linha__prox">' +
                        (c
                            ? I('calendar-days') +
                              esp(medico(c.medico).esp).nome +
                              ' · ' +
                              A.curto(c.data)
                            : 'Nenhuma consulta marcada') +
                        '</span></span>' +
                        I('chevron-right', 'item__seta') +
                        '</a>'
                    );
                })
                .join('') +
            '</div>' +
            '<a class="botao botao--secundario botao--largo" href="#adicionar-familiar" style="margin-top:16px">' +
            I('plus') +
            'Adicionar familiar</a>' +
            '<p class="nota-rodape" style="margin-top:16px">Cada pessoa tem uma cor própria, que aparece em todas as consultas e lembretes dela.</p>';

        return { titulo: 'Família', html };
    }

    function renderPessoa(id) {
        const p = pessoa(id) || pessoa(D.titular);
        const consultas = proximas().filter((c) => c.pessoa === p.id);
        const lembretes = [];
        D.prevencao.forEach((mes) =>
            mes.itens.forEach((it) => {
                if (it.pessoa === p.id) lembretes.push({ mes, it });
            }),
        );
        const espPadrao = p.idade < 18 ? 'pediatria' : 'clinica';
        const retornos = D.acompanhamento.retornos.filter(
            (r) => r.pessoa === p.id,
        );
        const exames = D.acompanhamento.exames.filter(
            (x) => x.pessoa === p.id && x.status !== 'agendado',
        );

        const html =
            tituloPagina(p.nome, p.relacao + ' · ' + p.idade + ' anos') +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div>' +
            '<div class="grupo">' +
            cabecaSecao('Próximas consultas') +
            (consultas.length
                ? consultas.map((c) => linhaConsulta(c)).join('')
                : '<p class="cartao">Nenhuma consulta marcada.</p>') +
            '<a class="botao botao--principal botao--largo" style="margin-top:12px" href="#agendar/' +
            espPadrao +
            '/' +
            p.id +
            '">' +
            I('plus') +
            'Marcar consulta para ' +
            (p.id === D.titular ? 'mim' : p.curto) +
            '</a></div>' +
            '</div>' +
            '<div>' +
            (retornos.length || exames.length
                ? '<div class="grupo">' +
                  cabecaSecao('Precisa marcar') +
                  '<div class="cartao lista-cartao">' +
                  retornos
                      .map(
                          (r) =>
                              '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' +
                              r.titulo +
                              '</p>' +
                              '<div class="prev-item__acao">' +
                              seloPrazo(r.prazo) +
                              '</div></div></div>',
                      )
                      .join('') +
                  exames
                      .map(
                          (x) =>
                              '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' +
                              x.titulo +
                              '</p>' +
                              '<div class="prev-item__acao">' +
                              ligarClinica('Ligar para marcar') +
                              '</div></div></div>',
                      )
                      .join('') +
                  '</div></div>'
                : '') +
            '<dl class="cartao lista-cartao ficha grupo">' +
            '<div><dt>Cartão do SUS</dt><dd>' +
            p.sus +
            '</dd></div>' +
            '<div><dt>Alergias</dt><dd>' +
            p.alergias +
            '</dd></div>' +
            '</dl>' +
            '</div></div>';

        return { titulo: p.curto, html };
    }

    function renderPrevencao() {
        const html =
            tituloPagina(
                'Prevenção',
                'Check-ups e exames de rotina ao longo do ano.',
            ) +
            '<div class="filtros" role="group" aria-label="Filtrar por pessoa" id="filtros-prev"></div>' +
            '<div id="meses-prev"></div>';

        function montar(el) {
            const filtros = el.querySelector('#filtros-prev');
            const meses = el.querySelector('#meses-prev');

            function desenhar() {
                const f = estado.prevFiltro;
                const conta = (id) =>
                    D.prevencao.reduce(
                        (s, m) =>
                            s +
                            m.itens.filter(
                                (it) => id === 'todos' || it.pessoa === id,
                            ).length,
                        0,
                    );
                filtros.innerHTML =
                    '<button type="button" class="filtro" aria-pressed="' +
                    (f === 'todos') +
                    '" data-f="todos">Todos <span class="filtro__n">' +
                    conta('todos') +
                    '</span></button>' +
                    D.pessoas
                        .map(
                            (p) =>
                                '<button type="button" class="filtro" aria-pressed="' +
                                (f === p.id) +
                                '" data-f="' +
                                p.id +
                                '">' +
                                A.avatar(p, 28) +
                                nomeCurto(p) +
                                ' <span class="filtro__n">' +
                                conta(p.id) +
                                '</span></button>',
                        )
                        .join('');

                meses.innerHTML = D.prevencao
                    .map((mes, i) => {
                        const itens = mes.itens.filter(
                            (it) => f === 'todos' || it.pessoa === f,
                        );
                        if (!itens.length) return '';
                        return (
                            '<div class="mes-bloco"><div class="container--folha">' +
                            A.folhaMes(mes.mes, { menta: i === 0 }) +
                            '</div>' +
                            '<div class="mes-bloco__corpo"><h2 class="mes-bloco__campanha">' +
                            (mes.campanha ||
                                cap(
                                    A.MESES_LONGOS[
                                        A.data(mes.mes + '-01').getMonth()
                                    ],
                                )) +
                            '</h2>' +
                            '<p class="mes-bloco__tema">' +
                            mes.tema +
                            '</p>' +
                            '<div class="cartao">' +
                            itens
                                .map((it) => {
                                    const p = pessoa(it.pessoa);
                                    const feito =
                                        it.status === 'agendado' ||
                                        it.status === 'feito';
                                    return (
                                        '<div class="prev-item">' +
                                        A.avatar(p, 36) +
                                        '<div class="item__corpo"><p class="prev-item__titulo">' +
                                        it.titulo +
                                        '</p><p class="prev-item__nota">Para ' +
                                        (p.id === D.titular
                                            ? 'você'
                                            : p.tratamento) +
                                        ' · ' +
                                        it.nota +
                                        '</p>' +
                                        '<div class="prev-item__acao">' +
                                        (feito
                                            ? '<span class="selo selo--feito">' +
                                              I('check') +
                                              (it.status === 'feito'
                                                  ? 'Feito'
                                                  : 'Marcado') +
                                              '</span>'
                                            : '<span class="selo selo--alerta">Não marcado</span>' +
                                              (it.esp
                                                  ? '<a class="botao botao--secundario botao--pequeno" href="#agendar/' +
                                                    it.esp +
                                                    '/' +
                                                    it.pessoa +
                                                    '">Agendar</a>'
                                                  : '')) +
                                        '</div></div></div>'
                                    );
                                })
                                .join('') +
                            '</div></div></div>'
                        );
                    })
                    .join('');
            }

            desenhar();

            el.addEventListener('click', (ev) => {
                const bf = ev.target.closest('[data-f]');
                if (bf) {
                    estado.prevFiltro = bf.dataset.f;
                    desenhar();
                }
            });
        }

        return { titulo: 'Prevenção', html, montar };
    }

    function renderAcompanhamento() {
        const ac = D.acompanhamento;
        const html =
            tituloPagina(
                'Depois da consulta',
                'Retornos, exames e próximas consultas.',
            ) +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div class="grupo">' +
            cabecaSecao('Retornos') +
            '<div class="cartao lista-cartao">' +
            ac.retornos
                .map((r) => {
                    const p = pessoa(r.pessoa);
                    return (
                        '<div class="prev-item">' +
                        A.avatar(p, 40) +
                        '<div class="item__corpo"><p class="prev-item__titulo">' +
                        r.titulo +
                        '</p>' +
                        '<p class="prev-item__nota">' +
                        p.curto +
                        ' · com ' +
                        medico(r.medico).nome +
                        '</p>' +
                        '<div class="prev-item__acao">' +
                        seloPrazo(r.prazo) +
                        '<a class="botao botao--principal botao--pequeno" href="#agendar/' +
                        r.esp +
                        '/' +
                        r.pessoa +
                        '">Agendar retorno</a>' +
                        '</div></div></div>'
                    );
                })
                .join('') +
            '</div></div>' +
            '<div class="grupo">' +
            cabecaSecao('Exames pedidos') +
            '<div class="cartao lista-cartao">' +
            ac.exames
                .map((x) => {
                    const p = pessoa(x.pessoa);
                    const c = x.consulta
                        ? D.consultas.find((k) => k.id === x.consulta)
                        : null;
                    return (
                        '<div class="prev-item">' +
                        A.avatar(p, 40) +
                        '<div class="item__corpo"><p class="prev-item__titulo">' +
                        x.titulo +
                        '</p>' +
                        '<p class="prev-item__nota">' +
                        p.curto +
                        ' · pedido por ' +
                        medico(x.pedidoPor).nome +
                        '</p>' +
                        '<div class="prev-item__acao">' +
                        (c
                            ? '<span class="selo selo--feito">' +
                              I('check') +
                              'Marcado: ' +
                              A.curto(c.data) +
                              ', ' +
                              c.hora +
                              '</span>'
                            : '<span class="selo selo--alerta">Não marcado</span>' +
                              ligarClinica('Ligar para marcar')) +
                        '</div></div></div>'
                    );
                })
                .join('') +
            '</div></div></div>';

        return { titulo: 'Depois da consulta', html };
    }

    function renderPerfil() {
        const t = pessoa(D.titular);
        const texto = lerPref('texto', 'normal');
        const reduzido = lerPref('movimento', 'sistema') === 'reduzido';

        const html =
            tituloPagina('Perfil', null) +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div>' +
            '<div class="cartao item" style="padding:16px;margin-bottom:20px;margin-top:40px">' +
            A.avatar(t, 64) +
            '<span class="item__corpo"><span class="item__titulo" style="display:block;font-size:1.125rem">' +
            t.nome +
            '</span>' +
            '<span class="item__sub" style="display:block">juliana.santos@exemplo.com</span></span></div>' +
            '<div class="grupo">' +
            cabecaSecao('Acessibilidade') +
            '<div class="cartao">' +
            '<p class="item__titulo" id="t-texto">Tamanho do texto</p>' +
            '<div class="segmentado" role="radiogroup" aria-labelledby="t-texto">' +
            [
                ['normal', 'A', 'Normal'],
                ['grande', 'A+', 'Grande'],
                ['muito-grande', 'A++', 'Extra'],
            ]
                .map(
                    ([v, s, n]) =>
                        '<button type="button" role="radio" aria-checked="' +
                        (texto === v) +
                        '" data-texto="' +
                        v +
                        '"><span aria-hidden="true">' +
                        s +
                        '</span>' +
                        n +
                        '</button>',
                )
                .join('') +
            '</div>' +
            '<div class="lista-cartao" style="padding:0;margin-top:12px">' +
            interruptor(
                'movimento',
                'Reduzir movimento',
                'Desativa os efeitos de transição.',
                reduzido,
            ) +
            '</div></div></div></div>' +
            '<div class="grupo">' +
            cabecaSecao('Avisos') +
            '<div class="cartao lista-cartao">' +
            interruptor(
                'lembrete',
                'Lembrete de consulta',
                'Um dia antes e duas horas antes',
                true,
            ) +
            interruptor(
                'fila',
                'Vagas da lista de espera',
                'Avisamos assim que abrir uma vaga',
                true,
            ) +
            interruptor(
                'prev',
                'Calendário de prevenção',
                'No começo de cada mês',
                true,
            ) +
            '</div></div>' +
            '</div></div>' +
            '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="sair">' +
            I('log-out') +
            'Sair da conta</button></div>';

        function montar(el) {
            el.querySelectorAll('[data-texto]').forEach((b) =>
                b.addEventListener('click', () => {
                    gravarPref('texto', b.dataset.texto);
                    aplicarPrefs();
                    el.querySelectorAll('[data-texto]').forEach((x) =>
                        x.setAttribute('aria-checked', String(x === b)),
                    );
                    anunciar(
                        'Tamanho do texto: ' +
                            b.textContent.replace(/^A\+*/, '').trim(),
                    );
                }),
            );

            el.addEventListener('click', (ev) => {
                const sw = ev.target.closest('[role="switch"]');
                if (!sw) return;
                const ligado = sw.getAttribute('aria-checked') !== 'true';
                sw.setAttribute('aria-checked', String(ligado));
                if (sw.dataset.chave === 'movimento') {
                    gravarPref('movimento', ligado ? 'reduzido' : 'sistema');
                    aplicarPrefs();
                }
            });

            el.querySelector('#sair').addEventListener('click', () => {
                aviso({
                    titulo: 'Saída desativada no protótipo',
                    texto: 'Na versão final, você voltaria para a tela de login.',
                    icone: 'info',
                });
            });
        }

        return { titulo: 'Perfil', html, montar };
    }

    function renderConsulta(id) {
        const c =
            D.consultas.find((k) => k.id === id) ||
            D.passadas.find((k) => k.id === id);
        if (!c) return renderAgenda();
        const passada = D.passadas.includes(c);
        const m = medico(c.medico),
            p = pessoa(c.pessoa);

        const html =
            tituloPagina(
                esp(m.esp).nome,
                passada ? 'Realizada' : cap(A.relativo(c.data)),
            ) +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div class="cartao consulta-cartao" style="padding:20px">' +
            A.folha(c.data, { bloco: true }) +
            '<span class="consulta-cartao__corpo"><span class="consulta-cartao__esp">' +
            esp(m.esp).nome +
            '</span>' +
            '<span class="consulta-cartao__medico">' +
            m.nome +
            '</span>' +
            '<span class="pessoa-chip">' +
            A.avatar(p, 30) +
            'Para ' +
            (p.id === D.titular ? 'você' : p.tratamento) +
            '</span></span></div>' +
            '<dl class="cartao lista-cartao ficha">' +
            '<div><dt>Data</dt><dd>' +
            cap(A.extenso(c.data)) +
            '</dd></div>' +
            '<div><dt>Horário</dt><dd class="num">' +
            c.hora +
            '</dd></div>' +
            '<div><dt>Local</dt><dd>' +
            D.clinica.nome +
            ', ' +
            c.sala +
            '</dd></div>' +
            '<div><dt>Motivo</dt><dd>' +
            c.motivo +
            '</dd></div>' +
            '</dl>' +
            '</div>' +
            (!passada
                ? '<div class="gaveta__acoes" style="margin-top:20px">' +
                  '<a class="botao botao--principal" href="#agendar/' +
                  m.esp +
                  '/' +
                  p.id +
                  '">' +
                  I('calendar-days') +
                  'Remarcar</a>' +
                  '<a class="botao botao--secundario" href="tel:' +
                  D.clinica.telefoneLink +
                  '">' +
                  I('phone') +
                  'Ligar para a clínica</a></div>' +
                  '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="cancelar">Cancelar consulta</button></div>'
                : '');

        function montar(el) {
            const b = el.querySelector('#cancelar');
            if (!b) return;
            b.addEventListener('click', () => {
                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Cancelar esta consulta?</h2>' +
                        '<p class="gaveta__texto">' +
                        esp(m.esp).nome +
                        ' com ' +
                        m.nome +
                        ', ' +
                        A.extenso(c.data) +
                        ', às ' +
                        c.hora +
                        '.</p>' +
                        '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Manter consulta</button></div>' +
                        '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-cancelar">Sim, cancelar</button></div>',
                    {
                        montar: (g) =>
                            g
                                .querySelector('#confirmar-cancelar')
                                .addEventListener('click', () => {
                                    D.consultas = D.consultas.filter(
                                        (k) => k !== c,
                                    );
                                    fecharGaveta();
                                    aviso({
                                        titulo: 'Consulta cancelada',
                                        texto: 'A vaga foi oferecida à lista de espera.',
                                        icone: 'info',
                                    });
                                    navegar('#agenda');
                                }),
                    },
                );
            });
        }

        return { titulo: 'Consulta', html, montar };
    }

    function renderEspera() {
        const e = D.espera;
        if (!e || e.resolvida) {
            return {
                titulo: 'Lista de espera',
                html:
                    tituloPagina('Lista de espera') +
                    '<p class="cartao" style="padding:20px">Você não está em nenhuma fila agora.</p>',
            };
        }
        const m = medico(e.medico);
        const g = pessoa(e.pessoa).genero;
        const ord = A.ordinal(e.posicao, g);
        const html =
            tituloPagina('Lista de espera', esp(m.esp).nome + ' · ' + m.nome) +
            '<section class="espera-painel grupo" aria-labelledby="pos-frase">' +
            '<div class="espera-painel__linha"><span class="posicao" id="pos" aria-hidden="true">' +
            ord +
            '</span>' +
            '<p class="espera-painel__frase" id="pos-frase">Você é a <span id="pos-txt">' +
            ord +
            '</span><br>da fila</p></div>' +
            '<p class="espera-painel__detalhe"><b>' +
            esp(m.esp).nome +
            '</b> · ' +
            m.nome +
            '<br>Na fila desde ' +
            A.extenso(e.desde, false) +
            '</p>' +
            '<div id="fila-vis">' +
            filaHTML(e.posicao, e.naFila) +
            '</div>' +
            '</section>' +
            '<div class="grade grade--2" style="gap:24px;margin-top:24px;align-items:start">' +
            '<div class="grupo">' +
            '<div class="cartao lista-cartao">' +
            interruptor(
                'notificar',
                'Notificação no app',
                'Recomendado: é o aviso mais rápido',
                e.notificar,
            ) +
            interruptor(
                'sms',
                'Mensagem SMS',
                'Para o número terminado em 4471',
                e.sms,
            ) +
            '</div></div>' +
            '<div class="grupo">' +
            '<div class="demo"><p>Demonstração: simula alguém cancelando.</p>' +
            '<button type="button" class="botao botao--secundario botao--largo" id="simular">' +
            I('repeat') +
            'Simular cancelamento</button></div>' +
            '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="sair-fila">Sair da fila</button>' +
            '<p style="font-size:0.875rem;color:var(--tinta-2);margin-top:4px">Você perde a sua posição.</p></div>' +
            '</div></div>';

        function montar(el) {
            el.addEventListener('click', (ev) => {
                const sw = ev.target.closest('[role="switch"]');
                if (sw) {
                    const ligado = sw.getAttribute('aria-checked') !== 'true';
                    sw.setAttribute('aria-checked', String(ligado));
                    e[sw.dataset.chave] = ligado;
                }
            });

            el.querySelector('#simular').addEventListener('click', (ev) => {
                if (e.posicao > 1) {
                    e.posicao -= 1;
                    e.naFila -= 1;
                    const novo = A.ordinal(e.posicao, g);
                    el.querySelector('#pos').textContent = novo;
                    el.querySelector('#pos-txt').textContent = novo;
                    el.querySelector('#fila-vis').innerHTML = filaHTML(
                        e.posicao,
                        e.naFila,
                    );
                    anunciar('Agora você é a ' + novo + ' da fila.');
                    if (e.posicao === 1)
                        ev.currentTarget.lastChild.textContent =
                            'Simular nova vaga';
                } else {
                    oferecerVaga();
                }
            });

            el.querySelector('#sair-fila').addEventListener('click', () => {
                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Sair da lista de espera?</h2>' +
                        '<p class="gaveta__texto">Você vai perder a ' +
                        A.ordinal(e.posicao, g) +
                        ' posição.</p>' +
                        '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Continuar na fila</button></div>' +
                        '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-sair">Sair da fila</button></div>',
                    {
                        montar: (g2) =>
                            g2
                                .querySelector('#confirmar-sair')
                                .addEventListener('click', () => {
                                    e.resolvida = true;
                                    fecharGaveta();
                                    aviso({
                                        titulo: 'Você saiu da fila',
                                        icone: 'info',
                                    });
                                    navegar('#inicio');
                                }),
                    },
                );
            });
        }

        return { titulo: 'Lista de espera', html, montar };
    }

    function abrirVaga() {
        const e = D.espera;
        if (!e || e.resolvida) return;
        const m = medico(e.medico);
        const v = e.vaga;
        let resta = 30 * 60;
        let timer = null;
        const fmt = (seg) =>
            Math.floor(seg / 60) +
            ' min ' +
            String(seg % 60).padStart(2, '0') +
            ' s';
        const recusaHTML =
            '<button type="button" class="botao botao--texto-perigo" id="vaga-nao">Não quero esta vaga</button>';
        abrirGaveta(
            '<h2 class="gaveta__titulo" id="gaveta-titulo">Abriu uma vaga para você</h2>' +
                '<div class="gaveta__resumo">' +
                A.folha(v.data, { menta: true }) +
                '<div><b>' +
                esp(m.esp).nome +
                '</b><br>' +
                m.nome +
                '<br><span class="num">' +
                v.hora +
                '</span></div></div>' +
                '<p class="contagem">' +
                I('clock') +
                '<span>Confirme em até <b class="num" id="contagem">' +
                fmt(resta) +
                '</b></span></p>' +
                '<div class="gaveta__acoes"><button type="button" class="botao botao--principal botao--largo" id="vaga-sim">Confirmar vaga</button></div>' +
                '<div class="gaveta__recusa" id="recusa">' +
                recusaHTML +
                '</div>',
            {
                montar: (g) => {
                    const saida = g.querySelector('#contagem');
                    timer = setInterval(() => {
                        if (!saida.isConnected) {
                            clearInterval(timer);
                            return;
                        }
                        resta = Math.max(0, resta - 1);
                        saida.textContent = fmt(resta);
                    }, 1000);
                    g.querySelector('#vaga-sim').addEventListener(
                        'click',
                        () => {
                            clearInterval(timer);
                            const c = {
                                id: 'v' + Date.now(),
                                pessoa: e.pessoa,
                                medico: e.medico,
                                data: v.data,
                                hora: v.hora,
                                sala: 'Sala 6',
                                status: 'confirmada',
                                motivo: 'Vaga da lista de espera',
                            };
                            D.consultas.push(c);
                            e.resolvida = true;
                            e.oferta = false;
                            fecharGaveta(true);
                            if (estado.calAtivo) estado.calAtivo.atualizar();
                            sucessoConsulta(c, 'Vaga confirmada!');
                        },
                    );
                    g.querySelector('#vaga-nao').addEventListener(
                        'click',
                        () => {
                            clearInterval(timer);
                            e.oferta = false;
                            fecharGaveta();
                            aviso({ titulo: 'Vaga recusada', icone: 'info' });
                        },
                    );
                },
            },
        );
    }

    function oferecerVaga() {
        const e = D.espera;
        if (!e || e.resolvida) return;
        const m = medico(e.medico);
        e.posicao = 1;
        e.oferta = true;
        if (estado.calAtivo) estado.calAtivo.atualizar();
        aviso({
            cabeca: 'AgendaPro Saúde · agora',
            titulo: 'Abriu uma vaga para você!',
            texto:
                esp(m.esp).nome +
                ' com ' +
                m.nome +
                ', ' +
                A.extenso(e.vaga.data) +
                ', às ' +
                e.vaga.hora +
                '. Confirme em até 30 minutos.',
            icone: 'bell-ring',
            acoes: [
                {
                    rotulo: 'Confirmar',
                    classe: 'botao--principal',
                    acao: abrirVaga,
                },
                {
                    rotulo: 'Ver na agenda',
                    classe: 'botao--secundario',
                    acao: () => {
                        estado.pendente = { tipo: 'vaga' };
                        navegar('#agenda');
                    },
                },
            ],
        });
    }

    function sucessoConsulta(c, titulo) {
        const m = medico(c.medico),
            p = pessoa(c.pessoa);
        c.novo = true;
        abrirGaveta(
            '<div class="carimbo-palco" aria-hidden="true">' +
                A.folha(c.data) +
                '<span class="carimbo">Marcada</span></div>' +
                '<h2 class="gaveta__titulo" id="gaveta-titulo" style="text-align:center">' +
                (titulo || 'Consulta marcada!') +
                '</h2>' +
                '<div class="gaveta__resumo"><div><b>' +
                cap(A.extenso(c.data)) +
                ', às <span class="num">' +
                c.hora +
                '</span></b><br>' +
                esp(m.esp).nome +
                ' com ' +
                m.nome +
                '<br>Para ' +
                (p.id === D.titular ? 'você' : p.tratamento) +
                '</div></div>' +
                '<div class="gaveta__acoes">' +
                '<button type="button" class="botao botao--principal" data-ver-carimbo="' +
                c.data +
                '">' +
                I('calendar-days') +
                'Ver no calendário</button>' +
                '<button type="button" class="botao botao--secundario" data-ir-inicio>Voltar ao início</button></div>',
            {
                montar: (g) => {
                    g.querySelector('[data-ver-carimbo]').addEventListener(
                        'click',
                        () => {
                            estado.agendaAba = 'calendario';
                            estado.pendente = { tipo: 'carimbo', data: c.data };
                            fecharGaveta();
                            navegar('#agenda');
                        },
                    );
                    g.querySelector('[data-ir-inicio]').addEventListener(
                        'click',
                        () => {
                            fecharGaveta();
                            navegar('#inicio');
                        },
                    );
                },
            },
        );
    }

    function renderAgendar(espId, pessoaId) {
        const espObj = espId ? esp(espId) : null;
        const titulo = espObj
            ? 'Marcar consulta de ' + espObj.nome
            : 'Marcar consulta';
        const sub = espObj ? espObj.desc : null;

        const medicos = espId
            ? D.medicos.filter((m) => m.esp === espId)
            : D.medicos;

        const pessoaAtiva = pessoaId || D.titular;

        const SALAS = [
            'Sala 1',
            'Sala 2',
            'Sala 3',
            'Sala 4',
            'Sala 5',
            'Sala 6',
            'Sala 7',
        ];

        function seletor(pAtiva) {
            return (
                '<div class="filtros" role="group" aria-label="Para quem?" id="filtro-pessoa">' +
                D.pessoas
                    .map(
                        (p) =>
                            '<button type="button" class="filtro" aria-pressed="' +
                            (p.id === pAtiva) +
                            '" data-pessoa="' +
                            p.id +
                            '">' +
                            A.avatar(p, 28) +
                            nomeCurto(p) +
                            '</button>',
                    )
                    .join('') +
                '</div>'
            );
        }

        function listaMedicos(pAtiva) {
            if (!medicos.length) {
                return '<p class="cartao" style="padding:20px">Nenhum médico disponível para esta especialidade.</p>';
            }
            return medicos
                .map((m) => {
                    const mEsp = esp(m.esp);
                    const iniciais = m.nome
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('');
                    const horariosMediaco = D.horarios[m.id] || [];
                    const slotsHTML = horariosMediaco.length
                        ? horariosMediaco
                              .map((bloco) =>
                                  bloco.horas
                                      .map(
                                          (h) =>
                                              '<button type="button" class="chip-horario" data-medico="' +
                                              m.id +
                                              '" data-data="' +
                                              bloco.data +
                                              '" data-hora="' +
                                              h +
                                              '" data-pessoa="' +
                                              pAtiva +
                                              '">' +
                                              A.curto(bloco.data) +
                                              ' ' +
                                              h +
                                              '</button>',
                                      )
                                      .join(''),
                              )
                              .join('')
                        : '<span style="font-size:0.875rem;color:var(--tinta-2)">Sem horários disponíveis · ' +
                          '<a href="#espera">Entrar na lista de espera</a></span>';
                    return (
                        '<div class="cartao" style="padding:16px;margin-bottom:12px">' +
                        '<div class="medico-cabeca">' +
                        '<span class="medico-inicial" style="background:' +
                        m.cor +
                        ';color:#fff">' +
                        iniciais +
                        '</span>' +
                        '<span><strong style="display:block">' +
                        m.nome +
                        '</strong><span style="font-size:0.875rem;color:var(--tinta-2)">' +
                        mEsp.nome +
                        '</span></span>' +
                        '</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
                        slotsHTML +
                        '</div>' +
                        '</div>'
                    );
                })
                .join('');
        }

        let html =
            tituloPagina(titulo, sub) +
            seletor(pessoaAtiva) +
            '<div id="lista-medicos">' +
            listaMedicos(pessoaAtiva) +
            '</div>';

        function montar(el) {
            let pAtiva = pessoaAtiva;

            el.querySelector('#filtro-pessoa').addEventListener(
                'click',
                (ev) => {
                    const b = ev.target.closest('[data-pessoa]');
                    if (!b) return;
                    pAtiva = b.dataset.pessoa;
                    el.querySelectorAll('#filtro-pessoa [data-pessoa]').forEach(
                        (x) =>
                            x.setAttribute(
                                'aria-pressed',
                                String(x.dataset.pessoa === pAtiva),
                            ),
                    );
                    el.querySelector('#lista-medicos').innerHTML =
                        listaMedicos(pAtiva);
                },
            );

            el.addEventListener('click', (ev) => {
                const chip = ev.target.closest('.chip-horario');
                if (!chip) return;
                const mId = chip.dataset.medico;
                const data = chip.dataset.data;
                const hora = chip.dataset.hora;
                const pId = chip.dataset.pessoa || pAtiva;
                const m = medico(mId);
                const mEsp = esp(m.esp);
                const p = pessoa(pId);

                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Confirmar agendamento</h2>' +
                        '<div class="gaveta__resumo">' +
                        A.folha(data, { menta: true }) +
                        '<div><b>' +
                        mEsp.nome +
                        '</b><br>' +
                        m.nome +
                        '<br><span class="num">' +
                        hora +
                        '</span></div>' +
                        '</div>' +
                        '<p style="margin:0 0 16px;font-size:0.9375rem">' +
                        I('user') +
                        ' Para: <strong>' +
                        (p.id === D.titular ? 'Você' : p.nome) +
                        '</strong></p>' +
                        '<div class="gaveta__acoes">' +
                        '<button type="button" class="botao botao--principal" id="confirmar-ag">Confirmar consulta</button>' +
                        '<button type="button" class="botao botao--secundario" data-fechar>Cancelar</button>' +
                        '</div>',
                    {
                        montar: (g) => {
                            g.querySelector('#confirmar-ag').addEventListener(
                                'click',
                                () => {
                                    const hd = D.horarioDisputado;
                                    if (
                                        hd &&
                                        hd.medico === mId &&
                                        hd.data === data &&
                                        hd.hora === hora
                                    ) {
                                        fecharGaveta();
                                        aviso({
                                            titulo: 'Horário indisponível',
                                            texto: 'Este horário acabou de ser ocupado por outro paciente.',
                                            icone: 'triangle-alert',
                                        });
                                        return;
                                    }
                                    const sala =
                                        SALAS[
                                            Math.floor(
                                                Math.random() * SALAS.length,
                                            )
                                        ];
                                    const c = {
                                        id: 'ag-' + Date.now(),
                                        pessoa: pId,
                                        medico: mId,
                                        data: data,
                                        hora: hora,
                                        sala: sala,
                                        status: 'confirmada',
                                        motivo: 'Consulta de ' + mEsp.nome,
                                    };
                                    D.consultas.push(c);
                                    if (D.horarios[mId]) {
                                        D.horarios[mId] = D.horarios[mId]
                                            .map((bloco) => ({
                                                ...bloco,
                                                horas: bloco.horas.filter(
                                                    (h2) =>
                                                        !(
                                                            bloco.data ===
                                                                data &&
                                                            h2 === hora
                                                        ),
                                                ),
                                            }))
                                            .filter(
                                                (bloco) =>
                                                    bloco.horas.length > 0,
                                            );
                                    }
                                    fecharGaveta(true);
                                    sucessoConsulta(c, 'Consulta marcada!');
                                },
                            );
                        },
                    },
                );
            });
        }

        return { titulo, html, montar };
    }

    function renderAdicionarFamiliar() {
        const CORES = [
            '#12263f',
            '#e07b39',
            '#2f6f9f',
            '#b5543a',
            '#2e5e4e',
            '#a0522d',
            '#7c3f8c',
        ];

        const html =
            tituloPagina(
                'Adicionar familiar',
                'Preencha os dados e a pessoa aparecerá em todas as consultas.',
            ) +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div>' +
            '<form id="form-familiar" class="formulario">' +
            '<div class="campo"><label for="f-nome">Nome completo</label>' +
            '<input id="f-nome" type="text" autocomplete="off" placeholder="Ex.: Ana Beatriz Santos" required></div>' +
            '<div class="campo"><span class="campo__rotulo" id="f-rel-label">Parentesco</span>' +
            '<div class="opcoes" role="radiogroup" aria-labelledby="f-rel-label">' +
            [
                'Filho/a',
                'Mãe/pai',
                'Avó/avô',
                'Cônjuge/companheiro(a)',
                'Outra pessoa',
            ]
                .map(
                    (o, i) =>
                        '<button type="button" role="radio" aria-checked="' +
                        (i === 0) +
                        '">' +
                        o +
                        '</button>',
                )
                .join('') +
            '</div></div>' +
            '<div class="campo"><label for="f-nasc">Data de nascimento</label>' +
            '<input id="f-nasc" type="text" inputmode="numeric" placeholder="dd/mm/aaaa"></div>' +
            '<div class="campo"><label for="f-sus">Cartão do SUS <span style="font-weight:400;color:var(--tinta-2)">(opcional)</span></label>' +
            '<input id="f-sus" type="text" inputmode="numeric"></div>' +
            '<div class="campo"><label for="f-alergias">Alergias</label>' +
            '<input id="f-alergias" type="text" placeholder="Ex.: Penicilina, dipirona"></div>' +
            '<div class="gaveta__acoes">' +
            '<button type="submit" class="botao botao--principal">Adicionar familiar</button>' +
            '<a class="botao botao--secundario" href="#familia">Cancelar</a>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '<div>' +
            '<div class="cartao" style="padding:20px">' +
            '<p style="margin:0 0 12px;font-weight:600">Cor de identificação</p>' +
            '<div id="grade-cores" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
            CORES.map(
                (cor, i) =>
                    '<button type="button" class="cor-btn" aria-pressed="' +
                    (i === 0) +
                    '" data-cor="' +
                    cor +
                    '" style="background:' +
                    cor +
                    ';color:' +
                    cor +
                    '" aria-label="Cor ' +
                    (i + 1) +
                    '"></button>',
            ).join('') +
            '</div>' +
            '<p style="font-size:0.875rem;color:var(--tinta-2);margin:0">Esta cor aparecerá nos avatares e nos cartões de consulta desta pessoa.</p>' +
            '</div>' +
            '</div>' +
            '</div>';

        function montar(el) {
            let corSelecionada = CORES[0];

            el.querySelectorAll('#grade-cores .cor-btn').forEach((b) =>
                b.addEventListener('click', () => {
                    corSelecionada = b.dataset.cor;
                    el.querySelectorAll('#grade-cores .cor-btn').forEach((x) =>
                        x.setAttribute('aria-pressed', String(x === b)),
                    );
                }),
            );

            el.querySelectorAll('.opcoes [role="radio"]').forEach((b) =>
                b.addEventListener('click', () =>
                    el
                        .querySelectorAll('.opcoes [role="radio"]')
                        .forEach((x) =>
                            x.setAttribute('aria-checked', String(x === b)),
                        ),
                ),
            );

            el.querySelector('#form-familiar').addEventListener(
                'submit',
                (ev) => {
                    ev.preventDefault();
                    const nome = el.querySelector('#f-nome').value.trim();
                    if (!nome) {
                        el.querySelector('#f-nome').focus();
                        return;
                    }
                    const relBtn = el.querySelector(
                        '.opcoes [aria-checked="true"]',
                    );
                    const relacao = relBtn
                        ? relBtn.textContent.trim()
                        : 'Familiar';
                    const sus = el.querySelector('#f-sus').value.trim() || '—';
                    const alergias =
                        el.querySelector('#f-alergias').value.trim() ||
                        'Nenhuma conhecida';
                    const nascStr = el.querySelector('#f-nasc').value.trim();
                    let idade = 0;
                    if (nascStr.length === 10) {
                        const partes = nascStr.split('/');
                        if (partes.length === 3) {
                            const ano = parseInt(partes[2], 10);
                            if (!isNaN(ano))
                                idade = new Date().getFullYear() - ano;
                        }
                    }
                    const novaPessoa = {
                        id: 'novo-' + Date.now(),
                        nome: nome,
                        curto: nome.split(' ')[0],
                        tratamento: nome.split(' ')[0],
                        relacao: relacao,
                        idade: idade,
                        cor: corSelecionada,
                        sus: sus,
                        alergias: alergias,
                        genero: 'o',
                    };
                    D.pessoas.push(novaPessoa);
                    navegar('#familia');
                    setTimeout(() => {
                        aviso({
                            titulo:
                                nome.split(' ')[0] +
                                ' foi adicionado à família',
                            texto: 'Você já pode marcar consultas para esta pessoa.',
                            icone: 'users',
                        });
                    }, 100);
                },
            );
        }

        return { titulo: 'Adicionar familiar', html, montar };
    }

    const TELAS = {
        inicio: renderInicio,
        assistente: renderAssistente,
        agenda: renderAgenda,
        familia: renderFamilia,
        pessoa: renderPessoa,
        prevencao: renderPrevencao,
        acompanhamento: renderAcompanhamento,
        perfil: renderPerfil,
        espera: renderEspera,
        consulta: renderConsulta,
        agendar: renderAgendar,
        'adicionar-familiar': renderAdicionarFamiliar,
    };

    const SECOES_NAV = [
        'inicio',
        'assistente',
        'agenda',
        'familia',
        'prevencao',
        'acompanhamento',
        'perfil',
    ];

    function rotaAtual() {
        const hash = location.hash.replace(/^#\/?/, '') || 'inicio';
        const partes = hash.split('/');
        const nome = TELAS[partes[0]] ? partes[0] : 'inicio';
        return {
            hash: nome === partes[0] ? hash : 'inicio',
            nome,
            args: partes.slice(1),
        };
    }

    function atualizarNavLateral(nomeAtivo) {
        document.querySelectorAll('[data-secao]').forEach((a) => {
            const secao = a.dataset.secao;
            if (
                secao === nomeAtivo ||
                (nomeAtivo === 'pessoa' && secao === 'familia') ||
                (nomeAtivo === 'consulta' && secao === 'agenda') ||
                (nomeAtivo === 'adicionar-familiar' && secao === 'familia')
            ) {
                a.setAttribute('aria-current', 'page');
            } else {
                a.removeAttribute('aria-current');
            }
        });
    }

    function navegar(hashAlvo) {
        if (hashAlvo) {
            location.hash = hashAlvo;
            return;
        }
        const r = rotaAtual();
        fecharGaveta(true);
        const def = TELAS[r.nome].apply(null, r.args);
        pagina.innerHTML = def.html;
        if (def.montar) def.montar(pagina);
        atualizarNavLateral(r.nome);
        const h1 = pagina.querySelector('h1');
        if (h1) h1.focus({ preventScroll: true });
        anunciar(def.titulo);
        pagina.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: MOV.reduzido() ? 120 : 200,
            easing: 'ease',
        });
        document.getElementById('conteudo').scrollTop = 0;
    }

    window.addEventListener('hashchange', () => navegar());

    document.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-voltar]')) {
            history.back();
        }
    });

    function aviso(o) {
        avisos.querySelectorAll('.aviso').forEach((v) => v.remove());
        const el = document.createElement('div');
        el.className = 'aviso';
        el.setAttribute('role', o.acoes ? 'alertdialog' : 'status');
        el.setAttribute('aria-label', o.titulo);
        el.innerHTML =
            '<p class="aviso__cabeca">' +
            I(o.icone || 'bell-ring') +
            (o.cabeca || 'AgendaPro Saúde') +
            '</p>' +
            '<p class="aviso__titulo">' +
            o.titulo +
            '</p>' +
            (o.texto ? '<p class="aviso__texto">' + o.texto + '</p>' : '') +
            (o.acoes
                ? '<div class="aviso__acoes">' +
                  o.acoes
                      .map(
                          (a, i) =>
                              '<button type="button" class="botao ' +
                              a.classe +
                              '" data-i="' +
                              i +
                              '">' +
                              a.rotulo +
                              '</button>',
                      )
                      .join('') +
                  '</div>'
                : '');
        avisos.appendChild(el);
        requestAnimationFrame(() =>
            requestAnimationFrame(() => el.classList.add('visivel')),
        );
        if (o.acoes) {
            el.addEventListener('click', (ev) => {
                const b = ev.target.closest('[data-i]');
                if (!b) return;
                fecharAviso(el);
                o.acoes[Number(b.dataset.i)].acao();
            });
            setTimeout(() => {
                const b = el.querySelector("[data-i='0']");
                if (b) b.focus({ preventScroll: true });
            }, 60);
        } else {
            setTimeout(() => fecharAviso(el), 4200);
        }
    }

    function fecharAviso(el) {
        el.classList.remove('visivel');
        setTimeout(() => el.remove(), 260);
    }

    let focoAntes = null;

    function abrirGaveta(html, opcoes) {
        opcoes = opcoes || {};
        focoAntes = document.activeElement;
        gavetaCamada.hidden = false;
        gavetaCamada.innerHTML =
            '<div class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo"><div class="gaveta__puxador" aria-hidden="true"></div>' +
            html +
            '</div>';
        const g = gavetaCamada.querySelector('.gaveta');
        requestAnimationFrame(() =>
            requestAnimationFrame(() => gavetaCamada.classList.add('aberta')),
        );
        if (opcoes.montar) opcoes.montar(g);
        setTimeout(() => {
            const alvo = g.querySelector('input, button, a[href]');
            if (alvo) alvo.focus({ preventScroll: true });
        }, 80);
    }

    function fecharGaveta(imediato) {
        if (gavetaCamada.hidden) return;
        gavetaCamada.classList.remove('aberta');
        const fim = () => {
            gavetaCamada.hidden = true;
            gavetaCamada.innerHTML = '';
        };
        if (imediato) fim();
        else setTimeout(fim, 260);
        if (focoAntes && document.contains(focoAntes))
            focoAntes.focus({ preventScroll: true });
    }

    gavetaCamada.addEventListener('click', (ev) => {
        if (ev.target === gavetaCamada || ev.target.closest('[data-fechar]'))
            fecharGaveta();
    });

    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && !gavetaCamada.hidden) fecharGaveta();
        if (ev.key === 'Tab' && !gavetaCamada.hidden) {
            const focaveis = Array.from(
                gavetaCamada.querySelectorAll(
                    'a[href], button, input, textarea',
                ),
            );
            if (!focaveis.length) return;
            const primeiro = focaveis[0],
                ultimo = focaveis[focaveis.length - 1];
            if (ev.shiftKey && document.activeElement === primeiro) {
                ev.preventDefault();
                ultimo.focus();
            } else if (!ev.shiftKey && document.activeElement === ultimo) {
                ev.preventDefault();
                primeiro.focus();
            }
        }
    });

    function anunciar(texto) {
        anunciador.textContent = '';
        setTimeout(() => {
            anunciador.textContent = texto;
        }, 30);
    }

    document.querySelectorAll('[data-marca]').forEach((el) => {
        el.outerHTML = A.marca(Number(el.dataset.marca));
    });

    const titular = D.pessoas.find((p) => p.id === D.titular);
    const avatarEl = document.getElementById('avatar-titular');
    const nomeEl = document.getElementById('nome-titular');
    if (avatarEl && titular) avatarEl.outerHTML = A.avatar(titular, 36);
    if (nomeEl && titular) nomeEl.textContent = titular.curto;

    aplicarPrefs();
    navegar();

    /* ─── Botão de recolher a sidebar ─── */
    (function () {
        const lateral = document.querySelector('.lateral');
        if (!lateral) return;

        function aplicarEstadoMenu() {
            const raiz = document.documentElement;
            raiz.dataset.lateral =
                lerPref('menu', 'aberto') === 'recolhido'
                    ? 'recolhida'
                    : 'aberta';
        }
        aplicarEstadoMenu();

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
            const dicaEl = document.querySelector('.lateral__dica');
            if (dicaEl) dicaEl.hidden = true;

            const rec =
                document.documentElement.dataset.lateral === 'recolhida';
            gravarPref('menu', rec ? 'aberto' : 'recolhido');
            aplicarEstadoMenu();
            atualizar();
        });

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
                window.innerWidth <= 860
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
})();
