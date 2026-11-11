# AgendaPro Saúde: funções × endpoints da API

Situação em 10 de novembro de 2026 (revisada: confirmação de presença e faltas). Para cada função de serviço da web e do app: o endpoint que ela
usa ou vai usar e se ele **já existe** em `backend/`.

- **Existe:** o endpoint está em `backend/Controllers`.
- **Falta:** a função funciona hoje gravando no navegador (web, `localStorage`) ou na memória do
  app (Expo, `src/dados/`). Quando o endpoint existir, troca-se só o miolo da função por um `fetch`;
  as telas não mudam.

O backend atual tem apenas usuários, login e o módulo de reuniões (`ReunioesController`,
`ParticipantesController`), que não é usado pela área de saúde. Os valores de status que o banco
deve usar estão em [`aplicativo/docs/aplicativo-integracao-api.md`](../aplicativo/docs/aplicativo-integracao-api.md),
na seção "Status da consulta e estado do horário".

## Senha (ponto de troca)

| Onde | Hoje | Com a API |
|---|---|---|
| Web, `frontend/assets/js/api.js`, função `resumo()` (bloco "PONTO DE TROCA PARA A API") | A senha vira um resumo SHA-256 antes de ir para o `localStorage` | Apagar `resumo()` e mandar a senha como digitada, por HTTPS. O servidor faz `BCrypt.HashPassword` no cadastro e `BCrypt.Verify` no login (já é assim em `UsuariosController` e `AuthController`) |
| App, `src/servicos/autenticacao.js` | Já manda a senha como digitada | Nada a mudar |

## Web: contas, clínicas e sessão (`frontend/assets/js/api.js`)

| Função | Endpoint | Backend |
|---|---|---|
| `entrar(email, senha)` | `POST /api/auth/login` | **Existe.** Falta devolver `papel`, `clinicaId` e `medicoId` |
| `sair()` | `POST /api/auth/logout` (ou só apagar o token, com JWT) | Falta |
| `trocarSenha(atual, nova)` | `PUT /api/usuarios/{id}/senha` | Falta |
| `cadastrarPaciente(dados)` | `POST /api/pacientes` | **Parcial:** `POST /api/usuarios` existe, mas não guarda telefone, documento, nascimento nem papel |
| `cadastrarClinica(dados)` | `POST /api/clinicas` | Falta |
| `atualizarClinica(campos)` | `PUT /api/clinicas/{id}` | Falta |
| `listarEquipe()` | `GET /api/clinicas/{id}/equipe` | Falta |
| `cadastrarRecepcionista(dados)` | `POST /api/clinicas/{id}/equipe` | Falta |
| `removerDaEquipe(usuarioId)` | `DELETE /api/clinicas/{id}/equipe/{usuarioId}` | Falta |
| `buscarClinicas(termo)` | `GET /api/clinicas?busca=` | Falta |
| `clinicaPorCodigo(codigo)` | `GET /api/clinicas/codigo/{codigo}` | Falta |
| `vincularClinica(clinicaId)` | `POST /api/pacientes/{id}/clinicas` | Falta |
| `clinicasDoPaciente()` | `GET /api/pacientes/{id}/clinicas` | Falta |

## Web: agenda, médicos e lista de espera (`clinica-dados.js` e as telas da clínica)

