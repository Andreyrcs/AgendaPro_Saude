# AgendaPro Saúde: API (back-end)

API REST do AgendaPro Saúde em ASP.NET Core (.NET 10), com Dapper e SQL Server.
A documentação oficial das rotas está em [docs/especificacao-api.md](docs/especificacao-api.md).
O que a web e o app precisam ajustar para usar a API está em [docs/ajustes-front.md](docs/ajustes-front.md).

## Como rodar

1. **SDK do .NET 10** instalado (`dotnet --version`).
2. **Banco:** SQL Server na instância padrão da máquina (`localhost`, autenticação do Windows). O script oficial é
   `banco/agendapro_saude_sqlserver.sql` (pasta `banco/` na raiz do repositório). Ele cria o banco `AgendaPro_Saude`
   com as tabelas, a visão, as procedures e os triggers, e grava só os dados do sistema (`Status_Consulta` e
   `Parametros`). Na raiz do repositório:

   ```
   sqlcmd -S localhost -E -C -I -f 65001 -i banco\agendapro_saude_sqlserver.sql
   sqlcmd -S localhost -E -C -I -f 65001 -d AgendaPro_Saude -i backend\docs\dados-prevencao.sql
   ```

   O segundo comando grava o catálogo de campanhas de prevenção (sem ele, a tela de prevenção fica vazia).
   Para usar outro nome de banco (por exemplo `AgendaPro_Saude_App`), faça uma cópia do script trocando o nome nas
   linhas do `IF DB_ID(...)`, do `CREATE DATABASE` e do `USE`, e passe o mesmo nome no `-d` e na connection string.
3. **Segredos** (ficam fora do código, nos user-secrets). Na pasta `backend/AgendaPro.Api`:

   ```
   dotnet user-secrets set "ConnectionStrings:AgendaPro" "Server=localhost;Database=AgendaPro_Saude;Trusted_Connection=True;TrustServerCertificate=True"
   dotnet user-secrets set "Jwt:Chave" "<chave aleatória>"
   ```

   A chave do JWT precisa ter pelo menos 32 caracteres (assinatura HMAC-SHA256). Gere uma aleatória e nunca a
   coloque em arquivo do repositório. No PowerShell:

   ```
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
   dotnet user-secrets set "Jwt:Chave" ([Convert]::ToBase64String($b))
   ```
4. **Rodar**, na pasta `backend/AgendaPro.Api`:

   | Comando | Endereço | Para quê |
   |---|---|---|
   | `dotnet run --launch-profile http` | `http://localhost:5080` | Só na própria máquina (abre o Swagger) |
   | `dotnet run --launch-profile rede-local` | `http://0.0.0.0:5080` | Para o celular e os colegas na mesma rede Wi-Fi |

   No perfil `rede-local`, os outros acessam pelo IP do computador que roda a API (`ipconfig`, linha "IPv4"),
   por exemplo `http://192.168.0.10:5080`. Na primeira vez, o Windows pode pedir para liberar o programa no
   firewall: aceite para "redes privadas". No app, troque `ENDERECO_API` em `aplicativo/src/servicos/config.js`
   para esse endereço (porta **5080**).

## CORS (web)

O navegador só deixa a página chamar a API se a origem dela estiver em `Cors:Origens`, no
`AgendaPro.Api/appsettings.json`. Hoje estão liberadas as do Live Server:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Se a web rodar em outro endereço ou porta (por exemplo, na apresentação com dois notebooks, a web aberta por
`http://<IP-do-servidor>:5500`), acrescente a origem **no user-secrets**, sem mexer no `appsettings.json`, e
reinicie a API. O índice continua a lista do arquivo, que já tem os itens 0 e 1:

```
dotnet user-secrets set "Cors:Origens:2" "http://192.168.0.10:5500"
dotnet user-secrets set "Cors:Origens:3" "http://outro-endereco:5500"
```

Para tirar uma origem: `dotnet user-secrets remove "Cors:Origens:2"`.
O app do celular não passa pelo CORS (não é navegador).

## Erros

Toda resposta de erro vem como `{ "mensagem": "..." }`. Além dos códigos do Quadro 5.1, a API responde **409**
quando dois pedidos tentam gravar o mesmo dado ao mesmo tempo (por exemplo, dois cadastros com o mesmo CPF ou
e-mail): o segundo recebe 409 com a mesma mensagem da checagem normal ("Este CPF já está cadastrado.",
"Este e-mail já tem uma conta. Entre com ele ou use outro."). Fora da corrida, a checagem continua respondendo 400.

## Swagger e token

1. Com a API rodando, abra `http://localhost:5080/swagger` (só em Development).
2. Chame `POST /api/auth/login` com:

   ```json
   { "email": "ana@email.com", "senha": "senha1234" }
   ```

   A resposta traz `token`, `expiraEm` e `usuario` (`idUsuario`, `nome`, `email`, `papel`, `clinicaId`, `medicoId`).
3. Copie o valor de `token`, clique em **Authorize** (cadeado no alto da página), cole o token (sem a palavra
   `Bearer`) e confirme. As próximas chamadas vão com `Authorization: Bearer <token>`.

