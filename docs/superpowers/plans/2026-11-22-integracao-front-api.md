# Integração front-end ↔ API: plano de implementação

> **Para agentes:** sub-skill obrigatória: superpowers:executing-plans. Uma etapa por vez. Ao fim de cada etapa: mostrar a evidência, fazer o commit e esperar o "próximo". Os passos usam `- [ ]`.

**Objetivo:** ligar a web e o app do paciente à API real (`AgendaPro.Api`, porta 5080), completar no back-end as rotas que faltam (L1–L6) e corrigir os 5 bugs combinados. No fim, retirar todos os dados fictícios, de modo que o sistema funcione a partir de um banco vazio.

**Arquitetura:**
- **Web:** `api.js` continua sendo a única camada que fala com o servidor (seção 5.1 da documentação). Ganha a função `chamar()`, que lê a URL de `config.js` e envia o token. `clinica-dados.js` e `paciente-servicos.js` deixam de gravar no `localStorage` e viram adaptadores assíncronos sobre `api.js`.
- **App:** continua com `chamarApi` (`src/servicos/api.js`) e um arquivo de configuração.
- **Back-end:** segue o padrão existente (controller → serviço → repositório com Dapper). Alterações no banco vão em `banco/migracoes/`.

**Tecnologias:** HTML, CSS e JS puro; Expo SDK 58 / React Native 0.88; ASP.NET Core .NET 10 + Dapper + JWT; SQL Server (instância padrão `localhost`).

**Especificação:**
- o prompt de integração (seções 0–3) e as respostas do grupo às decisões da Fase 0;
- `backend/docs/ajustes-front.md` (F1–F36);
- `docs/AgendaPro-Saude_documentação.pdf`;
- o levantamento da Fase 0, no scratchpad da sessão: `C:\Users\andre\AppData\Local\Temp\claude\f07e8a18492c1ae5\892deb4f-9c7e-4bf2-8879-a71e05cae0de\scratchpad\fase0-levantamento.md`.

## Regras globais

- Branch `frontBack`. Um commit por etapa. As etapas do back-end usam o prefixo `back:`. Sem merge e sem push.
- Não mexer nos bancos `AgendaPro_Saude` e `AgendaPro__Saude`. Tudo roda em **`AgendaPro_Saude_App`**.
- Nenhum segredo entra em arquivo versionado. A connection string e a `Jwt:Chave` ficam só no user-secrets. A chave tem no mínimo 32 bytes aleatórios.
- O endereço da API fica num único lugar em cada front:
  - web: `frontend/assets/js/config.js`;
  - app: `aplicativo/src/servicos/config.js`.
  - Valor: `http://localhost:5080` na web, e `http://<IP-do-PC>:5080` no app.
- As 51 rotas existentes não mudam de caminho nem de formato. Rota nova segue o padrão: `[Authorize(Roles=…)]`, `Forbid()` quando o recurso não é da clínica ou da conta do token, e erro em `{ "mensagem": "..." }`.
- **A estrutura do banco não muda** (tabelas, colunas e procedures), porque precisa continuar idêntica ao MER e ao Apêndice Q do PIM entregue. Se alguma etapa precisar mudar o banco, parar e perguntar ao grupo antes.
- Depois da E0 e depois da B9: rodar `banco/testes_agendapro.sql` (`sp_TesteSistema`), esperar 25 de 25 e deixar o banco vazio, só com o catálogo de prevenção.
- Cada rota nova é provada com curl em três casos: o certo, o 401 sem token e o 403 com perfil errado. A doc vai para `backend/docs/especificacao-api.md` e para o `backend/README.md`.
- Nada é declarado pronto sem a resposta real da API, vista pela tela, pelo console ou pelo curl.
- Não inventar rota nem dado. O que faltar vai para "Pendências do back-end".
- Texto em linguagem simples, igual ao Quadro 4.1. Mensagens fixadas:
  - "E-mail ou senha incorretos"
  - "Este horário acabou de ser ocupado. Escolha outro."
  - "Muitas tentativas. Aguarde um minuto e tente de novo."
  - "Não foi possível falar com o servidor"
  - "Por enquanto, você pode agendar só pela lista de espera"
  - "Por enquanto, agende pela recepção da clínica"
- O `{id}` em `/api/pacientes/{id}/…` é obrigatório nas rotas existentes, e a API o compara com o token. O front usa `usuario.idUsuario` da sessão **só nessa posição da URL**. Nenhum id do próprio usuário vai no corpo.

## Como testar (vale para todas as etapas)

- **API:** `dotnet run --launch-profile http` (pasta `backend/AgendaPro.Api`). Evidência por curl, salvo em `scratchpad/evidencias/`.
- **Web:** `npx --yes http-server frontend -p 5500 -c-1`. As origens 5500 já estão no CORS.
  - Para a evidência de tela, uso **Playwright** rodado do scratchpad, sem entrar no `package.json` do projeto. O roteiro abre a página, faz o login, executa a ação e salva um screenshot e o log de rede.
- **App:** a lógica é conferida pelas mesmas chamadas em curl. A tela, por `npx expo start --web` com Playwright, se o `react-native-web` estiver disponível. Se não estiver, o grupo confere no celular pelo Expo Go, com o IP configurado.
- **Pontos de checagem** (depois das etapas 4, 9 e 12): login com os 4 perfis, cada tela aberta sem erro no console e as telas vazias sem quebrar.

## Pontos de atenção na revisão

1. **Token vencido ou trocado no meio do uso.** A tela não pode travar: qualquer chamada com 401 limpa a sessão e volta ao login. Fica coberto na etapa 3.
2. **Datas no fuso de Brasília.** Montar `AAAA-MM-DD` com `getFullYear/getMonth/getDate`, nunca com `toISOString` (F25). Perto da meia-noite, "hoje" não pode virar amanhã. Fica coberto nas etapas 1 (`dataISO`) e 9.
3. **Listas vazias e campos nulos** (`alergias: null`, fila `null`, `sala: null`, clínica sem médico). Cada tela mostra o estado "vazio" sem exceção. Coberto nas etapas 7–11 e conferido de novo na 12.
4. **Clique duplo ou corrida no "Agendar".** O segundo pedido recebe o 50008, e a tela mostra a mensagem sem duplicar a consulta. O botão fica desativado durante o envio. Coberto nas etapas 7b e 8c, e na Fase 3, roteiro 2.
5. **Texto com acento e caracteres de LIKE** nas buscas (nome "João", busca "%"). O front envia com `encodeURIComponent`. A busca com `%` não pode listar tudo; o curl da etapa 6 registra o resultado, e o bug do LIKE fica como pendência, porque não está entre os 5 combinados.

