using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class PacientesController : ApiControllerBase
{
    private readonly IPacienteServico _servico;

    public PacientesController(IPacienteServico servico)
    {
        _servico = servico;
    }

    [AllowAnonymous]
    [HttpPost("api/pacientes")]
    public async Task<ActionResult<PacienteCadastradoResposta>> Cadastrar(CadastroPacienteRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "paciente")]
    [HttpGet("api/pacientes/{id:int}/familiares")]
    public async Task<ActionResult<IEnumerable<FamiliarResposta>>> ListarFamiliares(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarFamiliaresAsync(id));
    }

    [Authorize(Roles = "paciente")]
    [HttpPost("api/pacientes/{id:int}/familiares")]
    public async Task<ActionResult<FamiliarResposta>> AdicionarFamiliar(int id, FamiliarRequisicao dados)
    {
        if (id != IdUsuarioLogado)
            return Forbid();

        var resposta = await _servico.AdicionarFamiliarAsync(id, dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/pacientes")]
    public async Task<ActionResult<IEnumerable<PacienteDaClinicaResposta>>> ListarDaClinica(int idClinica,
        [FromQuery] string? busca, [FromQuery] string? filtro)
    {
        var resposta = await _servico.ListarDaClinicaAsync(idClinica, busca, filtro, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }
}