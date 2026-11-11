// Lista de espera inteligente.
// Quando não há horário com o médico escolhido, o paciente entra na fila.
// Quando uma consulta desse médico é cancelada (pela recepção ou por outro paciente),
// o horário é oferecido ao 1º da fila, que tem 30 minutos para aceitar
// (regra em horarioCanceladoDoMedico, em dados/bancoSimulado.js; com a API, quem faz é o servidor).
// Regra simples deste app: cada conta fica em uma fila por vez.

import {
  contaDe, esperar, novoId, garantirDaFamilia, medicoPorId, especialidadePorId,
} from '../dados/bancoSimulado';
import { pessoasNaFila } from '../dados/dadosFicticios';
import { montarConsulta } from './consultas';
import { HOJE } from '../utilitarios/datas';
import { restricaoDe } from '../utilitarios/status';

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

// A tela chama de novo ao abrir e ao tocar em "Atualizar": é assim que a vaga oferecida aparece.
// Vaga não respondida em 30 minutos expira e volta para a clínica oferecer à próxima pessoa.
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/lista-espera existir
export async function buscarMinhaFila(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  const f = conta.fila;
  if (f && f.vagaOferecida && f.vagaOferecida.expiraEm < Date.now()) f.vagaOferecida = null;
  return f ? montarFila(conta, f) : null;
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
    posicao, naFila: posicao, desde: HOJE, vagaOferecida: null,
  };
  return montarFila(conta, conta.fila);
}

// aceitar = true → vira consulta e o paciente sai da fila
// aceitar = false → a vaga volta para a clínica oferecer ao próximo; o paciente continua em 1º
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
