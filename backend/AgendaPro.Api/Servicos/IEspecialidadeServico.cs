using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IEspecialidadeServico
{
    Task<IEnumerable<EspecialidadeResposta>> ListarPorClinicaAsync(int idClinica);
}