using System.Data;

namespace AgendaPro.Api.Repositorios;

public interface IFabricaConexao
{
    IDbConnection CriarConexao();
}