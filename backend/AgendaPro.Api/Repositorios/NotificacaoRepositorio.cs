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

    public async Task<int> LembrarConsultasDeAmanhaAsync()
    {
        // A mensagem identifica a consulta (dia, hora, pessoa e médico): a que já foi gravada não se repete
        const string sql = @"
            INSERT INTO Notificacoes (IdUsuario, Tipo, Mensagem)
            SELECT L.IdUsuario, 'LEMBRETE', L.Mensagem
            FROM (
                SELECT P.IdUsuario,
                       CONCAT(N'Consulta amanhã, ', CONVERT(VARCHAR(10), C.DataConsulta, 103),
                              N' às ', LEFT(CONVERT(VARCHAR(8), C.HoraInicio), 5),
                              N', de ', P.Nome_paciente, N' com ', M.Nome,
                              N'. Confirme a presença no Início.') AS Mensagem
                FROM Consultas C
                INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus AND S.Codigo_consulta = 'CONFIRMADA'
                INNER JOIN Pacientes P ON P.Id_Paciente = C.IdPaciente
                INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
                WHERE C.DataConsulta = CAST(DATEADD(DAY, 1, GETDATE()) AS DATE)
                  AND ISNULL(C.PresencaConfirmada, 0) = 0
            ) L
            WHERE NOT EXISTS (
                SELECT 1 FROM Notificacoes N
                WHERE N.IdUsuario = L.IdUsuario AND N.Tipo = 'LEMBRETE' AND N.Mensagem = L.Mensagem);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.ExecuteAsync(sql);
    }

    public async Task MarcarTodasComoLidasAsync(int idUsuario)
    {
        const string sql = "UPDATE Notificacoes SET Lida = 1 WHERE IdUsuario = @IdUsuario AND Lida = 0;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { IdUsuario = idUsuario });
    }
}
