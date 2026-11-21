using AgendaPro.Api.Modelos;
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

    public async Task<bool> CnpjExisteAsync(string cnpj)
    {
        const string sql = "SELECT COUNT(1) FROM Clinica WHERE CNPJ = @Cnpj;";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { Cnpj = cnpj });
        return quantidade > 0;
    }

    // Paciente_Clinica: a conta do paciente está vinculada à clínica?
    public async Task<bool> ContaVinculadaAsync(int idConta, int idClinica)
    {
        const string sql = "SELECT COUNT(1) FROM Paciente_Clinica WHERE IdUsuario = @IdConta AND IdClinica = @IdClinica;";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { IdConta = idConta, IdClinica = idClinica });
        return quantidade > 0;
    }

    public async Task<(int IdClinica, int IdUsuario)> CriarComDonoAsync(Clinica clinica, Usuario dono)
    {
        const string sqlClinica = @"
            INSERT INTO Clinica (Nome_Clinica, Endereco, Telefone, CNPJ, Cidade, UF, Codigo, Publica)
            OUTPUT INSERTED.Id_Clinica
            VALUES (@Nome, @Endereco, @Telefone, @Cnpj, @Cidade, @Uf, @Codigo, @Publica);";

        const string sqlDono = @"
            INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, Telefone, IdClinica)
            OUTPUT INSERTED.Id_Usuario
            VALUES (@Email, @SenhaHash, @Papel, @Nome, @Telefone, @IdClinica);";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        var idClinica = await conexao.QuerySingleAsync<int>(sqlClinica, clinica, transacao);

        // CK_Usuarios_Clinica: a conta do dono precisa da clínica
        dono.IdClinica = idClinica;
        var idUsuario = await conexao.QuerySingleAsync<int>(sqlDono, dono, transacao);

        transacao.Commit();
        return (idClinica, idUsuario);
    }
}
