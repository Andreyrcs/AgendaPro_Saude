using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IPacienteRepositorio
{
    Task<bool> CpfExisteAsync(string cpf);
    Task<Paciente?> BuscarPorIdAsync(int idPaciente);
    Task<(int IdUsuario, int IdPaciente)> CriarContaComTitularAsync(Usuario usuario, Paciente titular, int? idClinica);
}