---

## Etapa 0: ambiente, banco novo e README

**Arquivos:**
- Criar no scratchpad (não versionado): `agendapro_saude_app.sql`, cópia de `banco/agendapro_saude_sqlserver.sql` com as linhas 6, 7 e 10 trocadas para `AgendaPro_Saude_App`. A linha 6 é o `IF DB_ID(...)`: sem essa troca, o `CREATE` é pulado porque `AgendaPro_Saude` já existe.
- Versionar: `banco/agendapro_saude_sqlserver.sql`, que hoje não está no git.
- Alterar: `backend/README.md`. Novo caminho `banco/agendapro_saude_sqlserver.sql`, servidor `localhost` no lugar de `.\SQLEXPRESS`, banco `AgendaPro_Saude_App`, porta 5080, e os comandos `dotnet user-secrets`.
- Alterar: `backend/docs/dados-prevencao.sql`. Tirar o `USE AgendaPro_Saude;` (linha 22) e documentar o uso com `-d <banco>`. Hoje o arquivo grava sempre no banco antigo.

**Passos:**
- [ ] Instalar o SDK: `winget install Microsoft.DotNet.SDK.10`. Conferir com `dotnet --version`, que deve mostrar 10.x.
- [ ] Rodar `sqlcmd -S localhost -E -C -I -f 65001 -i <scratchpad>\agendapro_saude_app.sql`.
- [ ] Conferir os objetos no `AgendaPro_Saude_App`. Esperado: `19 | 1 | 14 | 2` (tabelas, visões, procedures e triggers, nesta ordem), mais `Status_Consulta = 8` e `Parametros = 3`.
  ```sql
  SELECT (SELECT COUNT(*) FROM sys.tables),(SELECT COUNT(*) FROM sys.views),
         (SELECT COUNT(*) FROM sys.procedures),(SELECT COUNT(*) FROM sys.triggers)
  ```
- [ ] Rodar `sqlcmd -S localhost -E -C -I -f 65001 -d AgendaPro_Saude_App -i backend\docs\dados-prevencao.sql`. **Só depois do "ok" do grupo ao conteúdo mostrado.** Esperado: `Campanhas_Prevencao = 7`, `Exames_Prevencao = 9`.
- [ ] Configurar os user-secrets na pasta `backend/AgendaPro.Api`:
  - `ConnectionStrings:AgendaPro = Server=localhost;Database=AgendaPro_Saude_App;Trusted_Connection=True;TrustServerCertificate=True`
  - `Jwt:Chave` = 48 bytes de `RandomNumberGenerator`, em Base64, gerados no PowerShell sem ecoar o valor.
- [ ] Subir a API (`dotnet build` e `dotnet run --launch-profile http`) e testar:
  - `curl -s -X POST localhost:5080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"x@x.com\",\"senha\":\"12345678\"}"` deve devolver `401 {"mensagem":"E-mail ou senha incorretos"}`;
  - `curl -i localhost:5080/api/pacientes/1/familiares` deve devolver `401` sem corpo.
- [ ] Conferir que nada sensível entrou: `git diff --cached` não pode conter `Jwt:Chave`, `Password` nem `Server=`.
- [ ] Commit: `E0: versiona o script do banco e corrige o README (localhost, AgendaPro_Saude_App, porta 5080)`.

**Critério de aceite:** a API sobe contra o banco novo e vazio e responde ao login e ao 401.

**Risco:** o winget pede elevação. O SQL Server só aceita a autenticação do Windows, o que é o esperado.

---

## Etapas do back-end

Todas antes do front, para o front ser construído sobre a API final.

### Etapa B1: `back:` duplicidade concorrente vira 409, e o CORS fica configurável

**Arquivos:**
- Alterar `backend/AgendaPro.Api/Middlewares/ErroMiddleware.cs`.
- Alterar `Program.cs:51-61`, só o comentário e a leitura das origens.
- Alterar `backend/README.md`.

**Interfaces que esta etapa entrega:** `SqlException` 2627 ou 2601 vira **409** `{ "mensagem": ... }`. A mensagem é escolhida pela **tabela** citada no erro, porque o nome da restrição de e-mail é gerado pelo SQL Server:

| Tabela no erro | Mensagem |
|---|---|
| `Usuarios` | "Este e-mail já tem uma conta. Entre com ele ou use outro." |
| `Pacientes` | "Este CPF já está cadastrado." |
| `Clinica` | "Já existe uma clínica com este CNPJ." |
| `Medicos` | "Já existe um médico com este CRM." |
| outra | "Este cadastro já existe." |

As checagens prévias, que hoje respondem 400 com essas mesmas mensagens, ficam como estão, para não mudar o formato das rotas. O 409 só aparece na corrida.

**CORS:** as origens continuam vindo de `Cors:Origens`, que pode ser estendido pelo user-secrets ou por variável de ambiente sem mexer no arquivo. Exemplo: `dotnet user-secrets set "Cors:Origens:2" "http://192.168.0.10:5500"`. Documentar no README.

**Passos:**
- [ ] Reproduzir a corrida antes de corrigir: dois `POST /api/pacientes` simultâneos com o mesmo CPF e e-mails diferentes, disparados com `Start-Job`. Esperado antes da correção: um 201 e um **500**.
- [ ] Implementar `catch (SqlException e) when (e.Number is 2627 or 2601)` com a tabela da lista acima.
- [ ] Repetir a corrida. Esperado: um 201 e um **409** "Este CPF já está cadastrado.".
- [ ] Testar o pré-voo do CORS:
  - `curl -i -X OPTIONS localhost:5080/api/auth/login -H "Origin: http://192.168.0.10:5500" -H "Access-Control-Request-Method: POST"` traz `Access-Control-Allow-Origin` depois de configurar `Cors:Origens:2`;
  - uma origem fora da lista não traz o cabeçalho.
- [ ] Commit: `back: duplicidade concorrente responde 409 e origens do CORS por configuração`.

**Risco:** o texto da `SqlException` muda conforme o idioma do servidor. Por isso a escolha usa o nome do objeto (`dbo.Usuarios`), que aparece igual em qualquer idioma.

