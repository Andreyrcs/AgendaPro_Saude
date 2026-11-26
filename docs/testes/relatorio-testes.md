# Relatório de testes do sistema – AgendaPro Saúde

Data: 24/11/2026 · Branch `frontback`, commit `576e972` (etapas 9 a 12 já incluídas) · Executado por Claude Code, sem alterar o sistema.

**Como foi rodado**
- **Banco:** `AgendaPro_Saude_QA`, criado de uma cópia de `banco/agendapro_saude_sqlserver.sql` (só as linhas 6, 7 e 10 com o nome trocado). Depois rodei `dados-prevencao.sql` e `dados-feriados.sql` com `-d AgendaPro_Saude_QA`.
- **API:** o código atual foi compilado numa cópia no scratchpad, porque o `bin/` do repositório estava travado pela sua API.
  - Desde 23/11 havia uma API rodando na porta 5080, ligada ao `AgendaPro_Saude_App`. Você pediu para mantê-la.
  - Por isso a API de QA rodou na porta **5081**, com `ConnectionStrings__AgendaPro` por variável de ambiente.
  - O Playwright redirecionou as chamadas da web de `localhost:5080` para a 5081. A web foi servida pelo `http-server` que já estava na 5500 (só leitura).
  - O `git pull` no meio da execução não mudou `backend/` nem `banco/`. As telas do grupo CL, que rodaram antes do pull, foram revalidadas no código novo.
