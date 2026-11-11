// Carga inicial do app (a mesma da web, frontend/assets/js/dados.js).
// As datas são contadas a partir de hoje (diaDaqui), então a agenda sempre começa em volta do dia atual.
// Quando a API tiver os endpoints, estes dados passam a vir do banco.
//
// Diferenças em relação à web:
// - as cores dos familiares são hex (na web são variáveis CSS);
// - cada item de prevenção, retorno e exame tem um "id";
// - não há avatar desenhado: o app usa as iniciais na cor de cada pessoa.

import { cores } from '../estilos/cores';
import { diaDaqui, diaEMes, mesDaqui } from '../utilitarios/datas';

export const clinica = {
  nome: 'Clínica Ipê',
  unidade: 'Unidade Centro',
  endereco: 'Rua das Palmeiras, 410 — Centro',
  telefone: '(11) 2345-0000',
  telefoneLink: 'tel:+551123450000',
};

// Clínicas que aceitam pacientes pelo código (as mesmas da web; tabela Clinica)
export const clinicas = [
  { id: 'ipe', nome: 'Clínica Ipê', codigo: 'IPE-4821' },
  { id: 'jacaranda', nome: 'Clínica Jacarandá', codigo: 'JAC-2093' },
  { id: 'aroeira', nome: 'Centro Médico Aroeira', codigo: 'ARO-7716' },
];

export const pessoas = [
  {
    id: 'juliana', nome: 'Juliana Santos', curto: 'Juliana', relacao: 'Titular', idade: 36, genero: 'f',
    cor: cores.familia.juliana, alergias: 'Nenhuma informada', titular: true,
  },
  {
    id: 'davi', nome: 'Davi Santos Tanaka', curto: 'Davi', relacao: 'Filho', idade: 8, genero: 'm',
    cor: cores.familia.davi, alergias: 'Nenhuma informada', titular: false,
  },
  {
    id: 'marina', nome: 'Marina Santos Tanaka', curto: 'Marina', relacao: 'Filha', idade: 14, genero: 'f',
    cor: cores.familia.marina, alergias: 'Rinite alérgica', titular: false,
  },
  {
    id: 'cida', nome: 'Maria Aparecida Santos', curto: 'Dona Cida', relacao: 'Mãe', idade: 71, genero: 'f',
    cor: cores.familia.cida, alergias: 'Alergia a dipirona', titular: false,
  },
  {
    id: 'kenji', nome: 'Kenji Tanaka', curto: 'Seu Kenji', relacao: 'Sogro', idade: 74, genero: 'm',
    cor: cores.familia.kenji, alergias: 'Nenhuma informada', titular: false,
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
    { data: diaDaqui(1), horas: ['08:00', '11:30'] },
    { data: diaDaqui(2), horas: ['09:00', '14:00', '16:30'] },
  ],
  fernanda: [
    { data: diaDaqui(1), horas: ['08:30', '10:00'] },
    { data: diaDaqui(2), horas: ['15:30'] },
    { data: diaDaqui(6), horas: ['09:00', '09:30', '13:00'] },
  ],
  joao: [{ data: diaDaqui(7), horas: ['10:30', '11:00'] }],
  rafael: [
    { data: diaDaqui(3), horas: ['07:30'] },
    { data: diaDaqui(9), horas: ['08:00'] },
  ],
  camila: [],
  icaro: [{ data: diaDaqui(23), horas: ['14:00'] }],
  paulo: [
    { data: diaDaqui(16), horas: ['10:30', '11:00'] },
    { data: diaDaqui(21), horas: ['08:00'] },
  ],
  andre: [{ data: diaDaqui(2), horas: ['10:00', '10:30'] }],
  luana: [{ data: diaDaqui(8), horas: ['13:30', '15:00'] }],
  beatriz: [{ data: diaDaqui(10), horas: ['09:00'] }],
  rosa: [{ data: diaDaqui(14), horas: ['16:00'] }],
};

