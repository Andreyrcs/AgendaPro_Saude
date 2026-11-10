# Integração do app com a API — situação em 9 de novembro de 2026

Resumo para a apresentação da Etapa 5 e para quem cuida do `backend/`.
Mostra quais telas já falam com a API real, quais usam dados simulados e qual endpoint falta para cada uma.

## Como funciona hoje

- Toda chamada passa por **`chamarApi()`** ([`src/servicos/api.js`](../src/servicos/api.js)): `fetch`
  nativo, JSON, tempo limite de 8 s e erro `{ mensagem }` da API virando a mensagem mostrada na tela.
- **`USAR_API_REAL`** ([`src/servicos/config.js`](../src/servicos/config.js)) liga a API real para
  as funções cujo endpoint **já existe**. As demais usam o banco simulado (`src/dados/`) e têm, no
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
| Detalhe da consulta | `cancelarConsulta(usuario, id)` | `DELETE /api/consultas/{id}?idUsuarioLogado=` | Simulado — falta endpoint |
| Agendar | `marcarConsulta(usuario, dados)` | `POST /api/consultas` | Simulado — falta endpoint |
| Agendar | `listarEspecialidades()` · `buscarEspecialidade(id)` | `GET /api/especialidades` · `GET /api/especialidades/{id}` | Simulado — falta endpoint |
| Agendar, Assistente | `listarHorariosLivres(idEsp)` · `primeiroHorario(idEsp)` | `GET /api/especialidades/{id}/horarios-livres` | Simulado — falta endpoint |
| Família, Pessoa, Agendar, Prevenção, Assistente | `listarFamiliares(usuario)` | `GET /api/pacientes/{id}/familiares` | Simulado — falta endpoint |
| Adicionar familiar | `adicionarFamiliar(usuario, dados)` | `POST /api/pacientes/{id}/familiares` | Simulado — falta endpoint |
| Lista de espera, Início, Agendar | `buscarMinhaFila(usuario)` | `GET /api/pacientes/{id}/lista-espera` | Simulado — falta endpoint |
| Agendar | `entrarNaFila(usuario, dados)` | `POST /api/lista-espera` | Simulado — falta endpoint |
| Lista de espera | `responderVaga(usuario, idFila, aceitar)` | `PUT /api/lista-espera/{id}/vaga` | Simulado — falta endpoint |
| Lista de espera | `sairDaFila(usuario, idFila)` | `DELETE /api/lista-espera/{id}?idUsuarioLogado=` | Simulado — falta endpoint |
| Lista de espera | `simularCancelamento(usuario)` | — | **Só demonstração.** No sistema real, a vaga nasce quando a recepção cancela uma consulta. |
| Depois da consulta, Início, Pessoa | `listarAcompanhamento(usuario)` | `GET /api/pacientes/{id}/acompanhamento` | Simulado — falta endpoint |
| Prevenção | `listarPrevencao(usuario)` | `GET /api/pacientes/{id}/prevencao` | Simulado — falta endpoint |
| Prevenção, Agendar | `marcarItemPrevencao(usuario, idItem, status)` | `PUT /api/prevencao/{id}` | Simulado — falta endpoint |
| Assistente | `analisarSintomas(texto, familia)` | — | **Local, de propósito.** A checagem de emergência não pode depender do servidor. |

**Resumo:** 2 funções já usam a API real (login e cadastro). Outras 17 estão prontas esperando
16 endpoints (duas delas usam o mesmo endpoint de horários livres). 2 são locais por decisão.

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
- `status`: `confirmada` | `realizada` | `cancelada`
- `tipo`: `consulta` | `exame` | `prevencao`
- `GET /api/pacientes/{id}/consultas` devolve `{ "proximas": [Consulta], "passadas": [Consulta] }`.
- `POST /api/consultas` recebe `{ "idUsuarioLogado", "pessoa", "medico", "data", "hora", "motivo" }`.

Regras que o backend precisa garantir:
- Horário já ocupado → 400 `"Este horário acabou de ser ocupado. Escolha outro."`
- Pediatria para 18 anos ou mais → 400 `"A pediatria atende só crianças e adolescentes até 18 anos."`
- Familiar de outra conta → 403 `"Você só pode gerenciar a sua família."`

### Horários livres
`GET /api/especialidades/{id}/horarios-livres`:
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
- `PUT /api/lista-espera/{id}/vaga` recebe `{ "idUsuarioLogado", "aceitar": true|false }`.
  - Aceitar → devolve a `Consulta` criada.
  - Recusar → `null`, e o paciente continua em 1º.

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

1. **Tabelas novas:** `familiares`, `especialidades`, `medicos`, `horarios`, `consultas`, `lista_espera`, `retornos`, `exames`, `prevencao`.
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
