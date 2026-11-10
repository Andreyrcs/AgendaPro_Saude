// "Banco de dados" de mentira, em memória, usado enquanto a API não tem os endpoints.
// Ele vale até o app ser fechado: reabriu, voltou ao estado inicial.
//
// Os dados ficam separados por conta (idUsuario), como ficariam no MySQL:
// - a conta da Juliana (demonstração) começa com a família e as consultas fictícias;
// - qualquer outra conta começa só com o próprio titular, sem consultas nem fila.

import * as ficticios from './dadosFicticios';
import { primeiroNome } from '../utilitarios/texto';

export const EMAIL_DEMONSTRACAO = 'juliana.santos@email.com';

// Simula a demora da rede, para os indicadores de "carregando" aparecerem.
export function esperar(ms = 300) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// Cópia profunda: quem mexer na cópia não estraga os dados originais.
function copiar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

let ultimoId = 100;
export function novoId(prefixo) {
  ultimoId += 1;
  return `${prefixo}${ultimoId}`;
}

// Contas que existem no modo simulado.
// A senha fica em texto aqui só porque é memória de demonstração.
// No backend real ela é guardada com hash BCrypt.
export const usuariosSimulados = [
  { idUsuario: 1, nome: 'Juliana Santos', email: EMAIL_DEMONSTRACAO, senha: 'paciente123' },
];

// Horários livres da clínica. São de todos os pacientes, não de uma conta só.
export const horariosLivres = copiar(ficticios.horarios);

const contas = {}; // idUsuario → dados daquela conta

// Devolve os dados da conta, criando na primeira vez.
export function contaDe(usuario) {
  if (!contas[usuario.idUsuario]) {
    contas[usuario.idUsuario] =
      usuario.email === EMAIL_DEMONSTRACAO ? contaDeDemonstracao() : contaNova(usuario);
  }
  return contas[usuario.idUsuario];
}

function contaDeDemonstracao() {
  return {
    familia: copiar(ficticios.pessoas),
    consultas: copiar(ficticios.consultas),
    fila: copiar(ficticios.fila),
    acompanhamento: copiar(ficticios.acompanhamento),
    prevencao: copiar(ficticios.prevencao),
  };
}

function contaNova(usuario) {
  return {
    familia: [
      {
        id: 'titular', nome: usuario.nome || 'Você', curto: primeiroNome(usuario.nome) || 'Você',
        relacao: 'Você', idade: null, genero: null, cor: ficticios.pessoas[0].cor,
        alergias: 'Nenhuma informada', sus: 'Não informado', titular: true,
      },
    ],
    consultas: [],
    fila: null,
    acompanhamento: { retornos: [], exames: [] },
    prevencao: [],
  };
}

// Regra de negócio: o paciente só mexe na própria família.
export function garantirDaFamilia(conta, idPessoa) {
  const pessoa = conta.familia.find((p) => p.id === idPessoa);
  if (!pessoa) throw new Error('Você só pode gerenciar a sua família.');
  return pessoa;
}

// Busca simples nas tabelas fixas da clínica
export function medicoPorId(id) {
  return ficticios.medicos.find((m) => m.id === id);
}

export function especialidadePorId(id) {
  return ficticios.especialidades.find((e) => e.id === id);
}

// Tira um horário da lista de livres (quando alguém marca)
export function ocuparHorario(idMedico, data, hora) {
  const dia = (horariosLivres[idMedico] || []).find((d) => d.data === data);
  if (!dia || !dia.horas.includes(hora)) return false;
  dia.horas = dia.horas.filter((h) => h !== hora);
  return true;
}

// Devolve um horário à lista de livres (quando alguém cancela)
export function liberarHorario(idMedico, data, hora) {
  if (!horariosLivres[idMedico]) horariosLivres[idMedico] = [];
  let dia = horariosLivres[idMedico].find((d) => d.data === data);
  if (!dia) {
    dia = { data, horas: [] };
    horariosLivres[idMedico].push(dia);
    horariosLivres[idMedico].sort((a, b) => a.data.localeCompare(b.data));
  }
  if (!dia.horas.includes(hora)) {
    dia.horas.push(hora);
    dia.horas.sort();
  }
}
