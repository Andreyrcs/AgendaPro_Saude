# AgendaPro Saúde: regras do back-end

Este repositório é o PIM IV do grupo (sistema de agendamento de consultas). Nesta sessão, o trabalho é
**somente o back-end**: a API REST em `backend/AgendaPro.Api/`. Front-end web e aplicativo são de outros integrantes.

O usuário precisa **defender este código na banca**. Ele construiu à mão a base do projeto e vai revisar
cada plano antes da execução. Explique de forma simples o que cada arquivo novo faz e de onde vem cada regra.

## Regra número 1: não inventar

Só entra no código o que estiver na documentação ou no SQL. Ordem das fontes:

1. `backend/docs/especificacao-api.md` (documentação oficial do back-end) e o script do banco
   (Apêndice Q, já aplicado no banco `AgendaPro_Saude`).
2. **Quando os dois não definirem um detalhe** (nome de campo no JSON, texto de mensagem, valor de um campo),
   siga o que o front do grupo já espera: o código em `frontend/assets/js/` e `aplicativo/src/` e os contratos
   `docs/relatorio-integracao.md`, `aplicativo/docs/aplicativo-integracao-api.md`, `docs/banco-x-telas.md`.
   Em conflito com a especificação, **a especificação vence** (ver Pendências).
   No front web, as regras e mensagens de `frontend/assets/js/api.js` **valem** (é a API simulada do front);
   as regras que só as telas conferem (`cadastro-clinica.js`, `pagina-conta.js` etc.: mínimo de letras,
   nome e sobrenome, formato do e-mail, senha com letras e números) **não** são repetidas na API.
3. Se nem a documentação, nem o SQL, nem o front definirem, **pare e pergunte**. Não decida sozinho.

Exemplos do que **não** fazer sem fonte: validações extras (formato de e-mail, regras que só a tela confere),
campos a mais na resposta, pastas ou classes que não estão no Apêndice N, configurações "de boa prática"
(audience no JWT, truques contra ataque de tempo), mensagens novas onde o front já tem uma.

No plano de cada etapa, indique a **fonte** de cada regra (seção, apêndice, tabela do SQL ou arquivo do front).

## Escopo de edição

- Pode criar e editar arquivos só em `backend/` e neste `CLAUDE.md`.
- **Nunca edite** `frontend/`, `aplicativo/`, `docs/` (pasta da raiz) nem `.claude/`. Pode ler para consultar.
- Nunca altere o banco (tabelas, procedures, triggers). A API só lê e grava dados e chama procedures.
  Inserir dados de teste é permitido só quando o usuário pedir.
- **Não altere o que já está pronto e testado** (ver "Estado atual") sem apresentar o motivo e pedir aprovação.

## Banco de dados

- SQL Server Express, instância `.\SQLEXPRESS`, banco `AgendaPro_Saude`.
- Para nomes exatos de tabelas, colunas, parâmetros das procedures e códigos de erro, consulte o banco:
  `sqlcmd -S .\SQLEXPRESS -E -C -d AgendaPro_Saude -Q "..."`, por exemplo `sp_helptext 'sp_AgendarConsulta'`.
- Atenção aos nomes reais: tabela `Clinica` (singular), colunas `Id_Usuario`, `Nome_paciente`, `Data_Nascimento`,
  `Nome_Espec` etc. Use `AS` no SELECT para casar com as propriedades dos modelos.
- Collation do banco é case-insensitive: comparações de texto não diferenciam maiúsculas de minúsculas.

## Tecnologia (Apêndice M)

- .NET 10, ASP.NET Core Web API com **controllers** (não minimal APIs).
  Projeto em `backend/AgendaPro.Api/AgendaPro.Api.csproj`, solução `backend/AgendaPro.Api/AgendaPro.Api.slnx`,
  namespace raiz `AgendaPro.Api`.
