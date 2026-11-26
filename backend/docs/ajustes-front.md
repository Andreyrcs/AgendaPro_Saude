# Ajustes do front para usar a API

Resultado da auditoria da API contra a documentação (`especificacao-api.md` e `docs_/AgendaPro-Saude.pdf`), o banco
`AgendaPro_Saude` e o código do front (web em `frontend/assets/js/` e app em `aplicativo/src/`), em novembro de 2026.

A API está pronta: as 51 rotas do Apêndice C funcionam. A web ainda trabalha com os dados guardados no navegador
(`localStorage`), e o app está com `USAR_API_REAL: false`. Esta lista é o que o front precisa mudar na troca, que é o
item "Integração com web e app" do Apêndice T. Os formatos completos de cada rota estão no `README.md` do back-end e no
Swagger (`http://localhost:5080/swagger`).

**Gravidade:** **QUEBRA** = sem o ajuste, a tela não funciona com a API · **CONTRADIZ** = a tela faz algo que o
documento não permite · **detalhe** = funciona, mas fica diferente ou feio.

---

## 1. Formatos que a API usa (o front adota estes nomes)

### Nomes de campo que ficam como estão na API

| Rota | Na API | Hoje no front | Por quê |
|---|---|---|---|
| `POST /api/clinicas/{id}/medicos` e `PUT /api/medicos/{id}` (envio) | `especialidade` (o id) | `esp` (`pagina-medicos.js:189-192`) | Nome usado no Apêndice E |
| `GET /api/clinicas/{id}/medicos` e as respostas de médico | `especialidade: { id, nome, duracao }` | `md.esp` | Apêndice E |
| `POST /api/lista-espera` (envio da recepção) | `usaApp` (true ou false) | `app` (`clinica-dados.js:73`) | Coluna `Lista_Espera.UsaApp` |
| `GET /api/clinicas/{id}/lista-espera` | `usaApp` e `telefone` | `app` e `tel` (`pagina-lista-espera.js:85-91`) | Colunas `Lista_Espera.UsaApp` e `Usuarios.Telefone` |

O `telefone` vem **completo**, como foi cadastrado, por exemplo `(11) 91234-5678`. Se a tela quiser mostrar só o final
(`•••• 1234`, como faz hoje), **a máscara é feita na tela**.

### Mudanças recentes na resposta da consulta e da fila

Foram feitas para o app e valem para web e app:

- **`pessoa` traz o familiar completo** (`{ id, nome, curto, cpf, relacao, nascimento, cor, alergias, titular }`) em
  toda resposta de consulta: `GET /api/consultas/{id}`, `GET /api/pacientes/{id}/consultas`, `POST /api/consultas`,
  agenda da clínica, agenda do médico, ficha do paciente e aceite de vaga. Também na fila do paciente
  (`GET /api/pacientes/{id}/lista-espera` e `POST /api/lista-espera`). Nas linhas de vaga (`livre`, `oferecido`),
  `pessoa` é `null`.
- **`medico` traz a sala**: `{ id, nome, sala }` na consulta, nos horários livres e na fila do paciente.
  A `sala` vem de `Medicos.Sala` e pode ser `null`.
- **A consulta traz `titulo`**: o título do item de prevenção ligado a ela (por exemplo "Exame de próstata (PSA)"), e
  então `tipo` é `"prevencao"`. Nas outras consultas, `titulo` é `null` e `tipo` é `"consulta"`.

Exemplo de consulta:

```json
{ "id": 87, "data": "2026-11-20", "hora": "14:00", "sala": "Sala 2", "status": "confirmada",
  "motivo": "Dor de garganta", "tipo": "consulta", "titulo": null, "presencaConfirmada": false,
  "pessoa": { "id": 7, "nome": "Lia Rocha", "curto": "Lia", "cpf": "39152840689", "relacao": "Filho(a)",
              "nascimento": "2018-05-14", "cor": "#fbdcc6", "alergias": null, "titular": false },
  "medico": { "id": 1, "nome": "Dr. Teste Um", "sala": "Sala 2" },
  "especialidade": { "id": 4, "nome": "Clínica geral" } }
```

