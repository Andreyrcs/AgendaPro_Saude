using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class PacienteRepositorio : IPacienteRepositorio
{
    private readonly IFabricaConexao _fabrica;

    public PacienteRepositorio(IFabricaConexao fabrica)
    {
        _fabrica = fabrica;
    }

    public async Task<bool> CpfExisteAsync(string cpf)
    {
        const string sql = "SELECT COUNT(1) FROM Pacientes WHERE CPF = @Cpf;";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { Cpf = cpf });
        return quantidade > 0;
    }

    public async Task<Paciente?> BuscarPorIdAsync(int idPaciente)
    {
        const string sql = @"
            SELECT Id_Paciente AS Id, IdUsuario, Nome_paciente AS Nome, CPF AS Cpf,
                   Data_Nascimento AS DataNascimento, Alergias, Parentesco, Cor
            FROM Pacientes
            WHERE Id_Paciente = @Id;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Paciente>(sql, new { Id = idPaciente });
    }

    public async Task<(int IdUsuario, int IdPaciente)> CriarContaComTitularAsync(Usuario usuario, Paciente titular, int? idClinica)
    {
        const string sqlUsuario = @"
            INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, Telefone)
            OUTPUT INSERTED.Id_Usuario
            VALUES (@Email, @SenhaHash, @Papel, @Nome, @Telefone);";

        const string sqlPaciente = @"
            INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Alergias, Parentesco)
            OUTPUT INSERTED.Id_Paciente
            VALUES (@IdUsuario, @Nome, @Cpf, @DataNascimento, @Alergias, @Parentesco);";

        const string sqlVinculo = @"
            INSERT INTO Paciente_Clinica (IdUsuario, IdClinica)
            VALUES (@IdUsuario, @IdClinica);";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        var idUsuario = await conexao.QuerySingleAsync<int>(sqlUsuario, usuario, transacao);

        titular.IdUsuario = idUsuario;
        var idPaciente = await conexao.QuerySingleAsync<int>(sqlPaciente, titular, transacao);

        if (idClinica.HasValue)
            await conexao.ExecuteAsync(sqlVinculo, new { IdUsuario = idUsuario, IdClinica = idClinica.Value }, transacao);

        transacao.Commit();
        return (idUsuario, idPaciente);
    }

    private const string SelectPaciente = @"
        SELECT P.Id_Paciente AS Id, P.IdUsuario, P.Nome_paciente AS Nome, P.CPF AS Cpf,
               P.Data_Nascimento AS DataNascimento, P.Alergias, P.Parentesco, P.Cor
        FROM Pacientes P";

    public async Task<IEnumerable<Paciente>> ListarDaContaAsync(int idConta)
    {
        const string sql = SelectPaciente + @"
            WHERE P.IdUsuario = @IdConta
            ORDER BY CASE WHEN P.Parentesco = 'Titular' THEN 0 ELSE 1 END, P.Id_Paciente;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Paciente>(sql, new { IdConta = idConta });
    }

    public async Task<int> CriarFamiliarAsync(Paciente familiar)
    {
        const string sqlComCor = @"
            INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Alergias, Parentesco, Cor)
            OUTPUT INSERTED.Id_Paciente
            VALUES (@IdUsuario, @Nome, @Cpf, @DataNascimento, @Alergias, @Parentesco, @Cor);";

        const string sqlSemCor = @"
            INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Alergias, Parentesco)
            OUTPUT INSERTED.Id_Paciente
            VALUES (@IdUsuario, @Nome, @Cpf, @DataNascimento, @Alergias, @Parentesco);";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<int>(string.IsNullOrEmpty(familiar.Cor) ? sqlSemCor : sqlComCor, familiar);
    }

    // COLLATE ..._CI_AI: o nome é procurado sem diferenciar acento (semAcento de pagina-pacientes.js)
    public async Task<IEnumerable<Paciente>> ListarDaClinicaAsync(int idClinica, string? nome, string? cpf)
    {
        const string sql = SelectPaciente + @"
            INNER JOIN Paciente_Clinica PC ON PC.IdUsuario = P.IdUsuario AND PC.IdClinica = @IdClinica
            WHERE (@Nome IS NULL OR P.Nome_paciente COLLATE Latin1_General_CI_AI LIKE '%' + @Nome + '%' ESCAPE '\')
              AND (@Cpf IS NULL OR P.CPF LIKE '%' + @Cpf + '%' ESCAPE '\')
            ORDER BY P.Nome_paciente;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Paciente>(sql,
            new { IdClinica = idClinica, Nome = TextoLike.Escapar(nome), Cpf = TextoLike.Escapar(cpf) });
    }
}