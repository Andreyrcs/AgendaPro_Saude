# Apresentação: guia do dia

Quinta, 26/11/2026. Dois notebooks e um celular, todos na **mesma rede**.

| Aparelho | Mostra | Abre | O que precisa ter |
|---|---|---|---|
| Notebook 1 | Recepção (web) | `http://IP:5500/login.html` | O projeto: é ele que roda o banco, a API, a web e o app |
| Notebook 2 | Médico (web) | `http://IP:5500/login.html` | Só o navegador |
| Celular | Paciente (app) | QR code, no Expo Go | Expo Go instalado |

`IP` é sempre o do **notebook 1**.

## Uma vez só, antes do dia

1. No notebook 1, abra o PowerShell na pasta do projeto, rode `.\apresentacao.cmd -LiberarFirewall` e aceite o pedido de administrador. Ele libera as portas 5080, 5500 e 8081 nas redes Privadas **e** Públicas (a do roteador do celular costuma entrar como Pública).
2. Faça o [ensaio](#ensaio-quarta-2511).
3. Preencha a [folha de cola](#folha-de-cola).

## No dia

1. Conecte os três aparelhos na mesma rede Wi-Fi.
2. No notebook 1, feche o que ficou aberto: janela da API, Expo e Live Server (no VS Code, clique em **Port: 5500**, no canto de baixo).
3. Dê dois cliques em **`apresentacao.cmd`**, na pasta do projeto.
4. Ele mostra o IP da rede (o mesmo do `ipconfig`). Se estiver certo, **Enter**; se não, digite o IP e Enter.
5. Espere os cinco `[ok]` e o "Tudo certo neste computador". Não feche as três janelas que abriram.
6. No notebook 2, abra o endereço que apareceu na tela.
7. No celular, leia o QR code da janela **AgendaPro - App** (no Android, pelo Expo Go; no iPhone, pela câmera). A primeira abertura demora.
8. Entre nas três contas **antes** de começar a apresentar.

> Prefere deixar o IP escrito? Abra o `apresentacao.ps1` e preencha a linha `$IP_DA_CONEXAO = ''`. É o único lugar.

**Trocou de rede?** Feche as três janelas e rode o `apresentacao.cmd` de novo. No celular, leia o QR code outra vez. Nos notebooks, use o endereço novo (precisa entrar de novo).

## Antes de apresentar, confira

- [ ] O médico tem expediente na quinta que cobre o horário da apresentação. Sem isso, o paciente só acha horário em outro dia.
- [ ] Há uma consulta marcada para o próprio dia. A do médico só é finalizada a partir da data dela.
- [ ] A recepção registra a chegada antes de o médico iniciar o atendimento.
- [ ] A tela do médico se atualiza sozinha em até 30 segundos. Se tiver pressa, atualize a página.
- [ ] O notebook 1 está na tomada e não vai entrar em suspensão.
- [ ] A rede tem internet: os ícones da web vêm dela.

## Se algo não abrir

| O que acontece | O que fazer |
|---|---|
| "A porta ... está em uso" | Feche o programa que a mensagem mostra e rode de novo |
| "O IP ... não é deste computador" | Erro de digitação, ou IP de outra rede. Rode de novo e dê Enter |
| "O SQL Server está parado" | Abra **Serviços** do Windows › SQL Server (MSSQLSERVER) › Iniciar |
| Tudo `[ok]`, mas o notebook 2 e o celular não abrem | 1) Estão na mesma rede? 2) O firewall foi liberado? 3) A rede isola os aparelhos: use o plano B |
| A página abre, mas "Não foi possível falar com o servidor" | Veja se a janela **AgendaPro - API** está aberta. Confira se o endereço é o IP mostrado, com `http://` |
| O navegador muda para `https://` | Digite o endereço completo, com `http://` |
| O app abre, mas não fala com o servidor | Feche o app no Expo Go e leia o QR code de novo |
| "Muitas tentativas. Aguarde um minuto" | São 5 logins por minuto em cada aparelho. Espere um minuto |

Para conferir de novo sem religar nada: `.\apresentacao.cmd -Testar`.

## Plano B: a rede da faculdade não deixa os aparelhos se falarem

Muitas redes de faculdade bloqueiam a comunicação entre os aparelhos. Ter uma destas pronta:

1. **Roteador de um celular** (de preferência, um quarto aparelho, para o do paciente ficar livre). Conecte os dois notebooks e o celular do paciente nele.
2. **Hotspot móvel do Windows**, no notebook 1 (Configurações › Rede e Internet › Hotspot móvel). Os outros entram nele. O IP costuma ser `192.168.137.1`: digite-o quando o script perguntar.

Depois, rode o `apresentacao.cmd` de novo com o IP novo.

## Ensaio (quarta, 25/11)

**A. Wi-Fi de casa**
- [ ] `apresentacao.cmd` mostra "Tudo certo".
- [ ] O notebook 2 abre a tela de login e entra como médico.
- [ ] O celular abre o app e entra como paciente.
- [ ] O paciente marca uma consulta, e ela aparece na recepção e no médico.

**B. Roteador do celular: ele deixa os aparelhos se comunicarem?** Nem todo celular deixa; descubra antes do dia.
- [ ] Ligue o roteador e conecte os dois notebooks e o celular do paciente.
- [ ] Feche as três janelas e rode o `apresentacao.cmd`. O IP **precisa ter mudado**.
- [ ] No notebook 2, abra `http://IP:5500/login.html`.
  - **Abriu:** o roteador serve. Entre como médico.
  - **Não abriu:** com o firewall já liberado, o roteador isola os aparelhos. Teste o roteador de outro celular ou o hotspot do Windows.
- [ ] No celular do paciente, leia o QR code **de novo** e entre.
- [ ] Se o próprio celular do paciente for o roteador, teste também assim: alguns não alcançam os aparelhos conectados neles.
- [ ] Repita a marcação de consulta do item A.

Plano que funcionou no ensaio: ______________________________  Nome da rede: ______________________

## Folha de cola

> Imprima e preencha à mão. Se preencher no arquivo, **não faça commit**: as senhas iriam para o GitHub.

**Clínica**

| Campo | |
|---|---|
| Nome | ____________________________ |
| Código | ____________________________ |
| Especialidades | ____________________________ |
| IP do dia | ____________________________ |

**Contas**

| Perfil | Aparelho | Nome | E-mail | Senha |
|---|---|---|---|---|
| Recepção | Notebook 1 | ______________ | ____________________ | ______________ |
| Médico | Notebook 2 | ______________ | ____________________ | ______________ |
| Paciente | Celular | ______________ | ____________________ | ______________ |
| Dono (reserva) | — | ______________ | ____________________ | ______________ |
| 2º paciente (lista de espera) | — | ______________ | ____________________ | ______________ |

**CPFs de teste**: DADOS DE TESTE, gerados por cálculo, só para a apresentação. Os dígitos verificadores estão corretos. Cada um só pode ser cadastrado uma vez.

| # | CPF | Uso sugerido | Usado? |
|---|---|---|---|
| 1 | `730.418.562-71` | Cadastro de um paciente ao vivo | ☐ |
| 2 | `681.593.047-57` | Familiar | ☐ |
| 3 | `926.037.415-43` | Reserva | ☐ |
