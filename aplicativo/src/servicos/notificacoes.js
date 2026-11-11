// Avisos da conta (tabela Notificacoes): vaga oferecida, consulta confirmada, restrição, lembretes.
// Formato: { id, tipo, mensagem, dataEnvio: 'AAAA-MM-DD', lida }

import { contaDe, esperar } from '../dados/bancoSimulado';

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
