// Perfil familiar: o paciente gerencia filhos, pais e outros dependentes.
// Regra de negócio: cada conta só enxerga e altera a própria família.

import { contaDe, esperar, novoId } from '../dados/bancoSimulado';
import { idadeEm } from '../utilitarios/datas';
import { primeiroNome } from '../utilitarios/texto';

// Formato de cada familiar:
// { id, nome, curto, relacao, idade, genero, cor, alergias, sus, titular }

// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/familiares existir
export async function listarFamiliares(usuario) {
  await esperar();
  return contaDe(usuario).familia;
}

// dados = { nome, relacao, nascimento: 'AAAA-MM-DD', alergias, cor }
// TODO: troca pra chamada real quando o endpoint POST /api/pacientes/{id}/familiares existir
export async function adicionarFamiliar(usuario, dados) {
  const nome = (dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do familiar.');
  if (!dados.relacao) throw new Error('Escolha o parentesco.');
  if (!dados.nascimento) throw new Error('Informe a data de nascimento.');

  await esperar();
  const familiar = {
    id: novoId('pes'),
    nome,
    curto: primeiroNome(nome),
    relacao: dados.relacao,
    idade: idadeEm(dados.nascimento),
    genero: null,
    cor: dados.cor,
    alergias: (dados.alergias || '').trim() || 'Nenhuma informada',
    sus: 'Não informado',
    titular: false,
  };
  contaDe(usuario).familia.push(familiar);
  return familiar;
}
