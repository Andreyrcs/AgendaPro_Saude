# Especificação da API do AgendaPro Saúde (back-end)

Extraído da documentação oficial do PIM IV (`AgendaPro-Saude_revisado_limpo.docx`), versão entregue.
Este arquivo é a **fonte da verdade** do back-end: rotas, perfis, erros, token, camadas, pastas e tecnologias.
Não altere este arquivo para "encaixar" o código; se o código precisar fugir dele, pare e avise.

O script do banco é o `agendapro_saude_sqlserver2.0.sql` (idêntico ao Apêndice Q da documentação).
O banco `AgendaPro_Saude` já é criado por esse script; consulte o script ou o próprio banco para
nomes exatos de tabelas, colunas, parâmetros das procedures e códigos de erro (THROW 50001 a 50041).

Referências cruzadas citadas no texto e não incluídas aqui: seção 5.5 e Apêndice I (ações sobre a consulta)
estão abaixo; seção 6.4 (app mantém o paciente logado); seção 8.3 (restrições do banco); seção 8.6 (LGPD).

### 5.2 APIs REST

Fielding (2000) definiu o estilo arquitetural REST: cliente e servidor se comunicam por meio de recursos identificados por endereços e manipulados por uma interface uniforme, e o servidor não guarda estado de sessão entre uma requisição e a seguinte. A aplicação web e o aplicativo consomem a mesma API nesse modelo. O caminho indica o recurso, no plural e em português, como /api/consultas, e o método do Hypertext Transfer Protocol (HTTP) indica a operação: GET consulta, POST cria, PUT altera e DELETE remove ou cancela. Os dados trafegam em JavaScript Object Notation (JSON), e cada resposta já traz os dados relacionados, como o médico e o familiar de uma consulta.

Nas rotas que começam por /api/pacientes/{id}, a API compara o {id} com o identificador guardado no token e responde com o código 403 se forem diferentes, de modo que um paciente não lê nem altera os dados de outra conta. Pelo mesmo motivo, nenhuma rota recebe no corpo da requisição o identificador de quem está logado, que a API obtém do token (seção 5.3). O Apêndice C lista as rotas, com os perfis que podem usar cada uma e, quando for o caso, a procedure do banco que executa a operação.

Quando uma procedure recusa uma operação, ela lança um erro com código próprio e mensagem em linguagem simples (seção 8.4). O middleware de erros da API escolhe o código HTTP pelo número do erro, conforme o Quadro 5.1, e devolve o texto no formato { "mensagem": "..." }, que a tela mostra sem alteração. Erros inesperados recebem uma mensagem genérica, e o detalhe técnico fica só no registro (log) da API. Os códigos gravados no banco, como CONFIRMADA e SO_FILA, são traduzidos pela camada de serviços para os valores usados nas telas, conforme o Apêndice D.

Quadro 5.1 – Códigos HTTP usados nas respostas de erro

| Código HTTP | Quando é usado | Exemplos |
|---|---|---|
| 400 (Bad Request) | Dado inválido ou operação recusada por uma regra de negócio | Erros 50003 a 50014, 50021 a 50023, 50030, 50032 e 50040 do banco; "Este horário acabou de ser ocupado. Escolha outro." |
| 401 (Unauthorized) | Login com dados incorretos, ou requisição sem token, com token inválido ou vencido | "E-mail ou senha incorretos"; com token vencido, a tela volta ao login |
| 403 (Forbidden) | Perfil sem permissão para a rota, ou dado de outra conta ou de outra clínica | "Você só pode gerenciar a sua família." |
| 404 (Not Found) | Registro inexistente | Erros 50001, 50002, 50020, 50031, 50033 e 50041 do banco; "Paciente não encontrado." |
| 429 (Too Many Requests) | Tentativas de login acima do limite | "Muitas tentativas. Aguarde um minuto e tente de novo." |
| 500 (Internal Server Error) | Erro inesperado no servidor | "Não foi possível concluir agora. Tente de novo." |

> **Acréscimo depois da entrega do PIM (integração com o front):** quando dois pedidos tentam gravar o mesmo dado
> ao mesmo tempo (por exemplo, dois cadastros com o mesmo CPF ou e-mail), os dois passam pela checagem do serviço e
> o banco recusa o segundo (UNIQUE, erros 2627 e 2601). A API responde **409 (Conflict)** com a mesma mensagem da
> checagem normal, como "Este CPF já está cadastrado." ou "Este e-mail já tem uma conta. Entre com ele ou use
> outro.", em vez do 500 genérico. Fora dessa corrida, a checagem continua respondendo 400.

Um agendamento mostra as camadas em funcionamento. O aplicativo envia POST /api/consultas com o familiar, o médico, a data, o horário e o motivo. A API valida o token, confere o perfil e se o familiar pertence à conta e chama a procedure sp_AgendarConsulta, informando no parâmetro @PelaRecepcao se quem agenda é a recepção. Se outra pessoa tiver ocupado o horário um instante antes, a procedure lança o erro 50008, e o paciente vê "Este horário acabou de ser ocupado. Escolha outro." O Apêndice E mostra a requisição e as respostas desse exemplo e do login.

### 5.3 Autenticação

