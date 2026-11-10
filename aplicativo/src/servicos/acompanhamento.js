// Depois da consulta: retornos pedidos pelo médico e exames solicitados.

import { contaDe, esperar, medicoPorId, especialidadePorId } from '../dados/bancoSimulado';

// Formato:
// { retornos: [{ id, pessoa, titulo, medico, especialidade, prazo, origem }],
//   exames:   [{ id, pessoa, titulo, pedidoPor, status: 'pendente'|'agendado', obs, origem }] }
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/acompanhamento existir
export async function listarAcompanhamento(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  const pessoa = (id) => conta.familia.find((p) => p.id === id);

  return {
    retornos: conta.acompanhamento.retornos
      .map((r) => {
        const medico = medicoPorId(r.medico);
        return { ...r, pessoa: pessoa(r.pessoa), medico, especialidade: especialidadePorId(medico.esp) };
      })
      .sort((a, b) => a.prazo.localeCompare(b.prazo)),
    exames: conta.acompanhamento.exames.map((e) => ({
      ...e,
      pessoa: pessoa(e.pessoa),
      pedidoPor: medicoPorId(e.pedidoPor),
    })),
  };
}
