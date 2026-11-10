// Ajudante único para falar com a API usando o fetch nativo.
// Todas as funções de serviço que chamam o backend passam por aqui.

import { config } from './config';

const ERRO_DE_CONEXAO = 'Não foi possível falar com o servidor. Confira o endereço da API.';

// Token JWT da sessão. A API atual ainda não emite token; quando emitir,
// o login guarda aqui e toda requisição passa a enviá-lo.
let tokenAtual = null;

export function definirToken(token) {
  tokenAtual = token || null;
}

// Exemplo: chamarApi('/api/auth/login', { metodo: 'POST', corpo: { email, senha } })
export async function chamarApi(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (tokenAtual) cabecalhos.Authorization = `Bearer ${tokenAtual}`;

  // AbortController cancela a requisição se a API demorar demais
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), config.TEMPO_LIMITE_MS);

  let resposta;
  try {
    resposta = await fetch(config.ENDERECO_API + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch (erro) {
    throw new Error(ERRO_DE_CONEXAO);
  } finally {
    clearTimeout(relogio);
  }

  // A API devolve { mensagem } junto dos erros 400/403/404
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error((dados && dados.mensagem) || `Erro ${resposta.status} ao falar com o servidor.`);
  }
  return dados;
}