O usuário entra com e-mail e senha. A API procura a conta ativa pelo e-mail e compara a senha com o hash guardado no banco (seção 5.4). Se o e-mail não existir ou a senha estiver errada, responde com o código 401 e a mesma mensagem nos dois casos, "E-mail ou senha incorretos". Com os dados corretos, devolve os dados da sessão e um JSON Web Token (JWT), formato compacto para transmitir informações entre duas partes que pode ser assinado digitalmente (Jones; Bradley; Sakimura, 2015). A tela, então, leva o dono e a recepção à agenda da clínica (clinica.html), o médico à própria agenda (medico.html) e o paciente à sua área (paciente-desktop.html) ou, se ainda não tiver clínica, à escolha de clínica (escolher-clinica.html).

Só o paciente se cadastra sozinho. A conta do dono nasce com a clínica, e o dono cria as contas de recepcionista, com senha provisória mostrada uma única vez. O token segue em cada requisição no cabeçalho Authorization: Bearer e leva o identificador do usuário, o perfil, a clínica e, para o médico, o cadastro dele (Apêndice F). Como o conteúdo do token é apenas codificado, e não criptografado, ele nunca leva senha nem dados de saúde; o que impede a falsificação é a assinatura HMAC-SHA256, feita com uma chave secreta que só o servidor conhece. O token vale 8 horas para a equipe, o tempo de um turno, e 30 dias para o paciente, que continua logado ao reabrir o aplicativo (seção 6.4).

Em cada requisição, o middleware JwtBearer do ASP.NET Core confere a assinatura, o emissor e a validade do token e responde com o código 401 se algo falhar, antes de qualquer controller ser executado (Microsoft, 2026d). A permissão de cada rota fica no próprio controller, com o atributo \[Authorize(Roles = "...")\], que recusa com o código 403 os perfis não autorizados (Microsoft, 2026k). Só o login e os cadastros de paciente e de clínica funcionam sem token. O Apêndice G resume o que cada perfil pode fazer.

### 5.4 Segurança

As senhas são guardadas com o BCrypt, algoritmo criado para senhas que gera um valor aleatório, o sal, para cada uma e repete o cálculo conforme um fator de custo, o que torna lento testar senhas por tentativa mesmo com uma cópia do banco (Provos; Mazières, 1999). A API usa fator de custo 12, acima do mínimo de 10 recomendado pelo Open Worldwide Application Security Project, ou OWASP (OWASP Foundation, 2026b). Qualquer falha no login mostra a mesma mensagem, porque mensagens diferentes revelariam quais e-mails têm conta no sistema (OWASP Foundation, 2026a).

Os dados de entrada são validados na tela e de novo na API, já que quem envia a requisição direto ao servidor contorna a validação da tela. O Cadastro de Pessoas Físicas (CPF), pedido para o titular e para cada familiar, é conferido pelos dígitos verificadores e não pode se repetir; o Cadastro Nacional da Pessoa Jurídica (CNPJ) da clínica também é conferido pelos dígitos verificadores; e a senha tem de 8 a 64 caracteres. Na API, as regras ficam nas classes de Data Transfer Object (DTO), e o banco tem a palavra final com as restrições da seção 8.3. Todo texto digitado passa por uma função de escape antes de aparecer na página, o que bloqueia a injeção de scripts, conhecida como Cross-Site Scripting (XSS), e todos os comandos em Structured Query Language (SQL) usam parâmetros do Dapper, o que impede a injeção de SQL (OWASP Foundation, 2026c).

Cada perfil enxerga apenas os próprios dados. O serviço confere se o familiar, a consulta ou a entrada da fila pertencem à conta logada, e toda consulta da equipe é filtrada pela clínica guardada no token; nos dois casos, o pedido indevido recebe o código 403. As regras de tela, como o formulário da clínica bloqueado para a recepção, servem à experiência do usuário, e quem decide a permissão é o servidor. O Apêndice H resume as demais medidas, entre elas o Hypertext Transfer Protocol Secure (HTTPS) com redirecionamento e HTTP Strict Transport Security (HSTS) na publicação em nuvem (Microsoft, 2026h), o Cross-Origin Resource Sharing (CORS) restrito ao endereço da aplicação web (Microsoft, 2026g) e o limite de cinco tentativas de login por minuto (Microsoft, 2026j). Na apresentação local, a API roda em HTTP na rede da equipe, o que só é aceitável porque todos os dados são fictícios.

### 5.5 Estrutura administrativa

A área administrativa se divide entre o dono da clínica, a recepção e o médico. O dono cadastra a clínica, que recebe um código único de três letras e quatro números, como IPE-4821, e pode ser pública, quando aparece na busca, ou privada, quando só é encontrada pelo código. Um mesmo paciente pode estar vinculado a mais de uma clínica e alternar entre elas.

A recepção trabalha na agenda da clínica, com vistas de dia, semana e mês (Figura 5.2). Na vista do dia, o expediente aparece em intervalos de 30 minutos, com uma cor por médico e uma linha no horário atual. Pelo menu de cada consulta, a recepção registra a chegada, cancela ou reagenda, e também pode reagendar arrastando a consulta para outro horário livre.

Figura 5.2 – Agenda da clínica na vista do dia, com a lista de espera e a ocupação da semana

<img src="media/image8.png" style="width:5.51042in;height:2.85417in" />

A tela de pacientes tem busca por nome ou CPF, filtros e uma ficha com consultas, faltas, posição na fila e histórico. O médico tem uma tela própria, com a agenda do dia, o histórico de atendimentos e o perfil com o registro no Conselho Regional de Medicina (CRM), especialidade, sala e expediente.

