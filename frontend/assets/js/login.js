 (function () {
                'use strict';

                var A = window.AP;

                /* ─── Logo ─── */
                document
                    .querySelectorAll('[data-marca]')
                    .forEach(function (el) {
                        el.innerHTML = A.marca(Number(el.dataset.marca));
                    });

                /* ─── Contas de demonstração ─── */
                var CONTAS = {
                    paciente: {
                        email: 'juliana.santos@email.com',
                        senha: 'paciente123',
                        destino: 'paciente-desktop.html',
                    },
                    medico: {
                        email: 'paulo.menezes@clinicaipe.com.br',
                        senha: 'medico123',
                        destino: 'medico.html',
                    },
                    recepcao: {
                        email: 'recepcao@clinicaipe.com.br',
                        senha: 'recepcao123',
                        destino: 'clinica.html',
                    },
                };

                var emailEl = document.getElementById('email');
                var senhaEl = document.getElementById('senha');
                var formEl = document.getElementById('form-login');
                var btnEntrar = document.getElementById('btn-entrar');
                var erroGeral = document.getElementById('erro-geral');
                var erroGeralTexto =
                    document.getElementById('erro-geral-texto');
                var anunciador = document.getElementById('anunciador');

                function anunciar(texto) {
                    anunciador.textContent = '';
                    setTimeout(function () {
                        anunciador.textContent = texto;
                    }, 30);
                }

                /* ─── Toast ─── */
                var toastEl = document.getElementById('toast');
                var toastTimer;
                function toast(texto) {
                    clearTimeout(toastTimer);
                    toastEl.textContent = texto;
                    toastEl.classList.add('toast-acesso--visivel');
                    toastTimer = setTimeout(function () {
                        toastEl.classList.remove('toast-acesso--visivel');
                    }, 3000);
                }

                /* ─── Fora do escopo ─── */
                document.querySelectorAll('[data-fora]').forEach(function (el) {
                    el.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        toast('Fora do escopo deste protótipo');
                        anunciar('Fora do escopo deste protótipo');
                    });
                });

                /* ─── Mostrar/ocultar senha ─── */
                var btnVer = document.getElementById('btn-ver-senha');
                btnVer.addEventListener('click', function () {
                    var visivel = senhaEl.type === 'text';
                    senhaEl.type = visivel ? 'password' : 'text';
                    btnVer.setAttribute(
                        'aria-label',
                        visivel ? 'Mostrar senha' : 'Ocultar senha',
                    );
                    btnVer.setAttribute(
                        'title',
                        visivel ? 'Mostrar senha' : 'Ocultar senha',
                    );
                    btnVer
                        .querySelector('use')
                        .setAttribute(
                            'href',
                            visivel ? '#i-eye' : '#i-eye-off',
                        );
                });

                /* ─── Manter conectado ─── */
                var manterEl = document.getElementById('manter');
                try {
                    manterEl.checked =
                        localStorage.getItem('agendapro.manter') === '1';
                } catch (e) {}
                manterEl.addEventListener('change', function () {
                    try {
                        localStorage.setItem(
                            'agendapro.manter',
                            manterEl.checked ? '1' : '0',
                        );
                    } catch (e) {}
                });

                /* ─── Validação ─── */
                function limparErros() {
                    document
                        .querySelectorAll('.campo__entrada--erro')
                        .forEach(function (el) {
                            el.classList.remove('campo__entrada--erro');
                        });
                    document
                        .querySelectorAll('.campo__erro')
                        .forEach(function (el) {
                            el.textContent = '';
                        });
                    erroGeral.classList.remove('erro-geral--visivel');
                }

                function mostrarErroCampo(inputId, msg) {
                    var input = document.getElementById(inputId);
                    var erro = document.getElementById('erro-' + inputId);
                    if (input) input.classList.add('campo__entrada--erro');
                    if (erro) erro.textContent = msg;
                }

                function mostrarErroGeral(msg) {
                    erroGeralTexto.textContent = msg;
                    erroGeral.classList.add('erro-geral--visivel');
                    anunciar(msg);
                }

                function validarEmail(valor) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
                }

                /* ─── Encontrar conta ─── */
                function encontrarConta(email) {
                    var chaves = Object.keys(CONTAS);
                    for (var i = 0; i < chaves.length; i++) {
                        if (
                            CONTAS[chaves[i]].email ===
                            email.toLowerCase().trim()
                        ) {
                            return CONTAS[chaves[i]];
                        }
                    }
                    return null;
                }

                /* ─── Submit ─── */
                formEl.addEventListener('submit', function (ev) {
                    ev.preventDefault();
                    limparErros();

                    var email = emailEl.value.trim();
                    var senha = senhaEl.value;
                    var valido = true;

                    if (!email) {
                        mostrarErroCampo('email', 'Informe seu e-mail.');
                        valido = false;
                    } else if (!validarEmail(email)) {
                        mostrarErroCampo(
                            'email',
                            'Formato de e-mail inválido.',
                        );
                        valido = false;
                    }

                    if (!senha) {
                        mostrarErroCampo('senha', 'Informe sua senha.');
                        valido = false;
                    }

                    if (!valido) {
                        anunciar('Corrija os campos destacados.');
                        return;
                    }

                    simularLogin({ email: email, senha: senha });
                });

                /* ─── Simular login (com feedback visual) ─── */
                function simularLogin(conta) {
                    btnEntrar.classList.add('btn--carregando');
                    btnEntrar.textContent = 'Entrando...';
                    anunciar('Verificando credenciais...');

                    window.API.entrar(conta.email, conta.senha)
                        .then(function (r) {
                            window.location.href = r.destino;
                        })
                        .catch(function (e) {
                            btnEntrar.classList.remove('btn--carregando');
                            btnEntrar.textContent = 'Entrar';
                            mostrarErroGeral(e.message);
                        });
                }

                /* ─── Demos ─── */
                document
                    .querySelectorAll('[data-demo]')
                    .forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            var perfil = btn.dataset.demo;
                            var conta = CONTAS[perfil];
                            if (!conta) return;

                            limparErros();
                            emailEl.value = conta.email;
                            senhaEl.value = conta.senha;
                            anunciar(
                                'Credenciais preenchidas para ' +
                                    perfil +
                                    '. Entrando...',
                            );

                            setTimeout(function () {
                                simularLogin(conta);
                            }, 300);
                        });
                    });

                /* ─── Mensagem de sucesso vindo do cadastro ─── */
                if (
                    new URLSearchParams(window.location.search).get(
                        'cadastro',
                    ) === 'ok'
                ) {
                    toast('Conta criada. Entre para continuar.');
                    anunciar(
                        'Conta criada com sucesso. Faça login para continuar.',
                    );
                    history.replaceState(null, '', 'login.html');
                }

                /* ─── Limpar erro ao digitar ─── */
                emailEl.addEventListener('input', function () {
                    emailEl.classList.remove('campo__entrada--erro');
                    document.getElementById('erro-email').textContent = '';
                });
                senhaEl.addEventListener('input', function () {
                    senhaEl.classList.remove('campo__entrada--erro');
                    document.getElementById('erro-senha').textContent = '';
                });
            })();