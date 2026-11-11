# AgendaPro Saúde — Aplicativo do paciente

App mobile do **paciente** do AgendaPro Saúde, feito para a **Etapa 5 do PIM IV** (UNIP, ADS).
Médico e recepção não usam este app: eles trabalham no sistema web da clínica.

- **Tecnologia:** Expo (managed workflow, SDK 58), React Native, JavaScript
- **Navegação:** React Navigation (pilhas + abas inferiores)
- **Estado:** Context API + hooks (sessão e preferências)
- **Integração:** `fetch` nativo, uma função por operação em `src/servicos/`

Desenho e plano: [`../specs/2026-11-09-aplicativo-mobile-design.md`](../specs/2026-11-09-aplicativo-mobile-design.md)
e [`../specs/2026-11-09-aplicativo-mobile-plano.md`](../specs/2026-11-09-aplicativo-mobile-plano.md).
O que já usa a API e o que ainda roda no banco em memória do app: [`docs/aplicativo-integracao-api.md`](docs/aplicativo-integracao-api.md).

---

## Como rodar

Precisa do Node.js 20 ou mais novo e do app **Expo Go** atualizado no celular (Play Store / App Store).

```bash
cd aplicativo
npm install
npx expo start
```

Aparece um QR code no terminal:

- **Android:** abra o Expo Go e toque em "Scan QR code".
- **iPhone:** aponte a câmera para o QR code.

O computador e o celular precisam estar **na mesma rede Wi-Fi**. Se a rede da faculdade
bloquear a conexão, use `npx expo start --tunnel`.

### Rodando num GitHub Codespace

No Codespace o `npx expo start` comum não funciona no celular: o QR code aponta para um endereço
que só existe dentro do servidor, e o Expo Go mostra "Something went wrong". Use:

```bash
cd aplicativo
npm run celular
```

O script [`scripts/celular.js`](scripts/celular.js) inicia o Expo com o endereço público do Codespace
e deixa a porta 8081 pública (senão o GitHub pede login e o celular não baixa o app). Leia o QR code
com o Expo Go; a primeira abertura leva uns 20 a 40 segundos.

Se aparecer o aviso de que não conseguiu deixar a porta pública, faça à mão: aba **PORTAS** do
VS Code › botão direito na **8081** › Visibilidade da porta › **Pública**.

> Porta pública quer dizer que quem tiver o link consegue baixar o app enquanto o Codespace estiver
> ligado. Vale saber.

## Conta da carga inicial (acesso rápido)

| E-mail | Senha |
|---|---|
| `juliana.santos@email.com` | `paciente123` |

Na tela de login, o botão de **Acesso rápido** ("Juliana Santos · paciente") preenche e entra com ela.
A Juliana tem a família completa (Davi, Marina, Dona Cida e Seu Kenji), consultas marcadas,
lugar numa lista de espera e lembretes de prevenção. Uma conta criada pelo "Criar conta"
começa vazia, só com o próprio titular, e isso serve para mostrar os estados vazios.

"Hoje", no app, é a **data do aparelho**. As datas da carga inicial são contadas a partir dela
(consultas daqui a 3, 8, 15 dias...), então a agenda sempre começa em volta do dia atual.

## Ligar a API real (backend em ASP.NET)

Por padrão o app usa o banco em memória (`src/dados/`) e funciona sem backend.
Para que login e cadastro usem a API de verdade:

1. Suba o backend escutando na rede (não só no `localhost`):
   ```bash
   cd backend
   dotnet run --urls http://0.0.0.0:5000
   ```
2. Descubra o IP do computador: no Windows, `ipconfig` (procure "Endereço IPv4"); no Linux/Mac, `ip addr` ou `ifconfig`.
3. Edite [`src/servicos/config.js`](src/servicos/config.js):
   ```js
   USAR_API_REAL: true,
   ENDERECO_API: 'http://192.168.0.10:5000', // o IP do passo 2
   ```
4. Crie a conta da Juliana no banco, uma vez só:
   ```bash
   curl -X POST http://192.168.0.10:5000/api/usuarios \
     -H "Content-Type: application/json" \
     -d '{"nome":"Juliana Santos","email":"juliana.santos@email.com","senha":"paciente123"}'
   ```
5. Feche e abra o app e entre com a conta da Juliana.

Se a API não responder em 8 segundos, o app avisa: *"Não foi possível falar com o servidor.
Confira o endereço da API."* Se isso acontecer durante a apresentação, volte `USAR_API_REAL`
para `false` e o app continua com o banco em memória.

> Por que o IP e não `localhost`? No celular, `localhost` é o próprio celular, e não o computador.

## Roteiro para a apresentação

