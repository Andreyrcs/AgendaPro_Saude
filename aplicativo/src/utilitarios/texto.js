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

// 'Você está na posição 3 da fila' · 'Davi está na posição 2 da fila' (sem gênero)
export function fraseDaFila(pessoa, posicao) {
  const quem = pessoa.titular ? 'Você' : pessoa.curto;
  return `${quem} está na posição ${posicao} da fila`;
}

export function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}
