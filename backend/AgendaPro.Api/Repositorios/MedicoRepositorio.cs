using AgendaPro.Api.Modelos;
using Dapper;

namespace AgendaPro.Api.Repositorios;

public class MedicoRepositorio : IMedicoRepositorio
{
    // Só médicos com a conta ativa (L6: o médico desativado some das listas e não recebe consulta nem fila nova;
    // o histórico continua no banco e aparece nas consultas antigas, que não passam por aqui)
    private const string SelectMedico = @"
        SELECT M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala
        FROM Medicos M
        INNER JOIN Usuarios U ON U.Id_Usuario = M.IdUsuario AND U.Ativo = 1";

    // Três blocos de colunas, separados pelas colunas "Id" (multi-mapeamento do Dapper)
    private const string SelectCompleto = @"
        SELECT M.Id_Medico AS Id, M.IdUsuario, M.IdEspecialidade, M.IdClinica, M.Nome, M.CRM AS Crm, M.Sala,
               E.Id_Especialidade AS Id, E.IdClinica, E.Nome_Espec AS Nome, E.DuracaoPadrao,
               U.Id_Usuario AS Id, U.Email, U.Papel, U.Nome, U.Telefone, U.IdClinica, U.Ativo
        FROM Medicos M
        INNER JOIN Especialidades E ON E.Id_Especialidade = M.IdEspecialidade
        INNER JOIN Usuarios U ON U.Id_Usuario = M.IdUsuario";

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

    public async Task<Medico?> BuscarPorIdAsync(int id)
    {
        const string sql = SelectMedico + " WHERE M.Id_Medico = @Id;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleOrDefaultAsync<Medico>(sql, new { Id = id });
    }

    public async Task<IEnumerable<Medico>> ListarPorEspecialidadeAsync(int idEspecialidade)
    {
        const string sql = SelectMedico + " WHERE M.IdEspecialidade = @IdEspecialidade ORDER BY M.Nome;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Medico>(sql, new { IdEspecialidade = idEspecialidade });
    }

    public async Task<IEnumerable<(Medico Medico, Especialidade Especialidade, Usuario Conta)>> ListarCompletosPorClinicaAsync(int idClinica)
    {
        const string sql = SelectCompleto + " WHERE M.IdClinica = @IdClinica AND U.Ativo = 1 ORDER BY M.Nome;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QueryAsync<Medico, Especialidade, Usuario, (Medico, Especialidade, Usuario)>(
            sql, (m, e, u) => (m, e, u), new { IdClinica = idClinica }, splitOn: "Id,Id");
    }

    public async Task<(Medico Medico, Especialidade Especialidade, Usuario Conta)?> BuscarCompletoAsync(int id)
    {
        const string sql = SelectCompleto + " WHERE M.Id_Medico = @Id;";

        using var conexao = _fabrica.CriarConexao();
        var linhas = await conexao.QueryAsync<Medico, Especialidade, Usuario, (Medico, Especialidade, Usuario)>(
            sql, (m, e, u) => (m, e, u), new { Id = id }, splitOn: "Id,Id");
        return linhas.Cast<(Medico, Especialidade, Usuario)?>().SingleOrDefault();
    }

    // L6: o que impede desativar o médico. Consultas de hoje em diante ainda por atender
    // (confirmada, na recepção, em atendimento) e pessoas na fila dele (aguardando ou com vaga oferecida).
    public async Task<(int Consultas, int Fila)> ContarCompromissosAsync(int idMedico)
    {
        const string sql = @"
            SELECT
                (SELECT COUNT(1)
                 FROM Consultas C
                 INNER JOIN Status_Consulta S ON S.Id_Status = C.IdStatus
                 WHERE C.IdMedico = @IdMedico
                   AND C.DataConsulta >= CAST(GETDATE() AS DATE)
                   AND S.Codigo_consulta IN ('CONFIRMADA', 'NA_RECEPCAO', 'EM_ATENDIMENTO')) AS Consultas,
                (SELECT COUNT(1)
                 FROM Lista_Espera
                 WHERE IdMedico = @IdMedico
                   AND StatusOferta IN ('AGUARDANDO', 'OFERECIDA')) AS Fila;";

        using var conexao = _fabrica.CriarConexao();
        return await conexao.QuerySingleAsync<(int, int)>(sql, new { IdMedico = idMedico });
    }

    public async Task<bool> CrmExisteAsync(string crm, int? ignorarIdMedico)
    {
        const string sql = @"
            SELECT COUNT(1) FROM Medicos
            WHERE CRM = @Crm AND (@Ignorar IS NULL OR Id_Medico <> @Ignorar);";

        using var conexao = _fabrica.CriarConexao();
        var quantidade = await conexao.ExecuteScalarAsync<int>(sql, new { Crm = crm, Ignorar = ignorarIdMedico });
        return quantidade > 0;
    }

    // A conta do médico (Usuarios) e o cadastro (Medicos) na mesma transação
    public async Task<int> CriarComContaAsync(Usuario conta, Medico medico)
    {
        const string sqlConta = @"
            INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, Telefone, IdClinica)
            OUTPUT INSERTED.Id_Usuario
            VALUES (@Email, @SenhaHash, @Papel, @Nome, @Telefone, @IdClinica);";

        const string sqlMedico = @"
            INSERT INTO Medicos (IdUsuario, IdEspecialidade, IdClinica, Nome, CRM, Sala)
            OUTPUT INSERTED.Id_Medico
            VALUES (@IdUsuario, @IdEspecialidade, @IdClinica, @Nome, @Crm, @Sala);";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        medico.IdUsuario = await conexao.QuerySingleAsync<int>(sqlConta, conta, transacao);
        var idMedico = await conexao.QuerySingleAsync<int>(sqlMedico, medico, transacao);

        transacao.Commit();
        return idMedico;
    }

    // O nome fica igual nas duas tabelas; o telefone do médico é o da conta (api.js:348-349)
    public async Task AtualizarAsync(Medico medico, string? telefone)
    {
        const string sqlMedico = @"
            UPDATE Medicos
            SET Nome = @Nome, CRM = @Crm, IdEspecialidade = @IdEspecialidade, Sala = @Sala
            WHERE Id_Medico = @Id;";

        const string sqlConta = "UPDATE Usuarios SET Nome = @Nome, Telefone = @Telefone WHERE Id_Usuario = @IdUsuario;";

        using var conexao = _fabrica.CriarConexao();
        conexao.Open();
        using var transacao = conexao.BeginTransaction();

        await conexao.ExecuteAsync(sqlMedico, medico, transacao);
        await conexao.ExecuteAsync(sqlConta, new { medico.Nome, Telefone = telefone, medico.IdUsuario }, transacao);

        transacao.Commit();
    }
}
