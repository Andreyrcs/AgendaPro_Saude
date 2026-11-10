// Consultas do paciente e da família: listar, ver, marcar e cancelar.

import {
  contaDe, esperar, novoId, garantirDaFamilia, medicoPorId, especialidadePorId,
  ocuparHorario, liberarHorario,
} from '../dados/bancoSimulado';
import { horarioDisputado } from '../dados/dadosFicticios';
import { HOJE } from '../utilitarios/datas';

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

// Devolve { proximas: [...], passadas: [...] }
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/consultas existir
export async function listarConsultas(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  const validas = conta.consultas
    .filter((c) => c.status !== 'cancelada')
    .map((c) => montarConsulta(conta, c));

  const ehProxima = (c) => c.status === 'confirmada' && c.data >= HOJE;
  return {
    proximas: validas.filter(ehProxima).sort((a, b) => ordem(a).localeCompare(ordem(b))),
    passadas: validas.filter((c) => !ehProxima(c)).sort((a, b) => ordem(b).localeCompare(ordem(a))),
  };
}

function acharConsulta(conta, idConsulta) {
  const consulta = conta.consultas.find((c) => c.id === idConsulta && c.status !== 'cancelada');
  if (!consulta) throw new Error('Consulta não encontrada.');
  return consulta;
}

// TODO: troca pra chamada real quando o endpoint GET /api/consultas/{id}?idUsuarioLogado= existir
export async function buscarConsulta(usuario, idConsulta) {
  await esperar();
  const conta = contaDe(usuario);
  return montarConsulta(conta, acharConsulta(conta, idConsulta));
}

// TODO: troca pra chamada real quando o endpoint DELETE /api/consultas/{id}?idUsuarioLogado= existir
export async function cancelarConsulta(usuario, idConsulta) {
  await esperar();
  const consulta = acharConsulta(contaDe(usuario), idConsulta);
  if (consulta.status !== 'confirmada') {
    throw new Error('Só dá para cancelar consultas que ainda vão acontecer.');
  }
  consulta.status = 'cancelada';
  liberarHorario(consulta.medico, consulta.data, consulta.hora); // o horário volta a ficar livre
}

// dados = { pessoa: idFamiliar, medico: idMedico, data, hora, motivo? }
// TODO: troca pra chamada real quando o endpoint POST /api/consultas existir
export async function marcarConsulta(usuario, dados) {
  await esperar();
  const conta = contaDe(usuario);
  const pessoa = garantirDaFamilia(conta, dados.pessoa); // só a própria família
  const medico = medicoPorId(dados.medico);

  const ehCriancaOuAdolescente = pessoa.idade !== null && pessoa.idade < 18;
  if (medico.esp === 'pediatria' && !ehCriancaOuAdolescente) {
    throw new Error('A pediatria atende só crianças e adolescentes até 18 anos.');
  }

  // Demonstração da apresentação: alguém "pegou" este horário um segundo antes
  const disputado =
    dados.medico === horarioDisputado.medico &&
    dados.data === horarioDisputado.data &&
    dados.hora === horarioDisputado.hora;
  if (disputado) {
    ocuparHorario(dados.medico, dados.data, dados.hora);
    throw new Error(ERRO_OCUPADO);
  }
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
