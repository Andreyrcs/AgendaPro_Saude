// Pequenas funções de texto usadas em várias telas.

// 'Não CONSIGO' → 'nao consigo' (para comparar palavras sem se importar com acento)
export function semAcento(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Ids da API são números, e os que chegam da tela (parâmetros de rota) podem vir como texto (F2):
// por isso a comparação é sempre pelo texto do id.
export function mesmoId(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
}

// Dois nomes iguais sem considerar acento, maiúsculas ou espaços nas pontas ('Clínica geral' = 'clinica geral')
export function mesmoNome(a, b) {
  return semAcento(a).trim() === semAcento(b).trim();
}

// A pediatria é reconhecida pelo NOME: o id de cada especialidade muda de clínica para clínica (F2)
export function ehPediatria(especialidade) {
  return !!especialidade && mesmoNome(especialidade.nome, 'Pediatria');
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

// A clínica do paciente, guardada na sessão no login (GET /api/pacientes/{id}/clinicas).
// Devolve { nome, endereco, telefone, telefoneLink }; campos que a clínica não informou ficam vazios.
export function clinicaDaSessao(usuario) {
  const c = (usuario && usuario.clinica) || {};
  const numeros = String(c.telefone || '').replace(/\D/g, '');
  return {
    nome: c.nome || 'Sua clínica',
    endereco: c.endereco || '',
    telefone: c.telefone || '',
    telefoneLink: numeros ? `tel:+55${numeros}` : '',
  };
}
