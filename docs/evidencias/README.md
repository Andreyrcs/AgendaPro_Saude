# Evidências da integração front-end ↔ API

Provas das etapas 1 a 6 do plano (`docs/superpowers/plans/2026-11-22-integracao-front-api.md`) e da checagem A,
colhidas em 23/11/2026 com a API rodando (`http://localhost:5080`, banco `AgendaPro_Saude_App`) e a web servida em
`http://localhost:5500`. As telas foram abertas pelo Playwright no Microsoft Edge.

Em cada pasta:

- `NN-nome.png`: o screenshot de cada passo, na ordem.
- `rede.txt`: cada pedido feito à API (método, rota, código HTTP, se levou o token `[Bearer]` ou `[sem token]`, e o
  começo da resposta).
- `console-erros.txt`: o que o navegador registrou como erro. As linhas "Failed to load resource" são o próprio
  navegador anotando as respostas 4xx que o teste provocou de propósito (senha errada, CPF repetido, 403, 429).

Os arquivos `*-resultado.txt` têm cada verificação marcada como `OK` ou `XX`.

**Tokens e senhas:** os tokens JWT que apareciam nas respostas do login foram trocados por `[token omitido]`. Nenhum
arquivo daqui tem senha. As contas usadas eram de teste, criadas na hora pela própria API.

| Pasta / arquivo | Etapa | O que prova |
|---|---|---|
| `e1/`, `e1-resultado.txt` | 1: módulo de acesso à API | `API.chamar()` devolve `ErroApi` com o código e a mensagem da API; sem servidor, `status 0`; `dataISO()` às 23h59 e 00h01 |
| `e2/`, `e2-resultado.txt` | 2 (F1): login | Dono e recepção vão para a agenda, médico para a tela dele; token na sessão; senha errada e 429 com a mensagem da API; "Sair" apaga a sessão |
| `e2b/`, `e2b-login-sem-token-antigo.txt` | 2 | O login não manda o token de uma sessão anterior |
| `e3/`, `e3-resultado.txt` | 3: erros | 401 volta ao login com "Sua sessão terminou. Entre de novo."; token vencido; 403 "sem permissão"; 400 com a mensagem da API |
| `e3-app.txt` | 3 (app) | O `api.js` do app contra a API: 401 chama o `sair()`, 403 com e sem mensagem, 400, sem servidor |
| `e5/`, `e5-resultado.txt`, `e5-app.txt` | 5 (F2) | Menu da consulta e troca de médico com ids comparados como texto; assistente do app sugere pelo nome; pediatria pelo nome |
| `e6/`, `e6-resultado.txt` | 6 (F7) | Cadastro da clínica com o código; paciente novo escolhe a clínica pela busca e pelo código (clínica privada); CPF repetido; login do paciente com e sem clínica |
| `e6-app.txt` | 6 (app) | Cadastro e login reais do app, conferidos no banco |
| `checagemA/`, `checagemA-resultado.txt` | Checagem A | 4 perfis, 26 páginas e 6 públicas abertas sem erro de JavaScript (32/32) |

## Etapa 7 (área do paciente pela API)

Colhidas em 23/11/2026, depois dos commits 7a, 7b e 7c.

