using AgendaPro.Api.Dtos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class EspecialidadeServico : IEspecialidadeServico
{
    private readonly IEspecialidadeRepositorio _repositorio;

    public EspecialidadeServico(IEspecialidadeRepositorio repositorio)
    {
        _repositorio = repositorio;
    }

    public async Task<IEnumerable<EspecialidadeResposta>> ListarPorClinicaAsync(int idClinica)
    {
        var especialidades = await _repositorio.ListarPorClinicaAsync(idClinica);

        return especialidades
            .Select(e => new EspecialidadeResposta(e.Id, e.Nome, e.DuracaoPadrao))
            .ToList();
    }
}