A recepção cadastra cada médico com CRM e e-mail de acesso, e o sistema cria a conta dele com senha provisória. A duração da consulta vem da especialidade, e o intervalo de almoço de cada médico é respeitado ao mostrar os horários livres. O motivo registrado no agendamento aparece para o médico, que pede exames no detalhe da consulta; a recepção acompanha esses pedidos na ficha do paciente e marca cada exame como realizado.

O Apêndice I detalha quem pode agir sobre a consulta em cada momento: só o médico finaliza o atendimento e marca retornos, por exemplo, e só a recepção reagenda.

No dia anterior a cada consulta, a tela inicial do paciente pede a confirmação de presença, com as opções "Vou" e "Não vou". Quem responde "Não vou" até o fim desse dia tem a consulta cancelada sem consequência, e o horário vai para a lista de espera com um dia de antecedência. A falta sem aviso de quem confirmou presença é registrada pela recepção ou pelo médico, e o sistema aplica as regras do Quadro 5.2. O grupo decidiu não cobrar taxa de quem falta, porque o Código de Ética Médica proíbe o médico de receber por atendimentos não prestados (Conselho Federal de Medicina, 2019). As regras limitam por um tempo a forma de agendar, sem nunca impedir o paciente de ser atendido.

Quadro 5.2 – Regras para faltas sem aviso

| Situação | Consequência |
|---|---|
| 2 faltas sem aviso depois de confirmar presença | Por 30 dias, o paciente só pode entrar na lista de espera |
| Nova falta sem aviso nesse período, inclusive em vaga aceita da lista de espera | Por 30 dias, o paciente só agenda com a recepção, presencialmente ou por telefone |
| 30 dias sem novas faltas | O agendamento volta ao normal |
| Falta justificada, por exemplo com atestado | A recepção retira a falta do registro |

Atraso não conta como falta, e cancelar no próprio dia depois de confirmar presença conta, com aviso na tela antes de concluir. A regra aparece antes da marcação, já que o Código de Defesa do Consumidor garante informação adequada e clara sobre os serviços (Brasil, 1990), e a restrição vale para a conta inteira. Na ficha do paciente, a recepção vê quem registrou cada falta e, para retirar uma falta justificada, informa o motivo, que fica no histórico. O assistente de triagem e o aviso de emergência nunca são bloqueados.

### 7.1 Orientação a objetos e camadas na API

A API do AgendaPro Saúde é escrita em C#, com o ASP.NET Core na versão 10 da plataforma .NET, de suporte de longo prazo (Microsoft, 2026i), já usada pelo grupo no PIM III. O acesso ao banco é feito pelo Dapper, biblioteca que executa um comando SQL ou uma procedure e converte o resultado em objetos C# (DapperLib, 2026). O Entity Framework Core não foi usado porque as regras já estão nas procedures (seção 8.4) e porque exige configuração extra para gravar em tabelas com triggers, como Consultas (Microsoft, 2026c). O Apêndice M reúne as tecnologias e bibliotecas do back-end, com o motivo de cada escolha.

A API segue uma arquitetura em camadas (Sommerville, 2018), mostrada na Figura 7.1. Os controllers recebem a requisição, conferem o perfil e devolvem a resposta em JSON. Os serviços aplicam as regras que não estão no banco, como conferir se o familiar pertence à conta, e os repositórios são a única camada que acessa o banco. Antes e depois dessas camadas, o middleware de autenticação valida o token e o middleware de erros transforma qualquer erro na resposta padrão (seção 5.2). A estrutura de pastas está no Apêndice N.

Figura 7.1 – Camadas da API do AgendaPro Saúde

<img src="media/image13.png" style="width:3.73958in;height:3.29167in" />

A orientação a objetos aparece em todas as camadas. Cada tabela tem uma classe de modelo, e as interfaces, como IConsultaRepositorio, definem o que cada serviço e cada repositório fazem sem definir como (abstração). Os DTOs controlam o que entra e o que sai de cada rota, e por isso o hash da senha nunca sai da API (encapsulamento). A classe base ApiControllerBase lê do token o usuário logado e oferece esse dado a todos os controllers (herança), e o controller de consultas trabalha com a interface IConsultaServico sem saber qual classe a implementa (polimorfismo). As ligações entre as camadas são feitas pela injeção de dependência do ASP.NET Core, em que cada classe recebe no construtor as interfaces de que precisa (Microsoft, 2026f).

A expiração das ofertas da lista de espera roda em um serviço em segundo plano (hosted service), que chama a procedure sp_ExpirarOfertasVencidas a cada minuto (Microsoft, 2026b). A string de conexão e a chave dos tokens ficam fora do código-fonte, em segredos do usuário (user secrets) no desenvolvimento e em variáveis de ambiente na nuvem (Microsoft, 2026l).

### 8.4 Procedures, visão e triggers

Procedures são rotinas guardadas no banco e executadas quando chamadas, e triggers são executados automaticamente quando ocorre um evento em uma tabela, como a alteração de uma linha (Elmasri; Navathe, 2018). As procedures que alteram dados usam transação: se uma verificação falhar, nada é gravado, e o erro volta com uma mensagem para a tela. As principais são a sp_AgendarConsulta, que confere data, expediente e conflito de horário antes de gravar a consulta; a sp_OferecerVaga, a sp_AceitarOferta e a sp_RecusarOferta, que movimentam a lista de espera; e a sp_AplicarFalta, que grava a falta e aplica a restrição de agendamento. O trigger trg_VagaLiberada cria a vaga quando uma consulta futura é cancelada, e o trg_Consultas_Falta registra a falta. O Apêndice R descreve cada objeto.

