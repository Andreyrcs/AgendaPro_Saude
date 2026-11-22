using System.Data;
using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class FaltaRepositorio : IFaltaRepositorio
{
    // Sete blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper).
    // R = quem registrou e T = quem retirou (LEFT JOIN: podem não existir).
    private const string SelectCompleto = @"
        SELECT F.Id_Falta AS Id, F.IdConsulta, F.IdPaciente, F.IdUsuario, F.DataFalta, F.ConfirmouPresenca,
               F.RegistradaPor, F.Retirada, F.RetiradaPor, F.RetiradaEm, F.MotivoRetirada,
               C.Id_Consulta AS Id, C.IdPaciente, C.IdMedico, C.DataConsulta, C.HoraInicio, C.HoraFim, C.IdStatus,
               C.Sala, C.Motivo, C.CriadoEm, C.PresencaConfirmada, C.ConfirmadaEm, C.CanceladaEm,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor,
               M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala,
               S.Id_Status AS Id, S.Codigo_consulta AS Codigo, S.Descricao_consulta AS Descricao,
               R.Id_Usuario AS Id, R.Email, R.Papel, R.Nome, R.Telefone, R.IdClinica, R.Ativo,
               T.Id_Usuario AS Id, T.Email, T.Papel, T.Nome, T.Telefone, T.IdClinica, T.Ativo
        FROM Faltas F
        INNER JOIN Consultas C ON C.Id_Consulta = F.IdConsulta
        INNER JOIN Pacientes P ON P.Id_Paciente = F.IdPaciente
        INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
        INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus
        LEFT JOIN Usuarios R ON R.Id_Usuario = F.RegistradaPor
        LEFT JOIN Usuarios T ON T.Id_Usuario = F.RetiradaPor";

    private readonly IFabricaConexao _fabrica;

    public FaltaRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    private static Task<IEnumerable<FaltaCompleta>> ListarCompletas(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<Falta, Consulta, Paciente, Medico, StatusConsulta, Usuario, Usuario, FaltaCompleta>(
            sql,
            (f, c, p, m, s, r, t) => new FaltaCompleta
            {
                Falta = f, Consulta = c, Paciente = p, Medico = m, Status = s, RegistradaPor = r, RetiradaPor = t
            },
            parametros, splitOn: "Id,Id,Id,Id,Id,Id");

    public async Task<FaltaCompleta?> BuscarAsync(int idFalta)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarCompletas(conexao, SelectCompleto + " WHERE F.Id_Falta = @Id;", new { Id = idFalta });
        return linhas.SingleOrDefault();
    }

    // Faltas.IdConsulta é único: uma consulta tem no máximo uma falta
    public async Task<FaltaCompleta?> BuscarPorConsultaAsync(int idConsulta)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarCompletas(conexao, SelectCompleto + " WHERE F.IdConsulta = @IdConsulta;",
            new { IdConsulta = idConsulta });
        return linhas.SingleOrDefault();
    }

    public async Task<IEnumerable<FaltaCompleta>> ListarDaPessoaNaClinicaAsync(int idPaciente, int idClinica)
    {
        const string sql = SelectCompleto + @"
            WHERE F.IdPaciente = @IdPaciente AND M.IdClinica = @IdClinica
            ORDER BY F.DataFalta DESC, C.HoraInicio DESC;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdPaciente = idPaciente, IdClinica = idClinica });
    }

    public async Task<IEnumerable<Falta>> ListarNaoRetiradasDaClinicaAsync(int idClinica)
    {
        const string sql = @"
            SELECT F.Id_Falta AS Id, F.IdConsulta, F.IdPaciente, F.IdUsuario, F.DataFalta, F.ConfirmouPresenca,
                   F.RegistradaPor, F.Retirada, F.RetiradaPor, F.RetiradaEm, F.MotivoRetirada
            FROM Faltas F
            INNER JOIN Consultas C ON C.Id_Consulta = F.IdConsulta
            INNER JOIN Medicos M ON M.Id_Medico = C.IdMedico
            WHERE M.IdClinica = @IdClinica AND F.Retirada = 0;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Falta>(sql, new { IdClinica = idClinica });
    }

    // A procedure marca FALTOU; o trigger trg_Consultas_Falta grava a falta e aplica a restrição
    public async Task RegistrarAsync(int idConsulta, int idUsuario)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_RegistrarFalta", new { IdConsulta = idConsulta, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure);
    }

    public async Task RetirarAsync(int idFalta, int idUsuario, string motivo)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_RetirarFalta", new { IdFalta = idFalta, IdUsuario = idUsuario, Motivo = motivo },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<SituacaoConta?> BuscarSituacaoAsync(int idConta)
    {
        const string sql = @"
            SELECT Id_Usuario AS IdUsuario, Restricao, RestricaoAte, FaltasRegistradas
            FROM vw_SituacaoConta
            WHERE Id_Usuario = @IdConta;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<SituacaoConta>(sql, new { IdConta = idConta });
    }
}
