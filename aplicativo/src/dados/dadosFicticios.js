// Dados FICTÍCIOS do app, copiados de frontend/assets/js/dados.js (o protótipo web).
// Pessoas, médicos, clínica e horários foram inventados para a demonstração.
// "Hoje" é terça-feira, 20 de outubro de 2026 (ver utilitarios/datas.js).
//
// Diferenças em relação ao protótipo:
// - as cores dos familiares são hex (no protótipo eram variáveis CSS);
// - cada item de prevenção, retorno e exame tem um "id";
// - não há avatar desenhado: o app usa as iniciais na cor de cada pessoa.

import { cores } from '../estilos/cores';

export const clinica = {
  nome: 'Clínica Ipê',
  unidade: 'Unidade Centro',
  endereco: 'Rua das Palmeiras, 410 — Centro',
  telefone: '(11) 2345-0000',
  telefoneLink: 'tel:+551123450000',
};

// Demonstração de erro: este horário "acabou de ser ocupado" ao confirmar
export const horarioDisputado = { medico: 'fernanda', data: '2026-10-26', hora: '13:00' };

export const pessoas = [
  {
    id: 'juliana', nome: 'Juliana Santos', curto: 'Juliana', relacao: 'Você', idade: 36, genero: 'f',
    cor: cores.familia.juliana, alergias: 'Nenhuma informada', sus: '•••• 7310', titular: true,
  },
  {
    id: 'davi', nome: 'Davi Santos Tanaka', curto: 'Davi', relacao: 'Filho', idade: 8, genero: 'm',
    cor: cores.familia.davi, alergias: 'Nenhuma informada', sus: '•••• 2284', titular: false,
  },
  {
    id: 'marina', nome: 'Marina Santos Tanaka', curto: 'Marina', relacao: 'Filha', idade: 14, genero: 'f',
    cor: cores.familia.marina, alergias: 'Rinite alérgica', sus: '•••• 5521', titular: false,
  },
  {
    id: 'cida', nome: 'Maria Aparecida Santos', curto: 'Dona Cida', relacao: 'Mãe', idade: 71, genero: 'f',
    cor: cores.familia.cida, alergias: 'Alergia a dipirona', sus: '•••• 0937', titular: false,
  },
  {
    id: 'kenji', nome: 'Kenji Tanaka', curto: 'Seu Kenji', relacao: 'Sogro', idade: 74, genero: 'm',
    cor: cores.familia.kenji, alergias: 'Nenhuma informada', sus: '•••• 4468', titular: false,
  },
];

export const especialidades = [
  { id: 'clinica', nome: 'Clínica geral', desc: 'Primeira consulta para quase tudo, check-ups e pedidos de exame' },
  { id: 'pediatria', nome: 'Pediatria', desc: 'Saúde de crianças e adolescentes até 18 anos' },
  { id: 'otorrino', nome: 'Otorrinolaringologia', desc: 'Ouvido, nariz e garganta' },
  { id: 'dermatologia', nome: 'Dermatologia', desc: 'Pele, cabelo e unhas' },
  { id: 'cardiologia', nome: 'Cardiologia', desc: 'Coração e pressão arterial' },
  { id: 'ortopedia', nome: 'Ortopedia', desc: 'Ossos, músculos e articulações' },
  { id: 'oftalmologia', nome: 'Oftalmologia', desc: 'Olhos e visão' },
  { id: 'ginecologia', nome: 'Ginecologia', desc: 'Saúde da mulher' },
  { id: 'psiquiatria', nome: 'Psiquiatria', desc: 'Saúde mental, ansiedade, sono e humor' },
];

