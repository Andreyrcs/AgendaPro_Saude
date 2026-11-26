// Avisos da conta (tabela Notificacoes): vaga oferecida, consulta confirmada, restrição, lembretes (Apêndice L).
// Rotas: GET /api/pacientes/{id}/notificacoes e PUT /api/pacientes/{id}/notificacoes/lidas.
// Formato: { id, tipo, mensagem, dataEnvio: 'AAAA-MM-DD', lida }

import { chamarApi } from './api';

export async function listarNotificacoes(usuario) {
  const lista = await chamarApi(`/api/pacientes/${usuario.idUsuario}/notificacoes`);
  return [...lista].sort((a, b) => String(b.dataEnvio).localeCompare(String(a.dataEnvio)));
}

export async function marcarTodasComoLidas(usuario) {
  await chamarApi(`/api/pacientes/${usuario.idUsuario}/notificacoes/lidas`, { metodo: 'PUT' });
}
