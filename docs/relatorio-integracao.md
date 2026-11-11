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
| `marcarItemPrevencao(usuario, idItem, status)` | `PUT /api/prevencao/{id}` | Falta |
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
