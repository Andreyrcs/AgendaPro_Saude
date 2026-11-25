// Regras de validação do login e do cadastro do titular (as mesmas mensagens em todas as telas).
// Ficam fora das telas para poderem ser testadas sozinhas.

import { brParaIso } from './datas';

export const ERRO_PREENCHA = 'Preencha e-mail e senha.';
export const ERRO_LOGIN = 'E-mail ou senha incorretos'; // o mesmo texto da API (Quadro 4.1), sem ponto

// Código da clínica: 3 letras, hífen e 4 números (ex.: IPE-4821)
export function normalizarCodigo(texto) {
  return String(texto || '').trim().toUpperCase();
}
export function codigoValido(texto) {
  return /^[A-Z]{3}-\d{4}$/.test(normalizarCodigo(texto));
}

// ─── CPF (Pacientes.CPF): 11 dígitos, com os dois dígitos verificadores; guarda só os números ───
export const ERRO_CPF = 'CPF inválido.';
export const ERRO_CPF_REPETIDO = 'Este CPF já está cadastrado.';
export const soDigitos = (texto) => String(texto || '').replace(/\D/g, '');
function digitoCPF(base) {
  const soma = base.split('').reduce((s, n, i) => s + Number(n) * (base.length + 1 - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}
export function cpfValido(texto) {
  const c = soDigitos(texto);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const d1 = digitoCPF(c.slice(0, 9));
  return c.endsWith(`${d1}${digitoCPF(c.slice(0, 9) + d1)}`);
}
// ─── Máscaras (as mesmas da web: frontend/assets/js/mascaras.js). São só visuais: a API recebe o formato de sempre ───
// O limite dos campos com máscara é a própria máscara, e não o maxLength: o maxLength cortaria o texto colado
// ANTES da máscara, e "CPF: 529.982.247-25" perderia os últimos números.

// 000.000.000-00: só entram números
export function mascararCPF(texto) {
  return soDigitos(texto).slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// (00) 00000-0000 no celular (11 números) e (00) 0000-0000 no fixo (10 números)
export function mascararTelefone(texto) {
  let n = soDigitos(texto);
  if (n.length > 11 && /^\s*\+?\s*55/.test(texto)) n = n.slice(2); // colado com o código do Brasil
  n = n.replace(/^0+/, '').slice(0, 11); // DDD não começa com zero
  if (n.length < 3) return n ? `(${n}` : '';
  if (n.length < 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  const meio = n.length === 11 ? 7 : 6;
  return `(${n.slice(0, 2)}) ${n.slice(2, meio)}-${n.slice(meio)}`;
}

// Código da clínica, AAA-0000: 3 letras e 4 números
export function mascararCodigo(texto) {
  const letras = normalizarCodigo(texto).replace(/[^A-Z]/g, '').slice(0, 3);
  const numeros = letras.length === 3 ? soDigitos(texto).slice(0, 4) : '';
  return numeros ? `${letras}-${numeros}` : letras;
}

// Limites dos textos: o tamanho das colunas no banco (e o da senha na API)
export const LIMITES = { nome: 150, email: 150, senha: 64, alergias: 500 };

export function validarLogin(email, senha) {
  return !String(email || '').trim() || !senha ? ERRO_PREENCHA : null;
}

// f = { nome, email, telefone, cpf, senha, confirmar, nascimento: 'DD/MM/AAAA', alergias, codigo, privacidade }
// Devolve { campo: 'mensagem' } com cada problema encontrado (vazio = tudo certo)
export function validarCadastro(f, hoje) {
  const erros = {};
  const nome = String(f.nome || '').trim();
  if (nome.split(/\s+/).length < 2) erros.nome = 'Informe o nome completo (nome e sobrenome).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || '').trim())) erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  const digitos = String(f.telefone || '').replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) erros.telefone = 'Informe o telefone com DDD (10 ou 11 números).';
  if (!cpfValido(f.cpf)) erros.cpf = ERRO_CPF;
  if (String(f.senha || '').length < 8) erros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
  if (f.confirmar !== f.senha) erros.confirmar = 'As senhas não são iguais.';
  const nasc = brParaIso(String(f.nascimento || ''));
  if (!nasc) erros.nascimento = 'Informe a data de nascimento no formato DD/MM/AAAA.';
  else if (nasc > hoje) erros.nascimento = 'A data de nascimento não pode ser no futuro.';
  if (String(f.codigo || '').trim() && !codigoValido(f.codigo)) erros.codigo = 'Use o formato AAA-0000, como IPE-4821.';
  if (!f.privacidade) erros.privacidade = 'Para criar a conta, aceite a política de privacidade.';
  return erros;
}