| Função (arquivo) | Endpoint | Backend |
|---|---|---|
| `carregar()` (clinica-dados) | `GET /api/clinicas/{id}/agenda?de=&ate=` | Falta |
| `cancelarConsulta(k)` (clinica-dados) | `DELETE /api/consultas/{id}` | Falta |
| `oferecerHorario(h, nome)` (clinica-dados) | `POST /api/horarios/{id}/oferecer` | Falta |
| `ocuparHorario` / `liberarHorario` (clinica-dados) | dentro de `PUT /api/lista-espera/{id}/vaga` | Falta |
| `registrarFalta(k, motivo)` (clinica-dados; usada por clinica.js "Marcar falta" e medico.js) | `POST /api/consultas/{id}/falta` | Falta |
| `retirarFalta(id)` (pagina-pacientes.js, falta justificada) | `PUT /api/faltas/{id}/retirar` | Falta |
| `faltasDe(nomes)` / `restricaoDe(nomes)` (clinica-dados) | `GET /api/clinicas/{id}/faltas?paciente=` · `GET /api/pacientes/{id}/situacao` | Falta |
| `confirmarPresenca(k)` (clinica-dados) | `PUT /api/consultas/{id}/presenca` | Falta |
| `horariosLivres()` (clinica-dados, para o paciente) | `GET /api/especialidades/{id}/horarios-livres` (os mesmos horários `livre` da agenda) | Falta |
| `marcarChegada(k)` (clinica.js) | `PUT /api/consultas/{id}/status` `{ "status": "na_recepcao" }` | Falta |
| `remarcar(k, …)` (clinica.js) | `PUT /api/consultas/{id}` `{ medico, data, hora }` | Falta |
| marcar consulta (pagina-nova-consulta.js) | `POST /api/consultas` | Falta |
| `guardar.entrouNaFila` / `saiuDaFila` / `voltouParaFila` | `POST /api/lista-espera` · `DELETE /api/lista-espera/{id}` | Falta |
| `guardar.foraDaFila` | `POST /api/lista-espera/excecoes` | Falta |
| `guardar.medicoNovo` / `edicaoMedico` | `POST /api/clinicas/{id}/medicos` · `PUT /api/medicos/{id}` | Falta |
| `guardar.expediente` (pagina-horarios.js) | `PUT /api/medicos/{id}/expediente` | Falta |
| `guardar.especialidade` | `POST /api/clinicas/{id}/especialidades` | Falta |
| lista de pacientes (pagina-pacientes.js) | `GET /api/clinicas/{id}/pacientes` | Falta |
| `iniciarConsulta` / `finalizarConsulta` / `registrarFaltou` (medico.js) | `PUT /api/consultas/{id}/status` | Falta |
| retorno com nota (medico.js) | `POST /api/retornos` | Falta |

## Web: área do paciente (`paciente-servicos.js`)

| Função | Endpoint | Backend |
|---|---|---|
| `cancelar(c)` (também o "Não vou") | `DELETE /api/consultas/{id}` (devolve se contou falta e se o horário foi oferecido) | Falta |
| `paraConfirmar()` · `confirmarPresenca(c)` | `GET /api/pacientes/{id}/consultas` · `PUT /api/consultas/{id}/presenca` | Falta |
| `situacao()` (faltas e restrição) | `GET /api/pacientes/{id}/situacao` | Falta |
| `atualizarHorarios()` | `GET /api/especialidades/{id}/horarios-livres` | Falta |
| `entrarNaFila(medico)` | `POST /api/lista-espera` | Falta |
| `marcar(c)` | `POST /api/consultas` | Falta |
| `sincronizar()` | `GET /api/pacientes/{id}/lista-espera` | Falta |
| `responderVaga(aceitar)` | `PUT /api/lista-espera/{id}/vaga` | Falta |
| `sairDaFila()` | `DELETE /api/lista-espera/{id}` | Falta |
| `salvar()` (família, consultas, fila do paciente) | `GET/POST /api/pacientes/{id}/familiares`, `GET /api/pacientes/{id}/consultas` | Falta |

## App Expo (`aplicativo/src/servicos/`)

