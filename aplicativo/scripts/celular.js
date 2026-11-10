// Abre o app no celular (Expo Go) quando o projeto roda num GitHub Codespace.
// Uso: npm run celular
//
// Por que existe: no Codespace, o "npx expo start" comum põe no QR code um endereço
// que só existe dentro do servidor (127.0.0.1), e o celular não alcança. Este script:
//   1. inicia o Expo anunciando o endereço público do Codespace
//      (https://<codespace>-8081.app.github.dev, passado como http:// — veja abaixo);
//   2. quando o servidor responde, deixa a porta 8081 pública, senão o GitHub
//      pede login e o celular não consegue baixar o app.
// Fora do Codespace (no seu computador), ele só roda o "npx expo start" de sempre.

const { spawn, execFile } = require('child_process');
const http = require('http');

const PORTA = 8081;
const nomeCodespace = process.env.CODESPACE_NAME;
const dominio = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const noCodespace = process.env.CODESPACES === 'true' && nomeCodespace && dominio;

const ambiente = { ...process.env };
if (noCodespace) {
  // "http" e não "https" de propósito: com https o Expo grava ":443" no QR code e o
  // Expo Go tenta HTTP comum nessa porta, o que dá erro. Com http, o próprio Codespace
  // redireciona o celular para https sozinho.
  ambiente.EXPO_PACKAGER_PROXY_URL = `http://${nomeCodespace}-${PORTA}.${dominio}`;
  console.log(`\nCodespace detectado. Endereço para o celular: ${ambiente.EXPO_PACKAGER_PROXY_URL}\n`);
}

// Inicia o Expo mostrando a saída normal (com o QR code) neste terminal
const expo = spawn('npx', ['expo', 'start', '--port', String(PORTA), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: ambiente,
  shell: process.platform === 'win32',
});
expo.on('exit', (codigo) => process.exit(codigo ?? 0));

if (noCodespace) {
  esperarServidorEDeixarPublico();
}

// Pergunta ao servidor a cada 2 segundos se ele já está no ar; quando estiver, abre a porta
function esperarServidorEDeixarPublico(tentativa = 1) {
  http
    .get(`http://localhost:${PORTA}/status`, () => deixarPortaPublica())
    .on('error', () => {
      if (tentativa < 60) setTimeout(() => esperarServidorEDeixarPublico(tentativa + 1), 2000);
    });
}

function deixarPortaPublica() {
  execFile('gh', ['codespace', 'ports', 'visibility', `${PORTA}:public`, '-c', nomeCodespace], (erro) => {
    if (erro) {
      console.log(
        `\n⚠ Não consegui deixar a porta ${PORTA} pública sozinho.` +
          `\n  Faça à mão: aba PORTAS do VS Code › botão direito na ${PORTA} › Visibilidade da porta › Pública.\n`,
      );
    } else {
      console.log(`\n✔ Porta ${PORTA} pública. Leia o QR code acima com o Expo Go.\n`);
    }
  });
}