### Etapa B2: retirada pelo grupo

Invalidar os tokens na troca de senha exigiria uma coluna nova e não está na documentação. Fica como observação no relatório final.

### Etapa B3: `back:` reagendamento transacional de verdade

**Arquivos:**
- Alterar `Repositorios/ConsultaRepositorio.cs:110-137`.
- Se a causa estiver nas procedures: **parar e perguntar ao grupo** antes de mudar qualquer procedure.

**Passos:**
- [ ] Reproduzir (systematic-debugging): consulta X confirmada; reagendar X para um horário **ocupado**. Conferir no banco:
  - X continua `CONFIRMADA`?
  - Apareceu uma VAGA ou uma oferta no horário antigo?
  - Qual é o HTTP e qual erro veio? Por exemplo, 266 (contagem de transações) ou 50008.
- [ ] Ler como a `sp_CancelarConsulta`, a `sp_AgendarConsulta` e a `trg_VagaLiberada` tratam `@@TRANCOUNT` e `ROLLBACK`. Registrar a causa raiz.
- [ ] Corrigir **só na API**. Um `SAVE TRANSACTION` não resolve se a procedure faz `ROLLBACK` total, então tratar a exceção, conferir `@@TRANCOUNT` e devolver a mensagem original.
- [ ] Critério:
  - reagendar para um horário ocupado responde **400** "Este horário acabou de ser ocupado. Escolha outro.";
  - X continua `confirmada`;
  - nenhuma VAGA ou oferta nova aparece;
  - nenhuma notificação nova é gravada;
  - reagendar para um horário livre responde 200 com o id novo, X fica `CANCELADA` e o horário antigo vai para a fila, como hoje.
- [ ] Commit: `back: reagendamento cancela e agenda na mesma transação, com rollback total`.

**Risco:** mexer em procedure afeta também o cancelamento normal. Repetir o `DELETE /api/consultas/{id}` simples e conferir que ainda devolve `{falta, oferecidoAFila}` como antes.

### Etapa B4: `back:` o médico não altera o próprio CRM

**Arquivos:** `Servicos/MedicoServico.cs:86-103`.

**Regra:** se o perfil logado é `medico` e o `crm` enviado é diferente do atual, a resposta é **403** `{ "mensagem": "Só a recepção pode alterar o CRM." }`. Recepção e dono continuam podendo alterar.

**Passos:**
- [ ] Testar com curl:
  - médico enviando o CRM atual e outra sala deve dar 200;
  - médico enviando outro CRM deve dar 403 com a mensagem;
  - recepção enviando outro CRM deve dar 200;
  - sem token deve dar 401.
- [ ] Commit: `back: médico não altera o próprio CRM`.

### Etapa B5: `back:` L1, dados da clínica; L4, dados da conta do paciente

**Rotas novas:**

| Rota | Perfis | Resposta | Erros |
|---|---|---|---|
| `GET /api/clinicas/{id:int}` | `dono,recepcao` | `ClinicaResposta` (já existe: `{id,nome,endereco,telefone,cnpj,cidade,uf,codigo,publica}`) | 403 se `id ≠ claim clinica`; 404 "Clínica não encontrada." |
| `GET /api/pacientes/{id:int}` | `paciente` | nova `ContaPacienteResposta(string Nome, string Cpf, string Email, string? Telefone, DateOnly Nascimento)` | 403 se `id ≠ sub` |

Na segunda rota, `{id}` é o idUsuario, como nas outras rotas de paciente. Os dados são os do titular.

**Arquivos:**
- `ClinicasController.cs`, `ClinicaServico.cs` e a interface.
- `PacientesController.cs`, `PacienteServico.cs`, `PacienteRepositorio.cs` e as interfaces.
- Novo `Dtos/ContaPacienteResposta.cs`.
- `especificacao-api.md` e o README.

**Passos:**
- [ ] Testar com curl:
  - dono da clínica 1 → `GET /api/clinicas/1` deve dar 200 e mostrar o `codigo` no formato `AAA-0000`;
  - dono → `/api/clinicas/2` (outra clínica) deve dar 403;
  - paciente → `/api/clinicas/1` deve dar 403;
  - sem token deve dar 401;
  - paciente → `GET /api/pacientes/{seu id}` deve dar 200 com CPF e telefone;
  - paciente → o id de outra conta deve dar 403;
  - recepção na rota do paciente deve dar 403;
  - sem token deve dar 401.
- [ ] Commit: `back: GET da clínica (L1) e dos dados da conta do paciente (L4)`.

**Risco:** `GET /api/clinicas/{id:int}` e `GET /api/clinicas?busca=` têm caminhos diferentes. Não há conflito de rota, mas conferir no Swagger.

### Etapa B6: `back:` L2, perfil do médico; L6, desativar médico

**Rotas novas:**

| Rota | Perfis | Resposta | Regra |
|---|---|---|---|
| `GET /api/medicos/{id:int}` | `medico,recepcao,dono` | `MedicoResposta` (já existe, com `expediente`) | o médico lê só o próprio (claim `medico`); a equipe lê só da própria clínica |
| `DELETE /api/medicos/{id:int}` | `recepcao,dono` | 204 | `Usuarios.Ativo = 0` na conta do médico. O histórico fica. Recusa com 400 "Este médico tem consultas marcadas. Cancele ou reagende antes de desativar." se houver consulta futura `CONFIRMADA` |

**Efeitos da desativação:**
- o médico desativado sai de `GET /api/clinicas/{id}/medicos`, dos horários livres e da fila da clínica;
- `POST /api/consultas` e `POST /api/lista-espera` para ele respondem 404 "Médico não encontrado.";
- o token dele passa a dar 401, pelo `OnTokenValidated`, que já faz isso.

O banco não precisa mudar: basta o `JOIN Usuarios … AND Ativo = 1` nas listagens.

**Arquivos:** `MedicosController.cs`, `MedicoServico.cs`, `MedicoRepositorio.cs`, os repositórios de consulta e de fila, se forem eles que listam os médicos, as interfaces e a doc.

**Passos:**
- [ ] Testar o caso certo, o 401 e o 403 das duas rotas, mais:
  - desativar um médico com consulta futura deve dar 400;
  - desativar um médico sem consulta futura deve dar 204; depois disso, o médico some de `/medicos` e de `/horarios-livres`, e o login dele responde 401 "E-mail ou senha incorretos";
  - a consulta antiga dele continua em `GET /api/consultas/{id}`.
