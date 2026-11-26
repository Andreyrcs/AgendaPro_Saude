using System.Data;
using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class PrevencaoRepositorio : IPrevencaoRepositorio
{
    private const string SelectCampanha = @"
        SELECT Id_Campanha AS Id, Mes, Ano, Nome, Tema
        FROM Campanhas_Prevencao";

    private const string SelectExame = @"
        SELECT Id_ExamePrevencao AS Id, IdCampanha, Titulo, Nota, Especialidade
        FROM Exames_Prevencao";

    // Três blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper)
    private const string SelectItem = @"
        SELECT PP.Id_PessoaPrevencao AS Id, PP.IdPaciente, PP.IdCampanha, PP.IdExamePrevencao, PP.IdConsulta, PP.Status,
               EP.Id_ExamePrevencao AS Id, EP.IdCampanha, EP.Titulo, EP.Nota, EP.Especialidade,
               P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor
        FROM Pessoa_Prevencao PP
        INNER JOIN Exames_Prevencao EP ON EP.Id_ExamePrevencao = PP.IdExamePrevencao
        INNER JOIN Pacientes P ON P.Id_Paciente = PP.IdPaciente";

    private readonly IFabricaConexao _fabrica;

    public PrevencaoRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    private static Task<IEnumerable<ItemPrevencaoCompleto>> ListarItens(IDbConnection conexao, string sql, object parametros) =>
        conexao.QueryAsync<PessoaPrevencao, ExamePrevencao, Paciente, ItemPrevencaoCompleto>(
            sql,
            (i, e, p) => new ItemPrevencaoCompleto { Item = i, Exame = e, Paciente = p },
            parametros, splitOn: "Id,Id");

    public async Task<IEnumerable<CampanhaPrevencao>> ListarCampanhasAsync(int mesDe, int mesAte)
    {
        const string sql = SelectCampanha + @"
            WHERE Ano * 12 + (Mes - 1) BETWEEN @De AND @Ate
            ORDER BY Ano, Mes;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<CampanhaPrevencao>(sql, new { De = mesDe, Ate = mesAte });
    }

    public async Task<CampanhaPrevencao?> BuscarCampanhaAsync(int ano, int mes)
    {
        const string sql = SelectCampanha + " WHERE Ano = @Ano AND Mes = @Mes;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<CampanhaPrevencao>(sql, new { Ano = ano, Mes = mes });
    }

    public async Task<IEnumerable<ExamePrevencao>> ListarExamesAsync(IEnumerable<int> idsCampanhas)
    {
        const string sql = SelectExame + @"
            WHERE IdCampanha IN @Ids OR IdCampanha IS NULL
            ORDER BY Id_ExamePrevencao;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<ExamePrevencao>(sql, new { Ids = idsCampanhas });
    }

    public async Task<ExamePrevencao?> BuscarExameAsync(int idExame)
    {
        const string sql = SelectExame + " WHERE Id_ExamePrevencao = @Id;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<ExamePrevencao>(sql, new { Id = idExame });
    }

    public async Task<IEnumerable<ItemPrevencaoCompleto>> ListarItensDaContaAsync(int idConta, IEnumerable<int> idsCampanhas)
    {
        const string sql = SelectItem + @"
            WHERE P.IdUsuario = @IdConta AND PP.IdCampanha IN @Ids
            ORDER BY PP.Id_PessoaPrevencao;";

        using var conexao = _fabrica.CriarConexao();
        return await ListarItens(conexao, sql, new { IdConta = idConta, Ids = idsCampanhas });
    }

    public async Task<ItemPrevencaoCompleto?> BuscarItemAsync(int idItem)
    {
        using var conexao = _fabrica.CriarConexao();
        var linhas = await ListarItens(conexao, SelectItem + " WHERE PP.Id_PessoaPrevencao = @Id;", new { Id = idItem });
        return linhas.SingleOrDefault();
    }

    // Conferido antes de gravar, para responder 400 com mensagem (UQ_Prevencao_Paciente_Exame)
    public async Task<bool> ItemExisteAsync(int idPaciente, int idCampanha, int idExame)
    {
        const string sql = @"
            SELECT CAST(CASE WHEN EXISTS (
                SELECT 1 FROM Pessoa_Prevencao
                WHERE IdPaciente = @IdPaciente AND IdCampanha = @IdCampanha AND IdExamePrevencao = @IdExame)
            THEN 1 ELSE 0 END AS BIT);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<bool>(sql,
            new { IdPaciente = idPaciente, IdCampanha = idCampanha, IdExame = idExame });
    }

    public async Task<int> CriarItemAsync(PessoaPrevencao item)
    {
        const string sql = @"
            INSERT INTO Pessoa_Prevencao (IdPaciente, IdCampanha, IdExamePrevencao, Status)
            OUTPUT INSERTED.Id_PessoaPrevencao
            VALUES (@IdPaciente, @IdCampanha, @IdExamePrevencao, @Status);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(sql, item);
    }

    public async Task AtualizarItemAsync(int idItem, string status, int? idConsulta)
    {
        const string sql = @"
            UPDATE Pessoa_Prevencao SET Status = @Status, IdConsulta = @IdConsulta
            WHERE Id_PessoaPrevencao = @Id;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { Id = idItem, Status = status, IdConsulta = idConsulta });
    }
}