- Acesso a dados: **Dapper** + `Microsoft.Data.SqlClient`. **Não usar Entity Framework.**
- Senhas: `BCrypt.Net-Next`, fator de custo 12.
- Autenticação: `Microsoft.AspNetCore.Authentication.JwtBearer`, assinatura HMAC-SHA256.
- Swagger: `Microsoft.AspNetCore.OpenApi` (`/openapi/v1.json`) + `Swashbuckle.AspNetCore.SwaggerUI` em `/swagger`,
  só em Development, com botão **Authorize** já configurado.
- Não instale pacotes fora do Apêndice M sem pedir.

## Arquitetura (seção 7.1 e Apêndice N)

- Pastas: `Controllers/`, `Servicos/`, `Repositorios/`, `Modelos/`, `Dtos/`, `Middlewares/`, `Tarefas/`.
  Não crie outras pastas.
- Camadas: Controller → Serviço (interface + classe) → Repositório (interface + classe) → banco.
  Só os repositórios acessam o banco. Uma interface e uma classe **por assunto** (`IClinicaRepositorio`,
  `IMedicoRepositorio`...). Injeção de dependência pelo construtor, sempre recebendo a **interface**.
- `ExpiracaoOfertasServico` (em `Tarefas/`): hosted service que chama `sp_ExpirarOfertasVencidas` a cada minuto.

## Padrões já construídos (siga exatamente)

- **Conexão:** `IFabricaConexao.CriarConexao()` (classe `FabricaConexao`, Singleton). Cada método de repositório
  abre a sua conexão com `using var conexao = _fabrica.CriarConexao();`.
- **Transação** (gravações em mais de uma tabela): `conexao.Open()`, `using var transacao = conexao.BeginTransaction()`,
  passar `transacao` em cada comando do Dapper e `transacao.Commit()` no fim. Exemplo: `PacienteRepositorio.CriarContaComTitularAsync`.
- **Modelos** (`Modelos/`): só as colunas da tabela, nada a mais. Datas como `DateTime`, horas como `TimeSpan`
  (o Dapper não converte `DateOnly`/`TimeOnly`).
- **DTOs** (`Dtos/`): requisições como classe com DataAnnotations; respostas como `record`. Datas de entrada como
  `DateOnly?` (convertidas com `ToDateTime(TimeOnly.MinValue)`). O hash da senha nunca sai da API.
- **Controllers:** `[ApiController]` e herdam de **`ApiControllerBase`** (todos, inclusive o `AuthController`).
  A `ApiControllerBase` oferece `IdUsuarioLogado` (sub), `PapelLogado` (role), `ClinicaLogada` (clinica, `int?`)
  e `MedicoLogado` (medico, `int?`). Use-as; nunca leia identidade do corpo ou da query.
- **Permissões:** `[Authorize(Roles = "...")]` com os perfis do Apêndice C em minúsculas
  (`paciente`, `medico`, `recepcao`, `dono`; "Todos" = os quatro). Públicas: `[AllowAnonymous]`.
- **Erros:** o serviço lança `ErroApi(statusCode, mensagem)`; o `ErroMiddleware` responde `{ "mensagem": "..." }`
  (classe `RespostaErro`). Validação de DTO cai em `RespostaValidacao.Criar`. Controllers não usam try/catch.
- **Status de sucesso:** 200 com `Ok(...)`; criação com `StatusCode(StatusCodes.Status201Created, resposta)`;
  204 com `NoContent()` quando o front não espera nada de volta (ex.: troca de senha).
- **403:** `Forbid()` no controller, **sem corpo** (igual ao 403 do `[Authorize]`), para `{id}` de outra conta
  e para outra clínica. Só o 403 de familiar de outra conta leva mensagem (regra 2).
- **Registro no `Program.cs`:** sempre **antes** de `builder.Build()`. Repositórios e serviços `AddScoped`;
  classes sem estado por requisição (`FabricaConexao`, `TokenServico`) `AddSingleton`.
- **Configuração:** ler com `IConfiguration` no construtor (como `FabricaConexao` e `TokenServico`), com
  `?? throw new InvalidOperationException(...)` quando obrigatória.
