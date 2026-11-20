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
}