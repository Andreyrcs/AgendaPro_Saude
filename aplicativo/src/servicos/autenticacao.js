// Login e cadastro do paciente titular.
// Já existem no backend: POST /api/auth/login (AuthController) e POST /api/usuarios (UsuariosController).
// Ainda faltam (contrato em docs/relatorio-integracao.md): POST /api/pacientes (titular com nascimento,
// alergias e parentesco "Titular"), GET /api/clinicas/codigo/{codigo} e POST /api/pacientes/{id}/clinicas.

import { config } from './config';
import { chamarApi } from './api';
import { esperar, usuariosLocais } from '../dados/bancoSimulado';
import { clinicas } from '../dados/dadosFicticios';
import { normalizarEmail } from '../utilitarios/texto';
import { ERRO_LOGIN, normalizarCodigo } from '../utilitarios/validacao';

const ERRO_CODIGO = 'Não achamos uma clínica com esse código. Confira com a recepção.';

// Senha: vai como o paciente digitou, por HTTPS; o servidor faz o hash com BCrypt (o app não faz hash).
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
  const usuario = usuariosLocais.find((u) => u.email === emailLimpo);
  if (!usuario || usuario.senha !== senha) throw new Error(ERRO_LOGIN);
  return { idUsuario: usuario.idUsuario, nome: usuario.nome, email: usuario.email, token: null };
}

// dados = { nome, email, senha, telefone, nascimento: 'AAAA-MM-DD', alergias, codigo: 'AAA-0000' | '' }
// (a tela já validou os campos com utilitarios/validacao.js)
// Devolve o usuário já logado, no mesmo formato de entrar().
export async function cadastrar(dados) {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);
  const codigo = normalizarCodigo(dados.codigo);

  if (config.USAR_API_REAL) {
    // POST /api/usuarios → { mensagem, idUsuario }  (existe; a senha vai como digitada e o servidor faz BCrypt)
    // A API atual só guarda nome, e-mail e senha. Telefone, nascimento, alergias e o código da clínica
    // só serão gravados quando existirem POST /api/pacientes e POST /api/pacientes/{id}/clinicas.
    const resposta = await chamarApi('/api/usuarios', {
      metodo: 'POST',
      corpo: { nome, email, senha: dados.senha },
    });
    // TODO: quando existirem no backend:
    //   POST /api/pacientes  { idUsuario, nome, nascimento, alergias, parentesco: 'Titular', telefone }
    //   if (codigo) POST /api/pacientes/{idUsuario}/clinicas  { codigo }
    return { idUsuario: resposta.idUsuario, nome, email, token: resposta.token || null };
  }

  await esperar();
  if (usuariosLocais.some((u) => u.email === email)) {
    throw new Error('Este e-mail já tem uma conta. Entre com ele ou use outro.');
  }
  // código da clínica (opcional): liga o paciente à clínica (Paciente_Clinica)
  const clinica = codigo ? clinicas.find((c) => c.codigo === codigo) : null;
  if (codigo && !clinica) throw new Error(ERRO_CODIGO);
  const novo = {
    idUsuario: usuariosLocais.length + 1, nome, email, senha: dados.senha,
    telefone: dados.telefone, nascimento: dados.nascimento, alergias: (dados.alergias || '').trim(),
    clinicas: clinica ? [clinica.id] : [],
  };
  usuariosLocais.push(novo);
  return { idUsuario: novo.idUsuario, nome, email, token: null };
}
