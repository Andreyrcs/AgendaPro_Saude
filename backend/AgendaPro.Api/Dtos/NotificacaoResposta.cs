namespace AgendaPro.Api.Dtos;

// GET /api/pacientes/{id}/notificacoes: { id, tipo, mensagem, dataEnvio: 'AAAA-MM-DD', lida }
// (aplicativo/src/servicos/notificacoes.js:2). tipo sai como está no banco: o app escolhe o ícone por ele.
public record NotificacaoResposta(int Id, string Tipo, string Mensagem, DateOnly DataEnvio, bool Lida);
