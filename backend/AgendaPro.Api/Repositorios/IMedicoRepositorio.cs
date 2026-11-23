using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IMedicoRepositorio
{
    Task<int?> BuscarIdPorUsuarioAsync(int idUsuario);
    Task<Medico?> BuscarPorIdAsync(int id);
    Task<IEnumerable<Medico>> ListarPorEspecialidadeAsync(int idEspecialidade);

    // Médico com a especialidade e a conta (o telefone do médico é Usuarios.Telefone)
    Task<IEnumerable<(Medico Medico, Especialidade Especialidade, Usuario Conta)>> ListarCompletosPorClinicaAsync(int idClinica);
    Task<(Medico Medico, Especialidade Especialidade, Usuario Conta)?> BuscarCompletoAsync(int id);

    Task<bool> CrmExisteAsync(string crm, int? ignorarIdMedico);
    Task<(int Consultas, int Fila)> ContarCompromissosAsync(int idMedico);
    Task<int> CriarComContaAsync(Usuario conta, Medico medico);
    Task AtualizarAsync(Medico medico, string? telefone);
}
