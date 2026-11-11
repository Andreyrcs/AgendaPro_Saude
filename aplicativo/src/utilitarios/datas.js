// Funções de data usadas nas telas. As datas circulam como texto 'AAAA-MM-DD',
// igual à API (dataReuniao vem nesse formato), e só viram Date aqui dentro.

// "Hoje" é a data do aparelho, lida quando o app abre.
export const HOJE = paraIso(new Date());

// Feriados nacionais (a clínica não abre)
const FERIADOS = [
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04',
  '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27',
  '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
];

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Meio-dia no horário local: evita que o fuso horário "mude o dia".
export function paraData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

export function paraIso(data) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function somarDias(iso, n) {
  const d = paraData(iso);
  d.setDate(d.getDate() + n);
  return paraIso(d);
}

// Quantos dias faltam de HOJE até a data (negativo se já passou)
export function diasAte(iso) {
  return Math.round((paraData(iso) - paraData(HOJE)) / 86400000);
}

export function relativo(iso) {
  const n = diasAte(iso);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

// 'terça, 20 de outubro'
export function extenso(iso) {
  const d = paraData(iso);
  return `${SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// '20 de outubro'
export function diaEMes(iso) {
  const d = paraData(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// 'ter, 20 out'
export function curto(iso) {
  const d = paraData(iso);
  return `${SEMANA_CURTA[d.getDay()]}, ${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}

// 'OUT' (faixa de cima da folhinha)
export function mesCurto(iso) {
  return MESES_CURTOS[paraData(iso).getMonth()].toUpperCase();
}

// 'ter' (rodapé da folhinha)
export function diaSemanaCurto(iso) {
  return SEMANA_CURTA[paraData(iso).getDay()];
}

export function ehDomingoOuFeriado(iso) {
  return paraData(iso).getDay() === 0 || FERIADOS.includes(iso);
}

// Datas da carga inicial contadas a partir de hoje: diaDaqui(3) = daqui a 3 dias.
// Para consultas (util = true), pula domingo e feriado.
export function diaDaqui(n, util = true) {
  let iso = somarDias(HOJE, n);
  while (util && ehDomingoOuFeriado(iso)) iso = somarDias(iso, n < 0 ? -1 : 1);
  return iso;
}

// mesDaqui(0) = 'AAAA-MM' do mês atual; mesDaqui(1) = o próximo
export function mesDaqui(n) {
  const d = paraData(HOJE);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return paraIso(d).slice(0, 7);
}

// '2026-11' → 'Novembro de 2026'
export function nomeDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const nome = MESES[mes - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

// Idade em anos completos na data de HOJE
export function idadeEm(nascimentoIso) {
  const hoje = paraData(HOJE);
  const nasc = paraData(nascimentoIso);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFez =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFez) idade -= 1;
  return idade;
}

// 'DD/MM/AAAA' digitado pelo paciente → 'AAAA-MM-DD' (ou null se inválida)
export function brParaIso(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const iso = `${partes[3]}-${partes[2]}-${partes[1]}`;
  const d = paraData(iso);
  return paraIso(d) === iso ? iso : null; // recusa 31/02, por exemplo
}

// Máscara simples para o campo de data: só números, com as barras no lugar
export function mascararData(texto) {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}
