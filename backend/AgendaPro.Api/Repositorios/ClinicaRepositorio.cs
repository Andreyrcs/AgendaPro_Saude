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

    private const string SelectClinica = @"
        SELECT C.Id_Clinica AS Id, C.Nome_Clinica AS Nome, C.Endereco, C.Telefone, C.CNPJ AS Cnpj,
               C.Cidade, C.UF AS Uf, C.Codigo, C.Publica
        FROM Clinica C";

    public async Task<Clinica?> BuscarPorIdAsync(int id)
    {
        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Clinica>(SelectClinica + " WHERE C.Id_Clinica = @Id;", new { Id = id });
    }

    public async Task<Clinica?> BuscarPorCodigoAsync(string codigo)
    {
        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Clinica>(SelectClinica + " WHERE C.Codigo = @Codigo;",
            new { Codigo = codigo });
    }

    // O banco é Latin1_General_CI_AS (diferencia acento); o COLLATE ..._CI_AI faz "clinica" achar "Clínica",
    // como o semAcento de buscarClinicas (frontend/assets/js/api.js)
    public async Task<IEnumerable<Clinica>> BuscarPublicasAsync(string busca)
    {
        const string sql = SelectClinica + @"
            WHERE C.Publica = 1
              AND (@Busca = ''
                   OR C.Nome_Clinica COLLATE Latin1_General_CI_AI LIKE '%' + @Busca + '%'
                   OR C.Cidade COLLATE Latin1_General_CI_AI LIKE '%' + @Busca + '%')
            ORDER BY C.Nome_Clinica;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Clinica>(sql, new { Busca = busca });
    }

    public async Task<IEnumerable<Clinica>> ListarDaContaAsync(int idConta)
    {
        const string sql = SelectClinica + @"
            INNER JOIN Paciente_Clinica PC ON PC.IdClinica = C.Id_Clinica
            WHERE PC.IdUsuario = @IdConta
            ORDER BY PC.VinculadoEm;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Clinica>(sql, new { IdConta = idConta });
    }

    public async Task VincularContaAsync(int idConta, int idClinica)
    {
        const string sql = "INSERT INTO Paciente_Clinica (IdUsuario, IdClinica) VALUES (@IdConta, @IdClinica);";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, new { IdConta = idConta, IdClinica = idClinica });
    }

    public async Task AtualizarAsync(Clinica clinica)
    {
        const string sql = @"
            UPDATE Clinica
            SET Nome_Clinica = @Nome, Endereco = @Endereco, Telefone = @Telefone,
                Cidade = @Cidade, UF = @Uf, Publica = @Publica
            WHERE Id_Clinica = @Id;";

        using var conexao = _fabrica.CriarConexao();
        await conexao.ExecuteAsync(sql, clinica);
    }
}
