using Dapper;

namespace AgendaPro.Api.Repositorios;

public class ClinicaRepositorio : IClinicaRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public ClinicaRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<int?> BuscarIdPorCodigoAsync(string codigo)
    {
        const string sql = "SELECT Id_Clinica FROM Clinica WHERE Codigo = @Codigo;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<int?>(sql, new { Codigo = codigo });
    }
}