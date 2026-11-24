using System.Data;
using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class AcompanhamentoRepositorio : IAcompanhamentoRepositorio
{
    // A consulta do retorno AGENDADO é a do mesmo paciente e médico, no dia dele (Retornos.DataRetorno) e com o
    // motivo "Retorno..." que a API grava ao marcar (AcompanhamentoServico.MotivoRetorno):
    // atendida → REALIZADO; cancelada ou com falta → volta a ENCAMINHADO, para a recepção marcar de novo.
    internal const string StatusRetorno = @"
        CASE WHEN R.Status <> 'AGENDADO' THEN R.Status
             WHEN CR.Atendida = 1 THEN 'REALIZADO'
             WHEN CR.Desfeita = 1 AND CR.Ativa = 0 THEN 'ENCAMINHADO'
             ELSE 'AGENDADO' END";

    internal const string ConsultaDoRetorno = @"
        OUTER APPLY (
            SELECT ISNULL(MAX(CASE WHEN S.Codigo_consulta = 'ATENDIDA' THEN 1 ELSE 0 END), 0) AS Atendida,
                   ISNULL(MAX(CASE WHEN S.Codigo_consulta IN ('CONFIRMADA', 'NA_RECEPCAO', 'EM_ATENDIMENTO') THEN 1 ELSE 0 END), 0) AS Ativa,
                   ISNULL(MAX(CASE WHEN S.Codigo_consulta IN ('CANCELADA', 'FALTOU') THEN 1 ELSE 0 END), 0) AS Desfeita
            FROM Consultas C
            INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus
            WHERE C.IdPaciente = R.IdPaciente AND C.IdMedico = R.IdMedico AND C.DataConsulta = R.DataRetorno
              AND C.Motivo LIKE N'Retorno%'
              AND (R.IdConsultaOrigem IS NULL OR C.Id_Consulta <> R.IdConsultaOrigem)
        ) CR";

    // Quatro blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper)
    private const string SelectRetorno = @"
        SELECT R.Id_Retorno AS Id, R.IdPaciente, R.IdMedico, R.IdConsultaOrigem,
               CASE WHEN " + StatusRetorno + @" = 'ENCAMINHADO' THEN NULL ELSE R.DataRetorno END AS DataRetorno,
               R.Nota, " + StatusRetorno + @" AS Status,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor,
               M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala,
               E.Id_Especialidade AS Id, E.IdClinica, E.Nome_Espec AS Nome, E.DuracaoPadrao
        FROM Retornos R
        INNER JOIN Pacientes P ON P.Id_Paciente = R.IdPaciente
        INNER JOIN Medicos M ON M.Id_Medico = R.IdMedico
        INNER JOIN Especialidades E ON E.Id_Especialidade = M.IdEspecialidade"
        + ConsultaDoRetorno;

    // Consulta e médico com LEFT JOIN: Exames.IdConsulta aceita NULL
    private const string SelectExame = @"
        SELECT X.Id_Exame AS Id, X.IdPaciente, X.IdConsulta, X.NomeExame, X.Status,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor,
               C.Id_Consulta AS Id, C.IdPaciente, C.IdMedico, C.DataConsulta, C.HoraInicio, C.HoraFim, C.IdStatus,
               C.Sala, C.Motivo, C.CriadoEm, C.PresencaConfirmada, C.ConfirmadaEm, C.CanceladaEm,
               M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala
        FROM Exames X
        INNER JOIN Pacientes P ON P.Id_Paciente = X.IdPaciente
        LEFT JOIN Consultas C ON C.Id_Consulta = X.IdConsulta
        LEFT JOIN Medicos M ON M.Id_Medico = C.IdMedico";

    private readonly IFabricaConexao _fabrica;

    public AcompanhamentoRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    private static Task<IEnumerable<RetornoCompleto>> ListarRetornos(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<Retorno, Paciente, Medico, Especialidade, RetornoCompleto>(
            sql,
            (r, p, m, e) => new RetornoCompleto { Retorno = r, Paciente = p, Medico = m, Especialidade = e },
            parametros, splitOn: "Id,Id,Id");

    private static Task<IEnumerable<ExameCompleto>> ListarExames(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<Exame, Paciente, Consulta, Medico, ExameCompleto>(
            sql,
            (x, p, c, m) => new ExameCompleto { Exame = x, Paciente = p, Consulta = c, Medico = m },
            parametros, splitOn: "Id,Id,Id");

    public async Task<int> CriarRetornoAsync(Retorno retorno)
    {
        const string sql = @"
            INSERT INTO Retornos (IdPaciente, IdMedico, IdConsultaOrigem, DataRetorno, Nota, Status)
            OUTPUT INSERTED.Id_Retorno
            VALUES (@IdPaciente, @IdMedico, @IdConsultaOrigem, @DataRetorno, @Nota, @Status);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(sql, retorno);
    }

    public async Task<int> CriarRetornoComConsultaAsync(Retorno retorno, TimeSpan hora, string motivo)
    {
        const string sql = @"
            INSERT INTO Retornos (IdPaciente, IdMedico, IdConsultaOrigem, DataRetorno, Nota, Status)
            OUTPUT INSERTED.Id_Retorno
            VALUES (@IdPaciente, @IdMedico, @IdConsultaOrigem, @DataRetorno, @Nota, @Status);";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        await conexao.ExecuteAsync("sp_AgendarConsulta",
            new
            {
                retorno.IdPaciente,
                retorno.IdMedico,
                DataConsulta = retorno.DataRetorno,
                HoraInicio = hora,
                Motivo = motivo,
                PelaRecepcao = true // quem marca é a clínica: a restrição por faltas não se aplica
            },
            transacao, commandType: CommandType.StoredProcedure);
        var id = await conexao.QuerySingleAsync<int>(sql, retorno, transacao);

        transacao.Commit();
        return id;
    }

    public async Task<RetornoCompleto?> BuscarRetornoAsync(int idRetorno)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarRetornos(conexao, SelectRetorno + " WHERE R.Id_Retorno = @Id;", new { Id = idRetorno });
        return linhas.SingleOrDefault();
    }

    public async Task<int> CriarExameAsync(Exame exame)
    {
        const string sql = @"
            INSERT INTO Exames (IdPaciente, IdConsulta, NomeExame, Status)
            OUTPUT INSERTED.Id_Exame
            VALUES (@IdPaciente, @IdConsulta, @NomeExame, @Status);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(sql, exame);
    }

    public async Task<ExameCompleto?> BuscarExameAsync(int idExame)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarExames(conexao, SelectExame + " WHERE X.Id_Exame = @Id;", new { Id = idExame });
        return linhas.SingleOrDefault();
    }

    public async Task MudarStatusExameAsync(int idExame, string codigo)
    {
        const string sql = "UPDATE Exames SET Status = @Status WHERE Id_Exame = @Id;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { Id = idExame, Status = codigo });
    }

    public async Task<IEnumerable<RetornoCompleto>> ListarRetornosDoMedicoAsync(int idMedico)
    {
        const string sql = SelectRetorno + " WHERE R.IdMedico = @IdMedico ORDER BY R.Id_Retorno;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarRetornos(conexao, sql, new { IdMedico = idMedico });
    }

    public async Task<IEnumerable<ExameCompleto>> ListarExamesDoMedicoAsync(int idMedico)
    {
        const string sql = SelectExame + " WHERE C.IdMedico = @IdMedico ORDER BY X.Id_Exame;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarExames(conexao, sql, new { IdMedico = idMedico });
    }

    public async Task<IEnumerable<RetornoCompleto>> ListarRetornosDaClinicaAsync(int idClinica)
    {
        const string sql = SelectRetorno + " WHERE M.IdClinica = @IdClinica ORDER BY R.Id_Retorno;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarRetornos(conexao, sql, new { IdClinica = idClinica });
    }

    public async Task<IEnumerable<ExameCompleto>> ListarExamesDaClinicaAsync(int idClinica)
    {
        const string sql = SelectExame + " WHERE M.IdClinica = @IdClinica ORDER BY X.Id_Exame;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarExames(conexao, sql, new { IdClinica = idClinica });
    }

    // Encaminhados (a recepção ainda vai marcar) e marcados de hoje em diante
    public async Task<IEnumerable<RetornoCompleto>> ListarRetornosPendentesDaContaAsync(int idConta)
    {
        const string sql = SelectRetorno + @"
            WHERE P.IdUsuario = @IdConta AND (" + StatusRetorno + @" = 'ENCAMINHADO'
                   OR (" + StatusRetorno + @" = 'AGENDADO' AND R.DataRetorno >= CAST(GETDATE() AS DATE)))
            ORDER BY R.Id_Retorno;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarRetornos(conexao, sql, new { IdConta = idConta });
    }

    public async Task<IEnumerable<ExameCompleto>> ListarExamesPendentesDaContaAsync(int idConta)
    {
        const string sql = SelectExame + @"
            WHERE P.IdUsuario = @IdConta AND X.Status = 'PENDENTE'
            ORDER BY X.Id_Exame;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarExames(conexao, sql, new { IdConta = idConta });
    }
}
