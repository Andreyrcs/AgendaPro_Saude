// Perfil familiar: o paciente gerencia filhos, pais e outros dependentes.
// Regra de negócio: cada conta só enxerga e altera a própria família.

import { contaDe, cpfEmUso, esperar, novoId } from '../dados/bancoSimulado';
import { idadeEm } from '../utilitarios/datas';
import { primeiroNome } from '../utilitarios/texto';
import { ERRO_CPF, ERRO_CPF_REPETIDO, cpfValido, soDigitos } from '../utilitarios/validacao';

// Formato de cada familiar (o mesmo do contrato da API):
// { id, nome, curto, cpf, relacao, nascimento, cor, alergias, titular }
// O app ainda guarda "idade", calculada do nascimento.

// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/familiares existir
export async function listarFamiliares(usuario) {
  await esperar();
  return contaDe(usuario).familia;
}

// dados = { nome, cpf, relacao, nascimento: 'AAAA-MM-DD', alergias, cor }
// CPF obrigatório, válido e único (Pacientes.CPF): "CPF inválido." ou "Este CPF já está cadastrado."
// TODO: troca pra chamada real quando o endpoint POST /api/pacientes/{id}/familiares existir
export async function adicionarFamiliar(usuario, dados) {
  const nome = (dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do familiar.');
  const cpf = soDigitos(dados.cpf);
  if (!cpfValido(cpf)) throw new Error(ERRO_CPF);
  if (cpfEmUso(cpf)) throw new Error(ERRO_CPF_REPETIDO);
  if (!dados.relacao) throw new Error('Escolha o parentesco.');
  if (!dados.nascimento) throw new Error('Informe a data de nascimento.');

  await esperar();
  const familiar = {
    id: novoId('pes'),
    nome,
    curto: primeiroNome(nome),
    cpf,
    relacao: dados.relacao,
    nascimento: dados.nascimento,
    idade: idadeEm(dados.nascimento),
    cor: dados.cor,
    alergias: (dados.alergias || '').trim() || 'Nenhuma informada',
    titular: false,
  };
  contaDe(usuario).familia.push(familiar);
  return familiar;
}
