using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class EspecialidadesController : ControllerBase
{
    private readonly IEspecialidadeServico _servico;

    public EspecialidadesController(IEspecialidadeServico servico)
    {
        _servico = servico;
    }

    [HttpGet("api/clinicas/{idClinica:int}/especialidades")]
    public async Task<ActionResult<IEnumerable<EspecialidadeResposta>>> ListarPorClinica(int idClinica)
    {
        var especialidades = await _servico.ListarPorClinicaAsync(idClinica);
        return Ok(especialidades);
    }
}