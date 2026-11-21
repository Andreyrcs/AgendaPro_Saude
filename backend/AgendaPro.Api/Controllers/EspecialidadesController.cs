using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class EspecialidadesController : ApiControllerBase
{
    private readonly IEspecialidadeServico _servico;

    public EspecialidadesController(IEspecialidadeServico servico)
    {
        _servico = servico;
    }

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/especialidades")]
    public async Task<ActionResult<IEnumerable<EspecialidadeResposta>>> ListarPorClinica(int idClinica)
    {
        return Ok(await _servico.ListarPorClinicaAsync(idClinica));
    }
}