- [ ] Commit: `back: GET do perfil do médico (L2) e desativação sem apagar histórico (L6)`.

### Etapa B7: `back:` L5, editar especialidade

**Rota nova:** `PUT /api/especialidades/{id:int}`, perfis `recepcao,dono`, corpo `CadastroEspecialidadeRequisicao { nome, duracao }` (reaproveitado). Resposta 200 `EspecialidadeResposta`.

**Erros:**
- 404 "Especialidade não encontrada.";
- 403 se a especialidade é de outra clínica;
- 400 "Essa especialidade já existe nesta clínica." se o nome bater com o de outra especialidade.

A duração nova vale só para os agendamentos novos.

**Passos:**
- [ ] Testar com curl o caso certo, o nome repetido, o 401, o 403 (paciente) e o 403 (outra clínica).
- [ ] Commit: `back: editar especialidade (L5)`.

### Etapa B8: `back:` L3, rotas de feriados (tabela global, sem mudar o banco)

A tabela `Feriados` continua como está: global, com `Data_Feriado` UNIQUE. A `sp_AgendarConsulta` e os horários livres já consultam essa tabela, então não precisam mudar.

**Rotas novas:**

| Rota | Perfis | Corpo / resposta |
|---|---|---|
| `GET /api/feriados?de=&ate=` | `paciente,medico,recepcao,dono` | `[{ id, data, nome }]` (novo `FeriadoResposta`). `de` e `ate` são obrigatórios, no formato AAAA-MM-DD |
| `POST /api/feriados` | `recepcao,dono` | `{ data, nome≤120 }` → 201 `FeriadoResposta`; 400 "Já existe um feriado nesta data." |
| `DELETE /api/feriados/{id:int}` | `recepcao,dono` | 204; 404 "Feriado não encontrado." |

**Risco aceito pelo grupo:** como a tabela é global, um feriado cadastrado pela recepção de uma clínica vale para todas as clínicas, e qualquer recepção pode removê-lo. Isso fica registrado no relatório.

> **Revisão de 2026-11-23 (antes da 8b):** o risco foi reavaliado como falha de isolamento (seção 5.4). As rotas
> `POST /api/feriados` e `DELETE /api/feriados/{id}` foram **retiradas**; fica só o GET, para todos os perfis. Os
> feriados nacionais de 2026 e 2027 entram por `backend/docs/dados-feriados.sql`. Commit:
> `back: feriados só leitura e dados-feriados.sql`. Na 8b, `horarios.html` só lista os feriados (`GET /api/feriados`).

**Passos:**
- [ ] Testar com curl:
  - recepção cadastra o feriado de 2026-12-25 e recebe 201;
  - `GET /horarios-livres` não traz 2026-12-25;
  - `POST /api/consultas` para 2026-12-25 dá 400 "Não é permitido agendar em feriados.";
  - a mesma data repetida dá 400;
  - DELETE dá 204, e o dia volta a aparecer;
  - sem token dá 401;
  - paciente no POST dá 403.
- [ ] Atualizar a doc.
- [ ] Commit: `back: rotas de feriados (L3) sobre a tabela global`.

### Etapa B9: teste do banco depois das etapas do back-end

- [ ] Rodar `banco/testes_agendapro.sql` no `AgendaPro_Saude_App` (`sp_TesteSistema`). Esperado: 25 de 25.
- [ ] Deixar o banco vazio de novo, só com o catálogo de prevenção.

---

## Etapas do front (ordem do prompt)

### Etapa 1: módulo único de acesso à API (web e app)

**Arquivos:**
- Criar `frontend/assets/js/config.js`: `window.AGENDAPRO_CONFIG = { API_URL: "http://localhost:5080", TEMPO_LIMITE_MS: 8000 }`.
- Incluir `config.js` antes de `api.js` em todos os HTML que carregam `api.js`.
- Alterar `frontend/assets/js/api.js`, só acrescentando.
- Alterar `aplicativo/src/servicos/config.js` (porta 5080, F13).
- Alterar `aplicativo/src/servicos/api.js`.

**O que esta etapa entrega:**
- **Web:** `API.chamar(metodo: string, caminho: string, corpo?: object) : Promise<any>`.
  - Monta `API_URL + caminho` e envia `Content-Type: application/json` e `Authorization: Bearer <token>`, se houver sessão.
  - Aborta em 8 segundos.
  - 204 devolve `null`.
  - Erro lança `ErroApi { status: number, mensagem: string }`. A mensagem vem de `corpo.mensagem` quando existe. Sem rede ou no tempo limite, a mensagem é "Não foi possível falar com o servidor" com `status 0`.
- **Web:** `API.dataISO(d: Date) : string` monta `AAAA-MM-DD` no fuso local. Vai para `comum.js` se ali for o lugar das datas.
- **App:** `chamarApi` continua com a mesma assinatura e lança `ErroApi` com o mesmo formato.

**Passos:**
- [ ] No console de `login.html`:
  - `API.chamar("GET","/api/pacientes/1/familiares")` rejeita com `{status:401}`;
  - `API.chamar("POST","/api/auth/login",{email:"a@a.com",senha:"12345678"})` rejeita com `{status:401, mensagem:"E-mail ou senha incorretos"}`;
  - com a API desligada, rejeita com `{status:0, mensagem:"Não foi possível falar com o servidor"}`.
  - Evidência: screenshot do Playwright e o log.
- [ ] `API.dataISO(new Date(2026,10,22,23,59))` devolve `"2026-11-22"`.
- [ ] Commit: `Etapa 1: módulo único de acesso à API na web e no app (URL em config.js)`.

**Risco:** só acrescenta código. Nenhuma tela muda ainda.

### Etapa 2: F1, login da equipe com token, redirecionamento e sair

**Arquivos:**
- `api.js`: `entrar`, `abrirSessao`, `sessao`, `sair`, `destinoDe`, `protegerPagina`.
- `login.js`: tirar o acesso rápido (`login.js:16-21`) e os botões de `login.html:153-168`.
- O botão de sair das cascas.

