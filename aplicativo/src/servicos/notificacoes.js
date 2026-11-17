// Avisos da conta (tabela Notificacoes): vaga oferecida, consulta confirmada, restrição, lembretes.
// Formato: { id, tipo, mensagem, dataEnvio: 'AAAA-MM-DD', lida }

import { avisar, contaDe, esperar } from '../dados/bancoSimulado';
import { diaDaqui } from '../utilitarios/datas';

// TODO: troca pra chamada real quando o endpoint GET /api/pacientes/{id}/notificacoes existir
export async function listarNotificacoes(usuario) {
  await esperar(150);
  return [...contaDe(usuario).notificacoes].sort((a, b) => b.dataEnvio.localeCompare(a.dataEnvio));
}

// TODO: troca pra chamada real quando o endpoint PUT /api/pacientes/{id}/notificacoes/lidas existir
export async function marcarTodasComoLidas(usuario) {
  await esperar(100);
  contaDe(usuario).notificacoes.forEach((n) => { n.lida = true; });
}

// Simular notificação: cria um aviso de vaga oferecida, igual ao que o servidor manda
// quando a recepção cancela uma consulta e a pessoa é a 1ª da fila (sp_OferecerVaga).
// Devolve o aviso para a tela mostrar no topo.
export async function simularNotificacao(usuario) {
  await esperar(100);
  const conta = contaDe(usuario);
  const data = diaDaqui(2).split('-').reverse().join('/');
  avisar(conta, 'VAGA_OFERECIDA', `Vaga liberada com Dra. Camila Rocha em ${data} às 09:30. Aceite ou recuse a oferta.`);
  return conta.notificacoes[0];
}
