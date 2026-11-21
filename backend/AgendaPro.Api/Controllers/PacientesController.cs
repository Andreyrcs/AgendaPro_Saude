using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class PacientesController : ControllerBase
{
    private readonly IPacienteServico _servico;

    public PacientesController(IPacienteServico servico)
    {
        _servico = servico;
    }

    [HttpPost("api/pacientes")]
    public async Task<ActionResult<PacienteCadastradoResposta>> Cadastrar(CadastroPacienteRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }
}