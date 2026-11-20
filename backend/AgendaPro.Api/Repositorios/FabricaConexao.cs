using System.Data;
using Microsoft.Data.SqlClient;

namespace AgendaPro.Api.Repositorios;

public class FabricaConexao : IFabricaConexao
{
    private readonly string _stringConexao;

    public FabricaConexao(IConfiguration configuracao)
    {
        _stringConexao = configuracao.GetConnectionString("AgendaPro")
            ?? throw new InvalidOperationException("A string de conexão 'AgendaPro' não foi configurada.");
    }

    public IDbConnection CriarConexao()
    {
        return new SqlConnection(_stringConexao);
    }
}