1. **Login:** toque no Acesso rápido "Juliana Santos · paciente". Mostre também o "Criar conta" e o
   aceite da LGPD.
2. **Assistente:** no Início, toque em "Conte o que você está sentindo".
   - "Dor no peito e falta de ar" → aparece só o alerta do **SAMU 192**, sem nenhum agendamento.
   - "Meu filho está com dor de ouvido" → sugere Pediatria **para o Davi**.
3. **Agendar:** escolha um médico, um horário e confirme. Se outra pessoa tiver marcado o mesmo
   horário antes, o app avisa e pede outro.
4. **Lista de espera:** no Início, toque no cartão verde da fila. A vaga aparece quando uma consulta
   da Dra. Camila é cancelada e a Juliana é a 1ª da fila (na web, a recepção cancela na agenda;
   com a API ligada, o app recebe a vaga ao tocar em "Atualizar a fila"). Há 30 minutos para aceitar.
5. **Agenda e presença:** a consulta do Davi fica para daqui a 3 dias; na véspera, o Início mostra
   "Confirme sua consulta de amanhã" com Vou e Não vou. Avisar até o fim da véspera não tem consequência;
   cancelar no dia depois de dizer Vou conta como falta. O Perfil mostra as faltas registradas e a regra.
6. **Família e Prevenção:** adicione um familiar; na Prevenção, filtre pela Dona Cida e marque a
   mamografia como "Já fiz".
7. **Perfil:** ligue "Reduzir movimento" e mostre que as telas param de deslizar.

## Estrutura de pastas

```
aplicativo/
  App.js              carrega as fontes, liga sessão e preferências, mostra a navegação
  src/
    telas/            uma tela por arquivo (LoginTela, AgendaTela, EsperaTela...)
    componentes/      peças reutilizáveis (Botao, Cartao, FolhaDia, Avatar, Confirmacao...)
    navegacao/        Navegacao.js (login × app) e Abas.js (as 5 abas e suas pilhas)
    contexto/         SessaoContext (quem está logado) e PreferenciasContext (reduzir movimento)
    servicos/         uma função por operação da API; config.js liga/desliga a API real
    dados/            carga inicial (a mesma da web) e o banco em memória
    estilos/          cores, fontes e espaçamentos (os mesmos tokens da web)
    utilitarios/      funções de data e de texto
  docs/               resumo da integração com a API
```

### Como uma tela pega os dados

Toda tela segue o mesmo caminho:

```
AgendaTela ──useDadosDaTela──► listarConsultas(usuario)   (src/servicos/consultas.js)
                                   ├─ endpoint já existe? → fetch na API
                                   └─ ainda não existe    → banco em memória (src/dados/)
```

`useDadosDaTela` busca de novo **toda vez que a tela aparece**. Essa é a sincronização: se a
consulta foi cancelada em outra tela, a Agenda já volta atualizada. Quando o backend ganhar os
endpoints, só o miolo das funções em `src/servicos/` muda, e as telas ficam iguais.

## Regras de negócio no app

- O assistente **não faz diagnóstico**. O aviso fica fixo no topo do chat.
- **Emergência não agenda.** Sinais de emergência mostram só SAMU 192 e o pronto-socorro.
  Falar em suicídio mostra CVV 188. Essa checagem roda no próprio celular, de propósito.
- O paciente só vê e gerencia a **própria família** (`garantirDaFamilia` em `src/dados/bancoSimulado.js`).
- **Pediatria** só para quem tem menos de 18 anos.
- **Lista de espera:** uma fila por conta; a vaga oferecida vale 30 minutos; quem recusa continua em 1º.

## Acessibilidade

- Botões e áreas de toque com pelo menos 48 pontos de altura.
- `accessibilityLabel` e `accessibilityRole` nos elementos interativos (TalkBack e VoiceOver).
- O app segue o **tamanho de texto do celular**.
- **Reduzir movimento:** vale a opção do sistema (`AccessibilityInfo.isReduceMotionEnabled`) ou o
  interruptor do Perfil. Desliga as transições entre telas e a gaveta deslizante.
- Paleta da web, com contraste de pelo menos 4,5:1 nos textos.

## Diferenças em relação à versão web

- **Avatares:** círculo com as iniciais na cor de cada familiar, em vez do desenho em SVG.
- **Fonte dos números:** Archivo na largura normal. O pacote `@expo-google-fonts/archivo` não traz
  a versão condensada que a web usa com `font-stretch`.
- **Fora do app:** a tela de notificações (o sino), o "Reagendar" (para remarcar, cancele e
  marque de novo) e a escolha de clínica (fixa na Clínica Ipê).
- **Tamanho do texto:** o app segue o ajuste do celular, em vez do seletor próprio de 3 tamanhos.