Para o trigger de faltas saber quem cancelou a consulta, as procedures gravam esse dado com sp_set_session_context, e o trigger o lê com a função SESSION_CONTEXT (Microsoft, 2026n). A visão vw_SituacaoConta compara o fim da restrição com a data atual, e a conta volta ao normal sem rotina diária.

## APÊNDICE C – ROTAS DA API

Quadro C.1 – Rotas da API

| Método e rota | Perfis | Função |
|---|---|---|
| POST /api/auth/login | Público | Confere e-mail e senha e devolve o token e os dados da sessão (seção 5.3) |
| PUT /api/usuarios/{id}/senha | Todos | Troca a senha do usuário logado, pedindo a senha atual |
| POST /api/pacientes | Público | Cria a conta do paciente e o paciente titular e, se informado o código, faz o vínculo com a clínica |
| GET /api/pacientes/{id}/familiares | Paciente | Lista o titular e os familiares da conta |
| POST /api/pacientes/{id}/familiares | Paciente | Adiciona um familiar à conta |
| GET /api/pacientes/{id}/clinicas | Paciente | Lista as clínicas às quais a conta está vinculada |
| POST /api/pacientes/{id}/clinicas | Paciente | Vincula a conta a uma clínica |
| GET /api/pacientes/{id}/situacao | Paciente, recepção e dono | Faltas registradas e restrição em vigor (visão vw_SituacaoConta) |
| GET /api/pacientes/{id}/notificacoes | Paciente | Lista os avisos da conta, como vaga oferecida, consulta confirmada, restrição e lembrete da véspera (LEMBRETE) |
| PUT /api/pacientes/{id}/notificacoes/lidas | Paciente | Marca todos os avisos como lidos |
| POST /api/clinicas | Público | Cria a clínica, gera o código AAA-0000 e cria a conta do dono na mesma transação |
| GET /api/clinicas?busca= | Paciente | Busca clínicas públicas pelo nome ou pela cidade |
| GET /api/clinicas/codigo/{codigo} | Paciente | Encontra uma clínica, pública ou privada, pelo código |
| PUT /api/clinicas/{id} | Dono | Altera os dados da clínica, exceto o CNPJ |
| GET /api/clinicas/{id}/equipe | Dono e recepção | Lista o dono, as recepcionistas e os médicos da clínica |
| POST /api/clinicas/{id}/equipe | Dono | Cria a conta de uma recepcionista com senha provisória |
| POST /api/clinicas/{id}/equipe/{usuarioId}/senha-provisoria | Dono | Gera outra senha provisória para médico ou recepcionista (a anterior deixa de valer) |
| DELETE /api/clinicas/{id}/equipe/{usuarioId} | Dono | Desativa a conta de uma recepcionista; o dono não pode remover a própria conta |
| GET /api/clinicas/{id}/pacientes | Recepção e dono | Busca e filtra os pacientes vinculados à clínica |
| GET /api/clinicas/{id}/faltas?paciente= | Recepção e dono | Lista as faltas de um paciente para a ficha |
| GET /api/clinicas/{id}/especialidades | Todos | Lista as especialidades da clínica com a duração da consulta |
| GET /api/especialidades/{id} | Todos | Dados de uma especialidade |
| POST /api/clinicas/{id}/especialidades | Recepção e dono | Cadastra uma especialidade na própria clínica |
| GET /api/especialidades/{id}/horarios-livres | Paciente, recepção e dono | Horários livres por médico, calculados a partir do expediente, das consultas e dos feriados |
| GET /api/clinicas/{id}/medicos | Recepção e dono | Lista os médicos da clínica |
| POST /api/clinicas/{id}/medicos | Recepção e dono | Cria a conta do médico e o cadastro com CRM, especialidade e sala |
| PUT /api/medicos/{id} | Recepção, dono e médico | Altera os dados do médico |
| PUT /api/medicos/{id}/expediente | Recepção e dono | Grava os dias, os horários e o almoço do médico |
| GET /api/medicos/{id}/agenda?data= | Médico | Consultas do médico em um dia e histórico de atendimentos |
| GET /api/clinicas/{id}/agenda?de=&ate= | Recepção e dono | Consultas e vagas da clínica em um período, para as vistas de dia, semana e mês |
| GET /api/pacientes/{id}/consultas | Paciente | Próximas consultas e histórico da família |
| GET /api/consultas/{id} | Paciente, recepção e médico | Detalhe de uma consulta |
| POST /api/consultas | Paciente e recepção | Agenda uma consulta (sp_AgendarConsulta) |
| PUT /api/consultas/{id} | Recepção | Reagenda: cancela e agenda o novo horário numa única transação (sp_CancelarConsulta e sp_AgendarConsulta) |
| DELETE /api/consultas/{id} | Paciente e recepção | Cancela a consulta; a vaga vai para a lista de espera (sp_CancelarConsulta) |
| POST /api/consultas/{id}/oferecer | Recepção e dono | Oferece ao primeiro da lista de espera uma vaga que ficou parada (sp_OferecerVaga) |
| PUT /api/consultas/{id}/presenca | Paciente | Responde "Vou" ou "Não vou" na véspera (sp_ConfirmarPresenca) |
| PUT /api/consultas/{id}/status | Recepção e médico | Registra chegada, início ou fim do atendimento, conforme o Apêndice I; início e fim só a partir do dia da consulta |
| POST /api/consultas/{id}/falta | Recepção e médico | Registra a falta do paciente (sp_RegistrarFalta) |
| PUT /api/faltas/{id}/retirar | Recepção | Retira uma falta justificada (sp_RetirarFalta) |
| GET /api/pacientes/{id}/lista-espera | Paciente | Posição na fila e vaga oferecida, com o prazo de resposta |
| GET /api/clinicas/{id}/lista-espera | Recepção e dono | Filas de espera por médico |
| POST /api/lista-espera | Paciente e recepção | Coloca o paciente no fim da fila do médico (sp_EntrarListaEspera) |
| DELETE /api/lista-espera/{id} | Paciente e recepção | Tira o paciente da fila (sp_SairListaEspera) |
| PUT /api/lista-espera/{id}/vaga | Paciente | Aceita ou recusa a vaga oferecida (sp_AceitarOferta ou sp_RecusarOferta) |
| POST /api/retornos | Médico | Marca o retorno `{ consulta, data, hora, nota }`, com data definida (a consulta fica marcada) ou encaminhado à recepção (data null) |
| POST /api/exames | Médico | Registra um exame pedido na consulta |
| PUT /api/exames/{id} | Médico e recepção | Altera a situação do exame |
| GET /api/pacientes/{id}/acompanhamento | Paciente | Retornos e exames pendentes da família |
| GET /api/pacientes/{id}/prevencao | Paciente | Campanhas de prevenção do mês e itens de cada familiar |
| POST /api/pacientes/{id}/prevencao | Paciente | Inclui um familiar em um item de campanha |
| PUT /api/prevencao/{id} | Paciente | Altera a situação do item e o liga a uma consulta |

