using System.Data;
using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class ListaEsperaRepositorio : IListaEsperaRepositorio
{
    // Seis blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper)
    private const string SelectCompleto = @"
        SELECT L.Id_Lista AS Id, L.IdPaciente, L.IdMedico, L.Posicao, L.DataEntrada, L.UsaApp, L.StatusOferta,
               L.IdConsultaOfertada, L.OfertadaEm,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco,
               U.Id_Usuario AS Id, U.Email, U.Papel, U.Nome, U.Telefone, U.IdClinica, U.Ativo,
               M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala,
               E.Id_Especialidade AS Id, E.IdClinica, E.Nome_Espec AS Nome, E.DuracaoPadrao,
               C.Id_Consulta AS Id, C.IdPaciente, C.IdMedico, C.DataConsulta, C.HoraInicio, C.HoraFim, C.IdStatus,
               C.Sala, C.Motivo, C.CriadoEm, C.PresencaConfirmada, C.ConfirmadaEm, C.CanceladaEm
        FROM Lista_Espera L
        INNER JOIN Pacientes P ON P.Id_Paciente = L.IdPaciente
        INNER JOIN Usuarios U ON U.Id_Usuario = P.IdUsuario
        INNER JOIN Medicos M ON M.Id_Medico = L.IdMedico
        INNER JOIN Especialidades E ON E.Id_Especialidade = M.IdEspecialidade
        LEFT JOIN Consultas C ON C.Id_Consulta = L.IdConsultaOfertada AND L.StatusOferta = 'OFERECIDA'";

    private const string Ativas = "L.StatusOferta IN ('AGUARDANDO', 'OFERECIDA')";

    private readonly IFabricaConexao _fabrica;

    public ListaEsperaRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    private static Task<IEnumerable<FilaCompleta>> ListarCompletas(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<ListaEspera, Paciente, Usuario, Medico, Especialidade, Consulta, FilaCompleta>(
            sql, (l, p, u, m, e, c) => (l, p, u, m, e, c), parametros, splitOn: "Id,Id,Id,Id,Id");

    public async Task<FilaCompleta?> BuscarAsync(int idLista)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarCompletas(conexao, SelectCompleto + " WHERE L.Id_Lista = @Id;", new { Id = idLista });
        return linhas.Cast<FilaCompleta?>().SingleOrDefault();
    }

    public async Task<IEnumerable<FilaCompleta>> ListarAtivasDaContaAsync(int idConta)
    {
        const string sql = SelectCompleto + " WHERE P.IdUsuario = @IdConta AND " + Ativas + " ORDER BY L.DataEntrada;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdConta = idConta });
    }

    public async Task<IEnumerable<FilaCompleta>> ListarAtivasDaClinicaAsync(int idClinica)
    {
        const string sql = SelectCompleto + " WHERE M.IdClinica = @IdClinica AND " + Ativas + " ORDER BY M.Nome, L.Posicao;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarCompletas(conexao, sql, new { IdClinica = idClinica });
    }

    public async Task<int> ContarAtivasDoMedicoAsync(int idMedico)
    {
        const string sql = "SELECT COUNT(1) FROM Lista_Espera L WHERE L.IdMedico = @IdMedico AND " + Ativas + ";";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.ExecuteScalarAsync<int>(sql, new { IdMedico = idMedico });
    }

    public async Task<int> MinutosOfertaAsync()
    {
        const string sql = "SELECT Valor FROM Parametros WHERE Nome = 'MINUTOS_OFERTA';";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.ExecuteScalarAsync<int>(sql);
    }

    public async Task<int> EntrarAsync(int idPaciente, int idMedico, bool usaApp, bool pelaRecepcao)
    {
        // A procedure devolve Id_Lista e Posicao; o Dapper lê a primeira coluna
        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryFirstAsync<int>("sp_EntrarListaEspera",
            new { IdPaciente = idPaciente, IdMedico = idMedico, UsaApp = usaApp, PelaRecepcao = pelaRecepcao },
            commandType: CommandType.StoredProcedure);
    }

    public async Task SairAsync(int idLista)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_SairListaEspera", new { IdLista = idLista },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<int> AceitarAsync(int idLista, string motivo)
    {
        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>("sp_AceitarOferta", new { IdLista = idLista, Motivo = motivo },
            commandType: CommandType.StoredProcedure);
    }

    public async Task RecusarAsync(int idLista)
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_RecusarOferta", new { IdLista = idLista },
            commandType: CommandType.StoredProcedure);
    }

    // @IdListaOfertada é parâmetro de saída: a entrada que recebeu a vaga, ou NULL se ninguém pôde receber
    public async Task<int?> OferecerVagaAsync(int idConsulta)
    {
        var parametros = new DynamicParameters();
        parametros.Add("IdConsulta", idConsulta);
        parametros.Add("IdListaOfertada", dbType: DbType.Int32, direction: ParameterDirection.Output);

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_OferecerVaga", parametros, commandType: CommandType.StoredProcedure);
        return parametros.Get<int?>("IdListaOfertada");
    }

    // @Minutos fica NULL: a procedure lê o prazo em Parametros
    public async Task ExpirarOfertasVencidasAsync()
    {
        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync("sp_ExpirarOfertasVencidas", commandType: CommandType.StoredProcedure);
    }
}
