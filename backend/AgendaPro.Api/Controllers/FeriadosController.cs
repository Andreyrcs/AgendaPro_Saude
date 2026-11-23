using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// L3: feriados (tabela global do Apêndice Q, sem clínica). Todos os perfis leem; recepção e dono cadastram e removem.
[ApiController]
public class FeriadosController : ApiControllerBase
{
    private readonly IFeriadoServico _servico;

    public FeriadosController(IFeriadoServico servico)
    {
        _servico = servico;
    }

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/feriados")]
    public async Task<ActionResult<IEnumerable<FeriadoResposta>>> Listar([FromQuery] PeriodoAgendaRequisicao periodo)
    {
        return Ok(await _servico.ListarAsync(periodo.De!.Value, periodo.Ate!.Value));
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPost("api/feriados")]
    public async Task<ActionResult<FeriadoResposta>> Cadastrar(FeriadoRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpDelete("api/feriados/{id:int}")]
    public async Task<IActionResult> Remover(int id)
    {
        await _servico.RemoverAsync(id);
        return NoContent();
    }
}
