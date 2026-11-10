// Lista de espera inteligente.
// Quando não há horário com o médico escolhido, o paciente entra na fila.
// Se alguém cancela, a vaga é oferecida ao 1º da fila, que tem 30 minutos para aceitar.
// Regra simples deste app: cada conta fica em uma fila por vez.

import {
  contaDe, esperar, novoId, garantirDaFamilia, medicoPorId, especialidadePorId,
} from '../dados/bancoSimulado';
import { pessoasNaFila } from '../dados/dadosFicticios';
import { montarConsulta } from './consultas';
import { HOJE, somarDias } from '../utilitarios/datas';

const TRINTA_MINUTOS = 30 * 60 * 1000;

// Formato:
// { id, pessoa: {familiar}, medico: {médico}, especialidade, posicao, naFila, desde,
//   vagaOferecida: null | { data, hora, expiraEm (milissegundos) } }
function montarFila(conta, fila) {
  const medico = medicoPorId(fila.medico);
  return {
    ...fila,
    pessoa: conta.familia.find((p) => p.id === fila.pessoa),
    medico,
    especialidade: especialidadePorId(medico.esp),
    vagaOferecida: fila.vagaOferecida || null,
  };
}

function acharFila(conta, idFila) {
  if (!conta.fila || conta.fila.id !== idFila) throw new Error('Você não está nesta fila.');
  return conta.fila;
}

// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/lista-espera existir
export async function buscarMinhaFila(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  return conta.fila ? montarFila(conta, conta.fila) : null;
}

// dados = { pessoa: idFamiliar, medico: idMedico }
// TODO: troca pra chamada real quando o endpoint POST /api/lista-espera existir
export async function entrarNaFila(usuario, dados) {
  await esperar();
  const conta = contaDe(usuario);
  garantirDaFamilia(conta, dados.pessoa);
  if (conta.fila) {
    throw new Error('Você já está numa lista de espera. Saia dela antes de entrar em outra.');
  }
  const posicao = (pessoasNaFila[dados.medico] || 0) + 1; // entra no fim da fila
  conta.fila = {
    id: novoId('f'), pessoa: dados.pessoa, medico: dados.medico,
    posicao, naFila: posicao, desde: HOJE, vaga: null, vagaOferecida: null,
  };
  return montarFila(conta, conta.fila);
}

// SÓ PARA A DEMONSTRAÇÃO: finge que alguém da frente cancelou.
// Sobe uma posição; se já está em 1º, oferece uma vaga com prazo de 30 minutos.
// No sistema real isso acontece quando a recepção cancela uma consulta.
export async function simularCancelamento(usuario) {
  await esperar(150);
  const conta = contaDe(usuario);
  const fila = conta.fila;
  if (!fila) throw new Error('Você não está em nenhuma fila agora.');

  if (fila.posicao > 1) {
    fila.posicao -= 1;
    fila.naFila -= 1;
  } else if (!fila.vagaOferecida) {
    const vaga = fila.vaga || { data: somarDias(HOJE, 3), hora: '09:00' };
    fila.vagaOferecida = { ...vaga, expiraEm: Date.now() + TRINTA_MINUTOS };
  }
  return montarFila(conta, fila);
}

// aceitar = true → vira consulta e o paciente sai da fila
// aceitar = false → a vaga passa para o próximo; o paciente continua em 1º
// TODO: troca pra chamada real quando o endpoint PUT /api/lista-espera/{id}/vaga existir
export async function responderVaga(usuario, idFila, aceitar) {
  await esperar();
  const conta = contaDe(usuario);
  const fila = acharFila(conta, idFila);
  if (!fila.vagaOferecida) throw new Error('Esta vaga não está mais disponível.');

  if (!aceitar) {
    fila.vagaOferecida = null;
    return null;
  }

  const medico = medicoPorId(fila.medico);
  const consulta = {
    id: novoId('c'), pessoa: fila.pessoa, medico: fila.medico,
    data: fila.vagaOferecida.data, hora: fila.vagaOferecida.hora,
    sala: medico.sala, status: 'confirmada', motivo: 'Vaga da lista de espera', tipo: 'consulta',
  };
  conta.consultas.push(consulta);
  conta.fila = null;
  return montarConsulta(conta, consulta);
}

// TODO: troca pra chamada real quando o endpoint DELETE /api/lista-espera/{id}?idUsuarioLogado= existir
export async function sairDaFila(usuario, idFila) {
  await esperar();
  const conta = contaDe(usuario);
  acharFila(conta, idFila);
  conta.fila = null;
}