## APÊNDICE D – TRADUÇÃO DOS VALORES ENTRE AS TELAS E O BANCO

Quadro D.1 – Tradução dos valores entre as telas e o banco

| Assunto | Valor nas telas | Código no banco |
|---|---|---|
| Perfil do usuário | paciente, medico, recepcao, dono | PACIENTE, MEDICO, RECEPCAO, DONO (Usuarios.Papel) |
| Status da consulta | confirmada, na_recepcao, em_atendimento, atendida, faltou, cancelada | CONFIRMADA, NA_RECEPCAO, EM_ATENDIMENTO, ATENDIDA, FALTOU, CANCELADA (Status_Consulta) |
| Estado do horário | livre, oferecido | VAGA, OFERECIDA (Status_Consulta) |
| Restrição por faltas | normal, so_fila, so_recepcao | NORMAL, SO_FILA, SO_RECEPCAO (Usuarios.Restricao) |
| Exame | pendente, realizado | PENDENTE, REALIZADO (Exames.Status) |
| Retorno | encaminhado, agendado, realizado, cancelado | ENCAMINHADO, AGENDADO, REALIZADO, CANCELADO (Retornos.Status) |
| Item de prevenção | pendente, agendado, feito | NAO_AGENDADO, AGENDADO, REALIZADO (Pessoa_Prevencao.Status) |

## APÊNDICE E – EXEMPLOS DE REQUISIÇÃO E RESPOSTA DA API

Quadro E.1 – Rota POST /api/consultas (agendamento)

Requisição:
```http
POST /api/consultas
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

{ "pessoa": 15, "medico": 4, "data": "2026-11-20", "hora": "14:00", "motivo": "Dor de garganta" }
```

Resposta de sucesso (201):
```json
{ "id": 87, "data": "2026-11-20", "hora": "14:00", "sala": "Sala 2", "status": "confirmada", "motivo": "Dor de garganta", "tipo": "consulta",
  "pessoa": { "id": 15, "nome": "Davi Santos" },
  "medico": { "id": 4, "nome": "Dra. Paula Rocha" },
  "especialidade": { "id": 1, "nome": "Clínica geral" } }
```

Resposta de erro (400):
```json
{ "mensagem": "Este horário acabou de ser ocupado. Escolha outro." }
```

Quadro E.2 – Rota POST /api/auth/login (entrada no sistema)

Requisição:
```http
POST /api/auth/login

{ "email": "recepcao@clinicaipe.com.br", "senha": "(senha digitada)" }
```

Resposta de sucesso (200):
```json
{ "token": "eyJhbGciOiJIUzI1NiIs...", "expiraEm": "2026-11-12T03:00:00Z",
  "usuario": { "idUsuario": 12, "nome": "Carla Mendes", "email": "recepcao@clinicaipe.com.br", "papel": "recepcao", "clinicaId": 3, "medicoId": null } }
```

Resposta de erro (401):
```json
{ "mensagem": "E-mail ou senha incorretos" }
```

## APÊNDICE F – INFORMAÇÕES (CLAIMS) GUARDADAS NO TOKEN

Quadro F.1 – Informações (claims) guardadas no token