Nas telas, envie o mesmo cabeçalho `Authorization: Bearer <token>` em toda rota que não seja pública.
Públicas: `POST /api/auth/login`, `POST /api/pacientes` e `POST /api/clinicas`.

## Dados de teste

Todos os dados são fictícios. **Estas contas não existem num banco criado pelo script**: foram criadas em testes
locais. Num banco novo, crie a clínica e o dono por `POST /api/clinicas` e o paciente por `POST /api/pacientes`.

| Conta | Senha | Perfil | Clínica |
|---|---|---|---|
| `ana@email.com` | `senha1234` | Paciente | — |
| `bruno@email.com` | `senha1234` | Paciente | — |
| `carla@email.com` | `senha1234` | Paciente | Vinculada à 1 |
| `diego@email.com` | `senha1234` | Paciente (com dois familiares) | Vinculado às 1, 2 e 3 |
| `eva575609@teste.com` | `senha1234` | Paciente | — |
| `fabio575609@teste.com` | `senha1234` | Paciente | — |
| `dono@clinicajacaranda.com.br` | `nova1234` | Dono | 2 |
| `rita.recepcao@clinicajacaranda.com.br` | `xpass373` | Recepção | 2 |
| `medum575609@teste.com` | `khued611` | Médico | 2 |
| `meddois575609@teste.com` | `zafdq923` | Médico | 2 |
| `medped575609@teste.com` | `rvcsy224` | Médico (pediatria) | 2 |
| `medrecep@teste.com` | `afjef908` | Médico | 2 |
| `donob@teste.com` | `senha1234` | Dono | 3 |

| Clínica | Id | Código |
|---|---|---|
| Clínica Ipê | 1 | `IPE-4821` |
| Clínica Jacarandá | 2 | `JAC-1206` |
| Clinica Teste B | 3 | `TES-5118` |

## O que mudou em relação ao contrato antigo

Os contratos `docs/relatorio-integracao.md` e `aplicativo/docs/aplicativo-integracao-api.md` foram escritos antes
da especificação. Onde os dois divergem, a API segue a especificação:

1. **Sem `idUsuarioLogado`.** Quem está logado sai do token. O `idUsuarioLogado` enviado no corpo ou na query é
   ignorado. Em `/api/pacientes/{id}/...` e `/api/usuarios/{id}/...`, o `{id}` é o `idUsuario` da conta logada;
   outro id responde 403.
2. **Cadastro do paciente numa chamada só:** `POST /api/pacientes` cria a conta e o titular juntos, com
   `{ nome, email, senha, telefone, cpf, nascimento, alergias, codigo }` (`telefone`, `alergias` e `codigo`
   opcionais). Não existe `POST /api/usuarios`. O parentesco do titular é `"Titular"`.
3. **CPF repetido responde 400** (não 409), com "Este CPF já está cadastrado.".
4. **Especialidades:** `GET /api/clinicas/{id}/especialidades` (não `GET /api/especialidades`), com
   `{ id, nome, duracao }`. Não há rota para editar especialidade.
5. **Vínculo com a clínica:** `POST /api/pacientes/{id}/clinicas` aceita `{ "codigo": "IPE-4821" }` (app;
   acha clínica pública ou privada) ou `{ "clinicaId": 1 }` (web; só clínica pública). Vínculo novo responde
   201; clínica já vinculada responde 200 (é assim que a web troca de clínica). Para achar pelo código antes:
   `GET /api/clinicas/codigo/{codigo}`.
6. **Paciente só usa clínica vinculada:** especialidades, horários, agendamento e lista de espera de uma clínica
   sem vínculo com a conta respondem 403.
7. **Recusar a vaga tira a pessoa da fila** (`PUT /api/lista-espera/{id}/vaga` com `{ "aceitar": false }`): a
   entrada fica expirada e a vaga vai para o próximo. Ela não continua na fila.
8. **Uma fila por conta:** quem já está numa lista de espera recebe 400 ao tentar entrar em outra.
9. **Mudança de status** (`PUT /api/consultas/{id}/status` com `{ "status": "..." }`): iniciar o atendimento só a
   partir de `na_recepcao` (não de `confirmada`); `faltou` e `cancelada` não passam por essa rota.
10. **Textos de erro do banco** saem como a procedure escreve. Por exemplo, "Horário reservado para oferta da lista
    de espera." e "Por enquanto, você pode agendar só pela lista de espera.".
11. **Sair:** não há `POST /api/auth/logout`. Para sair, a tela apaga o token.

A lista completa dos ajustes do front, com a fonte e a gravidade de cada um, está em
[docs/ajustes-front.md](docs/ajustes-front.md).

## Respostas de erro

- Erros com mensagem: `{ "mensagem": "..." }` (400, 401, 404, 500).
- 403 sem corpo: dado de outra conta ou de outra clínica. A exceção é familiar, consulta ou entrada da fila de
  outra conta, que vem com "Você só pode gerenciar a sua família.".
- 401 sem corpo: token ausente, vencido ou de conta desativada (por exemplo, recepcionista removida da equipe).
