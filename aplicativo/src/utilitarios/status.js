// Os nomes de status da consulta e do horário, e as regras de presença e faltas.
// São os MESMOS valores da web (frontend/assets/js/dados.js) e do banco (ver docs/aplicativo-integracao-api.md).

// Status da CONSULTA (coluna consultas.status)
export const STATUS_CONSULTA = {
  confirmada: 'Confirmada',
  na_recepcao: 'Na recepção',
  em_atendimento: 'Em atendimento',
  atendida: 'Atendida',
  faltou: 'Faltou',
  cancelada: 'Cancelada',
};

// Estado do HORÁRIO na agenda do médico (coluna horarios.estado)
// oferecido = vaga mandada à 1ª pessoa da lista de espera, aguardando resposta
export const ESTADO_HORARIO = {
  livre: 'Livre',
  ocupado: 'Ocupado',
  oferecido: 'Oferecido à fila',
};

// Consultas que ainda vão acontecer (o paciente pode cancelar)
export const STATUS_FUTUROS = ['confirmada'];

// Presença e faltas — os mesmos valores da web (frontend/assets/js/dados.js)
// - a partir do início da véspera, o paciente confirma: "Vou" ou "Não vou";
// - avisar ou cancelar até o fim da véspera (AVISO_ATE): sem consequência;
// - cancelar no próprio dia depois de ter dito "Vou": falta sem aviso;
// - "faltou" só é marcado pelo médico ou pela recepção (atraso não é falta);
// - FALTAS_PARA_RESTRICAO faltas sem aviso → por DIAS_DE_RESTRICAO dias só lista de espera;
//   nova falta nesse período → por DIAS_DE_RESTRICAO dias só agenda com a recepção;
// - DIAS_DE_RESTRICAO dias sem novas faltas → volta ao normal sozinho.
export const FALTAS_PARA_RESTRICAO = 2;
export const DIAS_DE_RESTRICAO = 30;
export const AVISO_ATE = 'fim do dia anterior à consulta';

// O último instante para avisar sem consequência: 23:59:59 da véspera
export function avisoAte(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia - 1, 23, 59, 59);
}

function somar(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(a, m - 1, d + n, 12);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// Restrição atual a partir das faltas da conta ({ data, confirmou, retirada }).
// Devolve { tipo: 'normal' | 'so_fila' | 'so_recepcao', ate: 'AAAA-MM-DD' | null, faltas: n }
export function restricaoDe(faltas, hoje) {
  const validas = faltas.filter((f) => !f.retirada);
  const contam = validas.filter((f) => f.confirmou).sort((a, b) => a.data.localeCompare(b.data));
  let tipo = 'normal';
  let ate = null;
  let seguidas = 0;
  contam.forEach((f) => {
    if (tipo !== 'normal' && f.data > ate) { tipo = 'normal'; seguidas = 0; }
    if (tipo === 'normal') {
      seguidas += 1;
      if (seguidas >= FALTAS_PARA_RESTRICAO) { tipo = 'so_fila'; ate = somar(f.data, DIAS_DE_RESTRICAO); }
    } else {
      tipo = 'so_recepcao';
      ate = somar(f.data, DIAS_DE_RESTRICAO);
    }
  });
  if (tipo !== 'normal' && hoje > ate) tipo = 'normal';
  return { tipo, ate: tipo === 'normal' ? null : ate, faltas: validas.length };
}

// A regra, para mostrar antes de confirmar um agendamento
export const TEXTO_DA_REGRA =
  'Se não puder ir, avise até o fim do dia anterior (“Não vou” ou cancelar): não há nenhuma consequência. ' +
  'Cancelar no próprio dia depois de ter confirmado “Vou” conta como falta. ' +
  `${FALTAS_PARA_RESTRICAO} faltas sem aviso deixam o agendamento só pela lista de espera por ${DIAS_DE_RESTRICAO} dias.`;

export function textoDasFaltas(n) {
  return `Você tem ${n} ${n === 1 ? 'falta registrada' : 'faltas registradas'}.`;
}