| Claim | Conteúdo | Uso na API |
|---|---|---|
| sub | Identificador do usuário (Usuarios.Id_Usuario) | Conferir o {id} das rotas de paciente e preencher o parâmetro @IdUsuario das procedures |
| role | Perfil: paciente, medico, recepcao ou dono | Decidir quais rotas o usuário pode usar (Apêndice G) |
| clinica | Identificador da clínica, só para dono, recepção e médico | Limitar a equipe aos dados da própria clínica |
| medico | Identificador do cadastro de médico, só para o perfil médico | Mostrar a agenda e o histórico do próprio médico |
| exp | Data e hora em que o token vence | Recusar o token vencido |

## APÊNDICE G – PERMISSÕES DE CADA PERFIL NA API

Quadro G.1 – Permissões de cada perfil na API

| Perfil | O que pode fazer |
|---|---|
| Paciente | Gerenciar a própria família, agendar e cancelar consultas, confirmar presença, entrar e sair da lista de espera, responder vagas, ver acompanhamento, prevenção e avisos; sempre apenas com os dados da própria conta |
| Recepção | Ver e gerenciar a agenda da clínica, agendar, reagendar e cancelar consultas, registrar chegada e falta, retirar falta justificada, atualizar a situação de exames, gerenciar a lista de espera, os médicos, os horários e as especialidades; sempre apenas na própria clínica |
| Médico | Ver a própria agenda e o histórico, alterar os próprios dados de perfil, iniciar e finalizar atendimentos, registrar falta, marcar retorno e registrar exames |
| Dono | Tudo o que a recepção faz, mais alterar os dados da clínica e gerenciar as contas de recepcionista |

## APÊNDICE H – MEDIDAS DE SEGURANÇA DA API

Quadro H.1 – Medidas de segurança da API

| Risco | Medida na API |
|---|---|
| Vazamento de uma cópia do banco | Senhas guardadas só como hash BCrypt, com sal e fator de custo 12 |
| Descoberta de senha por tentativa e erro | Limite de cinco tentativas de login por minuto e mensagem de erro genérica |
| Token falsificado ou alterado | Assinatura HMAC-SHA256 com chave secreta e validade conferida em cada requisição |
| Acesso a dados de outra conta ou clínica | Identificador e clínica tirados do token e conferidos em toda operação |
| Dados inválidos enviados diretamente à API | Validação repetida no servidor, além das restrições do banco |
| Injeção de SQL | Comandos sempre parametrizados com o Dapper |
| Interceptação dos dados na rede | HTTPS com redirecionamento e HSTS na publicação em nuvem |
| Chamadas feitas por páginas de outros sites | CORS restrito ao endereço da aplicação web |
| Exposição de senhas do banco e da chave do token | Segredos fora do código-fonte (seção 7.1) |
| Vazamento de informação por erros e logs | Mensagem genérica nos erros inesperados e logs sem senhas, tokens ou dados de saúde |

## APÊNDICE I – AÇÕES SOBRE A CONSULTA POR PERFIL

Quadro I.1 – Ações sobre a consulta por perfil

| Ação | Quem executa | Condição |
|---|---|---|
| Registrar chegada (com opção de desfazer) | Recepção | Consulta confirmada |
| Iniciar atendimento | Recepção ou médico | Paciente na recepção |
| Finalizar atendimento | Médico | Consulta confirmada, na recepção ou em atendimento |
| Registrar falta | Médico ou recepção | Consulta confirmada ou paciente na recepção |
| Marcar retorno | Médico | Consulta em atendimento ou atendida |
| Pedir exame | Médico | Detalhe da consulta |
| Marcar exame como realizado | Recepção | Exame pedido pelo médico |
| Cancelar | Paciente ou recepção | Consulta confirmada |
| Reagendar | Recepção | Consulta ativa e novo horário livre |

## APÊNDICE M – TECNOLOGIAS E BIBLIOTECAS DO BACK-END

Quadro M.1 – Tecnologias e bibliotecas do back-end

| Tecnologia | Uso na API | Motivo da escolha |
|---|---|---|
| C# e ASP.NET Core (.NET 10) | Aplicação da API: rotas, controllers e injeção de dependência | Versão Long-Term Support (LTS); integração com SQL Server e Azure; já usado pelo grupo |
| Dapper | Execução de comandos SQL e procedures | Chama as procedures do banco diretamente, sem mapeamento extra |
| Microsoft.Data.SqlClient | Conexão com o SQL Server | Driver oficial da Microsoft para o SQL Server |
| BCrypt.Net-Next | Hash e verificação de senhas | Implementa o algoritmo BCrypt; já usado no PIM III |
| Microsoft.AspNetCore.Authentication.JwtBearer | Validação do token JWT em cada requisição | Biblioteca oficial do ASP.NET Core para JWT |
| OpenAPI (Swagger) | Documentação e teste das rotas no navegador | Gera a lista de rotas a partir do próprio código |

## APÊNDICE N – ESTRUTURA DE PASTAS DA API

Quadro N.1 – Estrutura de pastas da API

| Pasta ou arquivo | Conteúdo |
|---|---|
| Program.cs | Configuração da aplicação: injeção de dependência, autenticação, CORS, middlewares e rotas |
| Controllers/ | Um controller por assunto: autenticação, pacientes, clínicas, médicos, especialidades, consultas, lista de espera, faltas, acompanhamento, prevenção e notificações |
| Servicos/ | Regras de negócio da API e tradução dos status, com uma interface e uma classe por assunto |
| Repositorios/ | Comandos SQL e chamadas de procedure com o Dapper, com uma interface e uma classe por assunto |
| Modelos/ | Classes que representam as tabelas do banco, como Consulta, Medico, Paciente e ListaEspera |
| Dtos/ | Classes com os dados que entram e saem de cada rota |
| Middlewares/ | Tratamento centralizado de erros |
| Tarefas/ | Serviço em segundo plano que expira as ofertas da lista de espera |
| appsettings.json | Configurações sem segredos, como o tempo de validade do token |