**Comportamento:**
- `entrar` chama `POST /api/auth/login` e grava `agendapro.sessao = { token, expiraEm, usuario:{idUsuario,nome,email,papel,clinicaId,medicoId} }`.
- Redireciona assim: `dono` e `recepcao` vão para `clinica.html`; `medico` vai para `medico.html`. O `paciente` fica na etapa 6.
- `sair()` só apaga a sessão (F14).
- `protegerPagina` também confere `expiraEm`.
- F8: a mensagem é a da API, sem trocar.

**Passos:**
- [ ] Criar pela API uma clínica de teste (curl `POST /api/clinicas`) e, como dono, uma recepcionista e um médico.
- [ ] Testar pela tela:
  - o dono entra e cai em `clinica.html`, e a requisição tem `Authorization: Bearer`;
  - a recepção entra e cai em `clinica.html`;
  - o médico entra e cai em `medico.html`;
  - a senha errada mostra "E-mail ou senha incorretos";
  - o 6º login no mesmo minuto mostra a mensagem do 429;
  - "Sair" apaga `agendapro.sessao` e volta ao login.
- [ ] Commit: `F1: login com token, redirecionamento por perfil e sair limpando a sessão`.

**Risco:** as telas da clínica ainda leem os dados falsos. Elas abrem, mas mostram dados simulados até a etapa 8. Isso é esperado.

### Etapa 3: tratamento de erros (401, 403, 429 e negócio), F9

**Arquivos:**
- `api.js` (`chamar`).
- `comum.js`: aviso padrão; se já existir um toast, reutilizar.
- App: `src/servicos/api.js`, `SessaoContext.js` e `autenticacao.js` (F8).

**Comportamento:**

| Resposta | O que acontece |
|---|---|
| 401 fora do login | apaga a sessão e vai para `login.html?expirou=1`, que mostra "Sua sessão terminou. Entre de novo." No app, `sair()` volta ao Login |
| 403 sem corpo | "Você não tem permissão para fazer isso." |
| 403 com corpo | a mensagem da API |
| 429 | a mensagem da API |
| 400, 404 ou 409 | a `mensagem` da API, sem alteração |
| 500 | a mensagem genérica da API |

**Passos:**
- [ ] Testar pela tela:
  - apagar o token do `localStorage`, ou trocá-lo por um inválido, e clicar em algo da tela: volta ao login com o aviso;
  - recepção chamando `API.chamar("PUT","/api/clinicas/<id>",…)` vê a mensagem de permissão;
  - no app, a senha errada 6 vezes mostra a mensagem do 429 (F8 resolvido).
- [ ] Commit: `Etapa 3: 401 volta ao login, 403 e 429 com mensagem, erros de negócio da API`.

### Etapa 4: nenhum id do próprio usuário no corpo; F24

**Arquivos:** `clinica.js:673`, `medico.js:880` e `clinica-dados.js` (onde envia `por`/`motivo` de falta), `paciente-servicos.js`, `api.js:373`, `pagina-equipe.js:105`.

**Regra:**
- O corpo nunca leva `idUsuarioLogado`, `usuarioId`, `por` nem `motivo` de falta.
- O `{id}` de `/api/pacientes/{id}` vem de `API.sessao().usuario.idUsuario`, porque a rota exige.
- A equipe compara `u.idUsuario === sessao.usuario.idUsuario` (F33).

**Passos:**
- [ ] `grep` por `idUsuarioLogado|usuarioId|\bpor:` em `frontend/assets/js` e `aplicativo/src`: nenhuma ocorrência em corpo de requisição.
- [ ] **Ponto de checagem A:** web e app inteiros. Login dos 4 perfis (o paciente ainda pelo app com a chave desligada); nenhuma tela com erro no console.
- [ ] Commit: `Etapa 4: nenhum id do próprio usuário no corpo; usuário sai do token (F24, F33)`.

### Etapa 5: F2, ids numéricos

**Arquivos:** os pontos do levantamento:
- `clinica.js` 467/472/653/845/928;
- `pagina-lista-espera.js` 19/127/168/178;
- `pagina-nova-consulta.js:387`;
- `api.js` 414/423;
- `paciente-servicos.js:261`;
- `app.js:1392`;
- `paciente-desktop.js:2112`;
- `medico.js:709`;
- no app, `AgendarTela.js:64,119,219`, `consultas.js:129` e `assistente.js:56-63,79-80`.

**O que esta etapa entrega:**
- `comum.js`: `mesmoId(a, b) : boolean`, que compara com `Number(a) === Number(b)`.
- No app, o mesmo em `src/utilitarios/texto.js`.
- A pediatria passa a ser reconhecida pelo **nome** da especialidade, normalizado sem acento (`"pediatria"`), não pelo id.

**Passos:**
- [ ] `grep` por `=== *"(ipe|pediatria|juliana)"|=== *'pediatria'` sem nenhum resultado.
- [ ] Testar pela tela: os menus da agenda abrem a consulta certa a partir de um `data-id`.
- [ ] Commit: `F2: ids numéricos e pediatria reconhecida pelo nome`.

### Etapa 6: F7, entrada do paciente (web e app), cadastros e escolha de clínica

**Arquivos:**
- Web: `api.js` (`entrar`, `cadastrarPaciente`, `cadastrarClinica`, `buscarClinicas`, `clinicaPorCodigo`, `vincularClinica`, `clinicasDoPaciente`), `cadastro.html`, `cadastro-clinica.js`, `escolher-clinica.js` e `.html`.
- App: `autenticacao.js` (F11, F12), `CadastroTela.js`.

**Comportamento:**
- **Login do paciente:** depois do login, `GET /api/pacientes/{id}/clinicas`. Lista vazia vai para `escolher-clinica.html`; caso contrário, vai para a área do paciente (`paciente-desktop.html`, ou `paciente-mobile.html` em tela ≤ 900 px, como hoje). A clínica escolhida fica em `agendapro.clinicaAtual`.
- **Cadastro do paciente (F10, F11):** `POST /api/pacientes` com todos os campos (nome, cpf, email, telefone, senha, nascimento, alergias, codigo) e depois `POST /api/auth/login`.
- **Cadastro da clínica:** `POST /api/clinicas`, depois o login do dono, e uma tela de sucesso com **o código AAA-0000 em destaque** e o botão "Ir para a agenda".
- **Escolha de clínica:** `GET /api/clinicas?busca=` (nome ou cidade, F32) e `/codigo/{c}`, com a máscara AAA-0000. Depois `POST /pacientes/{id}/clinicas {codigo}`, ou `{clinicaId}`, para clínica pública.

