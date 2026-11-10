// Pequenas funções de texto usadas em várias telas.

// 'Não CONSIGO' → 'nao consigo' (para comparar palavras sem se importar com acento)
export function semAcento(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// 'Dra. Helena Duarte' → 'HD' (ignora o título)
export function iniciais(nome) {
  const partes = String(nome || '')
    .split(/\s+/)
    .filter((p) => p && !['dr.', 'dra.', 'psic.'].includes(p.toLowerCase()));
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

// 3, 'f' → '3ª' · 1, 'm' → '1º'
export function ordinal(n, genero) {
  return `${n}${genero === 'f' ? 'ª' : 'º'}`;
}

// O e-mail é comparado sempre sem espaços e em minúsculas
export function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Como chamar o familiar nas frases: o titular é "você"
export function nomeParaExibir(pessoa) {
  return pessoa.titular ? 'você' : pessoa.curto;
}

// 'Filho · 8 anos' (ou só 'Você' quando a idade não é conhecida)
export function descricaoFamiliar(pessoa) {
  return pessoa.idade !== null && pessoa.idade !== undefined
    ? `${pessoa.relacao} · ${pessoa.idade} anos`
    : pessoa.relacao;
}

// 'Você é a 3ª da fila' · 'Davi é o 2º da fila' · 'Posição na fila: 4ª'
export function fraseDaFila(pessoa, posicao) {
  const quem = pessoa.titular ? 'Você' : pessoa.curto;
  if (pessoa.genero === 'f') return `${quem} é a ${ordinal(posicao, 'f')} da fila`;
  if (pessoa.genero === 'm') return `${quem} é o ${ordinal(posicao, 'm')} da fila`;
  return `${quem} está na posição ${posicao} da fila`;
}

export function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}