export const medicos = [
  { id: 'helena', nome: 'Dra. Helena Duarte', esp: 'clinica', cor: '#d9ecf8', sala: 'Sala 2' },
  { id: 'fernanda', nome: 'Dra. Fernanda Lima', esp: 'pediatria', cor: '#fde3d3', sala: 'Sala 4' },
  { id: 'joao', nome: 'Dr. João Batista Moura', esp: 'pediatria', cor: '#e3f2dc', sala: 'Sala 3' },
  { id: 'rafael', nome: 'Dr. Rafael Nogueira', esp: 'otorrino', cor: '#efe2f5', sala: 'Sala 1' },
  { id: 'camila', nome: 'Dra. Camila Rocha', esp: 'dermatologia', cor: '#f9e9b9', sala: 'Sala 6' },
  { id: 'icaro', nome: 'Dr. Ícaro Bezerra', esp: 'dermatologia', cor: '#d6efe6', sala: 'Sala 8' },
  { id: 'paulo', nome: 'Dr. Paulo Menezes', esp: 'cardiologia', cor: '#f7d9dc', sala: 'Sala 5' },
  { id: 'andre', nome: 'Dr. André Nascimento', esp: 'ortopedia', cor: '#dfe6f6', sala: 'Sala 9' },
  { id: 'luana', nome: 'Dra. Luana Potiguara', esp: 'oftalmologia', cor: '#e6f1d4', sala: 'Sala 7' },
  { id: 'beatriz', nome: 'Dra. Beatriz Yamamoto', esp: 'ginecologia', cor: '#fbe0ea', sala: 'Sala 10' },
  { id: 'rosa', nome: 'Dra. Rosa Amaral', esp: 'psiquiatria', cor: '#e2ecf0', sala: 'Sala 11' },
];

// Horários livres por médico nas próximas semanas
export const horarios = {
  helena: [
    { data: '2026-10-21', horas: ['08:00', '11:30'] },
    { data: '2026-10-22', horas: ['09:00', '14:00', '16:30'] },
  ],
  fernanda: [
    { data: '2026-10-21', horas: ['08:30', '10:00'] },
    { data: '2026-10-22', horas: ['15:30'] },
    { data: '2026-10-26', horas: ['09:00', '09:30', '13:00'] },
  ],
  joao: [{ data: '2026-10-27', horas: ['10:30', '11:00'] }],
  rafael: [
    { data: '2026-10-23', horas: ['07:30', '17:00'] },
    { data: '2026-10-29', horas: ['08:00'] },
  ],
  camila: [],
  icaro: [{ data: '2026-11-12', horas: ['14:00'] }],
  paulo: [
    { data: '2026-11-05', horas: ['10:30', '11:00'] },
    { data: '2026-11-10', horas: ['08:00'] },
  ],
  andre: [{ data: '2026-10-22', horas: ['10:00', '10:30'] }],
  luana: [{ data: '2026-10-28', horas: ['13:30', '15:00'] }],
  beatriz: [{ data: '2026-10-30', horas: ['09:00'] }],
  rosa: [{ data: '2026-11-03', horas: ['16:00'] }],
};

// tipo: 'consulta' (padrão), 'exame' ou 'prevencao'
export const consultas = [
  { id: 'c1', pessoa: 'davi', medico: 'fernanda', data: '2026-10-23', hora: '14:30', sala: 'Sala 4', status: 'confirmada', motivo: 'Consulta de rotina', tipo: 'consulta' },
  { id: 'c5', pessoa: 'marina', medico: 'rafael', data: '2026-10-23', hora: '17:00', sala: 'Sala 1', status: 'confirmada', motivo: 'Acompanhamento da rinite', tipo: 'consulta' },
  { id: 'c2', pessoa: 'kenji', medico: 'helena', data: '2026-10-28', hora: '07:40', sala: 'Sala 2', status: 'confirmada', motivo: 'Eletrocardiograma pedido no check-up', tipo: 'exame', titulo: 'Eletrocardiograma' },
  { id: 'c3', pessoa: 'marina', medico: 'luana', data: '2026-11-04', hora: '09:15', sala: 'Sala 7', status: 'confirmada', motivo: 'Dificuldade para enxergar o quadro', tipo: 'consulta' },
  { id: 'c4', pessoa: 'kenji', medico: 'helena', data: '2026-11-13', hora: '11:00', sala: 'Sala 2', status: 'confirmada', motivo: 'Check-up anual (Novembro Azul)', tipo: 'prevencao', titulo: 'Check-up anual' },
  { id: 'c6', pessoa: 'cida', medico: 'luana', data: '2026-11-24', hora: '14:00', sala: 'Sala 7', status: 'confirmada', motivo: 'Revisão do grau dos óculos', tipo: 'consulta' },
  { id: 'c7', pessoa: 'juliana', medico: 'helena', data: '2026-12-08', hora: '08:30', sala: 'Sala 2', status: 'confirmada', motivo: 'Mostrar o resultado dos exames de sangue', tipo: 'consulta' },
  { id: 'p1', pessoa: 'cida', medico: 'paulo', data: '2026-10-02', hora: '10:30', sala: 'Sala 5', status: 'realizada', motivo: 'Pressão alta', tipo: 'consulta' },
  { id: 'p2', pessoa: 'juliana', medico: 'helena', data: '2026-09-15', hora: '08:00', sala: 'Sala 2', status: 'realizada', motivo: 'Cansaço frequente', tipo: 'consulta' },
];