| Função | Endpoint | Backend |
|---|---|---|
| `entrar(email, senha)` | `POST /api/auth/login` | **Existe** |
| `cadastrar(dados)` | `POST /api/usuarios` | **Existe** (telefone e nascimento ainda são descartados) |
| `listarConsultas(usuario)` | `GET /api/pacientes/{id}/consultas` | Falta |
| `buscarConsulta(usuario, id)` | `GET /api/consultas/{id}` | Falta |
| `cancelarConsulta(usuario, id)` | `DELETE /api/consultas/{id}` | Falta |
| `cancelarContaFalta(consulta)` | — (local, só para avisar antes de confirmar) | — |
| `listarParaConfirmar(usuario)` | `GET /api/pacientes/{id}/consultas` | Falta |
| `confirmarPresenca(usuario, id)` | `PUT /api/consultas/{id}/presenca` | Falta |
| `buscarSituacao(usuario)` | `GET /api/pacientes/{id}/situacao` | Falta |
| `marcarConsulta(usuario, dados)` | `POST /api/consultas` | Falta |
| `listarEspecialidades()` · `buscarEspecialidade(id)` | `GET /api/especialidades` · `GET /api/especialidades/{id}` | Falta |
| `listarHorariosLivres(idEsp)` · `primeiroHorario(idEsp)` | `GET /api/especialidades/{id}/horarios-livres` | Falta |
| `listarFamiliares(usuario)` | `GET /api/pacientes/{id}/familiares` | Falta |
| `adicionarFamiliar(usuario, dados)` | `POST /api/pacientes/{id}/familiares` | Falta |
| `buscarMinhaFila(usuario)` | `GET /api/pacientes/{id}/lista-espera` | Falta |
| `entrarNaFila(usuario, dados)` | `POST /api/lista-espera` | Falta |
| `responderVaga(usuario, idFila, aceitar)` | `PUT /api/lista-espera/{id}/vaga` | Falta |
| `sairDaFila(usuario, idFila)` | `DELETE /api/lista-espera/{id}` | Falta |
| `listarAcompanhamento(usuario)` | `GET /api/pacientes/{id}/acompanhamento` | Falta |
| `listarPrevencao(usuario)` | `GET /api/pacientes/{id}/prevencao` | Falta |
| `marcarItemPrevencao(usuario, idItem, status, idConsulta?)` | `PUT /api/prevencao/{id}` | Falta |
| `incluirNaPrevencao(usuario, dados)` · `sugestoesDoMes(mes)` | `POST /api/pacientes/{id}/prevencao` · (sugestões locais) | Falta |
| `analisarSintomas(texto, familia)` | — (local de propósito: o alerta de emergência não pode depender da rede) | — |

## Resumo

- **Existem no backend:** `POST /api/auth/login` e `POST /api/usuarios` (usados pelo login e cadastro do app e pelo login da web).
- **Faltam:** clínicas e equipe, médicos e expediente, especialidades, agenda e horários, consultas
  (marcar, mudar status, remarcar, cancelar), confirmação de presença, faltas e restrição, lista de espera, família,
  acompanhamento e prevenção.
- **Primeiro passo sugerido no banco:** tabelas `clinicas`, `medicos`, `horarios`, `consultas`,
  `lista_espera` e `faltas`, com `id_clinica` em todas, e os `CHECK` de status do contrato.

## Confirmação de presença (endpoint novo)

`PUT /api/consultas/{id}/presenca` com `{ "idUsuarioLogado", "vou": true | false }`.
`vou: true` grava a confirmação; `vou: false` cancela pelas mesmas regras de `DELETE /api/consultas/{id}`.
Os campos e as regras completas estão em `aplicativo/docs/aplicativo-integracao-api.md`, seção "Presença e faltas".

## Formato de Familiar

`{ id, nome, curto, relacao, nascimento, cor, alergias, titular }` — o mesmo de
`aplicativo/docs/aplicativo-integracao-api.md`. O sistema não guarda número de documento de saúde do familiar.

- `relacao` é a coluna `Pacientes.Parentesco`: `Titular` para o dono da conta e, para familiares,
  uma destas opções: `Filho(a)`, `Cônjuge`, `Pai/Mãe`, `Irmão(ã)`, `Outro` (obrigatório).
- `nascimento` (`AAAA-MM-DD`, coluna `Pacientes.Data_Nascimento`, obrigatória): a idade é calculada por ela
  nas telas. Não há `idade` nem `genero` no formato.
