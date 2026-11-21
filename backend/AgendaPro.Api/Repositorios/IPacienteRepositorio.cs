using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IPacienteRepositorio
{
    Task<bool> CpfExisteAsync(string cpf);
    Task<(int IdUsuario, int IdPaciente)> CriarContaComTitularAsync(Usuario usuario, Paciente titular);
}