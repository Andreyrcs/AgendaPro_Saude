using AgendaPro.Api.Dtos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class NotificacaoServico : INotificacaoServico
{
    private readonly INotificacaoRepositorio _notificacoes;

    public NotificacaoServico(INotificacaoRepositorio notificacoes)
    {
        _notificacoes = notificacoes;
    }

    // dataEnvio só com a data (AAAA-MM-DD), como o app espera (notificacoes.js:2)
    public async Task<IEnumerable<NotificacaoResposta>> ListarAsync(int idConta)
    {
        var avisos = await _notificacoes.ListarDaContaAsync(idConta);
        return avisos.Select(n => new NotificacaoResposta(n.Id, n.Tipo, n.Mensagem,
            DateOnly.FromDateTime(n.DataEnvio), n.Lida)).ToList();
    }

    public Task MarcarTodasComoLidasAsync(int idConta) => _notificacoes.MarcarTodasComoLidasAsync(idConta);
}