- **Texto digitado:** a API repete o tratamento que a tela já faz: e-mail `Trim().ToLowerInvariant()`,
  nome `Trim()`, código da clínica `Trim().ToUpperInvariant()`, UF `Trim().ToUpperInvariant()`.
  Da clínica (api.js): CNPJ gravado formatado `00.000.000/0000-00`, montado a partir dos 14 números
  (`ValidadorCnpj.Formatar`, também usado para conferir se já existe); telefone como `formatarTelefone`
  (`(00) 0000-0000` com 10 ou mais números; com menos, como foi digitado). Não acrescente outros tratamentos.
- **CPF e CNPJ:** dígitos verificadores e recusa de números com todos os dígitos iguais
  (`validarCPF` e `validarCNPJ` em api.js), em `ValidadorCpf` e `ValidadorCnpj`.

## Regras obrigatórias

1. **Identidade vem do token, nunca da requisição.** Id do usuário, perfil, clínica e médico saem das claims
   (`sub`, `role`, `clinica`, `medico`). Ignore qualquer `idUsuarioLogado` enviado no corpo ou na query.
   Parâmetros de procedure como `@IdUsuario`, `@PelaRecepcao` e `@PeloPaciente` são preenchidos pelo token.
2. Rotas `/api/pacientes/{id}/...` e `/api/usuarios/{id}/...`: `{id}` é o id da conta (usuário); se for diferente
   de `IdUsuarioLogado` → `Forbid()` (403 sem corpo).
   Familiar, consulta ou entrada da fila que não pertença à conta → 403 "Você só pode gerenciar a sua família.".
3. **Filtro da clínica (seção 5.4):** em toda rota usada pela equipe (dono, recepção, médico) com `{id}` de clínica
   ou dado de uma clínica, comparar com `ClinicaLogada`; outra clínica → `Forbid()` (403 sem corpo). Cada conta da
   equipe tem uma única clínica (`Usuarios.IdClinica`).
4. Só `POST /api/auth/login`, `POST /api/pacientes` e `POST /api/clinicas` são `[AllowAnonymous]`.
5. **Erros do banco:** `SqlException` 50001–50041 pelo Quadro 5.1 (404: 50001, 50002, 50020, 50031, 50033, 50041;
   demais → 400), texto da procedure repassado sem alterar. Erro inesperado → 500 "Não foi possível concluir agora.
   Tente de novo." e detalhe só no log. Regras que o banco já confere com UNIQUE/CHECK e que o usuário pode violar
   (e-mail, CPF, nascimento) são conferidas antes no serviço, para responder 400 com mensagem clara.
6. Login: 401 "E-mail ou senha incorretos" (sem ponto) para e-mail inexistente, conta inativa e senha errada.
   Limite de 5 tentativas por minuto por IP → 429 "Muitas tentativas. Aguarde um minuto e tente de novo.".
7. Token: validade no `appsettings.json` (`Jwt:HorasValidadeEquipe` = 8, `Jwt:DiasValidadePaciente` = 30),
   emissor `Jwt:Emissor`, chave `Jwt:Chave` nos user-secrets. Sem audience. Nunca senha ou dado de saúde no token.
8. SQL sempre parametrizado (Dapper). Nunca montar SQL concatenando texto do usuário.
9. JSON em camelCase; datas `AAAA-MM-DD`; horas `HH:MM`. Status traduzidos pelo Apêndice D na camada de serviços.
10. Segredos (string de conexão e chave do JWT) **fora do código**, em user-secrets. Logs nunca registram senha,
    token ou dado de saúde.
11. CORS: liberar só as origens da aplicação web, lidas da configuração (`Cors:Origens`).
12. HTTPS com redirecionamento e HSTS só fora de Development (publicação em nuvem, seção 5.4).

## Estado atual (pronto, testado e commitado)

| Rota | Situação |
|---|---|
| `POST /api/auth/login` | Pronta: JWT com claims do Apêndice F, resposta do Apêndice E |
| `POST /api/pacientes` | Pronta: conta + titular + vínculo opcional por `codigo` na mesma transação |
| `GET /api/clinicas/{id}/especialidades` | Pronta, com `[Authorize]` (falta o filtro da clínica da regra 3) |
| `POST /api/clinicas` | Feita, **falta teste no Swagger e commit**: clínica + conta `DONO` na mesma transação, código `AAA-0000` como `gerarCodigo` (api.js), 201 sem token |
| `PUT /api/usuarios/{id}/senha` | Feita, **falta teste no Swagger e commit**: confere a senha atual, 204 sem corpo |

