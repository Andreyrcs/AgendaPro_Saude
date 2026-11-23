using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IEspecialidadeRepositorio
{
    Task<IEnumerable<Especialidade>> ListarPorClinicaAsync(int idClinica);
    Task<Especialidade?> BuscarPorIdAsync(int id);
    Task<bool> NomeExisteNaClinicaAsync(int idClinica, string nome, int? ignorarId = null);
    Task AtualizarAsync(Especialidade especialidade);
    Task<int> CriarAsync(Especialidade especialidade);
}
