// Login e cadastro do paciente.
// Estes DOIS endpoints já existem no backend (AuthController e UsuariosController).

import { config } from './config';
import { chamarApi } from './api';
import { esperar, usuariosSimulados } from '../dados/bancoSimulado';
import { normalizarEmail } from '../utilitarios/texto';

const ERRO_LOGIN = 'E-mail ou senha incorretos.';

// Devolve o usuário logado: { idUsuario, nome, email, token? }
export async function entrar(email, senha) {
  const emailLimpo = normalizarEmail(email);

  if (config.USAR_API_REAL) {
    // POST /api/auth/login → { mensagem, usuario: { idUsuario, nome, email }, token? }
    try {
      const resposta = await chamarApi('/api/auth/login', {
        metodo: 'POST',
        corpo: { email: emailLimpo, senha },
      });
      return { ...resposta.usuario, token: resposta.token || null };
    } catch (erro) {
      // A API responde 400 com outra frase; aqui a mensagem fica sempre a mesma,
      // sem dizer se o erro foi no e-mail ou na senha. Erro de conexão passa adiante.
      if (erro.message.startsWith('Não foi possível falar')) throw erro;
      throw new Error(ERRO_LOGIN);
    }
  }

  await esperar();
  const usuario = usuariosSimulados.find((u) => u.email === emailLimpo);
  if (!usuario || usuario.senha !== senha) throw new Error(ERRO_LOGIN);
  return { idUsuario: usuario.idUsuario, nome: usuario.nome, email: usuario.email, token: null };
}

// dados = { nome, email, senha, telefone, nascimento }
// Devolve o usuário já logado, no mesmo formato de entrar().
export async function cadastrar(dados) {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);

  if (config.USAR_API_REAL) {
    // POST /api/usuarios → { mensagem, idUsuario }
    // Atenção: a API atual só guarda nome, e-mail e senha.
    // Telefone e data de nascimento ainda são descartados (faltam colunas na tabela usuarios).
    const resposta = await chamarApi('/api/usuarios', {
      metodo: 'POST',
      corpo: { nome, email, senha: dados.senha },
    });
    return { idUsuario: resposta.idUsuario, nome, email, token: resposta.token || null };
  }

  await esperar();
  if (usuariosSimulados.some((u) => u.email === email)) {
    throw new Error('Este e-mail já tem uma conta. Entre com ele ou use outro.');
  }
  const novo = { idUsuario: usuariosSimulados.length + 1, nome, email, senha: dados.senha };
  usuariosSimulados.push(novo);
  return { idUsuario: novo.idUsuario, nome, email, token: null };
}
