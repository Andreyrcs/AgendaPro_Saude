using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// Faltas e situação da conta (Quadro 5.2 e Apêndice I). O dono faz tudo o que a recepção faz (Apêndice G).
[ApiController]
public class FaltasController : ApiControllerBase
{
    private readonly IFaltaServico _servico;

    public FaltasController(IFaltaServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/faltas")]
    public async Task<ActionResult<IEnumerable<FaltaResposta>>> ListarDaClinica(int idClinica, [FromQuery] int? paciente)
    {
        var resposta = await _servico.ListarDaClinicaAsync(idClinica, paciente, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "recepcao,dono,medico")]
    [HttpPost("api/consultas/{id:int}/falta")]
    public async Task<ActionResult<FaltaResposta>> Registrar(int id)
    {
        var resposta = await _servico.RegistrarAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPut("api/faltas/{id:int}/retirar")]
    public async Task<ActionResult<FaltaResposta>> Retirar(int id, RetiradaFaltaRequisicao dados)
    {
        var resposta = await _servico.RetirarAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    // {id} = a conta do paciente. O paciente só vê a própria; a equipe, só conta vinculada à clínica
    [Authorize(Roles = "paciente,recepcao,dono")]
    [HttpGet("api/pacientes/{id:int}/situacao")]
    public async Task<ActionResult<SituacaoResposta>> Situacao(int id)
    {
        var resposta = await _servico.SituacaoAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }
}
