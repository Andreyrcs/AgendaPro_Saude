using Dapper;

namespace AgendaPro.Api.Repositorios;

public class MedicoRepositorio : IMedicoRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public MedicoRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<int?> BuscarIdPorUsuarioAsync(int idUsuario)
    {
        const string sql = "SELECT Id_Medico FROM Medicos WHERE IdUsuario = @IdUsuario;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<int?>(sql, new { IdUsuario = idUsuario });
    }
}