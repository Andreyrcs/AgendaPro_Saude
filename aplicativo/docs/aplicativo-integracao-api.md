# Integração do app com a API — situação em 10 de novembro de 2026 (revisada: confirmação de presença e faltas)

Resumo para a apresentação da Etapa 5 e para quem cuida do `backend/`.
Mostra quais telas já falam com a API real, quais ainda usam o banco em memória do app e qual endpoint falta para cada uma.
A lista completa (web + app) está em [`docs/relatorio-integracao.md`](../../docs/relatorio-integracao.md).

## Como funciona hoje

- Toda chamada passa por **`chamarApi()`** ([`src/servicos/api.js`](../src/servicos/api.js)): `fetch`
  nativo, JSON, tempo limite de 8 s e erro `{ mensagem }` da API virando a mensagem mostrada na tela.
- **`USAR_API_REAL`** ([`src/servicos/config.js`](../src/servicos/config.js)) liga a API real para
  as funções cujo endpoint **já existe**. As demais usam o banco em memória (`src/dados/`) e têm, no
  código, o comentário `// TODO: troca pra chamada real quando o endpoint X existir`.
- **Sincronização:** cada tela chama o serviço de novo sempre que aparece (`useDadosDaTela`).
- **Preparado para JWT:** se o login devolver um campo `token`, o app guarda o token na sessão e
  manda `Authorization: Bearer <token>` em todas as requisições. Ver a seção de Segurança do
  documento de desenho.

## Tela por tela

| Tela | Função de serviço | Endpoint | Situação |
|---|---|---|---|
| Login | `entrar(email, senha)` | `POST /api/auth/login` | **API real** ✅ |
| Cadastro | `cadastrar(dados)` | `POST /api/usuarios` | **API real** ✅ (telefone e nascimento ainda são descartados) |
| Início, Agenda, Detalhe, Família, Pessoa | `listarConsultas(usuario)` | `GET /api/pacientes/{id}/consultas` | Simulado — falta endpoint |
| Detalhe da consulta | `buscarConsulta(usuario, id)` | `GET /api/consultas/{id}?idUsuarioLogado=` | Simulado — falta endpoint |
| Detalhe da consulta, Início | `cancelarConsulta(usuario, id)` | `DELETE /api/consultas/{id}?idUsuarioLogado=` | Simulado — falta endpoint (devolve `{ falta, oferecidoAFila }`) |
| Detalhe da consulta | `cancelarContaFalta(consulta)` | — | **Local.** Avisa antes de confirmar se cancelar agora conta como falta; o servidor decide de novo ao cancelar. |
| Início | `listarParaConfirmar(usuario)` | `GET /api/pacientes/{id}/consultas` (filtra no app) | Simulado — falta endpoint |
| Início | `confirmarPresenca(usuario, id)` | `PUT /api/consultas/{id}/presenca` | Simulado — falta endpoint |
| Início, Agendar, Perfil | `buscarSituacao(usuario)` | `GET /api/pacientes/{id}/situacao` | Simulado — falta endpoint |
| Agendar | `marcarConsulta(usuario, dados)` | `POST /api/consultas` | Simulado — falta endpoint |
| Agendar | `listarEspecialidades()` · `buscarEspecialidade(id)` | `GET /api/especialidades` · `GET /api/especialidades/{id}` | Simulado — falta endpoint |
| Agendar, Assistente | `listarHorariosLivres(idEsp)` · `primeiroHorario(idEsp)` | `GET /api/especialidades/{id}/horarios-livres` | Simulado — falta endpoint |
| Família, Pessoa, Agendar, Prevenção, Assistente | `listarFamiliares(usuario)` | `GET /api/pacientes/{id}/familiares` | Simulado — falta endpoint |
| Adicionar familiar | `adicionarFamiliar(usuario, dados)` | `POST /api/pacientes/{id}/familiares` | Simulado — falta endpoint |
| Lista de espera, Início, Agendar | `buscarMinhaFila(usuario)` | `GET /api/pacientes/{id}/lista-espera` | Simulado — falta endpoint |
| Agendar | `entrarNaFila(usuario, dados)` | `POST /api/lista-espera` | Simulado — falta endpoint |
| Lista de espera | `responderVaga(usuario, idFila, aceitar)` | `PUT /api/lista-espera/{id}/vaga` | Simulado — falta endpoint |
| Lista de espera | `sairDaFila(usuario, idFila)` | `DELETE /api/lista-espera/{id}?idUsuarioLogado=` | Simulado — falta endpoint |
| Depois da consulta, Início, Pessoa | `listarAcompanhamento(usuario)` | `GET /api/pacientes/{id}/acompanhamento` | Simulado — falta endpoint |
| Prevenção | `listarPrevencao(usuario)` | `GET /api/pacientes/{id}/prevencao` | Simulado — falta endpoint |
| Prevenção, Agendar | `marcarItemPrevencao(usuario, idItem, status)` | `PUT /api/prevencao/{id}` | Simulado — falta endpoint |
| Assistente | `analisarSintomas(texto, familia)` | — | **Local, de propósito.** A checagem de emergência não pode depender do servidor. |