// tipo: 'consulta' (padrão), 'exame' ou 'prevencao'
export const consultas = [
  { id: 'c1', pessoa: 'davi', medico: 'fernanda', data: diaDaqui(3), hora: '14:30', sala: 'Sala 4', status: 'confirmada', motivo: 'Consulta de rotina', tipo: 'consulta' },
  { id: 'c5', pessoa: 'marina', medico: 'rafael', data: diaDaqui(3), hora: '17:00', sala: 'Sala 1', status: 'confirmada', motivo: 'Acompanhamento da rinite', tipo: 'consulta' },
  { id: 'c2', pessoa: 'kenji', medico: 'helena', data: diaDaqui(8), hora: '07:40', sala: 'Sala 2', status: 'confirmada', motivo: 'Eletrocardiograma pedido no check-up', tipo: 'exame', titulo: 'Eletrocardiograma' },
  { id: 'c3', pessoa: 'marina', medico: 'luana', data: diaDaqui(15), hora: '09:15', sala: 'Sala 7', status: 'confirmada', motivo: 'Dificuldade para enxergar o quadro', tipo: 'consulta' },
  { id: 'c4', pessoa: 'kenji', medico: 'helena', data: diaDaqui(24), hora: '11:00', sala: 'Sala 2', status: 'confirmada', motivo: 'Check-up anual', tipo: 'prevencao', titulo: 'Check-up anual' },
  { id: 'c6', pessoa: 'cida', medico: 'luana', data: diaDaqui(35), hora: '14:00', sala: 'Sala 7', status: 'confirmada', motivo: 'Revisão do grau dos óculos', tipo: 'consulta' },
  { id: 'c7', pessoa: 'juliana', medico: 'helena', data: diaDaqui(49), hora: '08:30', sala: 'Sala 2', status: 'confirmada', motivo: 'Mostrar o resultado dos exames de sangue', tipo: 'consulta' },
  { id: 'p1', pessoa: 'cida', medico: 'paulo', data: diaDaqui(-18), hora: '10:30', sala: 'Sala 5', status: 'atendida', motivo: 'Pressão alta', tipo: 'consulta' },
  { id: 'p2', pessoa: 'juliana', medico: 'helena', data: diaDaqui(-35), hora: '08:00', sala: 'Sala 2', status: 'atendida', motivo: 'Cansaço frequente', tipo: 'consulta' },
];

// A Juliana é a 3ª de 7 na fila da Dra. Camila Rocha (dermatologia)
export const fila = {
  id: 'f1', pessoa: 'juliana', medico: 'camila', posicao: 3, naFila: 7, desde: diaDaqui(-14, false),
  vagaOferecida: null, // a recepção oferece quando cancela uma consulta da Dra. Camila e for a vez da Juliana
};

// Quantas pessoas já esperam na fila de cada médico (contagem das filas da web).
// Quem entra numa fila nova fica na posição seguinte.
export const pessoasNaFila = { camila: 7, paulo: 4, fernanda: 2, luana: 3, andre: 1 };

// Avisos da conta da Juliana (tabela Notificacoes: tipo, mensagem, data de envio, lida)
export const notificacoes = [
  { id: 'n1', tipo: 'LEMBRETE', mensagem: 'A consulta do Davi com a Dra. Fernanda Lima é em ' + diaEMes(diaDaqui(3)) + ', às 14:30.', dataEnvio: diaDaqui(0, false), lida: false },
  { id: 'n2', tipo: 'FILA', mensagem: 'Você subiu para 3ª na fila de Dermatologia.', dataEnvio: diaDaqui(-1, false), lida: false },
  { id: 'n3', tipo: 'RETORNO', mensagem: 'Dona Cida precisa marcar o retorno com o cardiologista até ' + diaEMes(diaDaqui(27)) + '.', dataEnvio: diaDaqui(-3, false), lida: true },
];

