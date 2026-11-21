using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IEspecialidadeRepositorio
{
    Task<IEnumerable<Especialidade>> ListarPorClinicaAsync(int idClinica);
    Task<Especialidade?> BuscarPorIdAsync(int id);
    Task<bool> NomeExisteNaClinicaAsync(int idClinica, string nome);
    Task<int> CriarAsync(Especialidade especialidade);
}
