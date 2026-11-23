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
