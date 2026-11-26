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

const SESSAO_ACABOU = 'Sua sessão terminou. Entre de novo.';
const SEM_PERMISSAO = 'Você não tem permissão para fazer isso.';

// Token JWT da sessão: o login guarda aqui e toda requisição passa a enviá-lo.
let tokenAtual = null;
// O que fazer quando a API diz que a sessão acabou (401): o SessaoContext registra o sair()
let aoExpirar = null;

export function definirToken(token) {
  tokenAtual = token || null;
}

export function definirAoExpirar(funcao) {
  aoExpirar = funcao;
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
    const daApi = dados && dados.mensagem;
    // 401 fora do login: token vencido ou conta desativada. Sai da conta e volta ao Login (F9).
    if (resposta.status === 401 && caminho !== '/api/auth/login') {
      if (aoExpirar) aoExpirar();
      throw new ErroApi(401, SESSAO_ACABOU);
    }
    // 403 sem mensagem: perfil sem permissão. Com mensagem (ex.: "Você só pode gerenciar a sua família."), ela vale.
    if (resposta.status === 403 && !daApi) throw new ErroApi(403, SEM_PERMISSAO);
    // 400, 404, 409, 429 e 500: a mensagem da API, sem trocar
    throw new ErroApi(resposta.status, daApi || ERRO_GENERICO);
  }
  return dados;
}
