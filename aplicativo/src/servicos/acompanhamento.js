// Depois da consulta: retornos pedidos pelo médico e exames solicitados (Apêndice L).
// Rota: GET /api/pacientes/{id}/acompanhamento.

import { chamarApi } from './api';

// Formato (o da API):
// { retornos: [{ id, pessoa, titulo, medico, especialidade, prazo (o dia marcado ou null), origem }],
//   exames:   [{ id, pessoa, titulo, pedidoPor, status: 'pendente'|'realizado', obs, origem }] }
export async function listarAcompanhamento(usuario) {
  const r = await chamarApi(`/api/pacientes/${usuario.idUsuario}/acompanhamento`);
  return {
    retornos: [...r.retornos].sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999')),
    exames: r.exames,
  };
}
