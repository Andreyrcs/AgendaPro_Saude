namespace AgendaPro.Api.Repositorios;

public interface IUsuarioRepositorio
{
    Task<bool> EmailExisteAsync(string email);
}