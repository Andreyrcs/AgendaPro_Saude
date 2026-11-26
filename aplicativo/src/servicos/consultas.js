// Consultas do paciente e da família: listar, ver, confirmar presença, marcar e cancelar; faltas e restrição.
// Rotas (Apêndice L): GET /api/pacientes/{id}/consultas, GET /api/consultas/{id}, POST /api/consultas,
// DELETE /api/consultas/{id}, PUT /api/consultas/{id}/presenca e GET /api/pacientes/{id}/situacao.
// O usuário sai do token: nenhum id do próprio usuário no corpo; {id} da URL = idUsuario da sessão.

import { chamarApi } from './api';
import { HOJE, somarDias } from '../utilitarios/datas';
import { avisoAte } from '../utilitarios/status';

// Formato da consulta (o da API, Apêndice E):
// { id, data: 'AAAA-MM-DD', hora: 'HH:MM', sala, status, motivo, tipo, titulo, presencaConfirmada,
//   pessoa: {familiar}, medico: { id, nome, sala }, especialidade: { id, nome } }

// Devolve { proximas: [...], passadas: [...] } — as canceladas ficam em "passadas" (histórico)
export async function listarConsultas(usuario) {
  return chamarApi(`/api/pacientes/${usuario.idUsuario}/consultas`);
}

export async function buscarConsulta(usuario, idConsulta) {
  return chamarApi(`/api/consultas/${idConsulta}`);
}

// Cancelar agora conta como falta? Só se for no dia da consulta (depois do fim da véspera)
// e o paciente já tinha confirmado presença ("Vou"). Até o fim da véspera, nenhuma consequência.
// Serve só para o aviso antes de concluir; quem decide é o banco (trg_Consultas_Falta).
export function cancelarContaFalta(consulta) {
  return !!consulta.presencaConfirmada && new Date() > avisoAte(consulta.data);
}

// Consultas para confirmar presença: a partir do início da véspera, ainda sem resposta
export async function listarParaConfirmar(usuario) {
  const { proximas } = await listarConsultas(usuario);
  return proximas.filter((c) => !c.presencaConfirmada && HOJE >= somarDias(c.data, -1) && HOJE <= c.data);
}

// "Vou" (vou = true) confirma a presença e devolve a consulta.
// "Não vou" (vou = false) cancela a consulta e devolve { falta, oferecidoAFila } (sp_ConfirmarPresenca).
export async function confirmarPresenca(usuario, idConsulta, vou = true) {
  return chamarApi(`/api/consultas/${idConsulta}/presenca`, { metodo: 'PUT', corpo: { vou } });
}

// Faltas e restrição da conta (vw_SituacaoConta): { faltas, tipo: 'normal' | 'so_fila' | 'so_recepcao', ate }
export async function buscarSituacao(usuario) {
  const s = await chamarApi(`/api/pacientes/${usuario.idUsuario}/situacao`);
  return { faltas: s.faltas, tipo: s.restricao, ate: s.ate };
}

// Cancela: a consulta fica "cancelada" (continua no histórico) e a vaga vai para a lista de espera.
// Devolve { falta, oferecidoAFila }.
export async function cancelarConsulta(usuario, idConsulta) {
  return chamarApi(`/api/consultas/${idConsulta}`, { metodo: 'DELETE' });
}

// dados = { pessoa: idFamiliar, medico: idMedico, data, hora, motivo? }
// Erros da API sem trocar, como "Este horário acabou de ser ocupado. Escolha outro."
export async function marcarConsulta(usuario, dados) {
  return chamarApi('/api/consultas', {
    metodo: 'POST',
    corpo: {
      pessoa: Number(dados.pessoa),
      medico: Number(dados.medico),
      data: dados.data,
      hora: dados.hora,
      motivo: (dados.motivo || '').trim() || null,
    },
  });
}