- **App:** pausado por instrução sua (⏸). As mesmas funções foram testadas pela API.
- **Tempo simulado:** oferta da fila, consulta "hoje", faltas e restrição vencida foram ajustadas direto no banco de QA. Esses testes estão marcados com "(tempo simulado no banco)".
- **Evidências:** ficaram no scratchpad da sessão, fora do repositório, e podem ser apagadas numa limpeza do sistema. A pasta é:
  `C:\Users\andre\AppData\Local\Temp\claude\f07e8a18492c1ae5\d098a83e-b5d8-4d1e-8ba3-ab61e60d2e91\scratchpad\pw\`
  Dentro dela:
  - `ev/api.jsonl`: toda chamada à API, com status e corpo.
  - `ev/sql.log`: toda consulta e ajuste no banco de QA.
  - `ev/shots/*.png`: screenshots.
  - `ev/net-*.log` e `ev/console-*.log`: rede e console de cada tela.
  - `results.jsonl`: o registro bruto dos resultados.
- **Transparência:**
  - Em 12 testes, o 1º registro saiu errado por falha do meu script (seletor, critério rígido demais, codificação do sqlcmd, ordem dos passos), não do sistema: CL-01, ENV-02, TR-01, AG-01, LE-07, LE-10, LE-11, LE-12, AT-08, PS-06, AC-03 e AC-06.
  - Em cada caso, o motivo está escrito na coluna "Obtido", e vale o resultado conferido com evidência.
  - LE-10 e LE-11 nunca tinham rodado de verdade, porque o ajuste de tempo falhou. Foram rodados uma vez, corretamente.

## Resumo

| Total | ✅ Aprovados | ❌ Reprovados | ⚠️ Não testável / registro | ⏸ Pendente (app) |
|---|---|---|---|---|
| 129 | 119 | 6 | 1 | 3 |

- ❌ **Reprovados:** TR-03, LE-09b, NO-02, AC-04, AC-10 e AC-12. Nenhum é de gravidade Alta.
- ⚠️ **PS-10:** o token antigo continua válido depois da troca de senha. É pendência já documentada no plano e decisão do grupo.
- ⏸ **AG-15, LE-14, PS-09** e a parte de app do AC-10: o app ainda não foi testado, por instrução sua.
- **Antes da apresentação (não é bug de código):** o `AgendaPro_Saude_App` **não está vazio** e **não tem feriados**. Veja a seção "Limpeza".

## Resultados

| ID | Teste | Perfil | Onde | Esperado | Obtido | Status | Evidência |
|---|---|---|---|---|---|---|---|
| ENV-01 | Banco QA criado da cópia do script + prevenção + feriados | sistema | banco | 19 tabelas, 14 procs, 2 triggers, 7 campanhas, 9 exames, feriados | QA criado da cópia (só linhas 6, 7 e 10 trocadas): 19 tabelas, 14 procs, 2 triggers, 1 view, 8 status, 3 parâmetros, 7 campanhas, 9 exames de prevenção, 20 feriados | ✅ | ev/sql.log, qa/schema_out.txt |
| ENV-02 | API aponta para o QA só por variável de ambiente | sistema | API | gravações caem no QA, não no App | API na 5081 grava no AgendaPro_Saude_QA (Clínica QA id 1); AgendaPro_Saude_App: 0 linhas com esse nome | ✅ | ev/sql.log |
| CL-01 | Cadastrar clínica e dono | público | web | tela "Clínica cadastrada" + código AAA-0000 | revalidação pós-pull: formulário carrega com 12 campos, erros no console: 0  | ✅ | ev/shots/CL-REVAL-cadastro-clinica.png, ev/net-CL-REVAL-cadastro.log |
| CL-02 | CNPJ repetido/inválido, e-mail repetido | público | API | mensagens exatas (400) | CNPJ repetido: 400 {"mensagem":"Já existe uma clínica com este CNPJ."} ¦ CNPJ inválido: 400 {"mensagem":"CNPJ inválido. Confira os 14 números."} ¦ e-mail repetido: 400 {"mensagem":"Este e-mail já tem uma conta. Use outro ou entre com ele."} | ✅ | ev/api.jsonl |
| CL-03 | Ver dados da clínica | dono | web+API | dados, código, CNPJ só leitura | revalidação pós-pull: nome="Clínica QA", código=QAX-5252, equipe com R1 e sem R2; console: 0 erros | ✅ | ev/shots/CL-REVAL-equipe.png, ev/net-CL-REVAL-equipe.log |
| CL-04 | Editar dados da clínica | dono | web | "Dados da clínica salvos" + banco | revalidação pós-pull: toast "Dados da clínica salvosO novo nome já ap", telefone no banco (15) 3222-6677 | ✅ | ev/shots/CL-REVAL-equipe.png |
| CL-05 | Recepção editando a clínica | recepção | API | 403 | PUT /clinicas como recepção: 403 null | ✅ | ev/api.jsonl |
| CL-06 | Criar recepcionista (senha provisória) | dono | web | credencial mostrada uma vez | credencial na tela: [Recepção QA 1 já pode entrar. Passe estes dados à pessoa:E-mailrecep1.qa@teste.comSenha pr ¦¦ Recepção QA 2 já pode entrar. Passe estes dados à pessoa:E-mailrecep2.qa@teste.comSenha pr]; banco: 2¦Recepção QA 1¦recep1.qa@teste.com¦RECEPCAO¦1 ; 3¦Recepção QA 2¦recep2.qa@teste.com¦RECEPCAO¦1 | ✅ | ev/shots/CL-06-*.png, ev/net-CL-03a06.log |
| CL-07 | Login com senha provisória | recepção | API | 200, papel recepcao | login R1 (senha provisória "yghgr902"): 200 papel=recepcao clinicaId=1 | ✅ | ev/api.jsonl |
| CL-08 | Desativar recepcionista | dono | web | some da equipe; login 401 | revalidação pós-pull: R2 continua fora da lista da equipe | ✅ | ev/shots/CL-REVAL-equipe.png |
| CL-09 | Dono removendo a si mesmo | dono | API+web | 400 "Você não pode remover a sua própria conta." | API: 400 {"mensagem":"Você não pode remover a sua própria conta."}; botão "Remover" na linha do dono na tela: 0 | ✅ | ev/api.jsonl |
| CL-10 | Segunda clínica | público | API | 201, outro código | POST /clinicas: 201 {"clinica":{"id":2,"nome":"Clínica QA 2","codigo":"QAX-1805","publica":false},"usuario":{"idUsuario":4,"nome":"Dono QA 2","email":"dono2.qa@teste.com","papel":" | ✅ | ev/api.jsonl |
| CA-01 | Criar 4 especialidades (nomes exatos) | recepção | web | Clínica geral, Ginecologia, Pediatria, Psiquiatria | banco: 1¦Clínica geral¦30 ; 2¦Ginecologia¦30 ; 3¦Pediatria¦30 ; 4¦Psiquiatria¦30 | ✅ | ev/shots/CA-01-criadas.png, ev/net-CA-01.log |
| CA-02 | Editar duração | recepção | web | "{nome} atualizada" + banco | toast: "Pediatria criadaCadastre um médico para abrir a agenda.Psiqu"; duração no banco: 20 | ✅ | ev/shots/CA-02-editada.png |
| CA-03 | Especialidade com nome repetido | recepção | web+API | "Essa especialidade já existe nesta clínica." | tela mostra a mensagem=true; POST: 400 {"mensagem":"Essa especialidade já existe nesta clínica."}; PUT renomear: 400 {"mensagem":"Essa especialidade já existe nesta clínica."} | ✅ | ev/shots/CA-03-repetida.png |
| CA-04 | Cadastrar médicos com CRM e sala | recepção | web | senha provisória + banco | senhas provisórias na tela: ngvhg158,axhmc907,mcvcj605,xmezg621,dwubc445; banco: 1¦Dr. QA Clínico¦CRM/SP 100001¦Sala 1 ; 2¦Dra. QA Gineco¦CRM/SP 100002¦Sala 2 ; 3¦Dr. QA Pediatra¦CRM/SP 100003¦Sala 3 ; 4¦Dra. QA Psiq¦CRM/SP 100004¦Sala 4 ; 5¦Dr. QA Desativar¦CRM/SP 100005¦Sala 5 | ✅ | ev/shots/CA-04-M*.png, ev/net-CA-04.log |
| CA-05 | CRM repetido / médico troca o próprio CRM | recepção/médico | API | 400 CRM repetido / 403 "Só a recepção pode alterar o CRM." | CRM repetido: 400 {"mensagem":"Já existe um médico com este CRM."} ¦ médico troca CRM: 403 {"mensagem":"Só a recepção pode alterar o CRM."} | ✅ | ev/api.jsonl |
| CA-06 | Expediente com almoço | recepção | web | "Expediente de {nome} salvo", seg–sex | toast: "Expediente de Dr. QA Clínico salvoA agenda passa a"; banco: 1¦08:00:00.0000000¦17:00:00.0000000¦12:00:00.0000000¦13:00:00.0000000 ; 2¦08:00:00.0000000¦17:00:00.0000000¦12:00:00.0000000¦13:00:00.0000000 ; 3¦08:00:00.0000000¦17:00:00.0000000¦12:00:00.0000000¦13:00:00.0000000 ; 4¦08:00:00.0000000¦17:00:00.0000000¦12:00:00.0000000¦13:00:00.0000000 ; 5¦08:00:00.0000000¦17:00:00.0000000¦12:00:00.0000000¦13:00:0… | ✅ | ev/shots/CA-06-salvo.png, ev/net-CA-06.log |
| CA-07 | Horários livres respeitam almoço/fds/passado | recepção | API | nenhum horário no almoço, fds ou passado | 200; 84 datas, fds=0, horários no almoço=0, datas passadas=0; amostra: [{"medico":{"id":1,"nome":"Dr. QA Clínico","sala":"Sala 1"},"dias":[{"data":"2026-11-24","horas":["13:00","13:20","13:40","14:00","14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"]},{"da | ✅ | ev/CA-07-horarios-livres.json |
| CA-08 | Feriado (só leitura): GET e dia some dos livres | recepção | API | 25/12 listado e fora dos horários livres | GET /feriados dez/2026: 200 [{"id":10,"data":"2026-12-25","nome":"Natal"}]; horários livres incluem 24/12=true, 25/12=false | ✅ | ev/api.jsonl |
| CA-09 | Rotas de escrita de feriado | recepção | API | 405/404 (decisão de projeto) | POST: 405, DELETE: 404 (comportamento esperado: feriados nacionais só leitura) | ✅ | ev/api.jsonl |
| CA-10 | Desativar médico com consulta | recepção | API | 400 "Este médico tem consultas marcadas…" | 400 {"mensagem":"Este médico tem consultas marcadas. Cancele ou reagende antes de desativar."} | ✅ | ev/api.jsonl |
| CA-11 | Desativar médico sem pendências | recepção | web | some das listas e dos livres; login 401 | banco Ativo=0; na lista de médicos=false; nos horários livres=false; login de M5: 401 {"mensagem":"E-mail ou senha incorretos"} | ✅ | ev/shots/CA-11-removido.png, ev/net-CA-11.log |
| CA-12 | Desativar médico com fila | recepção | API | 400 "Este médico tem pacientes na lista de espera…" | P1 na fila de M2: 201; DELETE M2: 400 {"mensagem":"Este médico tem pacientes na lista de espera. Tire-os da fila antes de desativar."} | ✅ | ev/api.jsonl |
| PC-01 | Autocadastro | público | web | entra direto em escolher-clinica | URL final: /escolher-clinica.html; banco: 10¦Paciente Teste 1¦PACIENTE¦10101010133¦Titular | ✅ | ev/shots/PC-01-depois-cadastro.png, ev/net-PC-01.log |
| PC-02 | CPF inválido | público | web+API | "CPF inválido." | tela: "CPF inválido."; API: 400 {"mensagem":"CPF inválido."} | ✅ | ev/shots/PC-02-04-invalidos.png, ev/api.jsonl |
| PC-03 | CPF repetido | público | API | "Este CPF já está cadastrado." | 400 {"mensagem":"Este CPF já está cadastrado."} | ✅ | ev/api.jsonl |
| PC-04 | E-mail inválido | público | web+API | erro no formulário / "Informe um e-mail válido." | tela: "Formato de e-mail inválido."; API: 400 {"mensagem":"Informe um e-mail válido."} | ✅ | ev/shots/PC-02-04-invalidos.png, ev/api.jsonl |
| PC-05 | Login | paciente | web | vai para escolher-clinica (sem clínica) | depois do login: /escolher-clinica.html (sem clínica ainda) | ✅ | ev/shots/PC-05-login.png, ev/net-PC-05.log |
| PC-06 | Ver perfil | paciente | web | nome, e-mail, CPF, telefone mascarado | perfil: "NomePaciente Teste 1E-mailp1.qa@teste.comTelefone•••• 4567CPF101.010.101-33Nascimento15 de março de 1990" | ✅ | ev/shots/PC-06-perfil.png |
| PC-07 | Trocar senha | paciente | web | "A senha atual não confere." / "Senha trocada"; nova entra, antiga 401 | senha errada: "A senha atual não confere."; certa: aviso "Senha trocada"=true; login nova: 200; login antiga: 401 {"mensagem":"E-mail ou senha incorretos"} | ✅ | ev/shots/PC-07-errada.png, ev/shots/PC-07-certa.png |
| PC-08 | Vincular clínica pela busca | paciente | web | pública listada, privada não; vínculo gravado | busca "QA": "Clínica QAAv. QA Editada, 200 - Centro · Sorocaba/SPEscolher" (privada listada=false); URL /paciente-desktop.html; vínculo no banco: clínica 1 | ✅ | ev/shots/PC-08-busca.png, ev/shots/PC-08-vinculada.png |
| PC-09 | Vincular pelo código | paciente | web | código errado avisa; certo vincula; privada achada pelo código | código errado: "Não achamos uma clínica com esse código. Confira com a recepção."; código QAX-5252: vinculou (banco 1); clínica privada achada pelo código: 200 {"id":2,"nome":"Clínica QA 2","endereco":"Rua QA Dois, 2","telefone":"(15) 3444-0000","cnpj":"99.887.766/0001-05","cidade":"Itu","uf":"SP","codigo":"QAX-1805"," | ✅ | ev/shots/PC-09-codigo-errado.png, ev/shots/PC-09-vinculada.png, ev/net-PC-09.log |
| PC-10 | Adicionar familiar com CPF | paciente | web | familiar listado | GET familiares: 200 [{"id":1,"nome":"Paciente Teste 1","curto":"Paciente","cpf":"10101010133","relacao":"Titular","nascimento":"1990-03-15","cor":"#CFE2F6","alergias":null,"titular; URL depois: /paciente-desktop.html#familia | ✅ | ev/shots/PC-10-familiar.png |
| PC-11 | Idade pela data de nascimento | paciente | web | 8 anos / 36 anos | tela Família: "FamíliaVocê cuida das consultas de 2 pessoas.Paciente (você)Titular · 36 anosNenhuma consulta marcadaFamiliarFilho(a) · 8 anosNenhuma consulta marcadaAdicionar familiarCada pessoa tem uma cor própria, que aparece em toda" | ✅ | ev/shots/PC-11-familia.png |
| PC-12 | Familiar com CPF repetido/inválido | paciente | API | mensagens exatas | CPF repetido: 400 {"mensagem":"Este CPF já está cadastrado."} ¦ inválido: 400 {"mensagem":"CPF inválido."} | ✅ | ev/api.jsonl |
| PC-13 | Editar familiar | paciente | web | banco atualizado | banco Alergias="Dipirona (teste QA)" | ✅ | ev/shots/PC-13-editado.png |
| TR-01 | Sintoma comum → cartões de especialidade | paciente | web | cartão + "orientação, não diagnóstico" | Resposta "Pelo que você descreveu, estas especialidades podem ajudar:" + cartão-link "Clínica geral >" (a.chip-esp → #agendar/...) + "Isto é uma orientação, não um diagnóstico...". (1º registro ❌ foi erro do seletor do teste, que procurava o texto "Marcar") | ✅ | ev/shots/TR-01-comum.png |
| TR-02 | Dor no peito + falta de ar → SAMU 192 | paciente | web | cartão de emergência, sem agendamento | resposta: "Dor no peito e falta de ar Isso pode ser uma emergênciaDor no peito, falta de ar, desmaio ou fraqueza de um lado do corpo precisam de atendimento agora. Não espere por uma consulta. Ligar 192 (SAMU)Dor de cabeçaFebreDor no peitoDor nas costasProblema de pelePr"; link tel:192: 3; oferece agendamento: false | ✅ | ev/shots/TR-02-emergencia.png |
| TR-03 | Crise emocional ("quero morrer") → CVV 188 | paciente | web | cartão CVV 188 + SAMU 192 | resposta: "quero morrerPelo que você descreveu, estas especialidades podem ajudar:Clínica geralIsto é uma orientação, não um diagnóstico. Se piorar, ou se aparecer febre alta, falta de ar ou dor forte, procure um pronto-socorro.Dor" | ❌ | ev/shots/TR-03-crise.png |
| TR-03b | Crise com palavra da lista ("suicídio") | paciente | web | cartão CVV 188 + SAMU 192 | frase com palavra da lista: "pensando em suicídio Você não está sozinhoConverse agora com alguém do CVV, de graça, 24 horas por dia. Se houver risco imediato, ligue para o SAMU. Ligar 188 (CVV) Ligar 192 (SAMU)Dor de cabeçaFebreD" | ✅ | ev/shots/TR-03b-crise-palavra-da-lista.png |
| TR-04 | Aviso "não faz diagnóstico" | paciente | web | texto visível | texto no topo: "Dor de cabeçaFebreDor no peitoDor nas costasProblema de peleProblema de visão Orienta, mas não faz diagnóstico médico." | ✅ | ev/shots/TR-04-assistente.png |
| TR-05 | Cartão leva ao agendamento | paciente | web | #agendar/{esp}/{pessoa} | URL depois de "Marcar": /paciente-desktop.html#agendar/1/1 | ✅ | ev/shots/TR-05-agendar.png |
| AG-01 | Agendar para si | paciente | web | "Consulta marcada!" + CONFIRMADA | Tela "Consulta marcada!"; banco: consulta 1, P1, M1, 2026-11-25 08:00, CONFIRMADA. (O 1º registro ❌ cobrava uma notificação CONSULTA_CONFIRMADA que o sistema só grava ao aceitar vaga da fila – sp_AceitarOferta, SQL:1076 – e que a documentação não promete para o agendamento direto; critério errado na minha lista. Verificado em NO-01.) | ✅ | ev/shots/AG-01-marcada.png, ev/net-AG-01.log |
| AG-02 | Agendar para familiar (Pediatria) / adulto na Pediatria | paciente | web+API | ok / "A pediatria atende só…" | F1: tela ok=true, banco 2¦3¦2026-11-25¦10:00:00.0000000; P1 adulto na Pediatria: 400 {"mensagem":"A pediatria atende só crianças e adolescentes até 18 anos."} | ✅ | ev/shots/AG-02-pediatria-familiar.png |
| AG-03 | Agendar pela recepção (Nova consulta) | recepção | web | "Consulta marcada" | painel: "NOV25quaConsulta marcadaPaciente Teste 2 com Dr. QA Clínico (Clínica geral), quarta, 25 de novembro, às 09:00, Sala 1. E"; banco: 3¦2026-11-25¦09:00:00.0000000¦1 | ✅ | ev/shots/AG-03-feito.png, ev/net-AG-03.log |
| AG-04 | Conflito: 2 agendamentos simultâneos | paciente ×2 | API | um 201, outro "Este horário acabou de ser ocupado. Escolha outro." | P1: 201 {"id":4,"data":"2026-11-25","hora":"08:40","sala":"Sala 1","status":"confirmada","motivo":"Teste QA","tipo":"consulta","titulo":null,"presencaConfirmada":false, ¦ P2: 400 {"mensagem":"Este horário acabou de ser ocupado. Escolha outro."} ¦ consultas no horário (banco): 1 | ✅ | ev/api.jsonl |
| AG-05 | Sábado sem expediente | paciente | API | "Médico não atende neste dia." | sábado 28/11: 400 {"mensagem":"Médico não atende neste dia."} | ✅ | ev/api.jsonl |
| AG-06 | Horário de almoço | paciente | API | "Horário coincide com o almoço." | almoço 12:00: 400 {"mensagem":"Horário coincide com o almoço."} | ✅ | ev/api.jsonl |
| AG-07 | Data/horário passado | paciente | API | "Não é permitido agendar em data ou horário passado." | ontem 10:00: 400 {"mensagem":"Não é permitido agendar em data ou horário passado."} ¦ hoje 08:00: 400 {"mensagem":"Não é permitido agendar em data ou horário passado."} | ✅ | ev/api.jsonl |
| AG-08 | Feriado | paciente | API | "Não é permitido agendar em feriados." | Natal 25/12: 400 {"mensagem":"Não é permitido agendar em feriados."} | ✅ | ev/api.jsonl |
| AG-09 | Fora do expediente | paciente | API | "Horário fora do expediente." | 18:00: 400 {"mensagem":"Horário fora do expediente."} | ✅ | ev/api.jsonl |
| AG-10 | Paciente com 2 consultas no mesmo horário | paciente | API | "Paciente já possui consulta neste horário." | mesmo horário com outro médico: 400 {"mensagem":"Paciente já possui consulta neste horário."} | ✅ | ev/api.jsonl |
| AG-11 | Detalhe da consulta | paciente | web | data, hora, médico, sala, motivo | detalhe: "Clínica geralAmanhãNOV25quaClínica geralDr. QA ClínicoPara vocêDataQuarta, 25 de novembroHorário08:00LocalClínica QA, Sala 1Av. QA Editada, 200 - CentroMotivoDor de cabeça (teste QA)Ligar para a clínica (15) 3222-6677Se não puder ir, avise até o fim do dia ant" | ✅ | ev/shots/AG-11-detalhe.png |
| AG-12 | Agenda da clínica: dia/semana/mês | recepção | web | consultas nas 3 vistas | dia(amanhã) mostra pacientes=true; semana=true; mês contém o dia 25 com marcação: "25/11–1371070000–qui, 26/11–00000000–sex, 27/11–00000000–sáb, 2"; erros console=0 | ✅ | ev/shots/AG-12-dia-amanha.png, ev/shots/AG-12-semana.png, ev/shots/AG-12-mes.png, ev/net-AG-12.log |
| AG-13 | Agenda do médico (API) | médico | API | 200; outro médico 403 | M1: 200 {"consultas":[{"id":1,"data":"2026-11-25","hora":"08:00","sala":"Sala 1","status":"confirmada","motivo":"Dor de cabeça (teste QA)","tipo":"consulta","titulo":nu ¦ M2 lendo a agenda de M1: 403 | ✅ | ev/api.jsonl |
| AG-14 | Tela do médico (medico.html) | médico | web | agenda real pela API, sem dado fictício | chama /api/medicos/{id}/agenda=true; amanhã mostra "Paciente Teste 1"=true; dado fictício=false; erros console=0  | ✅ | ev/shots/AG-14-medico-hoje.png, ev/shots/AG-14-medico-amanha.png, ev/net-AG-14.log |
| AG-15 | Agendar pelo app | paciente | app | — | pendente: app ainda não integrado (instrução do usuário). Mesma função testada pela API em AG-01/AG-04/AG-05..10 | ⏸ | - |
| CN-01 | Paciente cancela | paciente | web | cancelada, vira VAGA, sem falta | NET DELETE /api/consultas/4 -> 200; banco: 4¦1¦CANCELADA ; 6¦NULL¦VAGA; faltas: 0; 08:40 volta aos livres=true; tela: "Consulta canceladaO horário ficou livre para outra pessoa." | ✅ | ev/shots/CN-01-cancelada.png, ev/net-CN-01.log |
| CN-02 | Recepção cancela pela agenda | recepção | web | "Consulta de {nome} cancelada · horário livre" | toast: "Consulta de Paciente Teste 2 cancelada · horário livreNinguém está esperando vaga com Dra."; status no banco: 6 (6=CANCELADA) | ✅ | ev/shots/CN-02-cancelada.png, ev/net-CN-02.log |
| CN-03 | Recepção reagenda para horário livre | recepção | API | 200, nova hora | 200 {"id":10,"data":"2026-11-25","hora":"09:20","sala":"Sala 1","status":"confirmada","motivo":"Retorno de exames (teste QA)","tipo":"consulta","titulo":null,"prese; banco: 3¦09:00:00.0000000¦CANCELADA¦2 ; 9¦09:00:00.0000000¦VAGA¦NULL ; 10¦09:20:00.0000000¦CONFIRMADA¦2 | ✅ | ev/api.jsonl |
| CN-04 | Reagendar para horário ocupado | recepção | API | 400 "Este horário acabou de ser ocupado…"; original continua | 400 {"mensagem":"Este horário acabou de ser ocupado. Escolha outro."}; original: CONFIRMADA¦09:20:00.0000000; linhas em Consultas antes/depois: 10/10 | ✅ | ev/api.jsonl |
| CN-05 | Paciente cancelando consulta de outra conta | paciente | API | 403 "Você só pode gerenciar a sua família." | 403 {"mensagem":"Você só pode gerenciar a sua família."}; consulta de P1 continua status 1 | ✅ | ev/api.jsonl |
| LE-01 | Entrar na fila | paciente | API+web | 201, posição 1 | POST /api/lista-espera (mesmo endpoint da tela; o botão da tela só aparece sem horário livre ou com restrição, paciente-desktop.js:1580-1607): 201 {"id":1,"posicao":1,"naFila":1,"desde":"2026-11-24","pessoa":{"id":3,"nome":"Paciente Teste 3","curto":"Paciente","cpf":"30303030399","relacao":"Titular","nasci; banco: 1¦3¦Paciente Teste 3¦1¦1¦AGUARDANDO¦NULL + complemento pela tela: com restrição, o botão "Entrar na list… | ✅ | ev/shots/LE-01-inicio.png |
| LE-02 | Ver a posição | paciente | web | "Você está na posição 1" | tela: "Lista de esperaClínica geral · Dr. QA Clínico1Você está na posição 1da filaClínica geral · Dr. QA ClínicoNa fila desde 24 de novembroVocê é a próxima pessoa da filaSe alguém cancelar, a vaga vai para " | ✅ | ev/shots/LE-02-posicao.png |
| LE-03 | Sair da fila e voltar | paciente | web | "Você saiu da fila"; volta no fim | aviso: "AgendaPro SaúdeVocê saiu da filaSua posi"; depois de sair: 2¦4¦Paciente Teste 4¦1¦1¦AGUARDANDO¦NULL ; 1¦3¦Paciente Teste 3¦1¦1¦SAIU¦NULL; voltou: 201 {"id":3,"posicao":2,"naFila":2,"desde":"2026-11-24","pessoa":{"id":3,"nome":"Paciente Teste 3","curto":"Paciente","cpf":"30303030399","relacao":"Titular","nasci → 2¦4¦Paciente Teste 4¦1¦1¦AGUARDANDO¦NULL ; 3¦3¦Paciente Teste 3¦1¦2¦AGUARDANDO¦NULL ; 1¦3¦Pacien… | ✅ | ev/shots/LE-03-saiu.png |
| LE-04 | Entrar em 2ª fila | paciente | API | "Você já está numa lista de espera…" | 400 {"mensagem":"Você já está numa lista de espera. Saia dela antes de entrar em outra."} | ✅ | ev/api.jsonl |
| LE-05 | Recepção coloca na fila | recepção | web | "{nome} entrou na fila" | toast: "Paciente Teste 4 entrou na filaPosição 2 na fila de Dr. QA Clínico."; banco: 1¦3¦Paciente Teste 3¦1¦1¦AGUARDANDO¦NULL ; 2¦4¦Paciente Teste 4¦1¦2¦AGUARDANDO¦NULL | ✅ | ev/shots/LE-05-recepcao-adicionou.png, ev/net-LE-05.log |
| LE-06 | Cancelamento oferecido ao 1º | recepção | web | toast "vaga oferecida a…", OFERECIDA, VAGA_OFERECIDA | toast: "Consulta cancelada · vaga oferecida a Paciente Teste 4Vaga de qua, 25/11, 15:00 com Dr. QA"; fila: 3¦3¦Paciente Teste 3¦1¦2¦AGUARDANDO¦NULL ; 2¦4¦Paciente Teste 4¦1¦1¦OFERECIDA¦14 ; 1¦3¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦1¦Paciente Teste 1¦2¦1¦SAIU¦NULL; horário: 13¦CANCELADA¦15:00:00.0000000 ; 14¦OFERECIDA¦15:00:00.0000000; notificação P4: VAGA_OFERECIDA¦Vaga liberada com Dr. QA Clínico em 25/11/2026 às … | ✅ | ev/shots/LE-06-oferecida.png, ev/net-LE-06.log |
| LE-07 | Contagem de 30 min (web) | paciente | web | gaveta com contagem regressiva | Gaveta "Abriu uma vaga para você" com "Confirme em até 28 min 45 s" → "28 min 43 s" (contagem pelo expiraEm da API, diminuindo a cada segundo). O 1º registro ❌ exigia 29–30 min, mas a oferta tinha sido criada ~1 min antes (critério do teste rígido demais). | ✅ | ev/shots/LE-07-contagem.png |
| LE-08 | 1º aceita | paciente | web | "Vaga confirmada!", consulta dele, ACEITA | tela "Vaga confirmada!"=true; consulta 14: 4¦CONFIRMADA; fila: 2¦4¦Paciente Teste 4¦1¦1¦ACEITA¦14 ; 3¦3¦Paciente Teste 3¦1¦1¦AGUARDANDO¦NULL ; 1¦3¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦1¦Paciente Teste 1¦2¦1¦SAIU¦NULL; notificações P4: VAGA_OFERECIDA,CONSULTA_CONFIRMADA | ✅ | ev/shots/LE-08-aceitou.png, ev/net-LE-07a08.log |
| LE-09 | 1º recusa → vaga ao 2º | paciente | web | "Vaga recusada"; 2º recebe a oferta | P2 entrou: 201; antes da recusa: 2¦4¦Paciente Teste 4¦1¦1¦ACEITA¦14 ; 5¦2¦Paciente Teste 2¦1¦2¦AGUARDANDO¦NULL ; 3¦3¦Paciente Teste 3¦1¦1¦OFERECIDA¦16 ; 1¦3¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦1¦Paciente Teste 1¦2¦1¦SAIU¦NULL; depois: 2¦4¦Paciente Teste 4¦1¦1¦ACEITA¦14 ; 3¦3¦Paciente Teste 3¦1¦1¦EXPIRADA¦16 ; 5¦2¦Paciente Teste 2¦1¦1¦OFERECIDA¦16 ; 1¦3¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦1¦Paciente Teste 1¦2¦1¦… | ✅ | ev/shots/LE-09-recusou.png, ev/net-LE-01a09.log |
| LE-09b | Quem recusa continua na fila (como a tela diz) | paciente | web+API | continua AGUARDANDO | Depois de recusar, a tela mostrou "Vaga recusada — Você continua na fila" (paciente-desktop.js:1428), mas GET /pacientes/{P3}/lista-espera: 200 null; banco: entrada de P3 = EXPIRADA (sp_RecusarOferta, SQL:1138-1141) | ❌ | ev/shots/LE-09-recusou.png, ev/api.jsonl |
| LE-10 | Oferta expira em 30 min (tempo simulado) | sistema | banco | EXPIRADA, passa ao próximo ou VAGA | fila depois da tarefa: 2¦Paciente Teste 4¦1¦1¦ACEITA¦14 ; 3¦Paciente Teste 3¦1¦1¦EXPIRADA¦16 ; 5¦Paciente Teste 2¦1¦1¦EXPIRADA¦16 ; 1¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦Paciente Teste 1¦2¦1¦SAIU¦NULL; horário 15:20 (consulta 16): VAGA (ninguém mais aguardando → fica VAGA) | ✅ | ev/sql.log (tempo simulado no banco) |
| LE-11 | Contagem chega a zero na web (tempo simulado) | paciente | web | "O prazo terminou…", botão desabilitado | UPDATE afetou 1 linha; contagem inicial "0 min 07 s"; depois: "O prazo terminou. A vaga foi para a próxima pessoa da fila, e você continua na fila."; botão confirmar desabilitado=true | ✅ | ev/shots/LE-11-prazo-terminou.png (tempo simulado no banco) |
| LE-12 | Recepção oferece manualmente uma VAGA | recepção | web | "Vaga oferecida a {nome}" | P3 volta à fila: 201; botões "Oferecer horário" (só em VAGA): 1 [vagas 6]; toast: "Vaga oferecida a Paciente Teste 3qua, 25/11, 08:40 com Dr. Q"; fila: 2¦Paciente Teste 4¦1¦1¦ACEITA¦14 ; 3¦Paciente Teste 3¦1¦1¦EXPIRADA¦16 ; 5¦Paciente Teste 2¦1¦1¦EXPIRADA¦16 ; 6¦Paciente Teste 3¦1¦1¦OFERECIDA¦6 ; 1¦Paciente Teste 3¦1¦1¦SAIU¦NULL ; 4¦Paciente Teste 1¦2¦1¦SAIU¦NULL | ✅ | ev/shots/LE-12-oferecida.png, ev/net-LE-12.log |
| LE-13 | Oferecer consulta que não é VAGA | recepção | API | 404 "Vaga não encontrada ou não está disponível." | 404 {"mensagem":"Vaga não encontrada ou não está disponível."} | ✅ | ev/api.jsonl |
| LE-14 | Contagem no app | paciente | app | — | pendente: app ainda não integrado (instrução do usuário). Contagem testada na web em LE-07/LE-11 | ⏸ | - |
| CP-01 | Lembrete na véspera | paciente | web | cartão "Vou / Não vou" | botões "Vou": 2; trecho: "Confirme sua consulta de amanhãClínica geral com Dr. QA Clínico, às 08:00.Se não puder ir, toque em “Não vou” até o fim de hoje: não há nenhuma consequência.VouNão vouC" | ✅ | ev/shots/CP-01-lembrete.png |
| CP-02 | Confirmar 3 dias antes | paciente | API | "Só dá para confirmar a partir da véspera da consulta." | consulta em 2026-11-27: 201; presença: 400 {"mensagem":"Só dá para confirmar a partir da véspera da consulta."} | ✅ | ev/api.jsonl |
| CP-03 | "Vou" grava a confirmação | paciente | web | "Presença confirmada" + banco | aviso: "AgendaPro SaúdePresença confirmadaA clínica já sabe que você"; banco PresencaConfirmada¦ConfirmadaEm: 1¦2026-11-24 13:10:29.9720053 | ✅ | ev/shots/CP-03-vou.png |
| CP-04 | "Não vou" na véspera | paciente | web | cancela sem falta | aviso: "AgendaPro SaúdeConsulta canceladaSem nenhuma consequência. O horário ficou livre para outra pessoa."; status 6 (6=CANCELADA); faltas da consulta: 0 | ✅ | ev/shots/CP-04-naovou.png, ev/net-CP.log |
| CP-05 | "Vou" e depois "Não vou" no dia (tempo simulado) | paciente | API | falta registrada | Vou: 200; (consulta movida p/ hoje 16:40) Não vou: 200 {"falta":true,"oferecidoAFila":false}; Faltas: 1¦2026-11-24; P2 FaltasSemAviso¦Restricao: 1¦NORMAL | ✅ | ev/api.jsonl, ev/sql.log (tempo simulado no banco) |
| AT-01 | Chegada e desfazer | recepção | web | NA_RECEPCAO → CONFIRMADA | toast: "Paciente Teste 1 está na recepçãoDr. QA Clínico, 16:00Desfaz"; status depois da chegada: NA_RECEPCAO; depois de "Desfazer": CONFIRMADA | ✅ | ev/shots/AT-01-chegou.png, ev/shots/AT-01-desfeito.png |
| AT-02 | Chegada de consulta não confirmada | recepção | API | "Só dá para registrar a chegada de consulta confirmada." | 400 {"mensagem":"Só dá para registrar a chegada de consulta confirmada."} | ✅ | ev/api.jsonl |
| AT-03 | Recepção inicia atendimento | recepção | web | EM_ATENDIMENTO | status depois de "Iniciar atendimento": EM_ATENDIMENTO | ✅ | ev/shots/AT-03-iniciado.png, ev/net-AT-01a03.log |
| AT-04 | Médico inicia e finaliza | médico | API | ATENDIDA; recepção finalizando = 403 | recepção chegada: 200; médico inicia: 200; recepção finaliza: 403; médico finaliza: 200; status final: ATENDIDA | ✅ | ev/api.jsonl |
| AT-05 | Retorno com data / encaminhado à recepção | médico | API | 201/201; data "" = 400 | com data: 201 {"id":1,"consulta":14,"data":"2026-12-24","nota":"Retorno em 30 dias (teste QA)","status":"agendado","pessoa":{"id":4,"nome":"Paciente Teste 4"},"medico":{"id": ¦ data null: 201 {"id":2,"consulta":1,"data":null,"nota":"Encaminhado à recepção (teste QA)","status":"encaminhado","pessoa":{"id":1,"nome":"Paciente Teste 1"},"medico":{"id":1, ¦ data "": 400 {"mensagem":"Confira o formato dos dados enviados."}… | ✅ | ev/api.jsonl |
| AT-06 | Médico pede exame | médico | API | PENDENTE | 201 {"id":1,"consulta":14,"nome":"Hemograma completo (teste QA)","status":"pendente","pessoa":{"id":4,"nome":"Paciente Teste 4"},"medico":{"id":1,"nome":"Dr. QA Clí; banco: 1¦4¦Hemograma completo (teste QA)¦PENDENTE | ✅ | ev/api.jsonl |
| AT-07 | Recepção marca exame realizado | recepção | web | REALIZADO | status do exame no banco: REALIZADO | ✅ | ev/shots/AT-07-realizado.png, ev/net-AT-07.log |
| AT-08 | Paciente vê "Depois da consulta" | paciente | web | retorno e exame pedido | retorno + exame pendente visíveis: "Depois da consultaRetornos e exames pedidos pelo médico.RetornosRetorno com Dr. QA ClínicoPaciente · com Dr. QA ClínicoData indicada pelo médico · Retorno em 30 dias (teste QA). Marcar até 24 de dezembro.Faltam 30 diasAgendar retornoExames pedidosGlicemia de jejum (teste QA)Paciente · pedido por Dr. QA ClínicoPedido por Dr. QA C". (1ª leitura ❌: o exame já estava realizado pelo AT-… | ✅ | ev/shots/AT-08-depois-da-consulta.png, ev/shots/AT-08b-depois-da-consulta.png |
| FA-01 | 1ª falta | recepção | API | sem restrição | consulta 20 (201), Vou 200, falta 201; situação: 200 {"faltas":1,"restricao":"normal","ate":null} | ✅ | ev/api.jsonl |
| FA-02 | 2ª falta → SO_FILA 30 dias | paciente | API+web | aviso, bloqueio do direto, fila liberada | consulta 21 (201), Vou 200, falta 201; situação: 200 {"faltas":2,"restricao":"so_fila","ate":"2026-12-24"}; banco: SO_FILA¦2026-12-24¦0; notificação: "Por 30 dias, você pode agendar só pela lista de espera."; agendar direto: 400 {"mensagem":"Por enquanto, você pode agendar só pela lista de espera."}; tela Início com aviso=true; tela Agendar: horários=0, texto "Agendamento direto indisponível"=true; entrar na fila pel… | ✅ | ev/shots/FA-02-inicio-aviso.png, ev/shots/FA-02-agendar-bloqueado.png, ev/shots/FA-02-entrou-na-fila.png |
| FA-03 | Nova falta → SO_RECEPCAO | paciente | API+web | direto e fila bloqueados; recepção agenda | consulta 22 (201), Vou 200, falta 201; situação: 200 {"faltas":3,"restricao":"so_recepcao","ate":"2026-12-24"}; paciente agenda: 400 {"mensagem":"Por enquanto, agende pela recepção da clínica."}; sai da fila: 204; entra na fila: 400 {"mensagem":"Por enquanto, agende pela recepção da clínica."}; recepção agenda: 201; aviso na tela=true | ✅ | ev/shots/FA-03-so-recepcao.png, ev/net-FA-03.log |
| FA-04 | Recepção retira falta justificada | recepção | web | volta ao normal; retirar de novo 404 | falta 4¦1¦Atestado médico apresentado (teste QA); situação: 200 {"faltas":2,"restricao":"normal","ate":null}; retirar de novo: 404 {"mensagem":"Falta não encontrada ou já retirada."}; paciente volta a agendar direto: 201 | ✅ | ev/shots/FA-04-retirada.png, ev/net-FA-04.log |
| FA-05 | Restrição vencida (tempo simulado) | paciente | API | NORMAL, agenda direto | situação com RestricaoAte=ontem: 200 {"faltas":0,"restricao":"normal","ate":null}; agendar direto: 201 {"id":25,"data":"2026-11-26","hora":"11:00","sala":"Sala 2","status":"confirmada","motivo":"Depois da restrição (teste QA)","tipo":"consulta","titulo":null,"pre | ✅ | ev/api.jsonl, ev/sql.log (tempo simulado no banco) |
| FA-06 | Falta sem confirmação | recepção | API | registrada, sem efeito | falta: 201; ConfirmouPresenca=0; FaltasSemAviso¦Restricao=0¦SO_FILA; situação: 200 {"faltas":1,"restricao":"normal","ate":null} | ✅ | ev/api.jsonl |
| FA-07 | Falta de consulta futura | recepção | API | "Só é possível registrar falta de consulta do dia ou anterior." | 400 {"mensagem":"Só é possível registrar falta de consulta do dia ou anterior."} | ✅ | ev/api.jsonl |
| PV-01 | Calendário com campanhas do mês | paciente | web | Novembro Azul etc. | tela: "PrevençãoCheck-ups e exames de rotina do anoIncluir alguém na prevençãoTodos 2Você 1Familiar 12026NOVnovembroNovembro de 2026Novembro AzulSaúde do homemExame de próstata (PSA)Você · Conforme orientação médica, a partir dos 50 anosMarcarJá fiz2027FEVfevereiroFevereiro de 2027Volta às aulasConsulta an" | ✅ | ev/shots/PV-01-calendario.png |
| PV-02 | Filtrar por familiar | paciente | web | só itens do familiar | com filtro F1: pediatra=true, PSA do titular=false | ✅ | ev/shots/PV-02-filtro-familiar.png |
| PV-03 | Incluir exame para familiar | paciente | web | item pendente | item do titular pela API: 201; banco: 1¦1¦Exame de próstata (PSA)¦NAO_AGENDADO ; 2¦5¦Consulta anual com pediatra¦NAO_AGENDADO | ✅ | ev/shots/PV-03-incluido.png |
| PV-04 | Incluir o mesmo exame de novo | paciente | web+API | "Essa pessoa já está nesse item da prevenção." | tela: "Essa pessoa já está nesse item da prevenção."; API: 400 {"mensagem":"Essa pessoa já está nesse item da prevenção."} | ✅ | ev/shots/PV-04-repetido.png |
| PV-05 | Agendar a partir do item | paciente | web | abre agendamento da especialidade | URL: /paciente-desktop.html#agendar/3/5/2; título: "Marcar consulta de PediatriaEspecialidadeClínica geralGineco" | ✅ | ev/shots/PV-05-marcar.png |
| PV-06 | Marcar como feito | paciente | web | REALIZADO | status no banco: REALIZADO; selo "Feito" na tela=true | ✅ | ev/shots/PV-06-feito.png, ev/net-PV-06.log |
| NO-01 | Avisos: vaga, consulta confirmada, restrição | paciente | web+API | aparecem na API e na tela | API tipos: RESTRICAO, CONSULTA_CONFIRMADA, VAGA_OFERECIDA; na tela Início: {"vaga":true,"confirmada":true,"restricao":true} | ✅ | ev/shots/NO-01-avisos.png |
| NO-02 | Lembrete de confirmação como notificação | paciente | banco | notificação gerada na véspera | Com consultas de amanhã (véspera) para P1/P2, nenhuma notificação de lembrete foi gerada; tipos no banco: CONSULTA_CONFIRMADA, RESTRICAO, VAGA_OFERECIDA. sp_ConfirmarPresenca / lembrete: nenhuma procedure grava notificação de lembrete (tipos possíveis no script: VAGA_OFERECIDA, CONSULTA_CONFIRMADA, RESTRICAO). O lembrete existe só como cartão "Vou/Não vou" no Início (CP-01). Apêndice K promete "Notificações: vaga o… | ❌ | ev/sql.log, ev/shots/CP-01-lembrete.png |
| NO-03 | Marcar todas como lidas | paciente | web | 204, não lidas = 0 | não lidas antes: 4; depois: 0 (via tela) NET PUT /api/pacientes/13/notificacoes/lidas -> 204 | ✅ | ev/shots/NO-03-lidas.png, ev/net-NO.log |
| PS-01 | Perfil fazendo ação de outro | todos | API | 403 | paciente GET /api/clinicas/1/agenda → 403 ¦ paciente GET /api/clinicas/1/pacientes → 403 ¦ paciente POST /api/retornos → 403 ¦ paciente PUT /api/consultas/1/status → 403 ¦ recepcao PUT /api/clinicas/1 → 403 ¦ recepcao POST /api/clinicas/1/equipe → 403 ¦ recepcao POST /api/retornos → 403 ¦ recepcao POST /api/exames → 403 ¦ recepcao PUT /api/lista-espera/1/vaga → 403 ¦ medico POST /api/consultas → 403 ¦ medico GET /api… | ✅ | ev/api.jsonl |
| PS-02 | Dados de outra clínica | dono | API | 403 | dono da Clínica QA 2: /api/clinicas/1 → 403 ¦ /api/clinicas/1/agenda → 403 ¦ /api/clinicas/1/pacientes → 403 ¦ /api/clinicas/1/medicos → 403 ¦ /api/clinicas/1/lista-espera → 403 ¦ /api/consultas/17 → 403 ¦ /api/medicos/1 → 403 ¦ /api/pacientes/10/situacao → 403 ¦ DELETE consulta → 403 | ✅ | ev/api.jsonl |
| PS-03 | Dados de outra conta | paciente | API | 403 | GET /api/pacientes/10 → 403 ¦ GET /api/pacientes/10/consultas → 403 ¦ GET /api/pacientes/10/familiares → 403 ¦ GET /api/consultas/17 → 403 ¦ PUT /api/consultas/17/presenca → 403 ¦ DELETE /api/lista-espera/6 → 403 ¦ PUT /api/prevencao/2 → 403 | ✅ | ev/api.jsonl |
| PS-04 | Clínica não vinculada | paciente | API | 403 | P1 lendo especialidades da Clínica QA 2 (não vinculada): 403 null | ✅ | ev/api.jsonl |
| PS-05 | Sem token | público | API+web | 401; páginas vão ao login | API sem token: 401/401; páginas: paciente-desktop.html → login.html ¦ clinica.html → login.html ¦ medico.html → login.html ¦ pacientes.html → login.html | ✅ | ev/shots/PS-05-sem-token.png |
| PS-06 | Token expirado/adulterado/removido | paciente | web | login com "Sua sessão terminou. Entre de novo." | expirado → login com "Sua sessão terminou. Entre de novo." ¦ token adulterado (API 401 no uso) → login com a mesma mensagem ¦ sessão removida → login.html. (1º registro ❌ exigia ?expirou=1 na URL final, mas o login.js:181 limpa a URL com history.replaceState de propósito depois de mostrar a mensagem; critério do teste errado) | ✅ | ev/shots/PS-06-expirado.png, ev/shots/PS-06-adulterado.png, ev/shots/PS-06-removido.png |
| PS-07 | 6 logins em 1 minuto | público | API+web | 429 "Muitas tentativas. Aguarde um minuto e tente de novo." | tentativas 1–5 pela API: 401,401,401,401,401; 6ª pela tela: NET POST /api/auth/login -> 429; mensagem na tela: "Muitas tentativas. Aguarde um minuto e tente de novo." | ✅ | ev/shots/PS-07-429.png, ev/net-PS-07.log |
| PS-08 | Médico desativado tenta logar | médico | API | 401 | login do médico desativado (M5): 401 {"mensagem":"E-mail ou senha incorretos"} | ✅ | ev/api.jsonl |
| PS-09 | Médico no app | médico | app | — | pendente: app ainda não integrado (instrução do usuário). | ⏸ | - |
| PS-10 | Token antigo depois da troca de senha | paciente | API | pendência conhecida | token emitido antes da troca de senha (PC-07) ainda vale: 200. Pendência já documentada no plano (opções A–D, decisão do grupo), não conta como bug novo. | ⚠️ | ev/api.jsonl |
| AC-01 | 3 tamanhos de texto salvos (paciente) | paciente | web | 100/118,75/137,5% e persistência | opções: normal/grande/muito-grande; normal: html=(nenhum) fs=16px ¦ grande: html=grande fs=19px ¦ muito-grande: html=muito-grande fs=22px; depois de recarregar: localStorage ap-texto=muito-grande, html data-texto=muito-grande | ✅ | ev/shots/AC-01-texto-extra.png |
| AC-02 | Reduzir movimento | paciente/equipe | web | data-movimento=reduzido salvo | paciente: depois do clique html=reduzido, salvo=reduzido, depois de recarregar=reduzido; equipe (conta.html → clinica.html): html=reduzido, salvo={"texto":"normal","movimento":"reduzido","menu":"aberto"} | ✅ | ev/shots/AC-02-movimento.png, ev/shots/AC-02-movimento-equipe.png |
| AC-03 | Foco visível com Tab | todos | web | contorno visível | Tab deixa o foco visível: clinica.html e paciente-desktop com contorno sólido de 3 px; no login/cadastro o campo focado ganha borda escura + halo de 3 px a 12% de opacidade (acesso.css:116-120) – visível, mas mais fraco que o contorno de 3 px do resto do site (observação Baixa). 1º registro ❌ media só o outline. | ✅ | ev/shots/AC-03-foco-*.png, ev/shots/AC-03-login-campo-focado.png |
| AC-04 | "Pular para o conteúdo" | todos | web | em todas as telas | "Pular para o conteúdo" ausente em 24 de 26 telas: index.html, login.html, cadastro.html, cadastro-clinica.html, termos.html, privacidade.html, escolher-clinica.html, paciente-desktop.html#inicio, paciente-desktop.html#agenda, paciente-desktop.html#familia, paciente-desktop.html#prevencao, paciente-desktop.html#acompanhamento, paciente-desktop.html#perfil, paciente-desktop.html#espera, paciente-desktop.html#assistent… | ❌ | ev/AC-varredura.json, ev/shots/AC-pag-*.png |
| AC-05 | Esc fecha diálogos | todos | web | fecha | diálogo especialidade: aberto=true → depois do Esc=false ¦ menu da consulta: aberto=true → depois do Esc=false ¦ gaveta do paciente: aberta=true → depois do Esc=false | ✅ | ev/shots/AC-05-esc.png |
| AC-06 | Menu no celular < 900 px | equipe/paciente | web | ☰ abre e fecha | clinica.html: botões de menu visíveis ["Abrir o menu .lateral__hamburguer"]; aria-expanded depois do clique=true, depois do Esc=false ¦ paciente-desktop.html#inicio: botões de menu visíveis ["Abrir o menu .lateral__hamburguer"]; aria-expanded depois do clique=true, depois do Esc=false (1º registro ❌ foi seletor do teste, que pegava um botão escondido; o ☰ aparece no screenshot AC-06-375-clinica_html.png) | ✅ | ev/shots/AC-06-375-*.png, ev/shots/AC-06b-*.png |
| AC-07 | Status com texto | recepção | web | rótulos e aria-label | legenda: "MostrarTodasConfirmadaNa recepçãoEm atendimentoAtendidaFaltouHorário livreOferecido à fila"; aria-label dos blocos: ["Paciente Teste 4, 08:00 às 08:30, ter, 24/11, Dra. QA Gineco. Faltou.","Paciente Teste 4, 09:00 às 09:30, ter, 24/11, Dra. QA Gineco. Faltou.","Paciente Teste 4, 10:00 às 10:30, ter, 24/11, Dra. QA Gineco. Faltou.","Paciente Teste 3, 11:00 às 11:30, ter, 24/11, Dra. QA Gineco. Faltou."] | ✅ | ev/shots/AC-07-status-texto.png |
| AC-08 | Telas vazias | dono/paciente | web | mensagem de vazio, sem erro | cadastro P5: 201; clinica.html: "A agenda ainda está vazia." erros=0 ¦ especialidades.html: "Nenhuma especialidade cadastrada ainda." erros=0 ¦ medicos.html: "Nenhum médico cadastrado ainda." erros=0 ¦ horarios.html: "Nenhum médico cadastrado ainda." erros=0 ¦ pacientes.html: "Nenhum paciente ainda." erros=0 ¦ lista-espera.html: "Nenhum médico cadastrado ainda." erros=0 ¦ paciente #inicio: "Nenhuma consulta marcada."… | ✅ | ev/shots/AC-08-vazio-*.png |
| AC-09 | API fora do ar | todos | web | "Não foi possível falar com o servidor" + "Tentar de novo" | clinica.html: mensagem=true, botão "Tentar de novo"=1 ¦ paciente-desktop.html#inicio: mensagem=true, botão "Tentar de novo"=1 ¦ login.html: "Não foi possível falar com o servidor" | ✅ | ev/shots/AC-09-api-fora-*.png |
| AC-10 | Nenhum dado fictício | todos | web (+app ⏸) | nenhum Juliana/Davi/Fernanda/Ipê/nº fixo | dado fictício em: index.html [visível: Davi,Dona Cida,Kenji,Juliana,Paulo Menezes,Camila Rocha; no HTML: Davi,Dona Cida,Kenji,Juliana,Paulo Menezes,Camila Rocha] ¦ cadastro-clinica.html [visível: -; no HTML: 2345-0000] (parte do app: ⏸ pendente) | ❌ | ev/AC-varredura.json |
| AC-11 | Console sem erros | todos | web | 0 erros | 0 erros de console nas 26 telas | ✅ | ev/console-*.log |
| AC-12 | 3 tamanhos de texto na equipe | equipe | web | 3 tamanhos (Apêndice A) | telas da equipe oferecem 2 tamanhos: Normal / Grande (Apêndice A pede 100%, 118,75% e 137,5%) | ❌ | ev/shots/AC-12-texto-equipe.png |

## Bugs encontrados

> **Correção (24/11, depois dos testes manuais):** este relatório dizia que não havia bug Alta, mas AT-05/AT-08 só conferiram que o retorno *aparece*, AT-04 não testou finalizar antes da data e CA-11 não testou recadastrar o CRM. Os testes manuais acharam: retorno que não sumia depois de marcado (**Alta**), chave duplicada no app, finalizar consulta de outro dia, CRM preso ao médico removido, senha provisória perdida e médico sem tela de senha. Todos foram corrigidos no código em 24/11 (o app ainda precisa de teste no celular). Na sequência foram corrigidos também TR-03, NO-02, AC-04, AC-10, AC-12 e LE-09b (decisão do grupo: quem recusa sai da fila; mudaram só os textos). O retorno segue o PIM: o médico marca com data e horário ou encaminha à recepção, e o paciente só visualiza. Os resultados da tabela são os da rodada original.

Ordenados do mais grave para o menos grave. Nenhum é Alta: os fluxos principais da apresentação funcionam.

### 1. LE-09b – Quem recusa a vaga (ou deixa expirar) sai da fila, mas a tela diz que continua · **Média** · back + front (decisão do grupo)
- **Passos:**
  1. Dois pacientes na fila do mesmo médico.
  2. A recepção cancela uma consulta futura desse médico, e a vaga vai para o 1º.
  3. O 1º abre a oferta e toca "Não quero esta vaga".
- **Esperado:** o que as telas prometem, "Vaga recusada. Ela passou para a próxima pessoa da fila. **Você continua na fila.**" A pessoa continua aguardando.
- **Obtido:**
  - A vaga passa ao 2º (correto).
  - A entrada do 1º vira `EXPIRADA`, e `GET /api/pacientes/{id}/lista-espera` devolve `null`, ou seja, ele **saiu da fila**.
  - O mesmo acontece quando a oferta expira: P2 ficou `EXPIRADA` no LE-10, e a tela dizia "…e você continua na fila." (LE-11).
- **Suspeitos:**
  - `banco/agendapro_saude_sqlserver.sql:1138-1141` (`sp_RecusarOferta` marca `EXPIRADA`; `sp_ExpirarOfertasVencidas` reaproveita a mesma procedure).
  - Textos: `frontend/assets/js/paciente-desktop.js:1380`, `:1400`, `:1428`; `frontend/assets/js/app.js:731`, `:753`, `:767`; `aplicativo/src/telas/EsperaTela.js:58`, `:107`, `:241`.
- **Quem resolve:**
  - Se a regra é "continua na fila", resolve o **back**: voltar a entrada para `AGUARDANDO` em vez de `EXPIRADA`.
  - Se a regra é "sai da fila", resolve o **front**: trocar os textos.
  - O plano (`docs/plano-agendapro-saude.md:178`, `:503-504`) não diz qual das duas vale.

### 2. TR-03 – Frases comuns de crise emocional não acionam o cartão do CVV 188 · **Média** · front (web e app)
- **Passos:** abrir o Assistente de saúde e escrever "Não aguento mais, quero morrer".
- **Esperado:** o cartão de crise com CVV 188 e SAMU 192, como prevê a documentação (crise emocional mostra o CVV).
- **Obtido:**
  - O assistente sugere **Clínica geral** com botão de agendar.
  - Com "Estou pensando em suicídio" o cartão aparece certo (TR-03b), então o defeito é a lista de palavras, e não o cartão.
- **Suspeitos:** `frontend/assets/js/triagem.js:34` e `aplicativo/src/servicos/assistente.js:17`. A regex só cobre `suicid|me matar|tirar (a )?minha vida|nao quero mais viver|acabar com tudo`; faltam, por exemplo, "quero morrer", "não aguento mais" e "sumir".
- **Quem resolve:** front.

### 3. NO-02 – O lembrete de confirmação não vira notificação · **Média** (gravidade definida por você) · back + front
- **Passos:** ter consulta para amanhã e abrir a lista de avisos ou notificações do paciente.
- **Esperado:** o Apêndice K promete, em Notificações, "vaga oferecida, lembrete de confirmação, aviso de restrição".
- **Obtido:**
  - Só existem os tipos `VAGA_OFERECIDA`, `CONSULTA_CONFIRMADA` e `RESTRICAO`.
  - Nenhuma procedure ou tarefa grava lembrete. O lembrete existe só como cartão "Vou / Não vou" no Início (CP-01 ✅).
- **Suspeitos:**
  - `banco/agendapro_saude_sqlserver.sql`: os únicos `INSERT INTO Notificacoes` estão em `:943`, `:1073`, `:1357` e `:1369`.
  - `backend/AgendaPro.Api/Tarefas/ExpiracaoOfertasServico.cs`, onde caberia uma tarefa diária parecida.
- **Quem resolve:** back (gravar o aviso na véspera) e front (mostrar o tipo novo).

### 4. AC-10 – Dados fictícios e links provisórios na página inicial · **Média** · front
- **Passos:** abrir `index.html` (a primeira tela da apresentação) e `cadastro-clinica.html`.
- **Esperado:** nenhum dado fictício em nenhuma tela.
- **Obtido:**
  - `index.html` mostra a família fictícia do mockup: Juliana, Davi, Dona Cida, Seu Kenji, Dra. Camila Rocha e Dr. Paulo Menezes (18 linhas).
  - Também tem o bloco provisório "para entrar por enquanto **TELA CLINICA / TELA MEDICO / TELA PACIENTE**" (`index.html:925-927`).
  - `cadastro-clinica.html:54` usa como placeholder "(11) 2345-0000", o telefone da antiga "Clínica Ipê".
  - Todas as telas logadas e a tela do médico estão limpas (AG-14 ✅). As 26 telas foram varridas.
- **Suspeitos:** `frontend/index.html` (mockup, linhas ~176-742, e o bloco em 924-928) e `frontend/cadastro-clinica.html:54`.
- **Quem resolve:** front.

### 5. AC-04 – "Pular para o conteúdo" só existe em 2 de 26 telas · **Média** (gravidade definida por você) · front
- **Passos:** abrir cada tela e procurar o link `#conteudo`.
- **Esperado:** o link em todas as telas (Apêndice A).
- **Obtido:** o link só existe em `equipe.html` e `medico.html`. Faltam index, login, cadastro, cadastro-clinica, termos, privacidade, escolher-clinica, paciente-desktop, paciente-mobile, clinica, lista-espera, medicos, horarios, especialidades, pacientes, nova-consulta e conta.
- **Suspeitos:** o CSS `.pular` já existe (`landing.css:87`, `paciente-desktop.css:1`, `clinica/base.css:54`). Falta o `<a class="pular" href="#conteudo">` e o `id="conteudo"` no `<main>` de cada página. Modelo: `frontend/equipe.html:23`.
- **Quem resolve:** front.

### 6. AC-12 – As telas da equipe têm 2 tamanhos de texto em vez de 3 · **Média** (gravidade definida por você) · front
- **Passos:** abrir `conta.html` e ver a opção "Tamanho do texto".
- **Esperado:** 3 tamanhos (100%, 118,75% e 137,5%), como no paciente (AC-01 ✅).
- **Obtido:** só "Normal" e "Grande", com "Grande" em 112,5%. A tela do médico não tem a opção.
- **Suspeitos:** `frontend/conta.html:102-103` e `frontend/assets/js/clinica-casca.js:38-53` (preferência `agendapro.recepcao.pref`).
- **Quem resolve:** front.

### Observações de gravidade Baixa (não contam como ❌)
- **O1. Mensagem errada no painel "Próximos pacientes".** Num dia sem nenhuma consulta, o painel diz "Todos os pacientes de hoje já foram atendidos." (`frontend/assets/js/clinica.js:658`). O certo seria uma mensagem de vazio, como "Nenhum paciente marcado para hoje." Front.
- **O2. O aviso da vaga cobre o botão "Ver a vaga".** Na tela Lista de espera do paciente, o aviso "Abriu uma vaga para você!" que surge no topo (`#avisos`) fica por cima do botão "Ver a vaga". O próprio aviso tem "Confirmar", então dá para seguir, mas o botão fica inacessível enquanto o aviso aparece (screenshot `LE-07-espera.png`). Front.
- **O3. Foco fraco nos campos de login e cadastro.** O campo focado só escurece a borda e ganha um halo de 3 px com 12% de opacidade (`frontend/assets/css/acesso.css:116-120`). No resto do site o contorno é sólido de 3 px. Está visível, mas é mais fraco que o pedido no Apêndice A. Front.
- **O4. O paciente só vê o botão de fila quando não há horário.** O botão "Entrar na lista de espera" só aparece quando o médico não tem horário livre ou quando há restrição (`paciente-desktop.js:1580-1607`). Isso segue o Apêndice K, mas na apresentação a fila deve ser montada pela **recepção** (Lista de espera → Adicionar). Informativo.
- **O5. O exame some depois de realizado.** Marcado como realizado, o exame sai de "Depois da consulta", porque a tela e a API listam só os pendentes (F28). Não existe histórico de exames para o paciente. Informativo.

## O que eu preciso testar com as mãos

Na ordem da apresentação:

1. **Banco da apresentação do zero.**
   - Passos:
     - Parar a API antiga, que roda desde 23/11.
     - Recriar o `AgendaPro_Saude_App` pelo script.
     - Rodar `dados-prevencao.sql` **e** `dados-feriados.sql` com `-d AgendaPro_Saude_App`.
   - Esperado: só o catálogo de prevenção (7 campanhas, 9 exames) e 20 feriados. `Usuarios`, `Clinica` e `Consultas` com 0 linhas.
2. **Dois notebooks na rede.**
   - Passos:
     - Subir a API com `dotnet run --launch-profile rede-local`.
     - Trocar `API_URL` em `frontend/assets/js/config.js` para o IP.
     - Liberar `http://<IP>:5500` em `Cors:Origens`.
     - Abrir a web pelo segundo notebook.
   - Esperado: login e agenda funcionam pelo outro computador, sem erro de CORS no console.
3. **App no celular (todos os itens ⏸).**
   - Passos:
     - Apontar `aplicativo/src/servicos/config.js` para o IP.
     - Entrar como paciente.
     - Agendar (AG-15).
     - Entrar na fila e receber a vaga com a contagem de 30 min (LE-14).
     - Tentar entrar com o login de um médico (PS-09).
     - Triagem com "dor no peito".
   - Esperado:
     - As mesmas mensagens da web.
     - No login do médico: "Este aplicativo é dos pacientes…"
     - O cartão do SAMU, sem a opção de agendar.
     - Nenhum nome fictício (parte de app do AC-10).
4. **Conflito ao vivo (AG-04 pela tela).**
   - Passos: duas janelas de pacientes diferentes na mesma tela de horários; confirmar o mesmo horário nas duas.
   - Esperado: a segunda recebe "Este horário acabou de ser ocupado. Escolha outro."
5. **Leitor de tela (NVDA ou TalkBack).**
   - Passos: navegar pelo login, pelo Agendar do paciente e pela agenda da clínica.
   - Esperado:
     - Os botões têm nome.
     - O status é lido como texto (ex.: "… Faltou.").
     - As mudanças de página são anunciadas.
     - Os diálogos prendem o foco.
6. **Zoom de 200% e celular real.**
   - Passos: abrir paciente-desktop e clinica no navegador do celular e no zoom de 200%.
   - Esperado: nada cortado. O menu ☰ abre e fecha (AC-06 ✅ no Playwright a 375 px).
7. **Espera real de 30 minutos (opcional).**
   - Passos: deixar uma oferta sem resposta por 30 min, sem mexer no banco.
   - Esperado: em até 1 min depois do prazo, a oferta passa ao próximo (LE-10 ✅ com tempo simulado).

## Roteiro sugerido para a apresentação

**Regras para não esbarrar no limite de login** (5 por minuto por IP, contando erros):
- Use uma janela anônima ou um perfil de navegador para cada pessoa.
- **Não saia e entre de novo:** a sessão fica salva, a do paciente por 30 dias e a da equipe por 8 h.
- O cadastro (clínica ou paciente) já entra sozinho, sem gastar login digitado.
- Faça no máximo 4 logins digitados por minuto.
- Com dois notebooks, cada um tem o seu próprio limite.

0. **Antes:** banco do zero com os feriados (item 1 acima). Teste a página inicial e confira se os links "TELA CLINICA…" ainda aparecem (bug 4).
1. **Dono, janela A.**
   - `cadastro-clinica.html`: "Clínica Demo", com CNPJ válido. Mostrar o código AAA-0000.
   - Em Clínica e equipe, criar a recepcionista e mostrar a senha provisória.
2. **Recepção, janela B.** Um login digitado.
   - Especialidades: Clínica geral, Ginecologia, Pediatria e Psiquiatria.
   - Médicos: um de Clínica geral e um de Pediatria, anotando as senhas provisórias.
   - Horários: seg–sex 08–17 com almoço 12–13.
3. **Paciente 1, janela C.**
   - `cadastro.html`, que entra sozinho. Escolher a clínica pela busca.
   - Família: adicionar um filho com CPF; mostrar a idade.
   - Assistente:
     - "Dor no peito e falta de ar" mostra o SAMU 192, sem agendar.
     - "Dor de cabeça e febre" mostra Clínica geral; tocar no cartão para agendar.
   - Marcar **hoje, num horário mais tarde**, e outra consulta para **amanhã**.
4. **Conflito.** Paciente 2 (janela D, cadastro que entra sozinho) e Paciente 1 tentam o mesmo horário; o segundo recebe a mensagem.
5. **Cancelar e oferecer à fila.**
   - A recepção põe o Paciente 2 na fila do médico (Lista de espera → Adicionar).
   - A recepção cancela a consulta de **amanhã** do Paciente 1 pela agenda. Aparece "vaga oferecida a Paciente 2".
   - O Paciente 2 vê "Abriu uma vaga para você!" com a contagem e confirma.
   - Não demonstre "Não quero esta vaga" enquanto o bug 1 não estiver resolvido.
6. **Atender.**
   - O Paciente 1 toca "Vou" na consulta de hoje.
   - A recepção registra "Chegou".
   - O médico (janela E, um login digitado) inicia e finaliza, marca o retorno e pede um exame.
   - O paciente vê tudo em "Depois da consulta".
   - A recepção marca o exame como realizado pela ficha.
7. **Falta.**
   - Nova consulta para hoje do Paciente 2, pela recepção, sem gastar login.
   - O Paciente 2 toca "Vou" e a recepção registra a falta: 1ª falta, a conta continua normal.
   - Explique a regra: 2ª falta põe em SO_FILA, nova falta põe em SO_RECEPCAO.
   - Mostre a retirada da falta justificada pela ficha.
8. **Fechamento.** Notificações (marcar como lidas), Prevenção (Novembro Azul, incluir um familiar, "Já fiz") e "Reduzir movimento" e tamanho do texto no Perfil.

## Limpeza

- **API de QA (porta 5081):** encerrada. Era o processo 23884, que rodava a cópia em `scratchpad\apicopy`.
- **Sua API (porta 5080, PID 26332):** iniciada em 23/11 18:54 e ligada ao `AgendaPro_Saude_App`. **Não foi tocada** e continua rodando.
- **`AgendaPro_Saude_QA` apagado:** `DROP DATABASE` terminou com exit 0. Bancos que existem agora:
  ```
  AgendaPro__Saude
  AgendaPro_Saude
  AgendaPro_Saude_App
  ```
- **`AgendaPro_Saude_App`:** **sem nenhuma alteração destes testes.** As contagens são as mesmas do início, a última criação de usuário é de 23/11 19:20 e há 0 e-mails `*.qa@teste.com`.
  - **Mas ele não está vazio.** Tem dados de testes anteriores, das etapas 7 e 8: 11 clínicas (ex.: "Clínica Teste A/B", "Valida …", e clínicas com o texto `<img src=x onerror=alert(1)>` do teste de XSS), 35 usuários, 21 pacientes, 11 consultas, 1 fila e 1 notificação.
  - **Não tem feriados (0 linhas)**, então o AG-08 ("Não é permitido agendar em feriados.") falharia na apresentação.
  - Por instrução sua, só registrei. Para a apresentação, recrie-o (item 1 da seção anterior).
  ```
  Campanhas_Prevencao 7 · Clinica 11 · Consultas 11 · Especialidades 5 · Exames 0 · Exames_Prevencao 9 · Faltas 0
  Feriados 0 · Horarios_Atendimento 10 · Lista_Espera 1 · Medicos 4 · Notificacoes 1 · Paciente_Clinica 8
  Pacientes 21 · Parametros 3 · Pessoa_Prevencao 2 · Retornos 0 · Status_Consulta 8 · Usuarios 35
  ```
- **Repositório:** nenhum arquivo foi alterado. O Playwright, os scripts e a cópia da API ficaram só no scratchpad. Saída do `git status` antes de criar este relatório:
  ```
  On branch frontback
  Your branch is up to date with 'origin/frontback'.

  nothing to commit, working tree clean
  ```
  Depois deste relatório, o único arquivo novo é `docs/testes/relatorio-testes.md` (sem commit).
- **Porta 5500:** o `http-server` já estava rodando antes dos testes e continua como estava.
