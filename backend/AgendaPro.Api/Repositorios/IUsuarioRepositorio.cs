using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IUsuarioRepositorio
{
    Task<bool> EmailExisteAsync(string email);
    Task<Usuario?> BuscarAtivoPorEmailAsync(string email);
}