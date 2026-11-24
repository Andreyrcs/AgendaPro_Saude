// Lista de espera inteligente (Apêndice L).
// Quando não há horário com o médico escolhido, o paciente entra na fila. Quando uma consulta desse médico é
// cancelada, o servidor oferece o horário ao 1º da fila, que tem 30 minutos para aceitar (sp_OferecerVaga).
// Rotas: GET /api/pacientes/{id}/lista-espera, POST /api/lista-espera, PUT /api/lista-espera/{id}/vaga
// e DELETE /api/lista-espera/{id}. O usuário sai do token.

import { chamarApi } from './api';

// Formato (o da API):
// { id, pessoa: {familiar}, medico: { id, nome, sala }, especialidade: { id, nome }, posicao, naFila, desde,
//   vagaOferecida: null | { data, hora, expiraEm (milissegundos) } }
// A tela chama de novo ao abrir e ao tocar em "Atualizar": é assim que a vaga oferecida aparece.
export async function buscarMinhaFila(usuario) {
  const fila = await chamarApi(`/api/pacientes/${usuario.idUsuario}/lista-espera`);
  return fila || null;
}

// dados = { pessoa: idFamiliar, medico: idMedico }
// Erros da API sem trocar, como "Você já está numa lista de espera. Saia dela antes de entrar em outra."
export async function entrarNaFila(usuario, dados) {
  return chamarApi('/api/lista-espera', {
    metodo: 'POST',
    corpo: { pessoa: Number(dados.pessoa), medico: Number(dados.medico), usaApp: true },
  });
}

// aceitar = true → devolve a consulta confirmada; aceitar = false → null (a vaga passa ao próximo)
export async function responderVaga(usuario, idFila, aceitar) {
  const resposta = await chamarApi(`/api/lista-espera/${idFila}/vaga`, { metodo: 'PUT', corpo: { aceitar: !!aceitar } });
  return aceitar ? resposta : null;
}

export async function sairDaFila(usuario, idFila) {
  await chamarApi(`/api/lista-espera/${idFila}`, { metodo: 'DELETE' });
}
