using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class ClinicasController : ApiControllerBase
{
    private readonly IClinicaServico _servico;

    public ClinicasController(IClinicaServico servico)
    {
        _servico = servico;
    }

    [AllowAnonymous]
    [HttpPost("api/clinicas")]
    public async Task<ActionResult<ClinicaCadastradaResposta>> Cadastrar(CadastroClinicaRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }
}
