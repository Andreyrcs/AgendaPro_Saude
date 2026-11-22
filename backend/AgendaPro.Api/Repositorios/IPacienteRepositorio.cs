using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IPacienteRepositorio
{
    Task<bool> CpfExisteAsync(string cpf);
    Task<Paciente?> BuscarPorIdAsync(int idPaciente);
    Task<(int IdUsuario, int IdPaciente)> CriarContaComTitularAsync(Usuario usuario, Paciente titular, int? idClinica);

    // Titular primeiro, depois os familiares na ordem em que foram incluídos
    Task<IEnumerable<Paciente>> ListarDaContaAsync(int idConta);

    // Familiar novo na conta; sem cor, fica o padrão do banco (Pacientes.Cor)
    Task<int> CriarFamiliarAsync(Paciente familiar);

    // Pessoas das contas vinculadas à clínica; nome e cpf são filtros opcionais ("contém")
    Task<IEnumerable<Paciente>> ListarDaClinicaAsync(int idClinica, string? nome, string? cpf);
}