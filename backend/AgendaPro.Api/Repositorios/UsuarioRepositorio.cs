using Dapper;
using AgendaPro.Api.Modelos;
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

    public async Task<Usuario?> BuscarAtivoPorEmailAsync(string email)
    {
        const string sql = @"
            SELECT Id_Usuario AS Id, Email, SenhaHash, Papel, Nome, Telefone, IdClinica, Ativo
            FROM Usuarios
            WHERE Email = @Email AND Ativo = 1;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Usuario>(sql, new { Email = email });
    }

    public async Task<Usuario?> BuscarAtivoPorIdAsync(int id)
    {
        const string sql = @"
            SELECT Id_Usuario AS Id, Email, SenhaHash, Papel, Nome, Telefone, IdClinica, Ativo
            FROM Usuarios
            WHERE Id_Usuario = @Id AND Ativo = 1;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Usuario>(sql, new { Id = id });
    }

    public async Task AtualizarSenhaAsync(int id, string senhaHash)
    {
        const string sql = "UPDATE Usuarios SET SenhaHash = @SenhaHash WHERE Id_Usuario = @Id;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { Id = id, SenhaHash = senhaHash });
    }

    public async Task<bool> EstaAtivoAsync(int id)
    {
        const string sql = "SELECT COUNT(1) FROM Usuarios WHERE Id_Usuario = @Id AND Ativo = 1;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.ExecuteScalarAsync<int>(sql, new { Id = id }) > 0;
    }

    // Ordem de listarEquipe (api.js:317-319): dono, recepção, médicos; depois pelo nome
    public async Task<IEnumerable<Usuario>> ListarEquipeAsync(int idClinica)
    {
        const string sql = @"
            SELECT Id_Usuario AS Id, Email, Papel, Nome, Telefone, IdClinica, Ativo
            FROM Usuarios
            WHERE IdClinica = @IdClinica AND Papel <> 'PACIENTE' AND Ativo = 1
            ORDER BY CASE Papel WHEN 'DONO' THEN 0 WHEN 'RECEPCAO' THEN 1 ELSE 2 END, Nome;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Usuario>(sql, new { IdClinica = idClinica });
    }

    public async Task<int> CriarAsync(Usuario usuario)
    {
        const string sql = @"
            INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, Telefone, IdClinica)
            OUTPUT INSERTED.Id_Usuario
            VALUES (@Email, @SenhaHash, @Papel, @Nome, @Telefone, @IdClinica);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(sql, usuario);
    }

    // "Remover da equipe" desativa a conta, sem apagar (banco-x-telas.md, Usuarios.Ativo)
    public async Task DesativarAsync(int id)
    {
        const string sql = "UPDATE Usuarios SET Ativo = 0 WHERE Id_Usuario = @Id;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { Id = id });
    }
}