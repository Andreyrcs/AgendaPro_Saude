// Consultas do paciente e da família: listar, ver, confirmar presença, marcar e cancelar; faltas e restrição.

import {
  contaDe, esperar, novoId, garantirDaFamilia, medicoPorId, especialidadePorId,
  ocuparHorario, liberarHorario, horarioCanceladoDoMedico,
} from '../dados/bancoSimulado';
import { HOJE } from '../utilitarios/datas';
import { STATUS_FUTUROS, avisoAte, restricaoDe } from '../utilitarios/status';
import { somarDias } from '../utilitarios/datas';

const ERRO_OCUPADO = 'Este horário acabou de ser ocupado. Escolha outro.';

// Troca os ids pelos objetos completos, como a API faria com um JOIN
// (igual ao "nomeOrganizador" que a API atual já devolve).
// Formato devolvido:
// { id, pessoa: {familiar}, medico: {médico}, especialidade: { id, nome, desc },
//   data: 'AAAA-MM-DD', hora: 'HH:MM', sala, status, motivo, tipo, titulo? }
export function montarConsulta(conta, consulta) {
  const medico = medicoPorId(consulta.medico);
  return {
    ...consulta,
    pessoa: conta.familia.find((p) => p.id === consulta.pessoa),
    medico,
    especialidade: especialidadePorId(medico.esp),
  };
}

const ordem = (c) => c.data + c.hora;

// Devolve { proximas: [...], passadas: [...] }  — as canceladas ficam em "passadas" (histórico)
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/consultas existir
export async function listarConsultas(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  const validas = conta.consultas.map((c) => montarConsulta(conta, c));

  const ehProxima = (c) => STATUS_FUTUROS.includes(c.status) && c.data >= HOJE;
  return {
    proximas: validas.filter(ehProxima).sort((a, b) => ordem(a).localeCompare(ordem(b))),
    passadas: validas.filter((c) => !ehProxima(c)).sort((a, b) => ordem(b).localeCompare(ordem(a))),
  };
}

function acharConsulta(conta, idConsulta) {
  const consulta = conta.consultas.find((c) => c.id === idConsulta);
  if (!consulta) throw new Error('Consulta não encontrada.');
  return consulta;
}

// TODO: troca pra chamada real quando o endpoint GET /api/consultas/{id}?idUsuarioLogado= existir
export async function buscarConsulta(usuario, idConsulta) {
  await esperar();
  const conta = contaDe(usuario);
  return montarConsulta(conta, acharConsulta(conta, idConsulta));
}

// Cancelar agora conta como falta? Só se for no dia da consulta (depois do fim da véspera)
// e o paciente já tinha confirmado presença ("Vou"). Até o fim da véspera, nenhuma consequência.
export function cancelarContaFalta(consulta) {
  return !!consulta.presencaConfirmada && new Date() > avisoAte(consulta.data);
}

// Consultas para confirmar presença: a partir do início da véspera, ainda sem resposta
export async function listarParaConfirmar(usuario) {
  const { proximas } = await listarConsultas(usuario);
  return proximas.filter((c) => !c.presencaConfirmada && HOJE >= somarDias(c.data, -1) && HOJE <= c.data);
}

// "Vou": a clínica fica sabendo que o paciente vai
// TODO: troca pra chamada real quando o endpoint PUT /api/consultas/{id}/presenca existir
export async function confirmarPresenca(usuario, idConsulta) {
  await esperar(150);
  const consulta = acharConsulta(contaDe(usuario), idConsulta);
  consulta.presencaConfirmada = true;
  consulta.confirmadaEm = new Date().toISOString();
}

// Faltas e restrição da conta: { faltas, tipo: 'normal' | 'so_fila' | 'so_recepcao', ate }
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/situacao existir
export async function buscarSituacao(usuario) {
  await esperar(150);
  return restricaoDe(contaDe(usuario).faltas, HOJE);
}

// Cancelar ("Não vou" também): a consulta fica "cancelada" (continua no histórico) e o horário volta
// a "livre", ou vira "oferecido" se houver lista de espera para aquele médico. Nunca há custo.
// Cancelar no dia, depois de ter dito "Vou", registra falta sem aviso.
// Devolve { falta, oferecidoAFila }.
// TODO: troca pra chamada real quando o endpoint DELETE /api/consultas/{id}?idUsuarioLogado= existir
export async function cancelarConsulta(usuario, idConsulta) {
  await esperar();
  const conta = contaDe(usuario);
  const consulta = acharConsulta(conta, idConsulta);
  if (!STATUS_FUTUROS.includes(consulta.status)) {
    throw new Error('Só dá para cancelar consultas que ainda vão acontecer.');
  }
  const falta = cancelarContaFalta(consulta);
  consulta.status = 'cancelada';
  consulta.canceladaEm = new Date().toISOString();
  const oferecidoAFila = horarioCanceladoDoMedico(consulta.medico, consulta.data, consulta.hora);
  if (!oferecidoAFila) liberarHorario(consulta.medico, consulta.data, consulta.hora);
  if (falta) {
    conta.faltas.push({
      id: novoId('fa'), consulta: consulta.id, data: consulta.data, confirmou: true,
      motivo: 'Cancelou no dia, depois de confirmar presença', retirada: false,
    });
  }
  return { falta, oferecidoAFila };
}

// dados = { pessoa: idFamiliar, medico: idMedico, data, hora, motivo? }
// TODO: troca pra chamada real quando o endpoint POST /api/consultas existir
export async function marcarConsulta(usuario, dados) {
  await esperar();
  const conta = contaDe(usuario);
  const pessoa = garantirDaFamilia(conta, dados.pessoa); // só a própria família
  const medico = medicoPorId(dados.medico);

  // faltas sem aviso podem limitar o agendamento direto
  const situacao = restricaoDe(conta.faltas, HOJE);
  if (situacao.tipo === 'so_fila') throw new Error('Por enquanto, só dá para entrar na lista de espera.');
  if (situacao.tipo === 'so_recepcao') throw new Error('Por enquanto, agende pela recepção da clínica.');

  const ehCriancaOuAdolescente = pessoa.idade !== null && pessoa.idade < 18;
  if (medico.esp === 'pediatria' && !ehCriancaOuAdolescente) {
    throw new Error('A pediatria atende só crianças e adolescentes até 18 anos.');
  }

  // se outra pessoa marcou este horário antes, ele já não está na lista de livres
  if (!ocuparHorario(dados.medico, dados.data, dados.hora)) throw new Error(ERRO_OCUPADO);

  const consulta = {
    id: novoId('c'),
    pessoa: pessoa.id,
    medico: medico.id,
    data: dados.data,
    hora: dados.hora,
    sala: medico.sala,
    status: 'confirmada',
    motivo: dados.motivo || 'Consulta marcada pelo app',
    tipo: 'consulta',
  };
  conta.consultas.push(consulta);
  return montarConsulta(conta, consulta);
}
