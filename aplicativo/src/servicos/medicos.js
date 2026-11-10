// Especialidades, médicos e horários livres da clínica.

import { esperar, horariosLivres, especialidadePorId } from '../dados/bancoSimulado';
import { especialidades, medicos } from '../dados/dadosFicticios';
import { HOJE } from '../utilitarios/datas';

// TODO: troca pra chamada real quando o endpoint GET /api/especialidades existir
export async function listarEspecialidades() {
  await esperar();
  return especialidades;
}

// TODO: troca pra chamada real quando o endpoint GET /api/especialidades/{id} existir
export async function buscarEspecialidade(idEspecialidade) {
  await esperar(100);
  const especialidade = especialidadePorId(idEspecialidade);
  if (!especialidade) throw new Error('Especialidade não encontrada.');
  return especialidade;
}

// Lê os horários sem esperar (o assistente também usa)
export function horariosDaEspecialidade(idEspecialidade) {
  return medicos
    .filter((m) => m.esp === idEspecialidade)
    .map((medico) => ({
      medico,
      dias: (horariosLivres[medico.id] || [])
        .filter((d) => d.data >= HOJE && d.horas.length > 0)
        .map((d) => ({ data: d.data, horas: [...d.horas] })),
    }));
}

// O horário livre mais cedo entre todos os médicos da especialidade (ou null)
export function calcularPrimeiroHorario(idEspecialidade) {
  let melhor = null;
  for (const { medico, dias } of horariosDaEspecialidade(idEspecialidade)) {
    for (const dia of dias) {
      for (const hora of dia.horas) {
        if (!melhor || dia.data + hora < melhor.data + melhor.hora) {
          melhor = { data: dia.data, hora, medico };
        }
      }
    }
  }
  return melhor;
}

// Formato: [{ medico: { id, nome, esp, cor, sala }, dias: [{ data, horas: ['08:00', ...] }] }]
// Médico sem horário vem com dias: [] (a tela oferece a lista de espera).
// TODO: troca pra chamada real quando o endpoint GET /api/especialidades/{id}/horarios-livres existir
export async function listarHorariosLivres(idEspecialidade) {
  await esperar();
  return horariosDaEspecialidade(idEspecialidade);
}

// TODO: troca pra chamada real quando o endpoint GET /api/especialidades/{id}/horarios-livres existir
export async function primeiroHorario(idEspecialidade) {
  await esperar(100);
  return calcularPrimeiroHorario(idEspecialidade);
}
