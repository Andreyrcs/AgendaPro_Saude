/* AgendaPro Saúde — área do paciente no computador. Dados e ações pela API (paciente-servicos.js); a tela só
   começa depois que os dados chegam. Todo texto que vem da API passa por A.esc() antes de entrar no HTML. */
window.PACIENTE.iniciar(function () {
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
        cal: { mes: D.hoje.slice(0, 7), filtro: 'todos', foco: null },
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

    const pessoa = (id) => D.pessoas.find((p) => A.mesmoId(p.id, id));
    const medico = (id) => D.medicos.find((m) => A.mesmoId(m.id, id)) || { id, nome: '', esp: null, cor: '#e2ecf0' };
    const esp = (id) => D.especialidades[id] || { nome: '', desc: '' };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const nomeCurto = (p) => (A.mesmoId(p.id, D.titular) ? 'Você' : p.curto);
    const ehTitular = (p) => !!p && A.mesmoId(p.id, D.titular);
    /* especialidade pelo NOME (o id muda de clínica para clínica): clínica geral e pediatria */
    const espPeloNome = (nome) => Object.keys(D.especialidades).find((k) => window.TRIAGEM.mesmaEspecialidade(D.especialidades[k].nome, nome));
    const espPadraoPara = (p) => (p && p.idade !== null && p.idade < 18 && espPeloNome('pediatria')) || espPeloNome('clinica geral') || Object.keys(D.especialidades)[0] || '';
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
            A.esc(titulo) +
            '</h1>' +
            (sub ? '<p>' + A.esc(sub) + '</p>' : '') +
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
            A.esc(esp(m.esp).nome) +
            '</span>' +
            '<span class="consulta-cartao__medico">' +
            A.esc(m.nome) +
            '</span>' +
            '<span class="meta">' +
            I('clock') +
            '<span class="num">' +
            c.hora +
            '</span>' +
            (passada ? ' · ' + D.STATUS_CONSULTA[c.status || 'atendida'] : ' · ' + A.relativo(c.data)) +
            '</span>' +
            '<span class="pessoa-chip">' +
            A.avatar(p, 28) +
            A.esc(nomeCurto(p)) +
            '</span>' +
            '</span>' +
            I('chevron-right', 'item__seta') +
            '</a>'
        );
    }

    function seloPrazo(iso) {
        if (!iso) return '';
        const n = A.diasAte(iso);
        return (
            '<span class="selo selo--alerta">' +
            I('clock') +
            (n <= 0 ? 'Hoje' : n === 1 ? 'Falta 1 dia' : 'Faltam ' + n + ' dias') +
            '</span>'
        );
    }

    function ligarClinica(rotulo) {
        return (
            '<a class="botao botao--secundario botao--pequeno" href="tel:' +
            A.esc(D.clinica.telefoneLink) +
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
        if (frente <= 0) return 'Você é a próxima pessoa da fila';
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

    /* ─── Presença e faltas: cartão "Confirme sua consulta", faltas registradas e restrição ─── */
    function restricaoHTML(r) {
        return (
            '<div class="aviso-regra aviso-regra--forte" role="note">' + I('info') +
            '<span><b>' + A.esc(r.titulo) + '.</b>' + A.esc(r.texto) +
            (r.tipo === 'so_recepcao'
                ? '<br><a class="botao botao--principal" style="margin-top:10px" href="tel:' + A.esc(D.clinica.telefoneLink) + '">' +
                  I('phone') + 'Ligar para a clínica · ' + A.esc(D.clinica.telefone) + '</a>'
                : '') +
            '</span></div>'
        );
    }
    function presencaHTML() {
        let h = PACIENTE.paraConfirmar()
            .map((c) => {
                const m = medico(c.medico);
                const p = pessoa(c.pessoa);
                const amanha = c.data > D.hoje;
                return (
                    '<section class="confirmar-presenca" aria-label="Confirmar presença">' +
                    '<p><b>Confirme sua consulta ' + (amanha ? 'de amanhã' : 'de hoje') + '</b><br>' +
                    A.esc(esp(m.esp).nome) + ' com ' + A.esc(m.nome) + ', às ' + c.hora +
                    (ehTitular(p) ? '' : ' · para ' + A.esc(nomeCurto(p))) + '.</p>' +
                    (amanha ? '<p style="font-size:0.875rem">Se não puder ir, toque em “Não vou” até o fim de hoje: não há nenhuma consequência.</p>' : '') +
                    '<div class="confirmar-presenca__acoes">' +
                    '<button type="button" class="botao botao--principal" data-vou="' + c.id + '">Vou</button>' +
                    '<button type="button" class="botao botao--secundario" data-naovou="' + c.id + '">Não vou</button>' +
                    '</div></section>'
                );
            })
            .join('');
        const r = PACIENTE.avisoDeRestricao();
        if (r) h += restricaoHTML(r);
        if (PACIENTE.situacao().faltas) h += '<p style="margin:0 0 16px;color:var(--tinta-2)">' + PACIENTE.textoDasFaltas() + '</p>';
        /* avisos da clínica ainda não lidos (tabela Notificacoes: tipo, mensagem, data de envio, lida) */
        const novos = (D.notificacoes || []).filter((n) => n.nova);
        if (novos.length) {
            h += '<section class="grupo" aria-label="Avisos novos" style="margin-bottom:16px">' +
                cabecaSecao('Avisos') + '<div class="cartao lista-cartao">' +
                '<p style="padding:8px 16px 0"><button type="button" class="botao botao--secundario botao--pequeno" data-ler-avisos>' + I('check') + 'Marcar como lidos</button></p>' +
                novos.map((n) => '<p class="notif" style="padding:12px 16px">' + I(n.icone || 'bell') +
                    '<span class="item__corpo"><span style="display:block">' + A.esc(n.texto) + '</span>' +
                    '<span class="item__sub" style="display:block">' + A.esc(n.quando) + '</span></span></p>').join('') +
                '</div></section>';
        }
        return h;
    }

    function renderInicio() {
        const t = pessoa(D.titular);
        const prox = proximas()[0];
        const e = D.espera;

        let html = tituloPagina(
            'Como você está se sentindo hoje?',
            'Olá, ' + t.curto + '.',
        );
        html += presencaHTML();

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
        if (e) {
            const m = medico(e.medico);
            html +=
                '<section class="grupo" aria-labelledby="t-espera-ini">' +
                cabecaSecao('Lista de espera', '#espera', 'Ver fila') +
                '<a class="cartao agenda-item agenda-item--fila pressionavel" href="#espera">' +
                '<span class="notif__icone" aria-hidden="true">' +
                I('list-ordered') +
                '</span>' +
                '<span class="item__corpo"><span class="item__titulo" style="display:block">' +
                A.esc(esp(m.esp).nome) +
                ' · ' +
                A.esc(m.nome) +
                '</span>' +
                '<span class="item__sub" style="display:block">Você está na posição ' +
                e.posicao +
                ' da fila</span></span>' +
                I('chevron-right', 'item__seta') +
                '</a></section>';
        }
        html += '</div>'; /* fecha a coluna do assistente, com ou sem fila */
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
                A.esc(esp(m.esp).nome) +
                '</span><span class="selo selo--menta">' +
                cap(A.relativo(prox.data)) +
                '</span></span>' +
                '<span class="consulta-cartao__medico">' +
                A.esc(m.nome) +
                '</span>' +
                '<span class="meta">' +
                I('clock') +
                '<span class="num">' +
                prox.hora +
                '</span>' +
                (prox.sala ? ' · ' + A.esc(prox.sala) : '') +
                '</span>' +
                '<span class="pessoa-chip">' +
                A.avatar(p, 30) +
                'Para ' +
                (ehTitular(p) ? 'você' : A.esc(p.tratamento)) +
                '</span>' +
                '</span></a></section>';
        } else {
            html +=
                '<section class="grupo" aria-labelledby="t-prox-ini">' +
                cabecaSecao('Próxima consulta') +
                '<p class="cartao">Nenhuma consulta marcada. Conte ao assistente o que está sentindo, ou toque em “Marcar consulta”.</p></section>';
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
                        A.esc(p.curto) +
                        (ehTitular(p) ? ' (você)' : '') +
                        '</span>' +
                        '<span class="pessoa-linha__rel" style="display:block">' +
                        A.esc(p.relacao) +
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

    /* ─── Assistente: as mesmas regras do celular (triagem.js), para o alerta de emergência nunca ser diferente ─── */
    const analisar = (texto) => window.TRIAGEM.analisar(texto);

    function respostaHTML(r) {
        if (r.tipo === 'emergencia') {
            return (
                '<div class="emergencia" role="alert">' +
                '<p class="emergencia__titulo">' +
                I('triangle-alert') +
                ' Isso pode ser uma emergência</p>' +
                '<p>Dor no peito, falta de ar, desmaio ou fraqueza de um lado do corpo precisam de atendimento <b>agora</b>. Não espere por uma consulta.</p>' +
                '<a href="tel:192">' +
                I('phone') +
                ' Ligar 192 (SAMU)</a></div>'
            );
        }
        if (r.tipo === 'cvv') {
            return (
                '<div class="emergencia" role="alert">' +
                '<p class="emergencia__titulo">' +
                I('heart-pulse') +
                ' Você não precisa passar por isso só</p>' +
                '<p>Converse agora com alguém do CVV, de graça, 24 horas por dia. Se houver risco imediato, ligue para o SAMU.</p>' +
                '<a href="tel:188">' +
                I('phone') +
                ' Ligar 188 (CVV)</a> ' +
                '<a href="tel:192">' +
                I('phone') +
                ' Ligar 192 (SAMU)</a></div>'
            );
        }
        return window.TRIAGEM.sugestaoHTML(r, { A, I, ligarClinica, adicionar: '#adicionar-familiar', balao: ' style="max-width:none"' });
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

    /* "1 retorno e 2 exames para acompanhar" contado a partir da API */
    function textoAcompanhamento() {
        const r = D.acompanhamento.retornos.length, x = D.acompanhamento.exames.length;
        if (!r && !x) return 'Nada para acompanhar agora';
        const partes = [];
        if (r) partes.push(r + (r === 1 ? ' retorno' : ' retornos'));
        if (x) partes.push(x + (x === 1 ? ' exame' : ' exames'));
        return partes.join(' e ') + ' para acompanhar';
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
            '<span class="item__sub" style="display:block">' + textoAcompanhamento() + '</span></span>' +
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
                        limites: [D.mes(-2), D.mes(6)],
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
                    cabecaSecao('Histórico') +
                    (passadas.length
                        ? passadas.map((c) => linhaConsulta(c, true)).join('')
                        : '<p class="cartao">Nenhuma consulta no histórico.</p>') +
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
                D.pessoas.length === 1
                    ? 'Por enquanto, só você. Adicione quem você cuida para marcar consultas para essas pessoas.'
                    : 'Você cuida das consultas de ' + D.pessoas.length + ' pessoas.',
            ) +
            '<div class="cartao lista-cartao">' +
            D.pessoas
                .map((p) => {
                    const c = proximas().find((k) => A.mesmoId(k.pessoa, p.id));
                    return (
                        '<a class="pessoa-linha" href="#pessoa/' +
                        p.id +
                        '">' +
                        A.avatar(p, 56) +
                        '<span class="item__corpo"><span class="pessoa-linha__nome" style="display:block">' +
                        A.esc(p.curto) +
                        (ehTitular(p) ? ' (você)' : '') +
                        '</span>' +
                        '<span class="pessoa-linha__rel" style="display:block">' +
                        A.esc(p.relacao) +
                        ' · ' +
                        p.idade +
                        ' anos</span>' +
                        '<span class="pessoa-linha__prox">' +
                        (c
                            ? I('calendar-days') +
                              A.esc(esp(medico(c.medico).esp).nome) +
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
        const consultas = proximas().filter((c) => A.mesmoId(c.pessoa, p.id));
        const lembretes = [];
        D.prevencao.forEach((mes) =>
            mes.itens.forEach((it) => {
                if (A.mesmoId(it.pessoa, p.id)) lembretes.push({ mes, it });
            }),
        );
        const espPadrao = espPadraoPara(p);
        const retornos = D.acompanhamento.retornos.filter(
            (r) => A.mesmoId(r.pessoa, p.id),
        );
        /* F28: exame pedido pelo médico só é "pendente" ou "realizado" */
        const exames = D.acompanhamento.exames.filter(
            (x) => A.mesmoId(x.pessoa, p.id) && x.status === 'pendente',
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
            (ehTitular(p) ? 'mim' : A.esc(p.curto)) +
            '</a></div>' +
            '</div>' +
            '<div>' +
            (retornos.length || exames.length
                ? '<div class="grupo">' +
                  cabecaSecao('Retornos e exames') +
                  '<div class="cartao lista-cartao">' +
                  retornos
                      .map(
                          (r) =>
                              '<div class="prev-item"><div class="item__corpo"><p class="prev-item__titulo">' +
                              A.esc(r.titulo) +
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
                              A.esc(x.titulo) +
                              '</p>' +
                              '<div class="prev-item__acao">' +
                              ligarClinica('Ligar para marcar') +
                              '</div></div></div>',
                      )
                      .join('') +
                  '</div></div>'
                : '') +
            '<dl class="cartao lista-cartao ficha grupo">' +
            '<div><dt>Parentesco</dt><dd>' +
            A.esc(p.relacao) +
            '</dd></div>' +
            '<div><dt>Nascimento</dt><dd>' +
            (p.nascimento ? A.extenso(p.nascimento, false) + ' de ' + p.nascimento.slice(0, 4) : '—') +
            '</dd></div>' +
            '<div><dt>CPF</dt><dd>' +
            (p.cpf ? A.esc(API.formatarCPF(p.cpf)) : '—') +
            '</dd></div>' +
            '<div><dt>Alergias</dt><dd>' +
            A.esc(p.alergias) +
            '</dd></div>' +
            '</dl>' +
            '<a class="botao botao--secundario botao--largo" style="margin-top:12px" href="#editar-familiar/' +
            p.id +
            '">' +
            I('user-round') +
            'Editar dados</a>' +
            '</div></div>';

        return { titulo: p.curto, html };
    }

    /* Prevenção: a mesma tela do app (prevencao-tela.js) */
    function renderPrevencao() {
        const op = { titulo: tituloPagina, estado, abrirGaveta, fecharGaveta, anunciar };
        return { titulo: 'Prevenção', html: PREVENCAO_TELA.html(op), montar: (el) => PREVENCAO_TELA.montar(el, op) };
    }

    function renderAcompanhamento() {
        const ac = D.acompanhamento;
        const html =
            tituloPagina('Depois da consulta', 'Retornos e exames pedidos pelo médico.') +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div class="grupo">' +
            cabecaSecao('Retornos') +
            (ac.retornos.length
                ? '<div class="cartao lista-cartao">' +
                  ac.retornos
                      .map((r) => {
                          const p = pessoa(r.pessoa);
                          return (
                              '<div class="prev-item">' +
                              A.avatar(p, 40) +
                              '<div class="item__corpo"><p class="prev-item__titulo">' +
                              A.esc(r.titulo) +
                              '</p>' +
                              '<p class="prev-item__nota">' +
                              A.esc(p.curto) +
                              ' · com ' +
                              A.esc(medico(r.medico).nome) +
                              '<br>' +
                              A.esc(r.origem) +
                              (r.prazo ? '. Dia ' + A.extenso(r.prazo, false) : '') +
                              '.</p>' +
                              '<div class="prev-item__acao">' +
                              seloPrazo(r.prazo) +
                              ligarClinica('Ligar para a clínica') +
                              '</div></div></div>'
                          );
                      })
                      .join('') +
                  '</div>'
                : '<p class="cartao" style="padding:16px 20px">Nenhum retorno para marcar.</p>') +
            '</div>' +
            '<div class="grupo">' +
            cabecaSecao('Exames pedidos') +
            (ac.exames.length
                ? '<div class="cartao lista-cartao">' +
                  /* F28: o exame só é "pendente" ou "realizado"; a recepção marca o realizado */
                  ac.exames
                      .map((x) => {
                          const p = pessoa(x.pessoa);
                          return (
                              '<div class="prev-item">' +
                              A.avatar(p, 40) +
                              '<div class="item__corpo"><p class="prev-item__titulo">' +
                              A.esc(x.titulo) +
                              '</p>' +
                              '<p class="prev-item__nota">' +
                              A.esc(p.curto) +
                              (x.pedidoPor ? ' · pedido por ' + A.esc(medico(x.pedidoPor).nome) : '') +
                              '<br>' +
                              A.esc(x.obs) +
                              '.</p>' +
                              '<div class="prev-item__acao"><span class="selo selo--alerta">Exame pendente</span>' +
                              ligarClinica('Ligar para marcar') +
                              '</div></div></div>'
                          );
                      })
                      .join('') +
                  '</div>'
                : '<p class="cartao" style="padding:16px 20px">Nenhum exame pendente.</p>') +
            '</div></div>';

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
            A.esc(t.nome) +
            '</span>' +
            '<span class="item__sub" style="display:block" id="conta-email">' +
            A.esc(API.usuarioAtual().email || '') +
            '</span></span></div>' +
            '<div class="grupo">' +
            cabecaSecao('Seus dados') +
            '<dl class="cartao lista-cartao ficha" id="conta-dados" aria-busy="true"><div><dt>Carregando</dt><dd>…</dd></div></dl></div>' +
            '<div class="grupo">' +
            cabecaSecao('Sua clínica') +
            '<div class="cartao item" style="padding:16px">' +
            '<span class="item__corpo"><span class="item__titulo" style="display:block">' +
            A.esc(D.clinica.nome) +
            '</span><span class="item__sub" style="display:block">' +
            A.esc(D.clinica.endereco) +
            (D.clinica.telefone ? ' · ' + A.esc(D.clinica.telefone) : '') +
            '</span></span>' +
            '<a class="botao botao--secundario" href="escolher-clinica.html">Trocar de clínica</a></div></div>' +
            '</div>' +
            '<div>' +
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
                'Desativa os efeitos de transição. A página também segue a opção do seu computador.',
                reduzido,
            ) +
            '</div></div></div>' +
            '<div class="grupo">' +
            cabecaSecao('Trocar a senha') +
            '<form class="cartao formulario" id="form-senha" novalidate style="padding:16px 20px">' +
            '<div class="campo"><label for="s-atual">Senha atual</label><input id="s-atual" type="password" autocomplete="current-password"></div>' +
            '<div class="campo"><label for="s-nova">Nova senha</label><input id="s-nova" type="password" autocomplete="new-password"><span class="item__sub">De 8 a 64 caracteres.</span></div>' +
            '<div class="campo"><label for="s-repete">Repita a nova senha</label><input id="s-repete" type="password" autocomplete="new-password"></div>' +
            '<p class="campo__erro" id="s-erro" role="alert" hidden></p>' +
            '<button type="submit" class="botao botao--secundario">Trocar a senha</button></form></div>' +
            '</div></div>' +
            '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="sair">' +
            I('log-out') +
            'Sair da conta</button></div>';

        function montar(el) {
            /* L4: GET /api/pacientes/{id} → nome, CPF, e-mail, telefone e nascimento da conta */
            const dl = el.querySelector('#conta-dados');
            API.chamar('GET', '/api/pacientes/' + API.usuarioAtual().id)
                .then((c) => {
                    const tel = String(c.telefone || '').replace(/\D/g, '');
                    dl.innerHTML =
                        '<div><dt>Nome</dt><dd>' + A.esc(c.nome) + '</dd></div>' +
                        '<div><dt>E-mail</dt><dd>' + A.esc(c.email) + '</dd></div>' +
                        '<div><dt>Telefone</dt><dd>' + (tel ? '•••• ' + A.esc(tel.slice(-4)) : 'Não informado') + '</dd></div>' +
                        '<div><dt>CPF</dt><dd>' + A.esc(API.formatarCPF(c.cpf)) + '</dd></div>' +
                        '<div><dt>Nascimento</dt><dd>' + A.extenso(c.nascimento, false) + ' de ' + c.nascimento.slice(0, 4) + '</dd></div>';
                    el.querySelector('#conta-email').textContent = c.email;
                })
                .catch((e) => {
                    dl.innerHTML = '<div><dt>Seus dados</dt><dd>' + A.esc(e.message) + '</dd></div>';
                })
                .finally(() => dl.removeAttribute('aria-busy'));

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

            /* PUT /api/usuarios/{id}/senha { senhaAtual, novaSenha } */
            el.querySelector('#form-senha').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const erro = el.querySelector('#s-erro');
                const atual = el.querySelector('#s-atual').value;
                const nova = el.querySelector('#s-nova').value;
                const mostrar = (t2) => {
                    erro.textContent = t2;
                    erro.hidden = false;
                };
                erro.hidden = true;
                if (!atual) return mostrar('Digite a senha que você usa hoje.');
                if (nova.length < 8 || nova.length > 64) return mostrar('A nova senha precisa ter de 8 a 64 caracteres.');
                if (nova !== el.querySelector('#s-repete').value) return mostrar('As duas senhas novas não estão iguais.');
                try {
                    await API.trocarSenha(atual, nova);
                } catch (e) {
                    return mostrar(e.message);
                }
                ev.target.reset();
                aviso({ titulo: 'Senha trocada', texto: 'Use a nova senha no próximo login.', icone: 'check' });
            });

            el.querySelector('#sair').addEventListener('click', async () => {
                await window.API.sair();
                location.href = 'login.html';
            });
        }

        return { titulo: 'Perfil', html, montar };
    }

    function renderConsulta(id) {
        const c =
            D.consultas.find((k) => A.mesmoId(k.id, id)) ||
            D.passadas.find((k) => A.mesmoId(k.id, id));
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
            A.esc(esp(m.esp).nome) +
            '</span>' +
            '<span class="consulta-cartao__medico">' +
            A.esc(m.nome) +
            '</span>' +
            '<span class="pessoa-chip">' +
            A.avatar(p, 30) +
            'Para ' +
            (ehTitular(p) ? 'você' : A.esc(p.tratamento)) +
            '</span></span></div>' +
            '<dl class="cartao lista-cartao ficha">' +
            '<div><dt>Data</dt><dd>' +
            cap(A.extenso(c.data)) +
            '</dd></div>' +
            '<div><dt>Horário</dt><dd class="num">' +
            c.hora +
            '</dd></div>' +
            '<div><dt>Local</dt><dd>' +
            A.esc(D.clinica.nome) +
            (c.sala ? ', ' + A.esc(c.sala) : '') +
            '<br>' +
            A.esc(D.clinica.endereco) +
            '</dd></div>' +
            '<div><dt>Motivo</dt><dd>' +
            (c.motivo ? A.esc(c.motivo) : 'Não informado') +
            '</dd></div>' +
            '</dl>' +
            '</div>' +
            (!passada
                ? '<div class="gaveta__acoes" style="margin-top:20px">' +
                  '<a class="botao botao--secundario" href="tel:' +
                  A.esc(D.clinica.telefoneLink) +
                  '">' +
                  I('phone') +
                  'Ligar para a clínica ' +
                  A.esc(D.clinica.telefone) +
                  '</a></div>' +
                  '<p class="aviso-falta">' + I('info') + '<span>' + PACIENTE.textoDaRegra() + '</span></p>' +
                  '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="cancelar">Cancelar consulta</button><p>Cancelar até o fim do dia anterior não tem nenhuma consequência.</p></div>'
                : '');

        function montar(el) {
            const b = el.querySelector('#cancelar');
            if (!b) return;
            b.addEventListener('click', () => {
                const contaFalta = PACIENTE.vaiContarFalta(c);
                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Cancelar esta consulta?</h2>' +
                        '<p class="gaveta__texto">' +
                        A.esc(esp(m.esp).nome) +
                        ' com ' +
                        A.esc(m.nome) +
                        ', ' +
                        A.extenso(c.data) +
                        ', às ' +
                        c.hora +
                        '.</p>' +
                        (contaFalta
                            ? '<p class="aviso-regra aviso-regra--forte">' + I('info') + '<span>Hoje é o dia da consulta e você confirmou presença: cancelar agora conta como falta sem aviso.</span></p>'
                            : '<p class="gaveta__texto">Sem nenhuma consequência: o horário volta para quem precisa.</p>') +
                        '<p class="campo__erro" id="erro-cancelar" role="alert" hidden></p>' +
                        '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Manter consulta</button></div>' +
                        '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-cancelar">Sim, cancelar</button></div>',
                    {
                        montar: (g) =>
                            g
                                .querySelector('#confirmar-cancelar')
                                .addEventListener('click', async (ev) => {
                                    const botao = ev.currentTarget;
                                    botao.disabled = true;
                                    let r;
                                    try {
                                        r = await PACIENTE.cancelar(c); /* DELETE /api/consultas/{id} → { falta, oferecidoAFila } */
                                    } catch (e) {
                                        const erro = g.querySelector('#erro-cancelar');
                                        erro.textContent = e.message;
                                        erro.hidden = false;
                                        botao.disabled = false;
                                        return;
                                    }
                                    fecharGaveta();
                                    aviso({
                                        titulo: 'Consulta cancelada',
                                        texto:
                                            (r.falta ? 'Conta como falta sem aviso. ' : '') +
                                            (r.oferecidoAFila
                                                ? 'O horário foi oferecido a quem espera na lista.'
                                                : 'O horário ficou livre para outra pessoa.'),
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
        if (!e) {
            return {
                titulo: 'Lista de espera',
                html:
                    tituloPagina('Lista de espera') +
                    '<p class="cartao" style="padding:20px">Você não está em nenhuma fila agora. Quando não houver horário com o médico que você quer, toque em “Entrar na lista de espera” na tela de agendamento.</p>',
            };
        }
        const m = medico(e.medico);
        const p = pessoa(e.pessoa);
        const ord = String(e.posicao);
        const html =
            tituloPagina('Lista de espera', esp(m.esp).nome + ' · ' + m.nome) +
            (e.vaga
                ? '<div class="cartao" style="padding:16px 20px;margin-bottom:16px"><p><b>Abriu uma vaga para você!</b> ' +
                  A.extenso(e.vaga.data) +
                  ', às ' +
                  e.vaga.hora +
                  '.</p><button type="button" class="botao botao--principal" id="ver-vaga" style="margin-top:8px">Ver a vaga</button></div>'
                : '') +
            '<section class="espera-painel grupo" aria-labelledby="pos-frase">' +
            '<div class="espera-painel__linha"><span class="posicao" id="pos" aria-hidden="true">' +
            ord +
            '</span>' +
            '<p class="espera-painel__frase" id="pos-frase">' +
            (p && !ehTitular(p) ? A.esc(p.curto) + ' está' : 'Você está') +
            ' na posição <span id="pos-txt">' +
            ord +
            '</span><br>da fila</p></div>' +
            '<p class="espera-painel__detalhe"><b>' +
            A.esc(esp(m.esp).nome) +
            '</b> · ' +
            A.esc(m.nome) +
            '<br>Na fila desde ' +
            A.extenso(e.desde, false) +
            '</p>' +
            '<div id="fila-vis">' +
            filaHTML(e.posicao, e.naFila) +
            '</div>' +
            '</section>' +
            '<div class="grade grade--2" style="gap:24px;margin-top:24px;align-items:start">' +
            '<div class="grupo">' +
            '<ol class="passos cartao">' +
            '<li><span>Se alguém cancelar, a vaga vai para a primeira pessoa da fila.</span></li>' +
            '<li><span>O aviso aparece aqui, e você tem <b>30 minutos</b> para confirmar.</span></li>' +
            '<li><span>Se não confirmar a tempo, a vaga passa para a próxima pessoa.</span></li>' +
            '</ol></div>' +
            '<div class="grupo">' +
            '<div class="cartao" style="padding:16px 20px"><p><b>Como a vaga chega</b></p>' +
            '<p class="item__sub">Quando uma consulta com ' + A.esc(m.nome) + ' é cancelada, o horário é oferecido à 1ª pessoa da fila. Se for você, o aviso aparece no Início e aqui. A página confere a cada 30 segundos enquanto está aberta.</p></div>' +
            '<div class="zona-perigo" style="margin-top:16px"><button type="button" class="botao botao--texto-perigo" id="sair-fila">Sair da fila</button>' +
            '<p style="font-size:0.875rem;color:var(--tinta-2);margin-top:4px">Você perde a sua posição.</p></div>' +
            '</div></div>';

        function montar(el) {
            const vv = el.querySelector('#ver-vaga');
            if (vv) vv.addEventListener('click', abrirVaga);
            el.querySelector('#sair-fila').addEventListener('click', () => {
                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Sair da lista de espera?</h2>' +
                        '<p class="gaveta__texto">Você vai perder a posição ' +
                        e.posicao +
                        ' na fila. Se quiser voltar depois, entra no fim da fila.</p>' +
                        '<p class="campo__erro" id="erro-sair" role="alert" hidden></p>' +
                        '<div class="gaveta__acoes"><button type="button" class="botao botao--principal" data-fechar>Continuar na fila</button></div>' +
                        '<div class="gaveta__acoes" style="margin-top:28px"><button type="button" class="botao botao--texto-perigo" id="confirmar-sair">Sair da fila</button></div>',
                    {
                        montar: (g2) =>
                            g2.querySelector('#confirmar-sair').addEventListener('click', async (ev) => {
                                const b = ev.currentTarget;
                                b.disabled = true;
                                try {
                                    await PACIENTE.sairDaFila(); /* DELETE /api/lista-espera/{id} */
                                } catch (e2) {
                                    const x = g2.querySelector('#erro-sair');
                                    x.textContent = e2.message;
                                    x.hidden = false;
                                    b.disabled = false;
                                    return;
                                }
                                fecharGaveta();
                                aviso({ titulo: 'Você saiu da fila', texto: 'Sua posição passou para a próxima pessoa.', icone: 'info' });
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
        if (!e || !e.vaga) return;
        const m = medico(e.medico);
        const v = e.vaga;
        let timer = null;
        const fmt = (seg) =>
            Math.floor(seg / 60) +
            ' min ' +
            String(seg % 60).padStart(2, '0') +
            ' s';
        abrirGaveta(
            '<h2 class="gaveta__titulo" id="gaveta-titulo">Abriu uma vaga para você</h2>' +
                '<div class="gaveta__resumo">' +
                A.folha(v.data, { menta: true }) +
                '<div><b>' +
                A.esc(esp(m.esp).nome) +
                '</b><br>' +
                A.esc(m.nome) +
                '<br>' +
                cap(A.extenso(v.data)) +
                ', às <span class="num">' +
                v.hora +
                '</span></div></div>' +
                '<p class="contagem">' +
                I('clock') +
                '<span>Confirme em até <b class="num" id="contagem">' +
                fmt(PACIENTE.segundosDaVaga()) +
                '</b></span></p>' +
                '<p class="campo__erro" id="erro-vaga" role="alert" hidden></p>' +
                '<div class="gaveta__acoes"><button type="button" class="botao botao--principal botao--largo" id="vaga-sim">Confirmar vaga</button></div>' +
                '<div class="gaveta__recusa" id="recusa"><button type="button" class="botao botao--texto-perigo" id="vaga-nao">Não quero esta vaga</button><p>A vaga vai para a próxima pessoa da fila, e você sai da lista de espera.</p></div>',
            {
                montar: (g) => {
                    const saida = g.querySelector('#contagem');
                    const erro = (texto) => {
                        const x = g.querySelector('#erro-vaga');
                        x.textContent = texto;
                        x.hidden = false;
                    };
                    /* a contagem usa o prazo da API (expiraEm): reabrir a gaveta não zera o tempo */
                    timer = setInterval(() => {
                        if (!saida.isConnected) {
                            clearInterval(timer);
                            return;
                        }
                        const resta = PACIENTE.segundosDaVaga();
                        saida.textContent = fmt(resta);
                        if (resta <= 0) {
                            clearInterval(timer);
                            g.querySelector('#vaga-sim').disabled = true;
                            erro('O prazo terminou. Você saiu da lista de espera; se quiser, entre de novo.');
                            PACIENTE.carregar().then(() => { if (estado.calAtivo) estado.calAtivo.atualizar(); }).catch(() => {});
                        }
                    }, 1000);
                    g.querySelector('#vaga-sim').addEventListener('click', async (ev) => {
                        const b = ev.currentTarget;
                        b.disabled = true;
                        try {
                            const c = await PACIENTE.responderVaga(true); /* PUT /api/lista-espera/{id}/vaga { aceitar: true } */
                            clearInterval(timer);
                            fecharGaveta(true);
                            if (estado.calAtivo) estado.calAtivo.atualizar();
                            sucessoConsulta(c, 'Vaga confirmada!');
                        } catch (e2) {
                            b.disabled = false;
                            erro(e2.message);
                        }
                    });
                    g.querySelector('#vaga-nao').addEventListener('click', async () => {
                        try {
                            await PACIENTE.responderVaga(false); /* PUT /api/lista-espera/{id}/vaga { aceitar: false } */
                        } catch (e2) {
                            erro(e2.message);
                            return;
                        }
                        clearInterval(timer);
                        fecharGaveta();
                        if (estado.calAtivo) estado.calAtivo.atualizar();
                        aviso({ titulo: 'Vaga recusada', texto: 'Você saiu da lista de espera; se quiser, entre de novo.', icone: 'info' });
                        navegar();
                    });
                },
            },
        );
    }

    function oferecerVaga() {
        const e = D.espera;
        if (!e || !e.vaga) return;
        const m = medico(e.medico);
        if (estado.calAtivo) estado.calAtivo.atualizar();
        aviso({
            cabeca: 'AgendaPro Saúde · agora',
            titulo: 'Abriu uma vaga para você!',
            texto: esp(m.esp).nome + ' com ' + m.nome + ', ' + A.extenso(e.vaga.data) + ', às ' + e.vaga.hora + '. Confirme em até 30 minutos.',
            icone: 'bell-ring',
            acoes: [
                { rotulo: 'Confirmar', classe: 'botao--principal', acao: abrirVaga },
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
        abrirGaveta(
            '<div class="carimbo-palco" aria-hidden="true">' +
                A.folha(c.data) +
                '<span class="carimbo">Marcada</span></div>' +
                '<h2 class="gaveta__titulo" id="gaveta-titulo" style="text-align:center">' +
                A.esc(titulo || 'Consulta marcada!') +
                '</h2>' +
                '<div class="gaveta__resumo"><div><b>' +
                cap(A.extenso(c.data)) +
                ', às <span class="num">' +
                c.hora +
                '</span></b><br>' +
                A.esc(esp(m.esp).nome) +
                ' com ' +
                A.esc(m.nome) +
                '<br>' +
                A.esc(D.clinica.nome) +
                (c.sala ? ' · ' + A.esc(c.sala) : '') +
                '<br>Para ' +
                (ehTitular(p) ? 'você' : A.esc(p.tratamento)) +
                '</div></div>' +
                '<p class="gaveta__texto">Na véspera, esta página pede para você confirmar a presença. Se não puder ir, cancele pela Agenda.</p>' +
                '<div class="gaveta__acoes">' +
                '<button type="button" class="botao botao--principal" data-ver-carimbo="' +
                c.data +
                '">' +
                I('calendar-days') +
                'Ver no calendário</button>' +
                '<button type="button" class="botao botao--secundario" data-ir-inicio>Voltar ao início</button></div>',
            {
                montar: (g) => {
                    g.querySelector('[data-ver-carimbo]').addEventListener('click', () => {
                        estado.agendaAba = 'calendario';
                        estado.pendente = { tipo: 'carimbo', data: c.data };
                        fecharGaveta();
                        navegar('#agenda');
                    });
                    g.querySelector('[data-ir-inicio]').addEventListener('click', () => {
                        fecharGaveta();
                        navegar('#inicio');
                    });
                },
            },
        );
    }

    /* itemId: o item de prevenção que esta consulta resolve (vem do "Marcar" da Prevenção) */
    function renderAgendar(espId, pessoaId, itemId) {
        const ids = Object.keys(D.especialidades);
        if (!ids.length) {
            return {
                titulo: 'Marcar consulta',
                html:
                    tituloPagina('Marcar consulta', null) +
                    '<p class="cartao" style="padding:20px">A clínica ainda não cadastrou especialidades. Para marcar agora, ligue para a recepção: ' +
                    A.esc(D.clinica.telefone) +
                    '.</p>',
            };
        }
        const alvo = pessoa(pessoaId);
        const espAtual = D.especialidades[espId] ? espId : espPadraoPara(alvo || pessoa(D.titular));
        const espObj = esp(espAtual);
        const pediatria = PACIENTE.ehPediatria(espObj.nome);
        /* a pediatria (reconhecida pelo nome) atende só menores de 18 anos */
        const elegivel = (p) => !pediatria || (p.idade !== null && p.idade < 18);
        const medicos = D.medicos.filter((m) => A.mesmoId(m.esp, espAtual));
        const pessoaAtiva = (alvo && elegivel(alvo) ? alvo : D.pessoas.find(elegivel) || pessoa(D.titular)).id;
        /* faltas sem aviso podem limitar o agendamento direto (o assistente e o 192 nunca são bloqueados) */
        const restricao = PACIENTE.avisoDeRestricao();

        function seletorEspecialidade() {
            return (
                '<div class="campo" style="max-width:420px;margin-bottom:16px"><label for="f-esp">Especialidade</label>' +
                '<select id="f-esp">' +
                ids
                    .map((k) => '<option value="' + k + '"' + (A.mesmoId(k, espAtual) ? ' selected' : '') + '>' + A.esc(D.especialidades[k].nome) + '</option>')
                    .join('') +
                '</select></div>'
            );
        }

        function seletor(pAtiva) {
            return (
                '<div class="filtros" role="group" aria-label="Para quem?" id="filtro-pessoa">' +
                D.pessoas
                    .map((p) => {
                        const ok = elegivel(p);
                        return (
                            '<button type="button" class="filtro" aria-pressed="' +
                            A.mesmoId(p.id, pAtiva) +
                            '" data-pessoa="' +
                            p.id +
                            '"' +
                            (ok ? '' : ' disabled title="Fora da idade da pediatria"') +
                            '>' +
                            A.avatar(p, 28) +
                            A.esc(nomeCurto(p)) +
                            (ok ? '' : ' (fora da idade)') +
                            '</button>'
                        );
                    })
                    .join('') +
                '</div>' +
                (pediatria ? '<p style="margin:8px 0 0;color:var(--tinta-2)">A pediatria atende crianças e adolescentes até 18 anos.</p>' : '')
            );
        }

        function listaMedicos(pAtiva) {
            if (!medicos.length) {
                return '<p class="cartao" style="padding:20px">Ainda não há médico com agenda nesta especialidade. Ligue para a clínica: ' + A.esc(D.clinica.telefone) + '.</p>';
            }
            return medicos
                .map((m) => {
                    const horarios = D.horarios[m.id] || [];
                    const naFila = D.espera && A.mesmoId(D.espera.medico, m.id);
                    const botaoFila = naFila
                        ? 'Você já está na fila deste médico: <a href="#espera">posição ' + D.espera.posicao + '</a>'
                        : '<button type="button" class="botao botao--menta botao--pequeno" data-fila="' + m.id + '">' + I('list-ordered') + 'Entrar na lista de espera</button>';
                    const slotsHTML = restricao && restricao.tipo === 'so_recepcao'
                        ? '<span style="font-size:0.875rem;color:var(--tinta-2)">Agende pela recepção da clínica.</span>'
                        : restricao
                        ? '<span style="font-size:0.875rem;color:var(--tinta-2)">Agendamento direto indisponível por enquanto. ' + botaoFila + '</span>'
                        : horarios.length
                        ? horarios
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
                                              '" aria-label="' +
                                              A.esc(A.extenso(bloco.data) + ' às ' + h + ' com ' + m.nome) +
                                              '">' +
                                              A.curto(bloco.data) +
                                              ' ' +
                                              h +
                                              '</button>',
                                      )
                                      .join(''),
                              )
                              .join('')
                        : '<span style="font-size:0.875rem;color:var(--tinta-2)">Sem horários livres agora. ' + botaoFila + '</span>';
                    return (
                        '<div class="cartao" style="padding:16px;margin-bottom:12px">' +
                        '<div class="medico-cabeca">' +
                        A.avatarMedico(m, 40) +
                        '<span><strong style="display:block">' +
                        A.esc(m.nome) +
                        '</strong><span style="font-size:0.875rem;color:var(--tinta-2)">' +
                        A.esc(espObj.nome) +
                        (m.sala ? ' · ' + A.esc(m.sala) : '') +
                        '</span></span>' +
                        '</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
                        slotsHTML +
                        '</div>' +
                        '</div>'
                    );
                })
                .join('');
        }

        const titulo = 'Marcar consulta de ' + espObj.nome;
        let html =
            tituloPagina(titulo, null) +
            seletorEspecialidade() +
            (restricao ? restricaoHTML(restricao) : '') +
            '<p style="margin:0 0 12px;color:var(--tinta-2)">' + PACIENTE.textoDasFaltas() + '</p>' +
            seletor(pessoaAtiva) +
            '<div id="lista-medicos" style="margin-top:16px">' +
            listaMedicos(pessoaAtiva) +
            '</div>';

        function montar(el) {
            let pAtiva = pessoaAtiva;

            el.querySelector('#f-esp').addEventListener('change', (ev) => {
                navegar('#agendar/' + ev.target.value + '/' + pAtiva + (itemId ? '/' + itemId : ''));
            });

            el.querySelector('#filtro-pessoa').addEventListener('click', (ev) => {
                const b = ev.target.closest('[data-pessoa]');
                if (!b || b.disabled) return;
                pAtiva = b.dataset.pessoa;
                el.querySelectorAll('#filtro-pessoa [data-pessoa]').forEach((x) =>
                    x.setAttribute('aria-pressed', String(x.dataset.pessoa === pAtiva)),
                );
            });

            el.addEventListener('click', async (ev) => {
                const bf = ev.target.closest('[data-fila]');
                if (bf) {
                    const m = medico(bf.dataset.fila);
                    bf.disabled = true;
                    try {
                        const fila = await PACIENTE.entrarNaFila(pAtiva, m.id); /* POST /api/lista-espera { pessoa, medico } */
                        navegar();
                        aviso({ titulo: 'Você entrou na fila', texto: 'Posição ' + fila.posicao + ' na fila de ' + m.nome + '. Quando abrir uma vaga e for a sua vez, o aviso aparece aqui e você tem 30 minutos para confirmar.', icone: 'list-ordered' });
                    } catch (e) {
                        bf.disabled = false;
                        aviso({ titulo: 'Não deu para entrar na fila', texto: e.message, icone: 'info' });
                    }
                    return;
                }
                const chip = ev.target.closest('.chip-horario');
                if (!chip) return;
                const mId = chip.dataset.medico;
                const data = chip.dataset.data;
                const hora = chip.dataset.hora;
                const m = medico(mId);
                const p = pessoa(pAtiva);
                /* marcada a partir da Prevenção: a consulta fica ligada ao item */
                const itemPrev = itemId ? PACIENTE.itemPrevencao(itemId) : null;

                abrirGaveta(
                    '<h2 class="gaveta__titulo" id="gaveta-titulo">Confirmar agendamento</h2>' +
                        '<div class="gaveta__resumo">' +
                        A.folha(data, { menta: true }) +
                        '<div><b>' +
                        A.esc(espObj.nome) +
                        '</b><br>' +
                        A.esc(m.nome) +
                        '<br>' +
                        cap(A.extenso(data)) +
                        ', às <span class="num">' +
                        hora +
                        '</span></div>' +
                        '</div>' +
                        '<p style="margin:0 0 16px;font-size:0.9375rem">' +
                        I('user-round') +
                        ' Para: <strong>' +
                        (ehTitular(p) ? 'Você' : A.esc(p.nome)) +
                        '</strong></p>' +
                        (itemPrev ? '' : '<div class="campo"><label for="f-motivo">Motivo (opcional)</label><input id="f-motivo" type="text" maxlength="500" placeholder="Ex.: dor de garganta há 3 dias"></div>') +
                        '<p class="aviso-regra">' + I('info') + '<span>' + PACIENTE.textoDaRegra() + '</span></p>' +
                        '<p class="campo__erro" id="erro-ag" role="alert" hidden></p>' +
                        '<div class="gaveta__acoes">' +
                        '<button type="button" class="botao botao--principal" id="confirmar-ag">Confirmar consulta</button>' +
                        '<button type="button" class="botao botao--secundario" data-fechar>Cancelar</button>' +
                        '</div>',
                    {
                        montar: (g) => {
                            g.querySelector('#confirmar-ag').addEventListener('click', async (ev2) => {
                                const b = ev2.currentTarget;
                                if (b.disabled) return;
                                b.disabled = true;
                                b.textContent = 'Marcando…';
                                const motivo = g.querySelector('#f-motivo');
                                try {
                                    const c = await PACIENTE.marcar({
                                        pessoa: pAtiva, medico: mId, data, hora,
                                        motivo: itemPrev ? itemPrev.titulo : motivo && motivo.value.trim() ? motivo.value.trim() : null,
                                        itemPrevencao: itemPrev ? itemPrev.id : null,
                                    });
                                    fecharGaveta(true);
                                    sucessoConsulta(c, 'Consulta marcada!');
                                } catch (e) {
                                    /* outra pessoa pode ter marcado este horário agora há pouco (erro 50008) */
                                    const erro = g.querySelector('#erro-ag');
                                    erro.textContent = e.message;
                                    erro.hidden = false;
                                    b.textContent = 'Confirmar consulta';
                                    try { await PACIENTE.carregar(); } catch (e2) { /* a mensagem já explica */ }
                                    el.querySelector('#lista-medicos').innerHTML = listaMedicos(pAtiva);
                                    anunciar(e.message);
                                }
                            });
                        },
                    },
                );
            });
        }

        return { titulo, html, montar };
    }

    /* Adicionar (#adicionar-familiar) ou editar (#editar-familiar/{id}) alguém da família, pela API.
       Os erros da API (como "Este CPF já está cadastrado.") aparecem no campo certo. */
    function renderAdicionarFamiliar(idEditar) {
        const CORES = PACIENTE.CORES_FAMILIA;
        const p = idEditar ? pessoa(idEditar) : null;
        const editar = !!p;
        const titular = editar && p.titular;
        const dataBr = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
        const corAtual = editar ? String(p.cor || '').toUpperCase() : CORES[D.pessoas.length % CORES.length];
        const val = (v) => (v ? ' value="' + A.esc(v) + '"' : '');

        const html =
            tituloPagina(
                editar ? 'Editar dados de ' + p.curto : 'Adicionar familiar',
                editar ? 'As mudanças aparecem em todas as consultas.' : 'Preencha os dados e a pessoa aparecerá em todas as consultas.',
            ) +
            '<div class="grade grade--2" style="gap:24px;align-items:start">' +
            '<div>' +
            '<form id="form-familiar" class="formulario" novalidate>' +
            '<div class="campo" id="c-nome"><label for="f-nome">Nome completo</label>' +
            '<input id="f-nome" type="text" autocomplete="off" placeholder="Ex.: Ana Beatriz Santos" required' + val(editar && p.nome) + '></div>' +
            '<div class="campo" id="c-cpf"><label for="f-cpf">CPF</label>' +
            '<input id="f-cpf" type="text" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14" required' + val(editar && API.formatarCPF(p.cpf)) + '></div>' +
            (titular
                ? ''
                : '<div class="campo" id="c-rel"><span class="campo__rotulo" id="f-rel-label">Parentesco (obrigatório)</span>' +
                  '<div class="opcoes" role="radiogroup" aria-labelledby="f-rel-label" aria-required="true">' +
                  PACIENTE.PARENTESCOS.map(
                      (o) => '<button type="button" role="radio" aria-checked="' + (editar && p.relacao === o) + '">' + A.esc(o) + '</button>',
                  ).join('') +
                  '</div></div>') +
            '<div class="campo" id="c-nasc"><label for="f-nasc">Data de nascimento</label>' +
            '<input id="f-nasc" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" required' + val(editar && dataBr(p.nascimento)) + '></div>' +
            '<div class="campo"><label for="f-alergias">Alergias (opcional)</label>' +
            '<input id="f-alergias" type="text" placeholder="Ex.: Penicilina, dipirona"' + val(editar && p.alergiasApi) + '></div>' +
            '<p class="campo__erro" id="f-erro-geral" role="alert" hidden></p>' +
            '<div class="gaveta__acoes">' +
            '<button type="submit" class="botao botao--principal">' + (editar ? 'Salvar' : 'Adicionar familiar') + '</button>' +
            '<a class="botao botao--secundario" href="' + (editar ? '#pessoa/' + p.id : '#familia') + '">Cancelar</a>' +
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
                    (cor === corAtual) +
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
            let corSelecionada = editar ? p.cor : corAtual;
            /* máscara do CPF: só números, no formato 000.000.000-00 */
            const cpf = el.querySelector('#f-cpf');
            cpf.addEventListener('input', () => { cpf.value = API.formatarCPF(cpf.value); });

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

            const form = el.querySelector('#form-familiar');
            const botao = form.querySelector('[type="submit"]');
            form.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const relBtn = el.querySelector('.opcoes [aria-checked="true"]');
                const dados = {
                    nome: el.querySelector('#f-nome').value,
                    cpf: cpf.value,
                    relacao: titular ? 'Titular' : relBtn ? relBtn.textContent.trim() : '',
                    nascimento: el.querySelector('#f-nasc').value,
                    alergias: el.querySelector('#f-alergias').value,
                    cor: corSelecionada,
                };
                el.querySelectorAll('.campo .campo__erro').forEach((x) => x.remove());
                const geral = el.querySelector('#f-erro-geral');
                geral.hidden = true;
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
                const mostrarErro = (campo, texto) => {
                    const c = el.querySelector(campo);
                    if (texto && c) c.insertAdjacentHTML('beforeend', '<p class="campo__erro" role="alert">' + A.esc(texto) + '</p>');
                };
                if (!r.familiar) {
                    mostrarErro('#c-nome', r.erros.nome);
                    mostrarErro('#c-cpf', r.erros.cpf);
                    mostrarErro('#c-rel', r.erros.relacao);
                    mostrarErro('#c-nasc', r.erros.nascimento);
                    if (r.erros.nome) el.querySelector('#f-nome').focus();
                    else if (r.erros.cpf) cpf.focus();
                    else if (r.erros.relacao) el.querySelector('#c-rel [role="radio"]').focus();
                    else el.querySelector('#f-nasc').focus();
                    return;
                }
                navegar(editar ? '#pessoa/' + p.id : '#familia');
                setTimeout(() => {
                    aviso(editar
                        ? { titulo: 'Dados salvos', texto: 'As mudanças já aparecem em todas as telas.', icone: 'check' }
                        : { titulo: r.familiar.curto + ' agora está na família', texto: 'Você já pode marcar consultas para esta pessoa.', icone: 'users' });
                }, 100);
            });
        }

        return { titulo: editar ? 'Editar dados' : 'Adicionar familiar', html, montar };
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
        'editar-familiar': renderAdicionarFamiliar,
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
            A.esc(o.titulo) +
            '</p>' +
            (o.texto ? '<p class="aviso__texto">' + A.esc(o.texto) + '</p>' : '') + /* texto puro: pode ter nome ou mensagem da API */
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
    A.seloClinica(document.querySelector('.lateral'), 'paciente', { href: 'escolher-clinica.html' });
    navegar();

    /* Avisos do Início: PUT /api/pacientes/{id}/notificacoes/lidas */
    document.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-ler-avisos]');
        if (!b) return;
        b.disabled = true;
        PACIENTE.lerTodosAvisos()
            .then(() => { anunciar('Avisos marcados como lidos'); navegar(); })
            .catch((e) => { b.disabled = false; aviso({ titulo: 'Não deu para marcar', texto: e.message, icone: 'info' }); });
    });

    /* "Vou" / "Não vou" no cartão do Início */
    document.addEventListener('click', (ev) => {
        const vou = ev.target.closest('[data-vou]');
        const nao = ev.target.closest('[data-naovou]');
        if (!vou && !nao) return;
        const c = D.consultas.find((k) => A.mesmoId(k.id, vou ? vou.dataset.vou : nao.dataset.naovou));
        if (!c) return;
        (vou || nao).disabled = true;
        /* PUT /api/consultas/{id}/presenca { vou: true | false }; "Não vou" cancela pelas mesmas regras */
        (vou ? PACIENTE.confirmarPresenca(c) : PACIENTE.naoVou(c))
            .then((r) => {
                if (vou) aviso({ titulo: 'Presença confirmada', texto: 'A clínica já sabe que você vai. Se não puder mais ir, avise; cancelar no dia da consulta conta como falta.', icone: 'circle-check' });
                else aviso({
                    titulo: 'Consulta cancelada',
                    texto: (r.falta ? 'Conta como falta sem aviso. ' : 'Sem nenhuma consequência. ') +
                        (r.oferecidoAFila ? 'O horário foi oferecido a quem espera na lista.' : 'O horário ficou livre para outra pessoa.'),
                    icone: 'info',
                });
                navegar();
            })
            .catch((e) => {
                (vou || nao).disabled = false;
                aviso({ titulo: 'Não deu para responder', texto: e.message, icone: 'info' });
            });
    });

    /* vaga da lista de espera oferecida (antes de a página abrir, ou enquanto ela está aberta: PACIENTE confere a cada 30 s) */
    if (D.espera && D.espera.oferta) setTimeout(oferecerVaga, 600);
    PACIENTE.aoMudar((novaVaga) => {
        if (novaVaga) oferecerVaga();
        else if (/^#?(espera|inicio)?$/.test(location.hash.replace(/^#/, ''))) navegar();
        if (estado.calAtivo) estado.calAtivo.atualizar();
    });

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
});