- `cor` é `Pacientes.Cor` (`#RRGGBB`).

## Funções novas (comparação com o banco SQL Server)

| Função (arquivo) | Endpoint | Tabela | Backend |
|---|---|---|---|
| `cadastrar(dados)` (app, `servicos/autenticacao.js`) | `POST /api/usuarios` + `POST /api/pacientes` (titular, parentesco `Titular`) + `GET /api/clinicas/codigo/{codigo}` + `POST /api/pacientes/{id}/clinicas` | Usuarios, Pacientes, Paciente_Clinica | Só `POST /api/usuarios` existe |
| `cadastrarContaMedico(dados)` (web, `api.js`) | `POST /api/clinicas/{id}/medicos` (cria o usuário `MEDICO` e o médico com CRM) | Usuarios, Medicos | Falta |
| `registrarExame` / `mudarStatusExame` (web, `clinica-dados.js`) | `POST /api/exames` · `PUT /api/exames/{id}` | Exames | Falta |
| `registrarRetorno` (web, `clinica-dados.js`) | `POST /api/retornos` | Retornos | Falta |
| `retirarFalta(id, por, motivo)` (web, `clinica-dados.js`) | `PUT /api/faltas/{id}/retirar` corpo `{ idUsuarioLogado, motivo }` | Faltas.MotivoRetirada | Falta |
| `guardar.expediente` com `almoco` (web, `pagina-horarios.js`) | `PUT /api/medicos/{id}/expediente` | Horarios_Atendimento (InicioAlmoco, FimAlmoco) | Falta |
| `guardar.especialidade` com `duracao` | `POST /api/clinicas/{id}/especialidades` | Especialidades.DuracaoPadrao | Falta |
| `listarNotificacoes` · `marcarTodasComoLidas` (app, `servicos/notificacoes.js`) | `GET /api/pacientes/{id}/notificacoes` · `PUT /api/pacientes/{id}/notificacoes/lidas` | Notificacoes | Falta |

### Valores das telas × códigos do banco

O script do banco guarda o status da consulta e o estado do horário na mesma tabela (`Status_Consulta`).
A API traduz assim:

| Tela (web e app) | Banco (`Status_Consulta.Codigo_consulta`) |
|---|---|
| `confirmada`, `na_recepcao`, `em_atendimento`, `atendida`, `faltou`, `cancelada` | `CONFIRMADA`, `NA_RECEPCAO`, `EM_ATENDIMENTO`, `ATENDIDA`, `FALTOU`, `CANCELADA` |
| horário `livre` | `VAGA` |
| horário `oferecido` | `OFERECIDA` |
| restrição `normal`, `so_fila`, `so_recepcao` | `Usuarios.Restricao`: `NORMAL`, `SO_FILA`, `SO_RECEPCAO` |
| exame `pendente`, `realizado` | `Exames.Status`: `PENDENTE`, `REALIZADO` |
| retorno `encaminhado`, `agendado`, `realizado`, `cancelado` | `Retornos.Status`: `ENCAMINHADO`, `AGENDADO`, `REALIZADO`, `CANCELADO` |
| prevenção `pendente`, `agendado`, `feito` | `Pessoa_Prevencao.Status`: `NAO_AGENDADO`, `AGENDADO`, `REALIZADO` |

## Prevenção na web do paciente (`paciente-servicos.js` + `prevencao-tela.js`)

As mesmas funções do app, com os mesmos nomes e mensagens:

| Função | Endpoint | Backend |
|---|---|---|
| `sugestoesDoMes(mes)` | — (lista local, igual à do app) | — |
| `incluirNaPrevencao(d)` | `POST /api/pacientes/{id}/prevencao` | Falta |
| `marcarItemPrevencao(id, status, idConsulta?)` | `PUT /api/prevencao/{id}` | Falta |

Formato do item: `{ id, pessoa, titulo, status, nota, esp, consulta? }` (o mesmo do app).