export const acompanhamento = {
  retornos: [
    { id: 'r1', pessoa: 'cida', titulo: 'Retorno com cardiologista', medico: 'paulo', prazo: diaDaqui(27), origem: 'Pedido na consulta de ' + diaEMes(diaDaqui(-18)) },
  ],
  exames: [
    { id: 'e1', pessoa: 'juliana', titulo: 'Hemograma e glicemia em jejum', pedidoPor: 'helena', status: 'pendente', obs: 'Jejum de 8 horas', origem: 'Pedido em ' + diaEMes(diaDaqui(-35)) },
    { id: 'e2', pessoa: 'kenji', titulo: 'Eletrocardiograma', pedidoPor: 'helena', status: 'agendado', obs: 'Levar exames anteriores', origem: 'Marcado para ' + diaEMes(diaDaqui(8)) },
  ],
};

// Calendário de prevenção: campanhas do Ministério da Saúde por mês do ano (1 = janeiro)
const CAMPANHAS = {
  1: ['Janeiro Branco', 'Saúde mental'], 2: [null, 'Volta às aulas'], 3: ['Março Lilás', 'Prevenção do câncer do colo do útero'],
  4: ['Vacinação contra a gripe', 'Campanha anual'], 5: ['Maio Amarelo', 'Segurança no trânsito'], 6: [null, 'Inverno: cuidado com o pulmão'],
  7: [null, 'Férias de julho'], 8: ['Agosto Dourado', 'Aleitamento materno'], 9: ['Setembro Amarelo', 'Prevenção do suicídio'],
  10: ['Outubro Rosa', 'Prevenção do câncer de mama'], 11: ['Novembro Azul', 'Saúde do homem'], 12: [null, 'Antes das férias'],
};
// O que cada pessoa da família tem para fazer em cada mês do ano
const PREVENCAO_POR_MES = {
  1: [{ pessoa: 'juliana', titulo: 'Check-up anual com clínica geral', nota: 'Inclui conversa sobre sono e estresse', esp: 'clinica' }],
  2: [{ pessoa: 'davi', titulo: 'Consulta anual com pediatra', nota: 'Conferir a caderneta de vacinação', esp: 'pediatria' },
      { pessoa: 'marina', titulo: 'Consulta anual com pediatra', nota: 'Conferir a caderneta de vacinação', esp: 'pediatria' }],
  3: [{ pessoa: 'juliana', titulo: 'Exame preventivo (Papanicolau)', nota: 'Frequência conforme orientação médica', esp: 'ginecologia' }],
  4: [{ pessoa: 'cida', titulo: 'Vacina da gripe', nota: 'Grupo prioritário: 60 anos ou mais', esp: null },
      { pessoa: 'kenji', titulo: 'Vacina da gripe', nota: 'Grupo prioritário: 60 anos ou mais', esp: null }],
  10: [{ pessoa: 'cida', titulo: 'Mamografia', nota: 'A cada 2 anos, dos 50 aos 74 anos', esp: 'ginecologia' }],
  11: [{ pessoa: 'kenji', titulo: 'Check-up anual com clínica geral', nota: 'Uma vez por ano depois dos 50', esp: 'clinica' }],
  12: [{ pessoa: 'davi', titulo: 'Revisão no dentista', nota: 'A cada 6 meses', esp: null },
       { pessoa: 'marina', titulo: 'Revisão no dentista', nota: 'A cada 6 meses', esp: null }],
};
export const prevencao = [-1, 0, 1, 2, 3, 4, 5].map((n) => {
  const mes = mesDaqui(n);
  const numero = Number(mes.slice(5));
  return {
    mes, campanha: CAMPANHAS[numero][0], tema: CAMPANHAS[numero][1],
    itens: (PREVENCAO_POR_MES[numero] || []).map((it, i) => ({ id: 'v' + mes + '-' + i, status: 'pendente', ...it })),
  };
});
