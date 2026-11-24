// Login e cadastro do paciente titular (seção 6.4 e Apêndice L).
// Rotas: POST /api/auth/login, POST /api/pacientes (cria a conta e o titular numa chamada só e, com o
// código, já vincula à clínica) e GET /api/pacientes/{id}/clinicas (backend/docs/especificacao-api.md).

import { ErroApi, chamarApi, definirToken } from './api';
import { normalizarEmail } from '../utilitarios/texto';
import { normalizarCodigo, soDigitos } from '../utilitarios/validacao';

const SO_PACIENTE = 'Este aplicativo é dos pacientes. A equipe da clínica usa o site do AgendaPro Saúde.';

// Senha: vai como o paciente digitou, por HTTPS; o servidor faz o hash com BCrypt (o app não faz hash).
// Devolve o usuário logado: { idUsuario, nome, email, papel, token, clinicaId, clinica }
export async function entrar(email, senha) {
  // POST /api/auth/login → { token, expiraEm, usuario: { idUsuario, nome, email, papel, clinicaId, medicoId } }
  // A mensagem de erro é a da API, sem trocar (F8): "E-mail ou senha incorretos" no 401 e
  // "Muitas tentativas. Aguarde um minuto e tente de novo." no 429.
  const resposta = await chamarApi('/api/auth/login', {
    metodo: 'POST',
    corpo: { email: normalizarEmail(email), senha },
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

// dados = { nome, email, senha, telefone, cpf, nascimento: 'AAAA-MM-DD', alergias, codigo: 'AAA-0000' | '' }
// O CPF é obrigatório, válido e único (Pacientes.CPF); vai só com os 11 números.
// (a tela já validou os campos com utilitarios/validacao.js)
// Devolve o usuário já logado, no mesmo formato de entrar().
export async function cadastrar(dados) {
  const email = normalizarEmail(dados.email);
  const codigo = normalizarCodigo(dados.codigo);

  // POST /api/pacientes (F11): conta e titular numa chamada só; com o código, já vincula à clínica.
  // Responde 201 SEM token, então o cadastro entra em seguida (F10).
  // Erros vêm prontos da API, por exemplo "Este CPF já está cadastrado." (400, ou 409 na corrida: F12).
  await chamarApi('/api/pacientes', {
    metodo: 'POST',
    corpo: {
      nome: dados.nome.trim(),
      email,
      senha: dados.senha,
      telefone: dados.telefone || null,
      cpf: soDigitos(dados.cpf),
      nascimento: dados.nascimento,
      alergias: (dados.alergias || '').trim() || null,
      codigo: codigo || null,
    },
  });
  return entrar(email, dados.senha);
}