## APÊNDICE R – PROCEDURES, VISÃO E TRIGGERS DO BANCO DE DADOS

Quadro R.1 – Procedures, visão e triggers do banco de dados

| Objeto | Tipo | Função |
|---|---|---|
| sp_AgendarConsulta | Procedure | Valida data, feriado, expediente, almoço e conflitos de horário e grava a consulta. Recusa o agendamento feito pelo próprio paciente quando a conta está com restrição, mas aceita o feito pela recepção |
| sp_EntrarListaEspera | Procedure | Coloca o paciente no fim da fila do médico; recusa quem só pode agendar pela recepção |
| sp_SairListaEspera | Procedure | Tira o paciente da fila e reorganiza as posições |
| sp_OferecerVaga | Procedure | Oferece a vaga ao primeiro da fila que não tenha outra consulta no horário e grava a notificação |
| sp_AceitarOferta | Procedure | Confirma a consulta para o paciente que aceitou a vaga |
| sp_RecusarOferta | Procedure | Encerra a oferta e passa a vaga ao próximo da fila |
| sp_ExpirarOfertasVencidas | Procedure | Recusa automaticamente as ofertas sem resposta depois do prazo guardado em Parametros |
| sp_CancelarConsulta | Procedure | Cancela a consulta e informa ao trigger se quem cancelou foi o paciente |
| sp_ConfirmarPresenca | Procedure | Grava a resposta ao aviso da véspera: "Vou" confirma a presença e "Não vou" cancela a consulta |
| sp_RegistrarFalta | Procedure | Usada pelo médico ou pela recepção para registrar que o paciente faltou |
| sp_AplicarFalta | Procedure | Grava a falta e aplica a restrição de agendamento quando o limite é atingido |
| sp_RetirarFalta | Procedure | Retira uma falta justificada, por exemplo com atestado, e encerra a restrição em vigor |
| sp_ReordenarFila | Procedure de apoio | Renumera as posições da fila depois de uma saída, recusa ou aceite |
| sp_AdquirirLock | Procedure de apoio | Pede o bloqueio exclusivo de um recurso com sp_getapplock |
| vw_SituacaoConta | Visão | Mostra a situação de cada conta de paciente; uma restrição vencida já aparece como NORMAL |
| trg_VagaLiberada | Trigger | Quando uma consulta futura é cancelada, cria a vaga no mesmo horário e chama sp_OferecerVaga |
| trg_Consultas_Falta | Trigger | Quando a consulta é marcada como falta, ou é cancelada no próprio dia pelo paciente que tinha respondido "Vou", chama sp_AplicarFalta |

## APÊNDICE T – ITENS DE BACKLOG DO BACK-END

Quadro T.1 – Itens de backlog do back-end

| Item | Descrição |
|---|---|
| Estrutura da API | Projeto ASP.NET Core em camadas, injeção de dependência, conexão com o SQL Server e middleware de erros |
| Autenticação | Login com JWT, cadastro de paciente e de clínica, troca de senha e permissões por perfil |
| Especialidades e horários | Especialidades, médicos, expediente e cálculo dos horários livres |
| Consultas | Agendar, cancelar, reagendar e confirmar presença |
| Lista de espera | Entrar e sair da fila, responder vaga e expiração automática das ofertas |
| Área da clínica | Agenda da clínica, pacientes, equipe, status do atendimento e faltas |
| Área do médico | Agenda do médico, retornos e exames |
| Acompanhamento e prevenção | Retornos e exames do paciente, campanhas de prevenção e notificações |
| Segurança | Validações no servidor, HTTPS, CORS e limite de tentativas de login |
| Integração com web e app | Troca dos dados simulados pelas chamadas à API, com teste de cada rota |

Fonte: elaborado pelos autores (2026).

---

## ACRÉSCIMOS DEPOIS DA ENTREGA DO PIM (integração com a web e o app)

O texto acima reproduz a documentação entregue. Esta seção reúne o que mudou na API durante a integração com o
front. **O banco não mudou**: as tabelas, as colunas, a visão, as procedures e os triggers continuam iguais ao
Apêndice Q.

### Regras novas em rotas existentes

| Rota | Mudança |
|---|---|
| Todas as que gravam | Dois pedidos simultâneos que gravariam o mesmo dado (CPF, e-mail, CNPJ, CRM…): o segundo recebe **409** com a mesma mensagem da checagem normal, em vez de 500 (ver a nota abaixo do Quadro 5.1) |
| POST /api/pacientes, POST /api/clinicas (dono), POST /api/clinicas/{id}/medicos, POST /api/clinicas/{id}/equipe | O e-mail precisa ter o formato `nome@dominio.ext` (um `@`, sem espaço no meio, com ponto no domínio). Fora disso: **400** `{ "mensagem": "Informe um e-mail válido." }`. Espaços em volta continuam aceitos e são cortados |
| PUT /api/medicos/{id} | O médico continua alterando os próprios dados, mas **não o CRM**. Se mandar um CRM diferente do atual: **403** `{ "mensagem": "Só a recepção pode alterar o CRM." }`. Mandar o mesmo CRM continua valendo. Recepção e dono alteram o CRM normalmente |

