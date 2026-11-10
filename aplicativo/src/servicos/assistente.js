// Assistente de saúde: sugere a ESPECIALIDADE a procurar a partir do que a pessoa conta.
// Regras copiadas de frontend/assets/js/triagem.js (as mesmas do site).
//
// REGRAS DE NEGÓCIO
// 1. O assistente NÃO faz diagnóstico. Ele só aponta para onde ir.
// 2. Emergência (dor no peito, falta de ar, desmaio...) → só manda ligar 192 (SAMU).
//    Nada é agendado.
// 3. Crise emocional (falar em suicídio) → CVV 188 e SAMU 192.
//
// Esta função roda no próprio celular e de propósito NÃO tem endpoint:
// mesmo quando houver uma IA no backend, a checagem de emergência fica aqui,
// para funcionar sem internet e nunca depender do servidor responder.

import { semAcento } from '../utilitarios/texto';
import { especialidadePorId } from '../dados/bancoSimulado';
import { calcularPrimeiroHorario } from './medicos';

const CRISE = /(suicid|me matar|tirar (a )?minha vida|nao quero mais viver|acabar com tudo)/;

const EMERGENCIA =
  /(dor no peito|aperto no peito|peito doendo|dor forte no peito|falta de ar|nao consigo respirar|dificuldade para respirar|desmai|convuls|boca torta|fraqueza de um lado|nao consegue falar|sangramento forte|sangrando muito|infarto|\bavc\b|inconsciente|engasg)/;

// Palavras que indicam o parentesco → valor de "relacao" do familiar
const PARENTESCOS = [
  { palavras: /(filho|menino|bebe)/, relacao: 'filho' },
  { palavras: /(filha|menina)/, relacao: 'filha' },
  { palavras: /\bmae\b/, relacao: 'mae' },
  { palavras: /\bpai\b/, relacao: 'pai' },
  { palavras: /sogro/, relacao: 'sogro' },
  { palavras: /sogra/, relacao: 'sogra' },
];

// Descobre de quem a pessoa está falando: pelo nome, depois pelo parentesco.
// Se não achar ninguém, é o próprio titular.
function descobrirQuem(t, familiares) {
  const titular = familiares.find((p) => p.titular) || familiares[0];
  const outros = familiares.filter((p) => !p.titular);

  const pelonome = outros.find((p) => {
    const nome = semAcento(p.curto).replace(/^(dona|seu) /, '');
    return new RegExp(`\\b${nome}\\b`).test(t);
  });
  if (pelonome) return pelonome;

  for (const { palavras, relacao } of PARENTESCOS) {
    if (palavras.test(t)) {
      const achado = outros.find((p) => semAcento(p.relacao).startsWith(relacao));
      if (achado) return achado;
    }
  }
  return titular;
}

// Sintoma → especialidades (a primeira é a mais indicada)
function escolherEspecialidades(t, crianca) {
  if (/(ouvido|orelha|garganta|nariz|sinusite)/.test(t)) return crianca ? ['pediatria', 'otorrino'] : ['otorrino', 'clinica'];
  if (/(pele|mancha|coceira|cocam|coca|espinha|acne|cabelo caindo|unha|pinta)/.test(t)) return crianca ? ['pediatria', 'dermatologia'] : ['dermatologia'];
  if (/(costas|coluna|joelho|ombro|torci|tornozelo|fratur|osso)/.test(t)) return crianca ? ['pediatria', 'ortopedia'] : ['ortopedia', 'clinica'];
  if (/(pressao|coracao|palpita|batedeira)/.test(t)) return ['cardiologia', 'clinica'];
  if (/(olho|vista|enxerg|visao|oculos|quadro)/.test(t)) return ['oftalmologia'];
  if (/(menstrua|gravid|preventivo|colica)/.test(t)) return ['ginecologia', 'clinica'];
  if (/(ansied|ansios|triste|depress|nao durmo|sem dormir|insonia|estresse|panico)/.test(t)) return ['psiquiatria', 'clinica'];
  return crianca ? ['pediatria'] : ['clinica'];
}

// Devolve uma destas respostas:
//   { tipo: 'emergencia' }
//   { tipo: 'cvv' }
//   { tipo: 'sugestao', quem: {familiar}, especialidades: [{ id, nome, desc, primeiroHorario }] }
export function analisarSintomas(texto, familiares) {
  const t = semAcento(texto);

  if (CRISE.test(t)) return { tipo: 'cvv' };
  if (EMERGENCIA.test(t)) return { tipo: 'emergencia' };

  const quem = descobrirQuem(t, familiares);
  const crianca = quem.idade !== null && quem.idade < 18;
  const especialidades = escolherEspecialidades(t, crianca).map((id) => ({
    ...especialidadePorId(id),
    primeiroHorario: calcularPrimeiroHorario(id),
  }));
  return { tipo: 'sugestao', quem, especialidades };
}
