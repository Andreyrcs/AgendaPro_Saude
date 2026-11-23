// Login e cadastro do paciente titular.
// Rotas: POST /api/auth/login, POST /api/pacientes (cria a conta e o titular numa chamada só e, com o
// código, já vincula à clínica) e GET /api/pacientes/{id}/clinicas (backend/docs/especificacao-api.md).

import { config } from './config';
import { ErroApi, chamarApi, definirToken } from './api';
import { cpfEmUso, esperar, usuariosLocais } from '../dados/bancoSimulado';
import { clinicas } from '../dados/dadosFicticios';
import { normalizarEmail } from '../utilitarios/texto';
import { ERRO_CPF, ERRO_CPF_REPETIDO, ERRO_LOGIN, cpfValido, normalizarCodigo, soDigitos } from '../utilitarios/validacao';

const ERRO_CODIGO = 'Não achamos uma clínica com esse código. Confira com a recepção.';

const SO_PACIENTE = 'Este aplicativo é dos pacientes. A equipe da clínica usa o site do AgendaPro Saúde.';

// Senha: vai como o paciente digitou, por HTTPS; o servidor faz o hash com BCrypt (o app não faz hash).
// Devolve o usuário logado: { idUsuario, nome, email, papel, token, clinicaId, clinica }
export async function entrar(email, senha) {
  const emailLimpo = normalizarEmail(email);

  if (config.USAR_API_REAL) {
    // POST /api/auth/login → { token, expiraEm, usuario: { idUsuario, nome, email, papel, clinicaId, medicoId } }
    // A mensagem de erro é a da API, sem trocar (F8): "E-mail ou senha incorretos" no 401 e
    // "Muitas tentativas. Aguarde um minuto e tente de novo." no 429.
    const resposta = await chamarApi('/api/auth/login', {
      metodo: 'POST',
      corpo: { email: emailLimpo, senha },
    });
    const usuario = { ...resposta.usuario, token: resposta.token };
    if (usuario.papel !== 'paciente') throw new ErroApi(403, SO_PACIENTE);

    // F7: para o paciente, a clínica não vem no login. As clínicas da conta vêm desta rota;
    // o token é usado já aqui, antes de a sessão ser aberta.
    definirToken(usuario.token);
    try {
      const clinicas = await chamarApi(`/api/pacientes/${usuario.idUsuario}/clinicas`);
      return { ...usuario, clinicaId: clinicas.length ? clinicas[0].id : null, clinica: clinicas[0] || null };
    } catch (erro) {
      definirToken(null);
      throw erro;
    }
  }

  await esperar();
  const usuario = usuariosLocais.find((u) => u.email === emailLimpo);
  if (!usuario || usuario.senha !== senha) throw new Error(ERRO_LOGIN);
  return { idUsuario: usuario.idUsuario, nome: usuario.nome, email: usuario.email, token: null };
}

// dados = { nome, email, senha, telefone, cpf, nascimento: 'AAAA-MM-DD', alergias, codigo: 'AAA-0000' | '' }
// O CPF é obrigatório, válido e único (Pacientes.CPF); vai só com os 11 números.
// (a tela já validou os campos com utilitarios/validacao.js)
// Devolve o usuário já logado, no mesmo formato de entrar().
export async function cadastrar(dados) {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);
  const codigo = normalizarCodigo(dados.codigo);
  const cpf = soDigitos(dados.cpf);

  if (config.USAR_API_REAL) {
    // POST /api/pacientes (F11): conta e titular numa chamada só; com o código, já vincula à clínica.
    // Responde 201 SEM token, então o cadastro entra em seguida (F10).
    // Erros vêm prontos da API, por exemplo "Este CPF já está cadastrado." (400, ou 409 na corrida: F12).
    await chamarApi('/api/pacientes', {
      metodo: 'POST',
      corpo: {
        nome,
        email,
        senha: dados.senha,
        telefone: dados.telefone || null,
        cpf,
        nascimento: dados.nascimento,
        alergias: (dados.alergias || '').trim() || null,
        codigo: codigo || null,
      },
    });
    return entrar(email, dados.senha);
  }

  await esperar();
  if (usuariosLocais.some((u) => u.email === email)) {
    throw new Error('Este e-mail já tem uma conta. Entre com ele ou use outro.');
  }
  if (!cpfValido(cpf)) throw new Error(ERRO_CPF);
  if (cpfEmUso(cpf)) throw new Error(ERRO_CPF_REPETIDO);
  // código da clínica (opcional): liga o paciente à clínica (Paciente_Clinica)
  const clinica = codigo ? clinicas.find((c) => c.codigo === codigo) : null;
  if (codigo && !clinica) throw new Error(ERRO_CODIGO);
  const novo = {
    idUsuario: usuariosLocais.length + 1, nome, email, senha: dados.senha,
    telefone: dados.telefone, cpf, nascimento: dados.nascimento, alergias: (dados.alergias || '').trim(),
    clinicas: clinica ? [clinica.id] : [],
  };
  usuariosLocais.push(novo);
  return { idUsuario: novo.idUsuario, nome, email, token: null };
}
