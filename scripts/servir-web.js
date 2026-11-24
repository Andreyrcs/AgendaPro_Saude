// Serve a web (pasta frontend) para os aparelhos da mesma rede, na porta 5500.
// Uso: node scripts/servir-web.js   (o apresentacao.cmd já faz isso)
// Só usa o que vem com o Node: não baixa nada. Sem cache, para a página aberta ser sempre a atual.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = Number(process.env.PORTA_WEB) || 5500;
const PASTA = path.join(__dirname, '..', 'frontend');
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};

// O arquivo pedido, ou null se estiver fora da pasta frontend, numa pasta oculta (.claude, .agents) ou não for da web
function acharArquivo(url) {
  let caminho;
  try {
    caminho = decodeURIComponent(url.split(/[?#]/)[0]);
  } catch (erro) {
    return null;
  }
  if (caminho.includes('\0') || caminho.includes('\\') || caminho.includes(':')) return null;
  if (caminho.split('/').some((parte) => parte.startsWith('.'))) return null;
  if (caminho.endsWith('/')) caminho += 'index.html';
  const arquivo = path.join(PASTA, caminho);
  if (!arquivo.startsWith(PASTA + path.sep) || !TIPOS[path.extname(arquivo).toLowerCase()]) return null;
  return fs.existsSync(arquivo) && fs.statSync(arquivo).isFile() ? arquivo : null;
}

const servidor = http.createServer((pedido, resposta) => {
  if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
    resposta.writeHead(405).end();
    return;
  }
  const arquivo = acharArquivo(pedido.url);
  if (!arquivo) {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Página não encontrada');
    return;
  }
  resposta.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()], 'Cache-Control': 'no-store' });
  if (pedido.method === 'HEAD') resposta.end();
  else fs.createReadStream(arquivo).on('error', () => resposta.destroy()).pipe(resposta);
});

servidor.on('error', (erro) => {
  console.error(erro.code === 'EADDRINUSE' ? `A porta ${PORTA} já está em uso (o Live Server está aberto?).` : erro.message);
  process.exit(1);
});
servidor.listen(PORTA, '0.0.0.0', () => console.log(`Web no ar, na porta ${PORTA}. Deixe esta janela aberta.`));
