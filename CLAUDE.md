# AgendaPro Saúde: regras do back-end

Este repositório é o PIM IV do grupo (sistema de agendamento de consultas). Nesta sessão, o trabalho é
**somente o back-end**: a API REST em `backend/`. Front-end web e aplicativo são de outros integrantes.

## Fonte da verdade

- `backend/docs/especificacao-api.md` é a documentação oficial do back-end (rotas, perfis, erros, token,
  camadas, pastas, tecnologias). Siga à risca: mesmos caminhos de rota, nomes de classes e pastas.
- Banco: SQL Server Express, instância `.\SQLEXPRESS`, banco `AgendaPro_Saude`, já criado pelo script
  oficial. Para nomes exatos de tabelas, colunas, parâmetros das procedures e códigos de erro, consulte o
  banco (`sqlcmd -S .\SQLEXPRESS -E -C -d AgendaPro_Saude -Q "..."`), por exemplo `sp_helptext 'sp_AgendarConsulta'`.
- Formato dos campos JSON que a especificação não detalha: siga os contratos dos colegas
  (`docs/relatorio-integracao.md`, `aplicativo/docs/aplicativo-integracao-api.md`, `docs/banco-x-telas.md`).
  Em conflito com a especificação, **a especificação vence** (ver Pendências).
- Se algo precisar fugir da especificação, **pare e pergunte** antes de implementar.

## Escopo de edição

- Pode criar e editar arquivos só em `backend/` e neste `CLAUDE.md`.
- **Nunca edite** `frontend/`, `aplicativo/`, `docs/` (pasta da raiz) nem `.claude/`. Pode ler para consultar.
- Nunca altere o banco (tabelas, procedures, triggers). A API só lê e grava dados e chama procedures.
  Inserir dados de teste é permitido só quando o usuário pedir.

## Tecnologia (Apêndice M)

- .NET 10, ASP.NET Core Web API com **controllers** (não minimal APIs). Projeto em `backend/AgendaPro.Api.csproj`,
  namespace raiz `AgendaPro.Api`.
- Acesso a dados: **Dapper** + `Microsoft.Data.SqlClient`. **Não usar Entity Framework.**
- Senhas: `BCrypt.Net-Next`, fator de custo 12.
- Autenticação: `Microsoft.AspNetCore.Authentication.JwtBearer`, assinatura HMAC-SHA256.
- Documentação e testes: Swagger/OpenAPI, com botão **Authorize** para colar o token JWT.

## Arquitetura (seção 7.1 e Apêndice N)

- Pastas: `Controllers/`, `Servicos/`, `Repositorios/`, `Modelos/`, `Dtos/`, `Middlewares/`, `Tarefas/`.
- Camadas: Controller → Serviço (interface + classe) → Repositório (interface + classe) → banco.
  Só os repositórios acessam o banco. Injeção de dependência pelo construtor.
- `ApiControllerBase`: classe base dos controllers; lê do token o id do usuário, o perfil, a clínica e o médico.
- `ExpiracaoOfertasServico` (em `Tarefas/`): hosted service que chama `sp_ExpirarOfertasVencidas` a cada minuto.
- Nomes previstos na documentação: `IConsultaRepositorio`, `IConsultaServico`, `ApiControllerBase`,
  `ExpiracaoOfertasServico`. Siga o mesmo padrão para os demais assuntos (ex.: `IPacienteServico`).

## Regras obrigatórias

1. **Identidade vem do token, nunca da requisição.** Id do usuário, perfil, clínica e médico saem das claims
   (`sub`, `role`, `clinica`, `medico`). Ignore qualquer `idUsuarioLogado` enviado no corpo ou na query.
   Parâmetros de procedure como `@IdUsuario`, `@PelaRecepcao` e `@PeloPaciente` são preenchidos pelo token.
2. Rotas `/api/pacientes/{id}/...`: `{id}` é o id da conta (usuário) do titular; se for diferente do token → 403.
   Familiar, consulta ou entrada da fila que não pertença à conta → 403 "Você só pode gerenciar a sua família.".
   Equipe (dono, recepção, médico): toda consulta filtrada pela clínica do token; outra clínica → 403.
3. Permissões por rota com `[Authorize(Roles = "...")]`, conforme a coluna "Perfis" do Apêndice C.
   Só `POST /api/auth/login`, `POST /api/pacientes` e `POST /api/clinicas` são `[AllowAnonymous]`.
4. **Erros**: sempre `{ "mensagem": "..." }`. Um middleware converte `SqlException` com número 50001–50041
   pelo Quadro 5.1 (404: 50001, 50002, 50020, 50031, 50033, 50041; demais → 400) e repassa o texto da
   procedure sem alterar. Erro inesperado → 500 "Não foi possível concluir agora. Tente de novo." e detalhe só no log.
5. Login: mesma mensagem para e-mail inexistente e senha errada, 401 "E-mail ou senha incorretos".
   Limite de 5 tentativas por minuto por IP → 429 "Muitas tentativas. Aguarde um minuto e tente de novo.".
6. Token: 8 horas para equipe, 30 dias para paciente. Nunca colocar senha ou dado de saúde no token.
7. SQL sempre parametrizado (Dapper). Nunca montar SQL concatenando texto do usuário.
8. JSON em camelCase; datas `AAAA-MM-DD`; horas `HH:MM`. Status traduzidos pelo Apêndice D na camada de serviços.
9. Validação repetida no servidor (DTOs com atributos de validação), com as mesmas mensagens das telas.
10. Segredos (string de conexão e chave do JWT) **fora do código**: `dotnet user-secrets` no desenvolvimento.
    `appsettings.json` só com configurações sem segredo. Logs nunca registram senha, token ou dado de saúde.
11. CORS: liberar só as origens da aplicação web, lidas da configuração (`Cors:Origens`).

## Fluxo de trabalho

- Uma etapa por vez, na ordem do Apêndice T. Antes de codar, apresente o plano da etapa e espere aprovação.
- Ao terminar: `dotnet build` sem erros, rodar a API, testar as rotas da etapa e listar o que testar no Swagger.
- Commit só com arquivos do back-end: `git add backend CLAUDE.md`. Nunca `git add .` ou `git add -A`.
  Mensagem em português, curta, descrevendo a etapa. Não faça `git push` sem o usuário pedir.
- Explique de forma simples o que cada arquivo novo faz: o usuário precisa defender o projeto na banca.

## Pendências (decidir depois; até lá, seguir a especificação)

1. CPF repetido: contrato dos colegas usa 409; especificação usa 400. **Usar 400** com "Este CPF já está cadastrado.".
2. Edição de especialidade: a web edita, mas não há rota na especificação. **Não criar rota.**
3. Lista de especialidades do app: contrato usa `GET /api/especialidades`; especificação usa
   `GET /api/clinicas/{id}/especialidades`. **Seguir a especificação.**
4. Cadastro do app: contrato chama `POST /api/usuarios` + `POST /api/pacientes`; especificação só
   `POST /api/pacientes`, que cria a conta e o titular. **Seguir a especificação.**
5. `idUsuarioLogado` ainda aparece no contrato: **ignorar** (regra 1).
6. Mensagem do erro 50012: a procedure diz "Horário reservado para oferta da lista de espera."; a tela espera
   "Este horário está reservado para a lista de espera.". **Repassar o texto da procedure** (regra 4).
