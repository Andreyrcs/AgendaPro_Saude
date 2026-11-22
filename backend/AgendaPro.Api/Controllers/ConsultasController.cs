using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class ConsultasController : ApiControllerBase
{
    private readonly IConsultaServico _servico;

    public ConsultasController(IConsultaServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/consultas/{id:int}")]
    public async Task<ActionResult<ConsultaResposta>> Obter(int id)
    {
        var resposta = await _servico.ObterAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente")]
    [HttpGet("api/pacientes/{id:int}/consultas")]
    public async Task<ActionResult<ConsultasDaContaResposta>> ListarDaConta(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarDaContaAsync(id));
    }

    [Authorize(Roles = "paciente,recepcao,dono")]
    [HttpPost("api/consultas")]
    public async Task<ActionResult<ConsultaResposta>> Agendar(AgendamentoRequisicao dados)
    {
        var resposta = await _servico.AgendarAsync(dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPut("api/consultas/{id:int}")]
    public async Task<ActionResult<ConsultaResposta>> Reagendar(int id, ReagendamentoRequisicao dados)
    {
        var resposta = await _servico.ReagendarAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente,recepcao,dono")]
    [HttpDelete("api/consultas/{id:int}")]
    public async Task<ActionResult<CancelamentoResposta>> Cancelar(int id)
    {
        var resposta = await _servico.CancelarAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente")]
    [HttpPut("api/consultas/{id:int}/presenca")]
    public async Task<IActionResult> ResponderPresenca(int id, PresencaRequisicao dados)
    {
        return Ok(await _servico.ResponderPresencaAsync(id, dados, Logado));
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/agenda")]
    public async Task<ActionResult<IEnumerable<ConsultaResposta>>> AgendaDaClinica(int idClinica,
        [FromQuery] PeriodoAgendaRequisicao periodo)
    {
        var resposta = await _servico.AgendaDaClinicaAsync(idClinica, periodo, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    // Dono incluído (Apêndice G: tudo o que a recepção faz)
    [Authorize(Roles = "recepcao,dono,medico")]
    [HttpPut("api/consultas/{id:int}/status")]
    public async Task<ActionResult<ConsultaResposta>> MudarStatus(int id, StatusRequisicao dados)
    {
        var resposta = await _servico.MudarStatusAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }
}
