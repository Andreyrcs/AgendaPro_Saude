using Dapper;

namespace AgendaPro.Api.Repositorios;

public class UsuarioRepositorio : IUsuarioRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public UsuarioRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<bool> EmailExisteAsync(string email)
    {
        const string sql = "SELECT COUNT(1) FROM Usuarios WHERE Email = @Email;";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { Email = email });
        return quantidade > 0;
    }
}