| Pasta / arquivo | O que prova |
|---|---|
| `like-antes.txt`, `like-depois.txt` | Busca de clínicas e de pacientes com `%` e `_` no texto: antes listava tudo, depois procura o caractere literal |
| `familiar-antes.txt`, `familiar-depois.txt` | Rota nova `PUT /api/pacientes/{id}/familiares/{idPessoa}`: caso certo, 401, 403 com outro perfil, 403 com familiar de outra família, CPF repetido |
| `app-sem-clinica.txt` | App: paciente sem clínica vê "Escolha sua clínica pelo site" |
| `e7b/`, `e7b-resultado.txt` | Agendar, cancelar e lista de espera pela tela |
| `e7-fumaca/` | As rotas da área do paciente (computador e celular) abertas sem erro de JavaScript |
| `e7-verificacoes.txt` | Verificações b até h numa rodada só (ver a observação abaixo sobre a "a") |
| `e7-verificacao-a.txt`, `e7/a-tela-x-banco/` | (a) Consulta e familiar na tela conferidos com o banco (`sqlcmd`) |
| `e7/b-familiar/` | (b) Adicionar e editar familiar pela tela; CPF repetido aparece no campo CPF |
| `e7/c-agendar-cancelar/` | (c) Agendar e cancelar pela tela; o horário volta para a lista de livres |
| `e7/d-isolamento.txt`, `e7/d-isolamento-tela/` | (d) Paciente A em 20 rotas com ids do paciente B: todas 403, e nada de B mudou |
| `e7/e-rotas-da-equipe.txt` | (e) Token de paciente em 18 rotas da equipe: todas 403 |
| `e7/f-xss/` | (f) Dependente `<img src=x onerror=alert(1)>` e uma clínica com ataque em todos os textos: 26 rotas, nenhum `<img>` no DOM, nenhum `alert`, texto literal |
| `e7/g-console/` | (g) 0 erros de JavaScript no paciente-desktop, no paciente-mobile a 390 px e no escolher-clinica |
| `e7/h-rede-todas.txt` | (h) Todas as chamadas das telas acima: sem token só login e cadastros |
| `e7-relogio.txt`, `e7/relogio-*` | "Hoje" do paciente às 23h59 e às 00h01 com o relógio do navegador simulado |
| `e7-checagemA.txt` | (i) Checagem A de novo nos 4 perfis: 32/32 |

**Observação sobre a "a":** na primeira rodada (`e7-verificacoes.txt`) a "a" saiu `XX` por erro do script de teste,
não do sistema: o `sqlcmd` devolvia os acentos na página de código do console (CP850) e "Médica" chegava como
"M�dica" para a comparação. O script passou a pedir o texto ao banco em hexadecimal (UTF-16) e a decodificar no Node;
a nova rodada está em `e7-verificacao-a.txt`, com tudo `OK`.

## Etapa 8 (telas do dono e da recepção pela API)

Pasta `e8/`. A Etapa 8a foi colhida em 23/11/2026, antes do commit, com o banco `AgendaPro_Saude_App` recriado do
zero na instância `.\SQLEXPRESS`. Nos arquivos de tela, cada verificação aparece como `PASSOU` ou `FALHOU`.

| Arquivo | O que prova |
|---|---|
| `e8/ambiente.txt` | Banco `_App` criado sem tocar no `AgendaPro_Saude`; `sp_TesteSistema` 25 de 25; prevenção e feriados carregados; a foto do `AgendaPro_Saude` antes e depois tem 0 diferenças |
| `e8/back-feriados-curl.txt` | Feriados só leitura: o `POST /api/feriados` dá 405 e o `DELETE /api/feriados/{id}` dá 404 para o dono e para a recepção; o GET dá 401 sem token e 200 nos 4 perfis; nada foi gravado |
| `e8/e8a-tela.txt` | 8a pela tela (Edge): código e telefone da clínica (o telefone continua depois de recarregar); recepcionista criada com a senha provisória mostrada uma vez; tela só para leitura da recepção; troca de senha do dono e da recepção (a senha antiga dá 401); remoção da recepcionista (o token dela dá 401 e o navegador volta ao login); XSS no nome da recepcionista e da clínica, no computador e a 390 px; 0 erros de JavaScript nas 9 telas, com o dono e com a recepção; token em todas as chamadas, menos no login |
| `e8/e8a-curl.txt` | Rotas da 8a: o caso certo, 401 sem token, 403 da recepção nas ações só do dono, 403 do médico e do paciente, isolamento A × B (14 pedidos, todos 403, e a linha da clínica B com o mesmo SHA-256 antes e depois); no fim, o token antigo do dono depois da troca de senha (pendência) |
| `e8/e8a-banco.txt` | Telefone, nome e código da clínica na tela conferidos no banco em hexadecimal; as recepcionistas removidas ficam com `Ativo=0` |
| `e8/e8a-*.png` | equipe.html e conta.html com os nomes XSS, no computador e a 390 px (a senha provisória não aparece) |
