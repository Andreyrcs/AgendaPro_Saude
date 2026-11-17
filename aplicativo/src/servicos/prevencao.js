// Calendário de prevenção: check-ups e exames de rotina ao longo do ano,
// seguindo as campanhas do Ministério da Saúde (Outubro Rosa, Novembro Azul...).

import { contaDe, esperar, novoId } from '../dados/bancoSimulado';
import { examesGerais } from '../dados/dadosFicticios';

const SITUACOES = ['pendente', 'agendado', 'feito'];

// O que faz sentido pedir em cada campanha. Todo mês também aceita os itens gerais.
// Sugestões = Exames_Prevencao: os da campanha do mês (mes.exames) + os gerais (IdCampanha nulo).
// Exame: { id, idCampanha, titulo, nota, especialidade } — especialidade é o NOME (ex.: 'Ginecologia') ou null.
export function sugestoesDoMes(mes) {
  const especificas = mes.exames || [];
  return [...especificas, ...examesGerais.filter((g) => !especificas.some((s) => s.titulo === g.titulo))];
}

// Inclui uma pessoa da família numa campanha. dados = { mes: 'AAAA-MM', pessoa: id, exame: id do exame }
// O mesmo exame no mesmo mês para a mesma pessoa é recusado (UQ_Prevencao_Paciente_Exame).
// TODO: troca pra chamada real quando o endpoint POST /api/pacientes/{id}/prevencao existir
export async function incluirNaPrevencao(usuario, dados) {
  const conta = contaDe(usuario);
  const mes = conta.prevencao.find((m) => m.mes === dados.mes);
  if (!mes) throw new Error('Escolha uma campanha.');
  if (!conta.familia.some((p) => p.id === dados.pessoa)) throw new Error('Escolha quem vai entrar na prevenção.');
  const exame = sugestoesDoMes(mes).find((e) => e.id === dados.exame);
  if (!exame) throw new Error('Escolha o exame ou check-up.');
  if (mes.itens.some((i) => i.pessoa === dados.pessoa && i.exame === exame.id)) {
    throw new Error('Essa pessoa já está nesse item da prevenção.');
  }

  await esperar();
  const item = {
    id: novoId('prev'),
    pessoa: dados.pessoa,
    exame: exame.id,
    titulo: exame.titulo,
    nota: exame.nota || '',
    especialidade: exame.especialidade || null,
    status: 'pendente',
  };
  mes.itens.push(item);
  return item;
}

// Formato: [{ id, mes: 'AAAA-MM', campanha (Nome ou null), tema, exames,
//            itens: [{ id, pessoa, exame, titulo, nota, especialidade, status, consulta? }] }]
// consulta = id da consulta marcada a partir do item (Pessoa_Prevencao.IdConsulta)
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

// status: 'pendente' | 'agendado' | 'feito'; ao agendar, idConsulta liga a consulta ao item
// TODO: troca pra chamada real quando o endpoint PUT /api/prevencao/{id} existir
export async function marcarItemPrevencao(usuario, idItem, status, idConsulta) {
  if (!SITUACOES.includes(status)) throw new Error('Situação inválida.');
  await esperar(150);
  const conta = contaDe(usuario);
  for (const mes of conta.prevencao) {
    const item = mes.itens.find((i) => i.id === idItem);
    if (item) {
      item.status = status;
      if (status === 'pendente') delete item.consulta;
      const consulta = idConsulta && conta.consultas.find((c) => c.id === idConsulta);
      if (consulta) {
        item.consulta = consulta.id;
        consulta.tipo = 'prevencao'; // na agenda, a consulta aparece como "Prevenção"
        consulta.titulo = item.titulo;
        consulta.prevencao = item.id;
      }
      return;
    }
  }
  throw new Error('Item de prevenção não encontrado.');
}