---

## 2. Ajustes no front

| # | Onde | O que ajustar | Fonte | Gravidade |
|---|---|---|---|---|
| F1 | Web, toda chamada | Guardar o `token` do login e mandar `Authorization: Bearer <token>` em toda rota que não seja pública. Hoje a sessão não tem token | `api.js:157`; seção 5.3; Apêndice F | QUEBRA |
| F2 | Web e app | Os ids da API são **números**. Hoje a web compara textos (`"ipe"`, `"k4801"`) com `===`, e o app compara `esp.id === 'pediatria'` e usa os ids em texto do assistente | `api.js:373`, `clinica-dados.js:481,554`, `paciente-desktop.js:50`; app `AgendarTela.js:119,219`, `consultas.js:129`, `assistente.js:56-63` | QUEBRA |
| F3 | Web, clínica | O paciente é identificado pelo **id**, não pelo nome (consulta, falta, retorno, exame, fila, `?paciente=`). A ficha já vem pronta em `GET /api/clinicas/{id}/pacientes` (`consultas`, `faltas`, `filas`, `retornos`, `exames`) | `pagina-pacientes.js:19-53`, `clinica-dados.js:490-517`; Apêndice C | QUEBRA |
| F4 | Web, clínica | Horas em `"HH:MM"`, não em minutos. A consulta traz `hora`, e o reagendamento envia `hora`, não `ini`. O expediente vai como `{ semana: { inicio, fim }, sabado, almoco }`, também em `"HH:MM"` | `clinica.js:65,816`, `pagina-nova-consulta.js:346`, `pagina-horarios.js`; regra das horas da API | QUEBRA |
| F5 | Web e app, situação | `GET /api/pacientes/{id}/situacao` responde `{ faltas, restricao, ate }`, como o contrato. As telas leem `tipo`: troque por `restricao` | app `Presenca.js:41-42`, `AgendarTela.js:113`; web `pagina-pacientes.js:180`, `paciente-servicos.js:125`; contrato do app, linhas 152-154 | QUEBRA |
| F6 | Web e app, familiar | Não há `idade` na resposta (o contrato diz que ela é calculada pelo `nascimento`). Sem esse cálculo, a pediatria fica bloqueada para todo mundo | app `AgendarTela.js:119`; web `app.js:446`, `paciente-desktop.js:854`; relatorio-integracao.md:134-135 | QUEBRA |
| F7 | Web, login | A resposta traz `usuario.idUsuario` (não `usuarioId`). Para o paciente, `clinicaId` vem `null` (a clínica no token é só da equipe). Para decidir entre a área do paciente e a escolha de clínica, chame `GET /api/pacientes/{id}/clinicas` | `api.js:157,242-245`; Apêndices E e F; seção 5.3 | QUEBRA |
| F8 | Web e app, login | O texto da API é "E-mail ou senha incorretos" (sem ponto). O app troca **qualquer** erro do login por esse texto, então a mensagem do 429 ("Muitas tentativas. Aguarde um minuto e tente de novo.") nunca aparece | `api.js:240`; app `validacao.js:7`, `autenticacao.js:31-32`; Quadro 5.1 | CONTRADIZ |
| F9 | App (e web) | Ao receber 401 (token vencido ou conta desativada), voltar ao login. Hoje o app mostra "Erro 401 ao falar com o servidor." | app `api.js:42`, `SessaoContext.js:34-38`; Quadro 5.1 | CONTRADIZ |
| F10 | Web, cadastros | `POST /api/pacientes` e `POST /api/clinicas` respondem 201 **sem token**. Depois do cadastro, chame `POST /api/auth/login` | `api.js:285,397` | QUEBRA |
| F11 | App | O cadastro é `POST /api/pacientes`, que cria a conta e o titular numa chamada só; não existe `POST /api/usuarios`. As especialidades vêm de `GET /api/clinicas/{id}/especialidades`; não existe `GET /api/especialidades` | `autenticacao.js:56`, `medicos.js:7`; Apêndice C | QUEBRA |
| F12 | App, CPF repetido | A resposta é 400 (não 409), com "Este CPF já está cadastrado." | contrato do app, linha 66 | detalhe |
| F13 | App, `config.js` | A API roda na porta **5080**, não na 5000 (`ENDERECO_API`) | `config.js:13-19`; `launchSettings.json` | detalhe |
| F14 | Web, sair | Não existe `POST /api/auth/logout`: para sair, basta apagar o token | `api.js:262`; Apêndice C | detalhe |
| F15 | Web, médicos | O cadastro é uma chamada só: `POST /api/clinicas/{id}/medicos` com `{ nome, email, crm, especialidade, sala, telefone }`. A resposta traz o médico, a conta e a `senhaProvisoria`, e o id é gerado pela API. O banco não guarda a cor do médico; a agenda precisa de "uma cor por médico" (seção 5.5), então a tela gera a cor (por exemplo, pela posição na lista) | `pagina-medicos.js:189-201`, `api.js:337`; seção 5.5 | QUEBRA |
| F16 | Web e app, especialidades | O id é gerado pela API. Não existe `desc` (não há coluna) e não há rota para editar especialidade | `pagina-especialidades.js:111,67`; app `AgendarTela.js:193`; banco-x-telas.md:132 | QUEBRA |
| F17 | Web, agenda | A agenda usa **feriados** (e a janela 07:00–19:00), mas o Apêndice C não tem rota de feriados. **Lacuna do documento: decisão do grupo** | `dados.js:13`, `clinica.js:165`, `pagina-horarios.js:89` | QUEBRA |
| F18 | Web, agenda | Em `GET /api/clinicas/{id}/agenda`, horário livre e oferecido vêm no próprio `status` (`livre`, `oferecido`; Apêndice D), sem os campos `horario` e `vaga`. A resposta não traz fim nem duração: a duração está em `GET /api/clinicas/{id}/especialidades` (`duracao`) | `clinica.js:30`, `clinica-dados.js:340` | QUEBRA |
| F19 | Web, cancelar | `DELETE /api/consultas/{id}` responde `{ falta, oferecidoAFila }`, e o próprio banco já oferece a vaga ao primeiro da fila (trigger `trg_VagaLiberada`). A tela não precisa chamar "oferecer" depois. A web do paciente lê `oferecidoA`: troque por `oferecidoAFila` (true ou false) | `clinica.js:1088-1099`, `paciente-desktop.js:1220`; Apêndice R | QUEBRA |
| F20 | Web, oferecer vaga | `POST /api/consultas/{id}/oferecer` oferece sempre ao **primeiro da fila** (`sp_OferecerVaga`). A recepção não escolhe a pessoa | `pagina-lista-espera.js:134`, `clinica-dados.js:342`; Apêndice R | CONTRADIZ |
| F21 | Web, lista de espera | Cada entrada tem `id` (use-o no `DELETE` e no `PUT .../vaga`). A fila da clínica vem como lista `[{ medico, especialidade, pessoas, vagas }]`. Só entra na fila paciente com conta vinculada à clínica. Quem sai e volta entra no fim (não dá para "desfazer" na posição antiga). No paciente, o `PUT /api/lista-espera/{id}/vaga` usa o id da **fila**, não o da consulta. Não existem `notificar` e `sms`. O prazo vem em `vagaOferecida.expiraEm` (milissegundos) | `clinica-dados.js:73-83`, `pagina-lista-espera.js:161,207`, `paciente-servicos.js:258` | QUEBRA |
| F22 | Web, nova consulta | A recepção marca por `{ pessoa (id), medico, data, hora, motivo }`, só para paciente com conta vinculada. O status e a sala vêm do banco: o paciente não escolhe a sala | `pagina-nova-consulta.js:346`, `paciente-desktop.js:1700-1718`, app `app.js:598` | QUEBRA |
| F23 | Web, médico | Iniciar o atendimento só a partir de `na_recepcao` (não de `confirmada`). Falta é por `POST /api/consultas/{id}/falta`, não pela rota de status | `medico.js:795`, `clinica.js:672`; Apêndice I | CONTRADIZ |
| F24 | Web, falta | Não precisa enviar `motivo` nem `por`: a API calcula os dois (quem registrou sai do token) | `clinica.js:673`, `medico.js:880` | detalhe |
| F25 | Web, retorno | `POST /api/retornos` exige `consulta` (o id). Sem data (retorno encaminhado à recepção), envie `data: null`, não `""`, que dá 400 "Confira o formato dos dados enviados.". Monte a data sem `toISOString`, porque o UTC pode trocar o dia | `medico.js:945`, `clinica-dados.js:537-546`; Apêndice I | QUEBRA |
| F26 | Web, horários livres | A resposta é a lista `[{ medico: { id, nome, sala }, dias: [{ data, horas }] }]`, não um mapa por médico | `clinica-dados.js:522`, `paciente-desktop.js:1560-1589`; contrato do app, linha 183 | QUEBRA |
| F27 | Web, notificações | A resposta é `[{ id, tipo, mensagem, dataEnvio, lida }]`, com os tipos do banco (`VAGA_OFERECIDA`, `CONSULTA_CONFIRMADA`, `RESTRICAO`). O número do sino ("2") não pode ficar fixo | `app.js:1166-1174,179` | QUEBRA |
| F28 | Web e app, acompanhamento | O exame só pode ser `pendente` ou `realizado`; `"agendado"` não existe | app `InicioTela.js:92`; web `app.js:275`; Apêndice D | CONTRADIZ |
| F29 | Web e app, consulta | `tipo: "exame"` não existe no banco; só aparecem `"consulta"` e `"prevencao"` | contrato do app, linha 79; `dados.js:226` | detalhe |
| F30 | App, prevenção | As sugestões gerais já vêm dentro de `exames` de cada mês; as fixas no código (`'exg-1'`, `'exg-2'`) podem sair | `dadosFicticios.js:173-176`, `prevencao.js:12-15` | detalhe |
| F31 | Web e app, dados de teste | Parentescos válidos: `Filho(a)`, `Cônjuge`, `Pai/Mãe`, `Irmão(ã)` e `Outro`. "Filho", "Filha", "Mãe" e "Sogro" não existem, e o assistente procura esses textos | `dados.js:157-174`, `dadosFicticios.js:30-47`, `assistente.js:24-31`; relatorio-integracao.md:133 | detalhe |
| F32 | Web, busca de clínicas | A busca é pelo nome ou pela cidade (Apêndice C), não pelo endereço | `api.js:402` | CONTRADIZ |
| F33 | Web, equipe | Cada pessoa vem com `idUsuario` (não `id`). Não existe `provisoria` | `pagina-equipe.js:105-110` | detalhe |
| F34 | Web, agenda | Só dá para reagendar consulta `confirmada`; arrastar uma consulta `na_recepcao` é recusado pelo banco | `clinica.js:31`; Apêndice I | detalhe |
| F35 | App, familiar | Sem alergias, a API manda `null` (não "Nenhuma informada") | `ConsultaTela.js:101`, `PessoaTela.js:76` | detalhe |
| F36 | App | Mostrar o erro quando sair da fila ou marcar um item da prevenção falhar (hoje não há `catch`) | `EsperaTela.js:118-127`, `PrevencaoTela.js:46-54` | detalhe |

**Resumo:** 36 ajustes: 19 que quebram a integração, 6 que contradizem o documento e 11 detalhes.
Os que mais pegam são F1, F3, F5, F6 e F7. O F17 (feriados) depende de uma decisão do grupo.

### Endereço da web na apresentação

A API só aceita chamadas do navegador vindas das origens em `Cors:Origens` (`backend/AgendaPro.Api/appsettings.json`);
hoje são `http://localhost:5500` e `http://127.0.0.1:5500`. Se a web for aberta por outro endereço (por exemplo,
`http://192.168.0.10:5510`), avise para essa origem ser incluída.
