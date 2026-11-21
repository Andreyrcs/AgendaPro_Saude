namespace AgendaPro.Api.Repositorios;

public interface IMedicoRepositorio
{
    Task<int?> BuscarIdPorUsuarioAsync(int idUsuario);
}