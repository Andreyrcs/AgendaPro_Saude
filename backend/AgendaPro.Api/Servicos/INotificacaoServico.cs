using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// Avisos da conta: a API só lê e marca como lidos o que as procedures gravam (decisão do Lote C)
public interface INotificacaoServico
{
    Task<IEnumerable<NotificacaoResposta>> ListarAsync(int idConta);
    Task MarcarTodasComoLidasAsync(int idConta);
}
