// Banco em memória, usado enquanto a API não tem os endpoints (config.USAR_API_REAL = false).
// Ele vale até o app ser fechado: reabriu, voltou à carga inicial.
//
// Os dados ficam separados por conta (idUsuario), como ficariam no MySQL:
// - a conta da Juliana (carga inicial) começa com a família e as consultas dela;
// - qualquer outra conta começa só com o próprio titular, sem consultas nem fila.

import * as ficticios from './dadosFicticios';
import { primeiroNome } from '../utilitarios/texto';
import { idadeEm } from '../utilitarios/datas';

export const EMAIL_CARGA_INICIAL = 'juliana.santos@email.com';

// Pequena pausa, como a de uma chamada de rede, para os indicadores de "carregando" aparecerem.
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

// Contas que existem enquanto o app não fala com a API.
// A senha fica em texto aqui porque é só memória do aparelho e some ao fechar o app.
// Com a API, a senha vai por HTTPS e o servidor guarda só o hash BCrypt.
export const usuariosLocais = [
  { idUsuario: 1, nome: 'Juliana Santos', email: EMAIL_CARGA_INICIAL, senha: 'paciente123', clinicas: ['ipe'] },
];

// Horários livres da clínica. São de todos os pacientes, não de uma conta só.
export const horariosLivres = copiar(ficticios.horarios);

const contas = {}; // idUsuario → dados daquela conta

// Devolve os dados da conta, criando na primeira vez.
export function contaDe(usuario) {
  if (!contas[usuario.idUsuario]) {
    contas[usuario.idUsuario] =
      usuario.email === EMAIL_CARGA_INICIAL ? contaDaCargaInicial() : contaNova(usuario);
  }
  return contas[usuario.idUsuario];
}

function contaDaCargaInicial() {
  return {
    familia: copiar(ficticios.pessoas),
    consultas: copiar(ficticios.consultas),
    fila: copiar(ficticios.fila),
    acompanhamento: copiar(ficticios.acompanhamento),
    notificacoes: copiar(ficticios.notificacoes),
    prevencao: copiar(ficticios.prevencao),
    faltas: [], // { id, consulta, data, confirmou, motivo, retirada }
  };
}

// Conta nova: o titular é salvo como paciente com parentesco "Titular" (tabela Pacientes)
function contaNova(usuario) {
  const dados = usuariosLocais.find((u) => u.idUsuario === usuario.idUsuario) || {};
  return {
    familia: [
      {
        id: 'titular', nome: usuario.nome || 'Você', curto: primeiroNome(usuario.nome) || 'Você',
        relacao: 'Titular', nascimento: dados.nascimento || null,
        idade: dados.nascimento ? idadeEm(dados.nascimento) : null, genero: null, cor: ficticios.pessoas[0].cor,
        alergias: dados.alergias || 'Nenhuma informada', titular: true,
      },
    ],
    consultas: [],
    fila: null,
    acompanhamento: { retornos: [], exames: [] },
    notificacoes: [],
    prevencao: [],
    faltas: [], // { id, consulta, data, confirmou, motivo, retirada }
  };
}

// O que o servidor faz quando uma consulta de um médico é cancelada:
// o horário é oferecido à 1ª pessoa da fila desse médico (que tem 30 minutos para aceitar)
// e quem está atrás sobe uma posição. Devolve true se a vaga ficou com alguém da fila.
const TRINTA_MINUTOS = 30 * 60 * 1000;
export function horarioCanceladoDoMedico(idMedico, data, hora) {
  const naFila = ficticios.pessoasNaFila;
  if (!naFila[idMedico]) return false; // ninguém esperando: o horário só fica livre
  Object.values(contas).forEach((conta) => {
    const f = conta.fila;
    if (!f || f.medico !== idMedico || f.vagaOferecida) return;
    if (f.posicao === 1) {
      f.vagaOferecida = { data, hora, expiraEm: Date.now() + TRINTA_MINUTOS };
      avisar(conta, 'VAGA_OFERECIDA', `Abriu uma vaga em ${data.split('-').reverse().join('/')} às ${hora}. Aceite ou recuse em até 30 minutos.`);
    }
    else { f.posicao -= 1; f.naFila = Math.max(f.posicao, f.naFila - 1); }
  });
  naFila[idMedico] -= 1; // a 1ª pessoa saiu da fila com a vaga
  return true;
}

// Novo aviso para a conta (o servidor grava em Notificacoes nos mesmos momentos)
export function avisar(conta, tipo, mensagem) {
  conta.notificacoes.unshift({ id: novoId('n'), tipo, mensagem, dataEnvio: new Date().toISOString().slice(0, 10), lida: false });
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
