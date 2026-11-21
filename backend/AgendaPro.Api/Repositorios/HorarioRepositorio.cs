using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class HorarioRepositorio : IHorarioRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public HorarioRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<IEnumerable<HorarioAtendimento>> ListarPorMedicosAsync(IEnumerable<int> idsMedicos)
    {
        // O Dapper troca @Ids pela lista de parâmetros (@Ids1, @Ids2...)
        const string sql = @"
            SELECT Id_Horario AS Id, IdMedico, Dia_Semana AS DiaSemana, Hora_Inicio AS HoraInicio, Hora_Fim AS HoraFim,
                   InicioAlmoco, FimAlmoco
            FROM Horarios_Atendimento
            WHERE IdMedico IN @Ids;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<HorarioAtendimento>(sql, new { Ids = idsMedicos });
    }

    // Apaga o expediente antigo e grava o novo na mesma transação
    public async Task SubstituirExpedienteAsync(int idMedico, IEnumerable<HorarioAtendimento> dias)
    {
        const string sqlApagar = "DELETE FROM Horarios_Atendimento WHERE IdMedico = @IdMedico;";

        const string sqlGravar = @"
            INSERT INTO Horarios_Atendimento (IdMedico, Dia_Semana, Hora_Inicio, Hora_Fim, InicioAlmoco, FimAlmoco)
            VALUES (@IdMedico, @DiaSemana, @HoraInicio, @HoraFim, @InicioAlmoco, @FimAlmoco);";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        await conexao.ExecuteAsync(sqlApagar, new { IdMedico = idMedico }, transacao);
        foreach (var dia in dias)
            await conexao.ExecuteAsync(sqlGravar, dia, transacao);

        transacao.Commit();
    }

    public async Task<IEnumerable<Feriado>> ListarFeriadosAsync(DateTime de, DateTime ate)
    {
        const string sql = @"
            SELECT Id_Feriado AS Id, Data_Feriado AS Data, Nome_Feriado AS Nome
            FROM Feriados
            WHERE Data_Feriado BETWEEN @De AND @Ate;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Feriado>(sql, new { De = de, Ate = ate });
    }
}