**Passos:**
- [ ] Testar pela tela:
  - cadastrar a clínica "Clínica Teste" e ver o código na tela de sucesso, igual ao do banco;
  - cadastrar um paciente **sem código**, cair na escolha de clínica, buscar pela cidade, vincular e cair na área do paciente;
  - cadastrar um paciente **com código**, cair direto na área;
  - repetir o CPF e ver "Este CPF já está cadastrado.";
  - no app, fazer o mesmo com a chave `USAR_API_REAL: true` só para `autenticacao.js`.
- [ ] Rodar o curl `GET /api/clinicas?busca=%25` e registrar o resultado (ponto de atenção 5).
- [ ] Commit: `F7: login do paciente decide entre área e escolha de clínica; cadastros pela API (F10, F11, F12, F32)`.

### Etapa 7: telas do paciente na web (desktop e mobile)

`paciente-servicos.js` vira um adaptador assíncrono. As funções de tela (`app.js`, `paciente-desktop.js`) passam a usar `await` e ganham os estados de carregando, vazio e erro. São três commits.

**Formatos da API que viram o modelo das telas:**
- Familiar: `{ id, nome, curto, cpf, relacao, nascimento, cor, alergias, titular }`.
- Consulta: `{ id, data, hora, sala, status, motivo, tipo, titulo, presencaConfirmada, pessoa, medico:{id,nome,sala}, especialidade:{id,nome} }`.

**Utilitários desta etapa:**
- `comum.js`: `idade(nascimento: "AAAA-MM-DD", hoje?: Date) : number` (F6).
- No app, o mesmo em `src/utilitarios/datas.js`.

#### 7a: família, consultas, agenda, detalhe, cancelar, presença e restrição
- **Rotas:** `GET /pacientes/{id}/familiares`, `POST …/familiares`, `GET …/consultas`, `GET /consultas/{id}`, `DELETE /consultas/{id}` (F19: `oferecidoAFila`), `PUT /consultas/{id}/presenca {vou}`, `GET …/situacao` (F5: `restricao`).
- **Avisos de restrição:** `so_fila` mostra "Por enquanto, você pode agendar só pela lista de espera" e bloqueia o "Agendar". `so_recepcao` mostra "Por enquanto, agende pela recepção da clínica" e bloqueia "Agendar" e "Entrar na fila".
- **Aceite:**
  - com o banco vazio, o Início mostra "Nenhuma consulta marcada";
  - um familiar adicionado aparece com a idade calculada;
  - o cancelamento mostra se contou falta;
  - "Vou" na véspera grava (ver `presencaConfirmada:true` no GET).
- **Commit:** `7a: família, consultas, presença e restrição do paciente pela API (F5, F6, F19, F35)`.

#### 7b: agendar, horários livres, lista de espera e vaga
- **Rotas:** `GET /clinicas/{c}/especialidades`, `GET /especialidades/{id}/horarios-livres` (F26: lista), `POST /consultas` (F22: `{pessoa,medico,data,hora,motivo}`), `GET …/lista-espera` (pode vir `null`), `POST /lista-espera`, `DELETE /lista-espera/{id}`, `PUT /lista-espera/{id}/vaga {aceitar}` (id da **fila**, F21).
- **Contagem:** `vagaOferecida.expiraEm − Date.now()`. Ao chegar a zero, mostra "O prazo terminou. A vaga foi para a próxima pessoa." e recarrega a fila.
- **Interface:** o botão "Agendar" fica desativado durante o envio. Os ids de especialidade do assistente do desktop (`paciente-desktop.js:457-486`) passam a ser buscados pelo nome nas especialidades reais. A sala vem da API, sem sorteio.
- **Aceite:**
  - agendar mostra a consulta na agenda;
  - dois pacientes no mesmo horário: o segundo vê "Este horário acabou de ser ocupado. Escolha outro.";
  - entrar e sair da fila;
  - com uma vaga oferecida pelo curl, a contagem começa do prazo real.
- **Commit:** `7b: agendar, horários livres e lista de espera do paciente pela API (F21, F22, F26)`.

#### 7c: depois da consulta, prevenção, notificações, perfil e troca de senha
- **Rotas:** `GET …/acompanhamento` (F28: exame só `pendente` ou `realizado`), `GET/POST …/prevencao`, `PUT /prevencao/{id}`, `GET …/notificacoes` (F27: sino com a contagem real de `lida:false`), `PUT …/notificacoes/lidas`, `GET /pacientes/{id}` (L4: perfil com telefone mascarado `•••• 1234` na tela), `PUT /usuarios/{id}/senha` seguido de novo login, e "Trocar de clínica".
- **Aceite:**
  - prevenção do mês com o filtro por familiar;
  - incluir o mesmo exame duas vezes mostra "Essa pessoa já está nesse item da prevenção.";
  - o sino mostra o número real;
  - "Marcar todas como lidas" zera o sino;
  - o perfil mostra os dados reais.
- **Commit:** `7c: acompanhamento, prevenção, notificações e perfil do paciente pela API (F27, F28, L4)`.

**Risco da etapa 7:** é a maior mudança de código, porque o código síncrono vira assíncrono. Uma tela que use um dado antes do `await` quebra. A mitigação é testar cada tela no desktop e no mobile antes do commit.

### Etapa 8: telas da recepção e da clínica

`clinica-dados.js` vira um adaptador assíncrono. O paciente passa a ser identificado pelo **id** (F3), e as horas ficam em `"HH:MM"` (F4).

**Utilitário desta etapa:** `corDoMedico(indice: number) : string`, uma cor por posição na lista de `GET /clinicas/{id}/medicos` (F15), numa paleta fixa em `tokens.css`.

#### 8a: casca, clínica e equipe, conta
- **Rotas:** `GET /clinicas/{id}` (L1: nome, código e endereço na casca e em `equipe.html`), `PUT /clinicas/{id}`, `GET/POST/DELETE /clinicas/{id}/equipe` (F33: `idUsuario`; a senha provisória aparece uma vez), `PUT /usuarios/{id}/senha`.
- **Aceite:**
  - o dono vê o código da clínica em equipe.html, edita o telefone e o dado persiste depois de recarregar;
  - cria uma recepcionista e vê a senha provisória;
  - remove a recepcionista, e o token dela passa a dar 401.
- **Commit:** `8a: casca, dados da clínica e equipe pela API (L1, F33)`.

