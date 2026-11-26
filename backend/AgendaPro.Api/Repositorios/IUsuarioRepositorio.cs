using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IUsuarioRepositorio
{
    Task<bool> EmailExisteAsync(string email);
    Task<Usuario?> BuscarAtivoPorEmailAsync(string email);
    Task<Usuario?> BuscarAtivoPorIdAsync(int id);
    Task AtualizarSenhaAsync(int id, string senhaHash);

    // Usado a cada requisição (OnTokenValidated): a conta desativada perde o acesso na hora
    Task<bool> EstaAtivoAsync(int id);

    // Contas ativas da clínica que não são de paciente: dono, recepção e médicos
    Task<IEnumerable<Usuario>> ListarEquipeAsync(int idClinica);
    Task<int> CriarAsync(Usuario usuario);
    Task DesativarAsync(int id);
}