// A Juliana é a 3ª de 7 na fila da Dra. Camila Rocha (dermatologia)
export const fila = {
  id: 'f1', pessoa: 'juliana', medico: 'camila', posicao: 3, naFila: 7, desde: '2026-10-06',
  vaga: { data: '2026-10-23', hora: '09:00' }, // vaga que abre quando chegar a vez
};

// Quantas pessoas já esperam na fila de cada médico (contagem das filas do protótipo).
// Quem entra numa fila nova fica na posição seguinte.
export const pessoasNaFila = { camila: 7, paulo: 4, fernanda: 2, luana: 3, andre: 1 };

export const acompanhamento = {
  retornos: [
    { id: 'r1', pessoa: 'cida', titulo: 'Retorno com cardiologista', medico: 'paulo', prazo: '2026-11-16', origem: 'Pedido na consulta de 2 de outubro' },
  ],
  exames: [
    { id: 'e1', pessoa: 'juliana', titulo: 'Hemograma e glicemia em jejum', pedidoPor: 'helena', status: 'pendente', obs: 'Jejum de 8 horas', origem: 'Pedido em 15 de setembro' },
    { id: 'e2', pessoa: 'kenji', titulo: 'Eletrocardiograma', pedidoPor: 'helena', status: 'agendado', obs: 'Levar exames anteriores', origem: 'Marcado para 28 de outubro' },
  ],
};

// Calendário de prevenção: sugestões por idade, com as campanhas do Ministério da Saúde
export const prevencao = [
  { mes: '2026-10', campanha: 'Outubro Rosa', tema: 'Prevenção do câncer de mama', itens: [
    { id: 'v1', pessoa: 'cida', titulo: 'Mamografia', status: 'pendente', nota: 'A cada 2 anos, dos 50 aos 74 anos', esp: 'ginecologia' },
  ] },
  { mes: '2026-11', campanha: 'Novembro Azul', tema: 'Saúde do homem', itens: [
    { id: 'v2', pessoa: 'kenji', titulo: 'Check-up anual com clínica geral', status: 'agendado', nota: 'Marcado para 13 de novembro', esp: 'clinica' },
  ] },
  { mes: '2026-12', campanha: null, tema: 'Antes das férias', itens: [
    { id: 'v3', pessoa: 'davi', titulo: 'Revisão no dentista', status: 'pendente', nota: 'A cada 6 meses', esp: null },
    { id: 'v4', pessoa: 'marina', titulo: 'Revisão no dentista', status: 'pendente', nota: 'A cada 6 meses', esp: null },
  ] },
  { mes: '2027-01', campanha: 'Janeiro Branco', tema: 'Saúde mental', itens: [
    { id: 'v5', pessoa: 'juliana', titulo: 'Check-up anual com clínica geral', status: 'pendente', nota: 'Inclui conversa sobre sono e estresse', esp: 'clinica' },
  ] },
  { mes: '2027-02', campanha: null, tema: 'Volta às aulas', itens: [
    { id: 'v6', pessoa: 'davi', titulo: 'Consulta anual com pediatra', status: 'pendente', nota: 'Conferir a caderneta de vacinação', esp: 'pediatria' },
    { id: 'v7', pessoa: 'marina', titulo: 'Consulta anual com pediatra', status: 'pendente', nota: 'Conferir a caderneta de vacinação', esp: 'pediatria' },
  ] },
  { mes: '2027-03', campanha: 'Março Lilás', tema: 'Prevenção do câncer do colo do útero', itens: [
    { id: 'v8', pessoa: 'juliana', titulo: 'Exame preventivo (Papanicolau)', status: 'pendente', nota: 'Frequência conforme orientação médica', esp: 'ginecologia' },
  ] },
  { mes: '2027-04', campanha: 'Vacinação contra a gripe', tema: 'Campanha anual', itens: [
    { id: 'v9', pessoa: 'cida', titulo: 'Vacina da gripe', status: 'pendente', nota: 'Grupo prioritário: 60 anos ou mais', esp: null },
    { id: 'v10', pessoa: 'kenji', titulo: 'Vacina da gripe', status: 'pendente', nota: 'Grupo prioritário: 60 anos ou mais', esp: null },
  ] },
];