### Rotas novas

Seguem o padrão das outras: token no cabeçalho `Authorization: Bearer`, **401 sem corpo** sem token, **403 sem
corpo** para perfil sem acesso ou recurso de outra clínica ou conta, e erros em `{ "mensagem": "..." }`.

| Método e rota | Perfis | Resposta | Erros |
|---|---|---|---|
| GET /api/clinicas/{id} | Dono e recepção (só a própria clínica) | 200 `{ id, nome, endereco, telefone, cnpj, cidade, uf, codigo, publica }`, o mesmo formato do PUT. Serve para a casca e para equipe.html mostrarem os dados e o **código AAA-0000** | 403 outra clínica ou outro perfil; 404 "Clínica não encontrada." |
| GET /api/pacientes/{id} | Paciente (só a própria conta; `{id}` = idUsuario, como nas outras rotas de paciente) | 200 `{ nome, cpf, email, telefone, nascimento }`. Nome, CPF e nascimento são do titular; e-mail e telefone, da conta. Usada no Perfil da web e do app | 403 outra conta ou outro perfil |
| GET /api/medicos/{id} | Médico (só o próprio, pela claim `medico`), recepção e dono (só da própria clínica) | 200 no mesmo formato de `GET /api/clinicas/{id}/medicos`: `{ id, nome, crm, sala, telefone, especialidade: { id, nome, duracao }, expediente: { semana, sabado, almoco } \| null }`. Usada no perfil da tela do médico | 403 outro médico, outra clínica ou paciente; 404 "Médico não encontrado." |
| DELETE /api/medicos/{id} | Recepção e dono (só da própria clínica) | 204. **Desativa** a conta do médico (`Usuarios.Ativo = 0`), sem apagar nada. Ele some de `GET /api/clinicas/{id}/medicos`, dos horários livres e da lista de espera da clínica; agendar ou entrar na fila com ele dá 404 "Médico não encontrado."; o login e o token dele passam a dar 401. As consultas antigas continuam legíveis, com o nome dele | 400 "Este médico tem consultas marcadas. Cancele ou reagende antes de desativar." (consulta de hoje em diante confirmada, na recepção ou em atendimento); 400 "Este médico tem pacientes na lista de espera. Tire-os da fila antes de desativar."; 403 outra clínica ou perfil; 404 "Médico não encontrado." (inexistente ou já desativado) |
| PUT /api/especialidades/{id} | Recepção e dono (só da própria clínica) | Corpo `{ nome, duracao }`, o mesmo do cadastro. 200 `{ id, nome, duracao }`. A duração nova vale para os horários livres e os agendamentos daqui para a frente; as consultas já marcadas mantêm o horário de fim delas | 400 "Essa especialidade já existe nesta clínica." (nome de outra especialidade da clínica); 400 com a mensagem da validação (por exemplo, duração 0); 403 outra clínica ou perfil; 404 "Especialidade não encontrada." |
| GET /api/feriados?de=&ate= | Todos os perfis logados | 200 `[{ id, data, nome }]`, em ordem de data. `de` e `ate` são obrigatórios (AAAA-MM-DD) | 400 "Informe a data de começo." / "Informe a data de fim." / "O fim do período precisa ser depois do começo." |
| PUT /api/pacientes/{id}/familiares/{idPessoa} | Paciente (só a própria conta; `{id}` = idUsuario, `{idPessoa}` = Id_Paciente) | Corpo igual ao do POST de familiar: `{ nome, cpf, relacao, nascimento, alergias?, cor? }`. 200 com o familiar no formato de sempre. O titular continua "Titular" (a relação enviada é ignorada) e, ao mudar o nome dele, muda também o nome da conta. Sem `cor`, a cor atual fica | 400 "CPF inválido." / "Este CPF já está cadastrado." (de outra pessoa) / "Escolha o parentesco." / "A data de nascimento não pode ser no futuro."; 403 "Você só pode gerenciar a sua família." (pessoa de outra conta); 403 sem corpo (URL de outra conta ou outro perfil); 404 "Paciente não encontrado." |

**Feriados: só leitura.** A tabela `Feriados` do Apêndice Q não tem coluna de clínica, e o banco não mudou: cada
feriado vale para **todas** as clínicas. Por isso a API não tem rota para gravar feriados. As rotas `POST /api/feriados`
e `DELETE /api/feriados/{id}`, acrescentadas no começo da integração, **foram retiradas**: com elas, o dono ou a
recepção de uma clínica podia fechar um dia, ou apagar um feriado, na agenda de todas as outras, o que fere o
isolamento entre clínicas (seção 5.4). Hoje o `POST /api/feriados` responde 405 (o caminho só aceita GET) e o
`DELETE /api/feriados/{id}` responde 404 (rota inexistente), para qualquer perfil. Os feriados nacionais de 2026 e
2027 entram pelo script `backend/docs/dados-feriados.sql`, que pode ser rodado mais de uma vez. Com o feriado no banco,
a `sp_AgendarConsulta` recusa o dia ("Não é permitido agendar em feriados.") e o dia some dos horários livres.
Para ter feriados por clínica, seria preciso uma coluna nova e uma mudança na `sp_AgendarConsulta`.
