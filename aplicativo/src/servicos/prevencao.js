// Calendário de prevenção: check-ups e exames de rotina ao longo do ano,
// seguindo as campanhas do Ministério da Saúde (Outubro Rosa, Novembro Azul...).

import { contaDe, esperar, novoId } from '../dados/bancoSimulado';

const SITUACOES = ['pendente', 'agendado', 'feito'];

// O que faz sentido pedir em cada campanha. Todo mês também aceita os itens gerais.
const SUGESTOES = {
  'Outubro Rosa': [
    { titulo: 'Mamografia', nota: 'A cada 2 anos, dos 50 aos 74 anos', esp: 'ginecologia' },
    { titulo: 'Consulta com ginecologista', nota: 'Inclui o exame clínico das mamas', esp: 'ginecologia' },
  ],
  'Novembro Azul': [
    { titulo: 'Exame de próstata (PSA)', nota: 'Conforme orientação médica, a partir dos 50 anos', esp: 'clinica' },
  ],
  'Janeiro Branco': [
    { titulo: 'Consulta de saúde mental', nota: 'Conversa sobre sono, humor e estresse', esp: 'psiquiatria' },
  ],
  'Março Lilás': [
    { titulo: 'Exame preventivo (Papanicolau)', nota: 'Frequência conforme orientação médica', esp: 'ginecologia' },
  ],
  'Vacinação contra a gripe': [{ titulo: 'Vacina da gripe', nota: 'Grupo prioritário: 60 anos ou mais', esp: null }],
};

const GERAIS = [
  { titulo: 'Check-up anual com clínica geral', nota: 'Uma vez por ano', esp: 'clinica' },
  { titulo: 'Revisão no dentista', nota: 'A cada 6 meses', esp: null },
];

// Lista de { titulo, nota, esp } que o paciente pode escolher para um mês
export function sugestoesDoMes(mes) {
  const especificas = SUGESTOES[mes.campanha] || [];
  return [...especificas, ...GERAIS.filter((g) => !especificas.some((s) => s.titulo === g.titulo))];
}

// Inclui uma pessoa da família numa campanha. dados = { mes: 'AAAA-MM', pessoa: id, titulo, nota, esp }
// TODO: troca pra chamada real quando o endpoint POST /api/pacientes/{id}/prevencao existir
export async function incluirNaPrevencao(usuario, dados) {
  const conta = contaDe(usuario);
  const mes = conta.prevencao.find((m) => m.mes === dados.mes);
  if (!mes) throw new Error('Escolha uma campanha.');
  if (!conta.familia.some((p) => p.id === dados.pessoa)) throw new Error('Escolha quem vai entrar na prevenção.');
  if (!dados.titulo) throw new Error('Escolha o exame ou check-up.');
  if (mes.itens.some((i) => i.pessoa === dados.pessoa && i.titulo === dados.titulo)) {
    throw new Error('Essa pessoa já está nesse item da prevenção.');
  }

  await esperar();
  const item = {
    id: novoId('prev'),
    pessoa: dados.pessoa,
    titulo: dados.titulo,
    status: 'pendente',
    nota: dados.nota || '',
    esp: dados.esp ?? null,
  };
  mes.itens.push(item);
  return item;
}

// Formato: [{ mes: 'AAAA-MM', campanha, tema, itens: [{ id, pessoa, titulo, status, nota, esp, consulta? }] }]
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
