using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class NotificacaoRepositorio : INotificacaoRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public NotificacaoRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    // Da mais nova para a mais antiga (aplicativo/src/servicos/notificacoes.js:10)
    public async Task<IEnumerable<Notificacao>> ListarDaContaAsync(int idUsuario)
    {
        const string sql = @"
            SELECT Id_Notificacao AS Id, IdUsuario, Tipo, Mensagem, DataEnvio, Lida
            FROM Notificacoes
            WHERE IdUsuario = @IdUsuario
            ORDER BY DataEnvio DESC, Id_Notificacao DESC;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Notificacao>(sql, new { IdUsuario = idUsuario });
    }

    public async Task MarcarTodasComoLidasAsync(int idUsuario)
    {
        const string sql = "UPDATE Notificacoes SET Lida = 1 WHERE IdUsuario = @IdUsuario AND Lida = 0;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { IdUsuario = idUsuario });
    }
}