**Resumo:** 2 funções já usam a API real (login e cadastro). Outras 19 estão prontas esperando os
endpoints da tabela (algumas compartilham o mesmo endpoint). 3 são locais por decisão
(assistente, aviso de falta mostrado antes de cancelar e a contagem dos 30 minutos da vaga).

**Senha:** o app já manda a senha como o paciente digitou, por HTTPS, em `POST /api/auth/login` e
`POST /api/usuarios`; quem faz o hash é o servidor (BCrypt). O app não faz hash nenhum.

## Contrato proposto para os endpoints que faltam

Rotas em português e JSON em camelCase, como a API atual. Erros sempre como `{ "mensagem": "..." }`.
As respostas já vêm "juntadas" (médico, especialidade e familiar como objetos, e não só o id),
como a API atual já faz com `nomeOrganizador`. Assim a tela não precisa de chamadas extras.

### Familiar
```json
{ "id": "davi", "nome": "Davi Santos Tanaka", "curto": "Davi", "relacao": "Filho", "idade": 8,
  "genero": "m", "cor": "#fbdcc6", "alergias": "Nenhuma informada", "sus": "•••• 2284", "titular": false }
```
`POST /api/pacientes/{id}/familiares` recebe `{ "nome", "relacao", "nascimento": "AAAA-MM-DD", "alergias", "cor" }`.

### Consulta
```json
{ "id": "c1", "data": "2026-10-23", "hora": "14:30", "sala": "Sala 4",
  "status": "confirmada", "motivo": "Consulta de rotina", "tipo": "consulta", "titulo": null,
  "pessoa": { "...Familiar" },
  "medico": { "id": "fernanda", "nome": "Dra. Fernanda Lima", "esp": "pediatria", "cor": "#fde3d3", "sala": "Sala 4" },
  "especialidade": { "id": "pediatria", "nome": "Pediatria", "desc": "Saúde de crianças e adolescentes até 18 anos" } }
```
- `status`: ver **Status da consulta** abaixo (os mesmos valores da web e do banco).
- `tipo`: `consulta` | `exame` | `prevencao`
- `GET /api/pacientes/{id}/consultas` devolve `{ "proximas": [Consulta], "passadas": [Consulta] }`.
- `POST /api/consultas` recebe `{ "idUsuarioLogado", "pessoa", "medico", "data", "hora", "motivo" }`.

Regras que o backend precisa garantir:
- Horário já ocupado → 400 `"Este horário acabou de ser ocupado. Escolha outro."`
- Pediatria para 18 anos ou mais → 400 `"A pediatria atende só crianças e adolescentes até 18 anos."`
- Familiar de outra conta → 403 `"Você só pode gerenciar a sua família."`

### Status da consulta e estado do horário (usar EXATAMENTE estes valores no banco)

São dois conceitos separados. Web (`frontend/assets/js/dados.js`) e app (`src/utilitarios/status.js`) usam os mesmos nomes.

**Status da CONSULTA** — coluna `consultas.status`:

| Valor | Selo na tela | Quando |
|---|---|---|
| `confirmada` | Confirmada | Consulta marcada (pelo paciente, pela recepção ou ao aceitar vaga da fila) |
| `na_recepcao` | Na recepção | A recepção marcou a chegada |
| `em_atendimento` | Em atendimento | O médico iniciou o atendimento |
| `atendida` | Atendida | O médico finalizou |
| `faltou` | Faltou | **Só o médico ou a recepção marcam.** Nunca é automático: atraso não é falta |
| `cancelada` | Cancelada | Paciente ou recepção cancelou. **A consulta continua no histórico** |

**Estado do HORÁRIO** — coluna `horarios.estado` (a agenda do médico, um registro por horário):

| Valor | Quando |
|---|---|
| `livre` | Ninguém marcado |
| `ocupado` | Tem uma consulta que não está `cancelada` |
| `oferecido` | Vaga mandada à 1ª pessoa da lista de espera, aguardando resposta (30 min) |

Sugestão de restrição no MySQL:

```sql
CONSTRAINT chk_status_consulta CHECK (status IN ('confirmada','na_recepcao','em_atendimento','atendida','faltou','cancelada')),
CONSTRAINT chk_estado_horario CHECK (estado IN ('livre','ocupado','oferecido'))
```

**Cancelar** (`DELETE /api/consultas/{id}`), numa transação:
1. `consultas.status = 'cancelada'` (não apagar a linha).
2. O horário volta a `livre`; se houver lista de espera para aquele médico, vira `oferecido` para a 1ª pessoa, que sai da fila, e quem está atrás sobe uma posição.
3. Se o cancelamento for **no dia da consulta** (depois de `AVISO_ATE`, o fim da véspera) **e** o paciente tinha confirmado presença, grava uma falta sem aviso (ver Presença e faltas). Antes disso, nenhuma consequência. **Cancelar nunca gera custo.**

Aceitar a vaga: horário `oferecido` → `ocupado` e nasce uma consulta `confirmada`. Recusar ou passar dos 30 min: horário volta a `livre` e a pessoa volta ao seu lugar na fila.

### Presença e faltas

Constantes (iguais na web, `frontend/assets/js/dados.js`, e no app, `src/utilitarios/status.js`):
`FALTAS_PARA_RESTRICAO = 2`, `DIAS_DE_RESTRICAO = 30`, `AVISO_ATE` = fim do dia anterior à consulta (23:59:59 da véspera).

Regras:
1. A partir do início da véspera, o paciente vê "Confirme sua consulta de amanhã" com **Vou** e **Não vou**.
2. **Não vou** (ou cancelar) até `AVISO_ATE`: consulta `cancelada`, horário `oferecido` se houver fila (30 min para aceitar) ou `livre`. Nenhuma consequência.
3. Cancelar no próprio dia, depois de ter dito **Vou**: conta como **falta sem aviso**.
4. `faltou` só é marcado pelo médico ou pela recepção. Não existe falta automática por atraso.
5. Falta que conta para restrição = falta não retirada de quem tinha confirmado presença.
6. `FALTAS_PARA_RESTRICAO` faltas → por `DIAS_DE_RESTRICAO` dias o paciente **só entra na lista de espera** (`so_fila`).
   Nova falta nesse período (inclusive em vaga aceita da fila) → por `DIAS_DE_RESTRICAO` dias **só agenda com a recepção** (`so_recepcao`).
   `DIAS_DE_RESTRICAO` dias sem falta nova → volta a `normal` sozinho.
7. A recepção pode **retirar** uma falta justificada (ela deixa de contar).
8. O assistente de triagem e o aviso de emergência (SAMU 192) nunca são bloqueados.

**Confirmar presença** — `PUT /api/consultas/{id}/presenca`
```json
{ "idUsuarioLogado": 1, "vou": true }
```
- `vou: true` → grava `presenca_confirmada = true` e `confirmada_em`; devolve a `Consulta`.
- `vou: false` → o mesmo que `DELETE /api/consultas/{id}` (regras de cancelar acima).
- Erro 400 se a consulta não estiver `confirmada` ou se ainda não for a véspera.

**Situação do paciente** — `GET /api/pacientes/{id}/situacao`
```json
{ "faltas": 1, "restricao": "normal", "ate": null }
```
`restricao`: `normal` | `so_fila` | `so_recepcao`; `ate`: `AAAA-MM-DD` do fim da restrição.
O servidor confere a restrição em `POST /api/consultas` (400 `"Por enquanto, só dá para entrar na lista de espera."` ou `"Por enquanto, agende pela recepção da clínica."`) e em `POST /api/lista-espera` (bloqueado em `so_recepcao`). Consulta marcada pela recepção não é bloqueada.

**Faltas** (recepção e médico)
- `POST /api/consultas/{id}/falta` — o médico ou a recepção marcam `faltou` e gravam a falta.
- `GET /api/clinicas/{id}/faltas?paciente=` — lista para a ficha do paciente.
- `PUT /api/faltas/{id}/retirar` corpo `{ "idUsuarioLogado", "motivo" }` — falta justificada deixa de contar.

O que o banco precisa guardar:

| Onde | Coluna | Tipo | Para quê |
|---|---|---|---|
| `consultas` | `presenca_confirmada` | `BOOLEAN NOT NULL DEFAULT FALSE` | O paciente disse "Vou" |
| `consultas` | `confirmada_em` | `DATETIME NULL` | Quando disse "Vou" |
| `consultas` | `cancelada_em` | `DATETIME NULL` | Para saber se foi no dia (depois do fim da véspera) |
| `faltas` (tabela nova) | `id_falta`, `id_clinica`, `id_paciente`, `id_consulta` | `INT` | Uma linha por falta |
| `faltas` | `data_falta` | `DATE NOT NULL` | Data da consulta (conta os 30 dias) |
| `faltas` | `confirmou_presenca` | `BOOLEAN NOT NULL` | Só conta para restrição se `TRUE` |
| `faltas` | `motivo` | `VARCHAR(120)` | "Não compareceu" ou "Cancelou no dia, depois de confirmar presença" |
| `faltas` | `registrada_por` | `INT NULL` | Médico ou recepção (NULL quando vem do cancelamento do paciente) |
| `faltas` | `retirada`, `retirada_por`, `retirada_em`, `motivo_retirada` | `BOOLEAN`, `INT`, `DATETIME`, `VARCHAR(200)` | Falta justificada retirada pela recepção |
| `pacientes` | `restricao`, `restricao_ate` | `VARCHAR(12) DEFAULT 'normal'`, `DATE NULL` | Restrição atual (pode ser calculada das faltas; guardar facilita a consulta) |

`CONSTRAINT chk_restricao CHECK (restricao IN ('normal','so_fila','so_recepcao'))`

### Horários livres
`GET /api/especialidades/{id}/horarios-livres` devolve os horários com `estado = 'livre'` da tabela `horarios`,
de agora em diante: **os mesmos que a recepção vê na agenda** (não existe uma lista separada para o paciente).
```json
[ { "medico": { "...Medico" }, "dias": [ { "data": "2026-10-21", "horas": ["08:30", "10:00"] } ] } ]
```
O médico sem horário vem com `"dias": []`; o app então oferece a lista de espera.

### Lista de espera
`GET /api/pacientes/{id}/lista-espera` devolve `null` ou:
```json
{ "id": "f1", "posicao": 3, "naFila": 7, "desde": "2026-10-06",
  "pessoa": { "...Familiar" }, "medico": { "...Medico" }, "especialidade": { "...Especialidade" },
  "vagaOferecida": null }
```
- `vagaOferecida`, quando existe: `{ "data", "hora", "expiraEm": <milissegundos desde 1970> }`. O prazo é de 30 minutos.
  Ela aparece quando uma consulta do mesmo médico é cancelada e a pessoa é a 1ª da fila (regra de "Cancelar" acima).
- `PUT /api/lista-espera/{id}/vaga` recebe `{ "idUsuarioLogado", "aceitar": true|false }`.
  - Aceitar → devolve a `Consulta` criada.
  - Recusar → `null`; o horário volta a `livre` e o paciente continua na fila.

### Acompanhamento
```json
{ "retornos": [ { "id", "titulo", "prazo": "2026-11-16", "origem", "pessoa": {}, "medico": {}, "especialidade": {} } ],
  "exames":   [ { "id", "titulo", "status": "pendente|agendado", "obs", "origem", "pessoa": {}, "pedidoPor": {} } ] }
```

### Prevenção
```json
[ { "mes": "2026-10", "campanha": "Outubro Rosa", "tema": "Prevenção do câncer de mama",
    "itens": [ { "id": "v1", "titulo": "Mamografia", "status": "pendente|agendado|feito",
                 "nota": "A cada 2 anos, dos 50 aos 74 anos", "esp": "ginecologia", "pessoa": {} } ] } ]
```
`PUT /api/prevencao/{id}` recebe `{ "idUsuarioLogado", "status" }`.

## Pendências no backend que afetam o app

1. **Tabelas novas:** `clinicas`, `familiares`, `especialidades`, `medicos`, `horarios`, `consultas`, `lista_espera`, `faltas`, `retornos`, `exames`, `prevencao`. Toda tabela da clínica leva `id_clinica` (cada clínica só vê os seus dados).
2. **Colunas em `usuarios`:** `telefone` e `data_nascimento`, que o cadastro do app já envia.
3. **Autenticação:** trocar o `idUsuarioLogado` enviado pelo cliente por um token JWT emitido no
   login. O app já envia `Authorization: Bearer` quando o token existir.
4. **Papéis:** separar pacientes (`usuarios`) de funcionários (`funcionario`: médico, recepção, dono),
   para que o login do app aceite só pacientes.

## Como trocar uma função simulada pela real

Exemplo com `listarConsultas` ([`src/servicos/consultas.js`](../src/servicos/consultas.js)):

```js
// antes
export async function listarConsultas(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  ...
}

// depois
export async function listarConsultas(usuario) {
  return chamarApi(`/api/pacientes/${usuario.idUsuario}/consultas`);
}
```

As telas não mudam.
