// Assistente de saúde: sugere a ESPECIALIDADE a procurar a partir do que a pessoa conta.
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

import { mesmaEspecialidade, semAcento } from '../utilitarios/texto';
import { listarFamiliares } from './familia';
import { calcularPrimeiroHorario, listarEspecialidades, listarHorariosLivres } from './medicos';

// Estas duas listas são IGUAIS às do site (frontend/assets/js/triagem.js). Mudou aqui, mude lá.
const CRISE = /(suicid|me matar|me enforcar|automutil|tirar (a )?(minha |propria )+vida|acabar com (a )?minha vida|acabar com tudo|desistir d[ae] (vida|viver)|(quero|queria|prefiro|preferia|vontade de|melhor) (morrer|sumir)|nao (quero|aguento) mais (viver|existir)|nao quero viver|sem vontade de viver)/;

const EMERGENCIA =
  /(dor no peito|aperto no peito|peito doendo|dor forte no peito|falta de ar|nao consigo respirar|dificuldade para respirar|desmai|convuls|boca torta|fraqueza de um lado|nao consegue falar|sangramento forte|sangrando muito|infarto|\bavc\b|inconsciente|engasg)/;

// Prepara o texto antes de procurar as palavras: sem acento, sem pontuação e sem emojis, com um espaço só,
// sem letras repetidas ("doooor") e com os erros e jeitos comuns de escrever uma emergência.
function preparar(texto) {
  return semAcento(texto)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\bpeit[ou]s?\b|\bpieto\b/g, 'peito')
    .replace(/\bdor(es)? (muito )?(forte )?(n[oa]|d[oe]) (meu )?peito/g, 'dor no peito')
    .replace(/\bpeito (dele |dela )?(esta |ta |muito )*(doi|doendo|apertado|apertando)/g, 'peito doendo')
    .replace(/\bsem ar\b(?! condicionado)/g, 'falta de ar')
    .replace(/\bfaltar? (de|d|o) ar\b|\bfaltando (o )?ar\b/g, 'falta de ar')
    .replace(/nao (estou|to|esta|ta) conseguindo respirar/g, 'nao consigo respirar')
    .replace(/fraqueza (em|no|num) (um )?lado/g, 'fraqueza de um lado')
    .replace(/(rosto|boca) (esta |ta |ficou )?tort[oa]/g, 'boca torta');
}

// Palavras que indicam o parentesco → o parentesco da API (o mesmo do site)
const PARENTESCOS = [
  { palavras: /\b(filh[oa]|menin[oa]|bebe|crianca)\b/, relacao: 'Filho(a)', crianca: true },
  { palavras: /\b(mae|pai)\b/, relacao: 'Pai/Mãe' },
  { palavras: /\b(espos[oa]|marido|mulher)\b/, relacao: 'Cônjuge' },
  { palavras: /\b(irmao|irma)\b/, relacao: 'Irmão(ã)' },
];

// Descobre de quem a pessoa está falando: pelo nome, depois pelo parentesco. Se não achar ninguém, é o titular.
// naoCadastrado = falou de um parente que ainda não está na família.
function descobrirQuem(t, familiares) {
  const titular = familiares.find((p) => p.titular) || familiares[0];
  const outros = familiares.filter((p) => !p.titular);

  // compara palavra por palavra (o nome é digitado pela pessoa e pode ter qualquer caractere)
  const porNome = outros.find((p) => {
    const nome = preparar(p.curto);
    return nome.length > 1 && ` ${t} `.includes(` ${nome} `);
  });
  if (porNome) return { quem: porNome, crianca: ehCrianca(porNome), naoCadastrado: false };

  const pista = PARENTESCOS.find((p) => p.palavras.test(t));
  if (pista) {
    // "meu filho": o mais novo, que é quem mais costuma ir ao pediatra
    const [achado] = outros.filter((p) => p.relacao === pista.relacao).sort((a, b) => (a.idade ?? 99) - (b.idade ?? 99));
    if (achado) return { quem: achado, crianca: ehCrianca(achado), naoCadastrado: false };
    return { quem: titular, crianca: !!pista.crianca, naoCadastrado: true };
  }
  return { quem: titular, crianca: ehCrianca(titular), naoCadastrado: false };
}

function ehCrianca(pessoa) {
  return pessoa.idade !== null && pessoa.idade !== undefined && pessoa.idade < 18;
}

