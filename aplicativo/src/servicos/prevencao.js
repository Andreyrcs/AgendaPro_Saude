// Calendário de prevenção: check-ups e exames de rotina ao longo do ano,
// seguindo as campanhas do Ministério da Saúde (Outubro Rosa, Novembro Azul...).

import { contaDe, esperar } from '../dados/bancoSimulado';

const SITUACOES = ['pendente', 'agendado', 'feito'];

// Formato: [{ mes: 'AAAA-MM', campanha, tema, itens: [{ id, pessoa, titulo, status, nota, esp }] }]
// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/prevencao existir
export async function listarPrevencao(usuario) {
  await esperar();
  const conta = contaDe(usuario);
  return conta.prevencao.map((mes) => ({
    ...mes,
    itens: mes.itens.map((item) => ({
      ...item,
      pessoa: conta.familia.find((p) => p.id === item.pessoa),
    })),
  }));
}

// status: 'pendente' | 'agendado' | 'feito'
// TODO: troca pra chamada real quando o endpoint PUT /api/prevencao/{id} existir
export async function marcarItemPrevencao(usuario, idItem, status) {
  if (!SITUACOES.includes(status)) throw new Error('Situação inválida.');
  await esperar(150);
  for (const mes of contaDe(usuario).prevencao) {
    const item = mes.itens.find((i) => i.id === idItem);
    if (item) {
      item.status = status;
      return;
    }
  }
  throw new Error('Item de prevenção não encontrado.');
}
