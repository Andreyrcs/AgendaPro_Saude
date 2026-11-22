using System.Data;
using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class ConsultaRepositorio : IConsultaRepositorio
{
    // Cinco blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper)
    private const string SelectCompleto = @"
        SELECT C.Id_Consulta AS Id, C.IdPaciente, C.IdMedico, C.DataConsulta, C.HoraInicio, C.HoraFim, C.IdStatus,
               C.Sala, C.Motivo, C.CriadoEm, C.PresencaConfirmada, C.ConfirmadaEm, C.CanceladaEm,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor,
               M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala,
               E.Id_Especialidade AS Id, E.IdClinica, E.Nome_Espec AS Nome, E.DuracaoPadrao,
               S.Id_Status AS Id, S.Codigo_consulta AS Codigo, S.Descricao_consulta AS Descricao
        FROM Consultas C
        LEFT JOIN Pacientes P ON P.Id_Paciente = C.IdPaciente
        INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
        INNER JOIN Especialidades E ON E.Id_Especialidade = M.IdEspecialidade
        INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus";

    private const string SelectConsulta = @"
        SELECT C.Id_Consulta AS Id, C.IdPaciente, C.IdMedico, C.DataConsulta, C.HoraInicio, C.HoraFim, C.IdStatus,
               C.Sala, C.Motivo, C.CriadoEm, C.PresencaConfirmada, C.ConfirmadaEm, C.CanceladaEm
        FROM Consultas C
        INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus";

    private readonly IFabricaConexao _fabrica;

    public ConsultaRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    private static Task<IEnumerable<ConsultaCompleta>> ListarCompletas(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<Consulta, Paciente, Medico, Especialidade, StatusConsulta, ConsultaCompleta>(
            sql, (c, p, m, e, s) => (c, p, m, e, s), parametros, splitOn: "Id,Id,Id,Id");

    public async Task<ConsultaCompleta?> BuscarAsync(int id)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarCompletas(conexao, SelectCompleto + " WHERE C.Id_Consulta = @Id;", new { Id = id });
        return linhas.Cast<ConsultaCompleta?>().SingleOrDefault();
    }

    public async Task<IEnumerable<ConsultaCompleta>> ListarPorContaAsync(int idConta)
    {
        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, SelectCompleto + " WHERE P.IdUsuario = @IdConta;", new { IdConta = idConta });
    }

    // Uma consulta pode estar ligada a mais de um item: fica o primeiro título em ordem alfabética
    public async Task<IEnumerable<PrevencaoDaConsulta>> FiltrarDePrevencaoAsync(IEnumerable<int> idsConsultas)
    {
        const string sql = @"
            SELECT PP.IdConsulta, MIN(X.Titulo) AS Titulo
            FROM Pessoa_Prevencao PP
            INNER JOIN Exames_Prevencao X ON X.Id_ExamePrevencao = PP.IdExamePrevencao
            WHERE PP.IdConsulta IN @Ids
            GROUP BY PP.IdConsulta;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<PrevencaoDaConsulta>(sql, new { Ids = idsConsultas });
    }

    public async Task<IEnumerable<Consulta>> ListarOcupadasAsync(IEnumerable<int> idsMedicos, DateTime de, DateTime ate)
    {
        const string sql = SelectConsulta + @"
            WHERE C.IdMedico IN @Ids
              AND C.DataConsulta BETWEEN @De AND @Ate
              AND S.Codigo_consulta NOT IN ('CANCELADA', 'VAGA');";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Consulta>(sql, new { Ids = idsMedicos, De = de, Ate = ate });
    }

    public async Task<IEnumerable<Consulta>> ListarVagasFuturasDaClinicaAsync(int idClinica)
    {
        // "Ainda não passou" com a mesma conta das procedures (GETDATE e SYSDATETIME)
        const string sql = SelectConsulta + @"
            INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
            WHERE M.IdClinica = @IdClinica
              AND S.Codigo_consulta = 'VAGA'
              AND (C.DataConsulta > CAST(GETDATE() AS DATE)
                   OR (C.DataConsulta = CAST(GETDATE() AS DATE) AND C.HoraInicio > CAST(SYSDATETIME() AS TIME)))
            ORDER BY C.DataConsulta, C.HoraInicio;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Consulta>(sql, new { IdClinica = idClinica });
    }

    public async Task<int> AgendarAsync(int idPaciente, int idMedico, DateTime data, TimeSpan hora, string? motivo, bool pelaRecepcao)
    {
        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>("sp_AgendarConsulta",
            new
            {
                IdPaciente = idPaciente,
                IdMedico = idMedico,
                DataConsulta = data,
                HoraInicio = hora,
                Motivo = motivo,
                PelaRecepcao = pelaRecepcao
            },
            commandType: CommandType.StoredProcedure);
    }

    // Apêndice C: cancela e agenda o novo horário numa única transação. As procedures aninham na
    // transação da API; se o agendamento falhar, o ROLLBACK dela desfaz também o cancelamento.
    public async Task<int> ReagendarAsync(int idConsulta, int idUsuario, int idPaciente, int idMedico,
        DateTime data, TimeSpan hora, string? motivo)
    {
        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        await conexao.ExecuteAsync("sp_CancelarConsulta",
            new { IdConsulta = idConsulta, PeloPaciente = false, IdUsuario = idUsuario },
            transacao, commandType: CommandType.StoredProcedure);

        var idNova = await conexao.QuerySingleAsync<int>("sp_AgendarConsulta",
            new
            {
                IdPaciente = idPaciente,
                IdMedico = idMedico,
                DataConsulta = data,
                HoraInicio = hora,
                Motivo = motivo,
                PelaRecepcao = true
            },
            transacao, commandType: CommandType.StoredProcedure);

        transacao.Commit();
        return idNova;
    }

    public async Task CancelarAsync(int idConsulta, bool peloPaciente, int idUsuario)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_CancelarConsulta",
            new { IdConsulta = idConsulta, PeloPaciente = peloPaciente, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure);
    }

    public async Task ConfirmarPresencaAsync(int idConsulta, bool vou, int idUsuario)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_ConfirmarPresenca",
            new { IdConsulta = idConsulta, Vou = vou, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<(bool Falta, bool OferecidoAFila)> ResultadoCancelamentoAsync(Consulta consulta)
    {
        const string sql = @"
            SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM Faltas WHERE IdConsulta = @Id) THEN 1 ELSE 0 END AS BIT),
                   CAST(CASE WHEN EXISTS (
                        SELECT 1 FROM Consultas X
                        INNER JOIN Status_Consulta S ON S.Id_Status = X.IdStatus
                        WHERE X.IdMedico = @IdMedico AND X.DataConsulta = @DataConsulta
                          AND X.HoraInicio = @HoraInicio AND X.HoraFim = @HoraFim
                          AND S.Codigo_consulta = 'OFERECIDA') THEN 1 ELSE 0 END AS BIT);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<(bool, bool)>(sql, consulta);
    }

    public async Task<IEnumerable<ConsultaCompleta>> ListarDaClinicaAsync(int idClinica, DateTime de, DateTime ate)
    {
        const string sql = SelectCompleto + @"
            WHERE M.IdClinica = @IdClinica AND C.DataConsulta BETWEEN @De AND @Ate
            ORDER BY C.DataConsulta, C.HoraInicio, M.Nome;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdClinica = idClinica, De = de, Ate = ate });
    }

    public async Task<IEnumerable<ConsultaCompleta>> ListarComPacienteDaClinicaAsync(int idClinica)
    {
        const string sql = SelectCompleto + @"
            WHERE M.IdClinica = @IdClinica AND C.IdPaciente IS NOT NULL
            ORDER BY C.DataConsulta, C.HoraInicio;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdClinica = idClinica });
    }

    public async Task<IEnumerable<ConsultaCompleta>> ListarDoMedicoAsync(int idMedico, DateTime data)
    {
        const string sql = SelectCompleto + @"
            WHERE C.IdMedico = @IdMedico AND C.DataConsulta = @Data
            ORDER BY C.HoraInicio;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdMedico = idMedico, Data = data });
    }

    // Mesma ordem de medico.js:1026 (data e hora, da mais recente para a mais antiga)
    public async Task<IEnumerable<ConsultaCompleta>> ListarComPacienteDoMedicoAsync(int idMedico)
    {
        const string sql = SelectCompleto + @"
            WHERE C.IdMedico = @IdMedico AND C.IdPaciente IS NOT NULL
            ORDER BY C.DataConsulta DESC, C.HoraInicio DESC;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdMedico = idMedico });
    }

    // Sem lista de ids no IN: uma clínica pode ter mais consultas que o limite de parâmetros do SQL Server
    public async Task<IEnumerable<PrevencaoDaConsulta>> ListarDePrevencaoDaClinicaAsync(int idClinica)
    {
        const string sql = @"
            SELECT PP.IdConsulta, MIN(X.Titulo) AS Titulo
            FROM Pessoa_Prevencao PP
            INNER JOIN Exames_Prevencao X ON X.Id_ExamePrevencao = PP.IdExamePrevencao
            INNER JOIN Consultas C ON C.Id_Consulta = PP.IdConsulta
            INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
            WHERE M.IdClinica = @IdClinica
            GROUP BY PP.IdConsulta;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<PrevencaoDaConsulta>(sql, new { IdClinica = idClinica });
    }

    // Chegada, início e fim do atendimento não têm procedure. O WHERE confere o status atual,
    // então duas pessoas não mudam a mesma consulta ao mesmo tempo. Os triggers de Consultas
    // só agem em FALTOU e CANCELADA, que não passam por aqui.
    public async Task<bool> MudarStatusAsync(int idConsulta, IEnumerable<string> codigosAtuais, string codigoNovo)
    {
        const string sql = @"
            UPDATE C SET IdStatus = N.Id_Status
            FROM Consultas C
            INNER JOIN Status_Consulta A ON A.Id_Status = C.IdStatus
            CROSS JOIN Status_Consulta N
            WHERE C.Id_Consulta = @Id AND A.Codigo_consulta IN @Atuais AND N.Codigo_consulta = @Novo;";

        using var conexao = _fabrica.CriarConexao();
        var linhas = await conexao.ExecuteAsync(sql, new { Id = idConsulta, Atuais = codigosAtuais, Novo = codigoNovo });
        return linhas > 0;
    }
}