// Sintoma → NOMES das especialidades (a primeira é a mais indicada). São nomes, e não ids, porque o id
// de cada especialidade muda de clínica para clínica (F2); o nome é procurado nas especialidades da clínica.
const SINTOMAS = [
  { palavras: /\b(ouvido|orelha|garganta|nariz|sinusite)/, nomes: ['Otorrinolaringologia', 'Clínica geral'] },
  { palavras: /\b(pele|mancha|coceira|cocam|coca(r|ndo)?\b|espinha|acne|cabelo caindo|unha|pinta(s)?\b)/, nomes: ['Dermatologia'] },
  { palavras: /\b(costas|coluna|joelho|ombro|torci|tornozelo|fratur|osso)/, nomes: ['Ortopedia', 'Clínica geral'] },
  { palavras: /\b(pressao|coracao|palpita|batedeira)/, nomes: ['Cardiologia', 'Clínica geral'] },
  { palavras: /\b(olho|vista|enxerg|visao|oculos)|\b(ve|ver|le|ler) o quadro/, nomes: ['Oftalmologia'] },
  { palavras: /\b(menstrua|gravid|preventivo|colica)/, nomes: ['Ginecologia', 'Clínica geral'] },
  { palavras: /\b(ansied|ansios|triste|depress|deprim|nao durmo|sem dormir|insonia|estresse|panico)/, nomes: ['Psiquiatria', 'Clínica geral'] },
  // queixas gerais: a clínica geral avalia e encaminha
  { palavras: /\b(dor|dores|doi|doendo|doid[oa]|febre|grip|resfri|tosse|catarro|enjo|vomit|diarre|tont|cansa|fraqueza|fraco|mal estar|passando mal|cabeca|barriga|estomago|dente|alerg|infec|machuc|ferid|inflam|check ?up|consulta|medico)/, nomes: ['Clínica geral'] },
];

// reconhecido = false quando nenhuma palavra foi encontrada: a tela avisa e sugere a clínica geral
function escolherEspecialidades(t, crianca) {
  const achado = SINTOMAS.find((s) => s.palavras.test(t));
  const nomes = achado ? achado.nomes : ['Clínica geral'];
  // criança: a pediatria vem primeiro
  return { nomes: crianca ? ['Pediatria', ...nomes.filter((n) => n !== 'Clínica geral')] : nomes, reconhecido: !!achado };
}

// O cartão de uma especialidade da clínica, com o primeiro horário livre. situacao:
// 'livre' | 'semHorario' (há médico: lista de espera) | 'semMedico' | 'desconhecida' (a API não respondeu os horários)
async function montarCartao(especialidade) {
  try {
    const horarios = await listarHorariosLivres(especialidade.id);
    const primeiroHorario = calcularPrimeiroHorario(horarios);
    const situacao = primeiroHorario ? 'livre' : horarios.length > 0 ? 'semHorario' : 'semMedico';
    return { ...especialidade, primeiroHorario, situacao };
  } catch (e) {
    return { ...especialidade, primeiroHorario: null, situacao: 'desconhecida' };
  }
}

// Devolve uma destas respostas:
//   { tipo: 'cvv' } | { tipo: 'emergencia' } | { tipo: 'naoEntendi' }
//   { tipo: 'sugestao', quem, naoCadastrado, reconhecido, especialidades: [cartões], naoAtendidas: [nomes], erro }
// A emergência e o CVV são decididos aqui, sem a API e sem a lista da família. Só a sugestão busca as
// especialidades da clínica (GET /api/clinicas/{id}/especialidades) e os horários; se a API falhar, "erro" traz a mensagem.
export async function analisarSintomas(usuario, texto, familiares) {
  const t = preparar(texto);

  if (CRISE.test(t)) return { tipo: 'cvv' };
  if (EMERGENCIA.test(t)) return { tipo: 'emergencia' };
  if (!/[a-z]/.test(t)) return { tipo: 'naoEntendi' };

  try {
    const familia = familiares || (await listarFamiliares(usuario));
    const { quem, crianca, naoCadastrado } = descobrirQuem(t, familia);
    const { nomes, reconhecido } = escolherEspecialidades(t, crianca);

    const daClinica = await listarEspecialidades(usuario);
    const naClinica = (nome) => daClinica.filter((e) => mesmaEspecialidade(e.nome, nome));
    let achadas = nomes.flatMap(naClinica);
    const naoAtendidas = nomes.filter((nome) => naClinica(nome).length === 0);
    // a clínica não atende nenhuma das sugeridas: a clínica geral avalia e encaminha
    if (achadas.length === 0) achadas = naClinica('Clínica geral');

    return { tipo: 'sugestao', quem, naoCadastrado, reconhecido, naoAtendidas, especialidades: await Promise.all(achadas.map(montarCartao)), erro: null };
  } catch (e) {
    return { tipo: 'sugestao', quem: null, naoCadastrado: false, reconhecido: true, naoAtendidas: [], especialidades: [], erro: e.message };
  }
}