#### 8b: especialidades, médicos, horários e feriados
- **Rotas:** `GET/POST /clinicas/{id}/especialidades`, `PUT /especialidades/{id}` (L5; sem `desc`, F16), `GET/POST /clinicas/{id}/medicos` (F15: `{nome,email,crm,especialidade,sala,telefone}`, mostra a `senhaProvisoria`), `PUT /medicos/{id}`, `DELETE /medicos/{id}` (L6), `PUT /medicos/{id}/expediente` (F4: `{semana,sabado,almoco}` em HH:MM), `GET/POST /feriados`, `DELETE /feriados/{id}` (L3, F17).
- **Aceite:**
  - com o banco vazio: cadastrar a especialidade, depois o médico (ver a senha provisória), depois o expediente seg–sex 08:00–17:00 com almoço 12:00–13:00;
  - `GET /horarios-livres` traz as horas sem o almoço;
  - cadastrar o feriado e conferir que ele some dos horários;
  - desativar o médico sem consultas.
- **Commit:** `8b: especialidades, médicos, expediente e feriados pela API (F4, F15, F16, F17, L3, L5, L6)`.

#### 8c: agenda (dia, semana e mês) e ações sobre a consulta
- **Rotas:** `GET /clinicas/{id}/agenda?de=&ate=` (F18: `livre`/`oferecido` vêm no `status`; a duração vem da especialidade), `PUT /consultas/{id}/status` (chegada `na_recepcao`, com "Desfazer" voltando para `confirmada`; **"Iniciar atendimento" da recepção** a partir de `na_recepcao`, que hoje não existe), `POST /consultas/{id}/falta`, `DELETE /consultas/{id}` (F19: sem chamar "oferecer" depois), `PUT /consultas/{id}` (F34: reagendar só `confirmada`; usar o id novo devolvido), `POST /consultas/{id}/oferecer` (só em status `livre` que é VAGA; F20: sem escolher a pessoa).
- **Painel:** "consultas hoje" e a ocupação da semana são **calculados** a partir da agenda e do expediente. Nenhum número fixo.
- **Aceite:**
  - a consulta marcada pelo paciente aparece na agenda com a cor do médico;
  - chegada e desfazer;
  - reagendar arrastando;
  - cancelar oferece a vaga à fila (ver `GET /clinicas/{id}/lista-espera`);
  - o selo de status tem texto (Apêndice A).
- **Commit:** `8c: agenda da clínica e ações sobre a consulta pela API (F18, F19, F20, F23, F34)`.

#### 8d: lista de espera, pacientes e nova consulta
- **Rotas:** `GET /clinicas/{id}/lista-espera` (F21: `[{medico,especialidade,pessoas,vagas}]`, telefone mascarado na tela), `POST /lista-espera {pessoa,medico,usaApp}`, `DELETE /lista-espera/{id}`, `GET /clinicas/{id}/pacientes?busca=&filtro=` (F3: ficha pronta), `GET /clinicas/{id}/faltas?paciente=`, `PUT /faltas/{id}/retirar {motivo}`, `PUT /exames/{id} {status:"realizado"}`, `GET /pacientes/{idConta}/situacao` (F5), `POST /consultas` pela recepção (F22).
- **Aceite:**
  - buscar o paciente pelo CPF e abrir a ficha com consultas, faltas, fila, retornos e exames;
  - retirar uma falta com motivo, e a restrição volta a `normal`;
  - marcar o exame como realizado;
  - agendar passo a passo para o paciente vinculado.
- **Commit:** `8d: lista de espera, ficha do paciente e nova consulta pela API (F3, F5, F21, F22)`.

### Etapa 9: telas do médico

**Arquivos:** `medico.js`, `medico.html`.

**Rotas:** `GET /medicos/{medicoId}/agenda?data=` (consultas, histórico, exames, retornos), `GET /medicos/{id}` (L2: perfil com CRM, especialidade, sala e expediente; o nome fixo em `medico.html:105,109,390-396` e o `'Dr.'` de `medico.js:1207` saem), `PUT /medicos/{id}` (sem CRM; B4), `PUT /consultas/{id}/status` (iniciar só a partir de `na_recepcao`, F23; finalizar com `atendida`), `POST /consultas/{id}/falta` (F24), `POST /retornos {consulta, data|null, nota}` (F25, data com `dataISO`), `POST /exames {consulta,nome}`, "Sair", trocar a senha, e "Reduzir movimento" lido da opção salva.

**Passos:**
- [ ] Testar pela tela: o médico vê a consulta do dia, inicia depois da chegada, finaliza, marca o retorno sem data (`data:null`) e pede um exame. O paciente vê os dois em "Depois da consulta".
- [ ] **Ponto de checagem B:** web e app inteiros com os 4 perfis.
- [ ] Commit: `Etapa 9: área do médico pela API (L2, F23, F24, F25)`.

### Etapa 10: app do paciente pela API

`USAR_API_REAL = true`. Cada serviço de `src/servicos/` passa a chamar a rota real, conforme o Apêndice L. O caminho simulado continua no código até a etapa 11.

#### 10a: sessão, família, consultas, situação e presença
- **Mudanças:** `familia.js` (F35: alergias `null` mostram "Nenhuma informada" só na tela), `consultas.js` (`{proximas,passadas}`), `buscarSituacao` (F5), "Não vou" por `PUT …/presenca {vou:false}`.
- **Remoção:** `idade` deixa de existir no dado e passa a ser calculada (F6).
- **Commit:** `10a: app — família, consultas e presença pela API (F5, F6, F35)`.

#### 10b: agendar, assistente, fila e vaga
- **Mudanças:**
  - `medicos.js` usa `/clinicas/{c}/especialidades` (F11) e `/horarios-livres`;
  - o assistente fica assíncrono: busca as especialidades reais pelo nome, sem `desc` (F16), e com os parentescos válidos (F31);
  - o alerta de emergência continua local;
  - `espera.js` usa as rotas reais, com o `catch` do F36.
- **Commit:** `10b: app — agendar, assistente e lista de espera pela API (F2, F11, F16, F31, F36)`.

#### 10c: depois da consulta, prevenção, notificações e perfil
- **Mudanças:**
  - `acompanhamento.js` (F28);
  - `prevencao.js` (F30: sem `exg-1/2`; `catch`, F36);
  - `notificacoes.js` (sem "Simular notificação");
  - Perfil com `GET /pacientes/{id}` e a clínica de `GET …/clinicas`;
  - o sino com o número visível.
