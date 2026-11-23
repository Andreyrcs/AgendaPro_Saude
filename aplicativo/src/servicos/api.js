// Ajudante único para falar com a API usando o fetch nativo.
// Todas as funções de serviço que chamam o backend passam por aqui.

import { config } from './config';

const ERRO_DE_CONEXAO = 'Não foi possível falar com o servidor';
const ERRO_GENERICO = 'Não foi possível concluir agora. Tente de novo.';

// Erro de uma chamada à API: a mensagem já vem pronta para a tela, e o status diz o que aconteceu.
// status 0 = sem resposta (servidor desligado, sem rede ou tempo esgotado). Igual ao ErroApi da web.
export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

// Token JWT da sessão: o login guarda aqui e toda requisição passa a enviá-lo.
let tokenAtual = null;

export function definirToken(token) {
  tokenAtual = token || null;
}

// Exemplo: chamarApi('/api/auth/login', { metodo: 'POST', corpo: { email, senha } })
export async function chamarApi(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (tokenAtual) cabecalhos.Authorization = `Bearer ${tokenAtual}`;

  // AbortController cancela a requisição se a API demorar demais
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), config.TEMPO_LIMITE_MS);

  let resposta;
  try {
    resposta = await fetch(config.ENDERECO_API + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch (erro) {
    throw new ErroApi(0, ERRO_DE_CONEXAO);
  } finally {
    clearTimeout(relogio);
  }

  // A API devolve { mensagem } nos erros. 401 e 403 de permissão vêm sem corpo; 204 também.
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (erro) {
    dados = null;
  }
  if (!resposta.ok) {
    throw new ErroApi(resposta.status, (dados && dados.mensagem) || ERRO_GENERICO);
  }
  return dados;
}
