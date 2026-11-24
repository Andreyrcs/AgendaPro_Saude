// Especialidades, médicos e horários livres da clínica do paciente (Apêndice L).
// Rotas: GET /api/clinicas/{id}/especialidades, GET /api/especialidades/{id} e
// GET /api/especialidades/{id}/horarios-livres. A clínica é a da sessão (GET /api/pacientes/{id}/clinicas no login).

import { chamarApi } from './api';
import { mesmaEspecialidade } from '../utilitarios/texto';

// Especialidade da API: { id, nome, duracao }. "desc" é o texto curto que as telas mostram embaixo do nome.
const comDescricao = (e) => ({ ...e, desc: `Consulta de ${e.duracao} minutos` });

export async function listarEspecialidades(usuario) {
  if (!usuario.clinicaId) return [];
  const lista = await chamarApi(`/api/clinicas/${usuario.clinicaId}/especialidades`);
  return lista.map(comDescricao);
}

export async function buscarEspecialidade(idEspecialidade) {
  return comDescricao(await chamarApi(`/api/especialidades/${idEspecialidade}`));
}

// Procura a especialidade pelo NOME na clínica do paciente (os ids mudam de clínica para clínica).
// Devolve a especialidade ou null.
export async function especialidadePeloNome(usuario, nome) {
  const lista = await listarEspecialidades(usuario);
  return lista.find((e) => mesmaEspecialidade(e.nome, nome)) || null;
}

// "Marcar" da prevenção: devolve o id da especialidade ou lança "Esta clínica não atende essa especialidade."
export async function especialidadeNaClinica(usuario, nome) {
  const achada = await especialidadePeloNome(usuario, nome);
  if (!achada) throw new Error('Esta clínica não atende essa especialidade.');
  return achada.id;
}

// Formato: [{ medico: { id, nome, sala }, dias: [{ data, horas: ['08:00', ...] }] }]
// Médico sem horário vem com dias: [] (a tela oferece a lista de espera).
export async function listarHorariosLivres(idEspecialidade) {
  return chamarApi(`/api/especialidades/${idEspecialidade}/horarios-livres`);
}

// O horário livre mais cedo entre todos os médicos da especialidade (ou null)
export function calcularPrimeiroHorario(horarios) {
  let melhor = null;
  for (const { medico, dias } of horarios) {
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

export async function primeiroHorario(idEspecialidade) {
  return calcularPrimeiroHorario(await listarHorariosLivres(idEspecialidade));
}