- **Commit:** `10c: app — acompanhamento, prevenção, notificações e perfil pela API (F28, F30, L4)`.

**Aceite da etapa 10:** os mesmos roteiros da etapa 7, feitos no app.

### Etapa 10b: funcionalidades e acessibilidade que faltam

O que a Fase 0 marcou como "pela metade" ou "não existe" e que ainda não foi resolvido nas etapas acima:

**Web:**
- link "Pular para o conteúdo" em **todas** as páginas;
- `aria-live` no filtro da Prevenção;
- selo de texto nos blocos da agenda;
- o médico respeita a opção "Reduzir movimento";
- o assistente do desktop usa `triagem.js`: mesma lista de emergência, `role="alert"`, CVV 188 e o aviso fixo "Não faço diagnóstico. Em emergência, ligue 192";
- a tela de Notificações no desktop;
- "Trocar de clínica" no mobile;
- o contorno de foco de `menu-consulta.css:32`.

**App:**
- a grade do mês com no mínimo 48 dp;
- o `spring` de `NotificacoesTela.js:31` respeitando "Reduzir movimento".

**Contraste:** medir as razões declaradas no Apêndice A (7:1, 9:1 e 6,2:1) com um script sobre os tokens. Se alguma não bater, corrigir o token.

**Passos:**
- [ ] Rodar o Playwright em cada página: Tab mostra o link de pular e o foco visível. Conferir as contagens do contraste.
- [ ] Commit: `10b: acessibilidade e funções que faltavam (Apêndice A)`.

### Etapa 11: remoção dos dados fictícios

**Arquivos:**
- Apagar `aplicativo/src/dados/bancoSimulado.js` e `dadosFicticios.js` e a chave `USAR_API_REAL`, com o caminho simulado em todos os serviços.
- Web: tirar a carga de `dados.js` (linhas 13–298), `semear()` e o "banco" de `api.js:94-149`, as constantes de `clinica-dados.js:106-183`, os textos fixos do inventário da Fase 0 e as cores `--id-juliana…` (que viram `--id-1…`).

**Regras:**
- Toda tela tem os três estados: carregando, vazio (por exemplo "Nenhuma consulta marcada") e erro.
- **Exceção:** a ilustração do celular em `index.html:126-743`. Antes de mexer, mostrar ao grupo a lista do que é fictício nela e perguntar.

**Passos:**
- [ ] Rodar `grep -ri "juliana\|davi\|fernanda\|ipê\|ipe-4821\|bancoSimulado\|dadosFicticios\|USAR_API_REAL"` em `frontend` (fora do `index.html` combinado) e em `aplicativo/src`: nenhum resultado.
- [ ] Commit: `Etapa 11: remove dados fictícios; telas com carregando, vazio e erro`.

### Etapa 12: começo do zero

**Passos:**
- [ ] Recriar o `AgendaPro_Saude_App`: `DROP` e criar de novo pelo script completo. Depois rodar o `dados-prevencao.sql`.
- [ ] Fazer o fluxo inteiro pelas telas, com evidência:
  1. o dono se cadastra e cria a clínica (anotar o código);
  2. cadastra a especialidade, o médico com expediente, a recepcionista e um feriado;
  3. o paciente se cadastra pelo app com o código e agenda;
  4. a consulta aparece na recepção e no médico.
- [ ] Abrir cada tela antes de existir qualquer dado: nenhuma quebra ou trava.
- [ ] **Ponto de checagem C:** os 4 perfis, web e app.
- [ ] Commit: `Etapa 12: primeiro uso a partir do banco vazio`.

---

## Depois do plano

- **Fase 3:** os roteiros 0–6 do prompt, com o banco vazio.
- **Fase 4:** o relatório final, com a seção "Mudanças no back-end" para o Thiago: as rotas novas e os bugs corrigidos. O banco não muda.

## Pendências registradas durante a Etapa 8 (decisão do Andrey)

1. **Dados pessoais da equipe sem rota para alterar.** Nenhuma rota deixa o dono ou a recepção mudar o próprio nome,
   e-mail ou telefone (`Usuarios.Telefone` existe, mas não há rota para ele; o ramal não existe no banco). Desde a 8a,
   `conta.html` mostra o nome e o e-mail só para leitura, e saíram o telefone e o ramal, que antes eram gravados só no
   navegador. Para resolver, seria preciso uma rota nova (por exemplo `PUT /api/usuarios/{id}`, só a própria conta).
2. **Token antigo continua valendo depois da troca de senha.** O `PUT /api/usuarios/{id}/senha` troca o `SenhaHash`,
   mas os tokens já emitidos continuam válidos até vencer (8 h para a equipe, 30 dias para o paciente). O que existe
   hoje: o `OnTokenValidated` (`Program.cs`) já consulta o banco em toda requisição (`EstaAtivoAsync`), e `Usuarios`
   não tem coluna com a data da troca de senha (só `CriadoEm`). As opções:
   - **A. Selo da senha no token, sem coluna nova.** No login, o token ganha uma claim com os 16 primeiros caracteres
     de um HMAC-SHA256 do `SenhaHash`, feito com a `Jwt:Chave`. O hash da senha não vai para o token. A consulta que
     já confere `Ativo` passa a ler também o `SenhaHash` e compara os dois; se não bater, a resposta é 401. Como o
     BCrypt usa um sal novo a cada troca, qualquer troca derruba todos os tokens antigos. Custo: umas 25 linhas
     (TokenServico, Program, UsuarioRepositorio), nenhuma consulta a mais e nenhuma mudança no banco. Efeitos: quem
     troca a senha precisa entrar de novo, e as telas teriam de fazer o login depois da troca. Os tokens emitidos
     antes da mudança, que não têm o selo, passam a dar 401, e cada pessoa entra de novo uma vez.
   - **B. Comparar o `iat` do token com a data da troca.** Precisa de uma coluna nova (`SenhaAlteradaEm`) e da
     gravação dela na troca. Muda o banco.
   - **C. Token do paciente mais curto.** Muda só a configuração (`Jwt:DiasValidadePaciente` no appsettings). A janela diminui, mas o
     problema continua.
   - **D. Tabela de tokens revogados (`jti`).** Tabela nova, uma consulta a mais em toda requisição e limpeza
     periódica dos tokens vencidos. É a mais cara.
