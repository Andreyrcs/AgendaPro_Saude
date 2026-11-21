using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class EspecialidadeRepositorio : IEspecialidadeRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public EspecialidadeRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<IEnumerable<Especialidade>> ListarPorClinicaAsync(int idClinica)
    {
        const string sql = @"
            SELECT Id_Especialidade AS Id,
                   IdClinica,
                   Nome_Espec       AS Nome,
                   DuracaoPadrao
            FROM Especialidades
            WHERE IdClinica = @IdClinica
            ORDER BY Nome_Espec;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Especialidade>(sql, new { IdClinica = idClinica });
    }

    public async Task<Especialidade?> BuscarPorIdAsync(int id)
    {
        const string sql = @"
            SELECT Id_Especialidade AS Id, IdClinica, Nome_Espec AS Nome, DuracaoPadrao
            FROM Especialidades
            WHERE Id_Especialidade = @Id;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Especialidade>(sql, new { Id = id });
    }

    public async Task<bool> NomeExisteNaClinicaAsync(int idClinica, string nome)
    {
        const string sql = "SELECT COUNT(1) FROM Especialidades WHERE IdClinica = @IdClinica AND Nome_Espec = @Nome;";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { IdClinica = idClinica, Nome = nome });
        return quantidade > 0;
    }

    public async Task<int> CriarAsync(Especialidade especialidade)
    {
        const string sql = @"
            INSERT INTO Especialidades (IdClinica, Nome_Espec, DuracaoPadrao)
            OUTPUT INSERTED.Id_Especialidade
            VALUES (@IdClinica, @Nome, @DuracaoPadrao);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(sql, especialidade);
    }
}