Também prontos: `ErroMiddleware`, `RespostaValidacao`, `ValidadorCpf`, `ValidadorCnpj`, JwtBearer (assinatura,
emissor, validade), `ApiControllerBase`, botão Authorize do Swagger.

Faltam (Apêndice T): Especialidades e horários, Consultas, Lista de espera, Área da clínica, Área do médico, Acompanhamento e prevenção, Segurança
(limite de login, CORS, HTTPS) e `ExpiracaoOfertasServico`.

Dados de teste no banco: Clínica Ipê (id 1, código `IPE-4821`) com 3 especialidades; pacientes Ana, Bruno,
Carla (vinculada à clínica 1) e Diego, todos com senha `senha1234`.

## Fluxo de trabalho

- Uma etapa por vez, na ordem do Apêndice T. **Antes de codar, apresente o plano da etapa** (arquivos, rotas,
  perfis, regras e a fonte de cada uma) **e espere aprovação.**
- Ao terminar: `dotnet build` sem erros e a lista do que testar no Swagger, com os corpos de exemplo e o resultado
  esperado de cada teste (sucesso, 400, 401, 403, 404).
- Commit só com arquivos do back-end: `git add backend CLAUDE.md` a partir da raiz. Nunca `git add .` na raiz
  nem `git add -A`. Confira o `git status` antes: nenhum arquivo gerado por engano (ex.: `Interface.cs`).
  Mensagem em português, curta, descrevendo a etapa. **Não faça commit nem `git push` sem o usuário pedir.**

## Pendências (decididas ou a decidir; até lá, seguir a especificação)

1. CPF repetido: contrato dos colegas usa 409; especificação usa 400. **Usar 400** com "Este CPF já está cadastrado.".
2. Edição de especialidade: a web edita, mas não há rota na especificação. **Não criar rota.**
3. Lista de especialidades do app: contrato usa `GET /api/especialidades`; especificação usa
   `GET /api/clinicas/{id}/especialidades`. **Seguir a especificação.**
4. Cadastro do app: chama `POST /api/usuarios` e depois `POST /api/pacientes`; especificação só tem
   `POST /api/pacientes`, que cria a conta e o titular. **Seguir a especificação.**
5. `idUsuarioLogado` ainda aparece no contrato: **ignorar** (regra 1).
6. Mensagem do erro 50012: a procedure diz "Horário reservado para oferta da lista de espera."; a tela espera
   "Este horário está reservado para a lista de espera.". **Repassar o texto da procedure** (regra 5).
7. Código da clínica no cadastro: implementado como o Apêndice C pede (campo opcional `codigo`; inexistente → 404
   "Não achamos uma clínica com esse código. Confira com a recepção." e nada é gravado). Os fronts vinculam pelas
   rotas separadas `GET /api/clinicas/codigo/{codigo}` e `POST /api/pacientes/{id}/clinicas`.
8. `POST /api/pacientes/{id}/clinicas`: a web envia o id da clínica e o app envia `{ codigo }`. **Decidir com o
   usuário** ao construir a rota.
9. Textos de validação sem definição no documento ("CPF inválido.", "Informe o nome." etc.): **manter** os atuais
   e seguir o mesmo tom nos novos (frase curta, simples, com ponto).
10. Parentesco do titular: `"Titular"` (valor usado pelo front).
11. Equipe em várias clínicas: não suportado pelo modelo (`Usuarios.IdClinica` único). Não implementar.
12. E-mail repetido (api.js): no paciente "Este e-mail já tem uma conta. Entre com ele ou use outro."; na clínica
    "Este e-mail já tem uma conta. Use outro ou entre com ele.".
13. Cadastros simultâneos com o mesmo CNPJ, e-mail ou código sorteado: o índice único do banco recusa e sai 500.
    **Não tratar** (decidido com o usuário).
