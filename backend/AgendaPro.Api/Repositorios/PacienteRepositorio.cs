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
}