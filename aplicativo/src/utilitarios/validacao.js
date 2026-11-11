// Regras de validação do login e do cadastro do titular (as mesmas mensagens em todas as telas).
// Ficam fora das telas para poderem ser testadas sozinhas.

import { brParaIso } from './datas';

export const ERRO_PREENCHA = 'Preencha e-mail e senha.';
export const ERRO_LOGIN = 'E-mail ou senha incorretos.';

// Código da clínica: 3 letras, hífen e 4 números (ex.: IPE-4821)
export function normalizarCodigo(texto) {
  return String(texto || '').trim().toUpperCase();
}
export function codigoValido(texto) {
  return /^[A-Z]{3}-\d{4}$/.test(normalizarCodigo(texto));
}

export function validarLogin(email, senha) {
  return !String(email || '').trim() || !senha ? ERRO_PREENCHA : null;
}

// f = { nome, email, telefone, senha, confirmar, nascimento: 'DD/MM/AAAA', alergias, codigo, privacidade }
// Devolve { campo: 'mensagem' } com cada problema encontrado (vazio = tudo certo)
export function validarCadastro(f, hoje) {
  const erros = {};
  const nome = String(f.nome || '').trim();
  if (nome.split(/\s+/).length < 2) erros.nome = 'Informe o nome completo (nome e sobrenome).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || '').trim())) erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  const digitos = String(f.telefone || '').replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) erros.telefone = 'Informe o telefone com DDD (10 ou 11 números).';
  if (String(f.senha || '').length < 8) erros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
  if (f.confirmar !== f.senha) erros.confirmar = 'As senhas não são iguais.';
  const nasc = brParaIso(String(f.nascimento || ''));
  if (!nasc) erros.nascimento = 'Informe a data de nascimento no formato DD/MM/AAAA.';
  else if (nasc > hoje) erros.nascimento = 'A data de nascimento não pode ser no futuro.';
  if (String(f.codigo || '').trim() && !codigoValido(f.codigo)) erros.codigo = 'Use o formato AAA-0000, como IPE-4821.';
  if (!f.privacidade) erros.privacidade = 'Para criar a conta, aceite a política de privacidade.';
  return erros;
}
