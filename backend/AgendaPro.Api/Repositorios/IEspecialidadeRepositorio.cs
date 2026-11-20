using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IEspecialidadeRepositorio
{
    Task<IEnumerable<Especialidade>> ListarPorClinicaAsync(int idClinica);
}