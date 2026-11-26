// Calendário de prevenção: check-ups e exames de rotina ao longo do ano,
// seguindo as campanhas do Ministério da Saúde (Outubro Rosa, Novembro Azul...) (Apêndice L).
// Rotas: GET e POST /api/pacientes/{id}/prevencao e PUT /api/prevencao/{id}.

import { chamarApi } from './api';

// Sugestões do mês = Exames_Prevencao que a API manda em mes.exames (os da campanha e os gerais).
// Exame: { id, idCampanha, titulo, nota, especialidade } — especialidade é o NOME (ex.: 'Ginecologia') ou null.
export function sugestoesDoMes(mes) {
  return mes.exames || [];
}

// Inclui uma pessoa da família numa campanha. dados = { mes: 'AAAA-MM', pessoa: id, exame: id do exame }
// Erros da API sem trocar, como "Essa pessoa já está nesse item da prevenção."
export async function incluirNaPrevencao(usuario, dados) {
  return chamarApi(`/api/pacientes/${usuario.idUsuario}/prevencao`, {
    metodo: 'POST',
    corpo: { mes: dados.mes, pessoa: Number(dados.pessoa), exame: Number(dados.exame) },
  });
}

// Formato: [{ id, mes: 'AAAA-MM', campanha (Nome ou null), tema, exames,
//            itens: [{ id, pessoa: {familiar}, exame, titulo, nota, especialidade, status, consulta }] }]
export async function listarPrevencao(usuario) {
  return chamarApi(`/api/pacientes/${usuario.idUsuario}/prevencao`);
}

// status: 'pendente' | 'agendado' | 'feito'; ao agendar, idConsulta liga a consulta ao item
export async function marcarItemPrevencao(usuario, idItem, status, idConsulta) {
  await chamarApi(`/api/prevencao/${idItem}`, {
    metodo: 'PUT',
    corpo: { status, idConsulta: idConsulta ? Number(idConsulta) : null },
  });
}
