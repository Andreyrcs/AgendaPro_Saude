using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// Calendário de prevenção do paciente (Apêndice C)
[ApiController]
[Authorize(Roles = "paciente")]
public class PrevencaoController : ApiControllerBase
{
    private readonly IPrevencaoServico _servico;

    public PrevencaoController(IPrevencaoServico servico)
    {
        _servico = servico;
    }

    [HttpGet("api/pacientes/{id:int}/prevencao")]
    public async Task<ActionResult<IEnumerable<MesPrevencaoResposta>>> Listar(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarAsync(id));
    }

    [HttpPost("api/pacientes/{id:int}/prevencao")]
    public async Task<ActionResult<ItemPrevencaoResposta>> Incluir(int id, InclusaoPrevencaoRequisicao dados)
    {
        if (id != IdUsuarioLogado)
            return Forbid();

        var resposta = await _servico.IncluirAsync(id, dados);
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [HttpPut("api/prevencao/{id:int}")]
    public async Task<ActionResult<ItemPrevencaoResposta>> Alterar(int id, ItemPrevencaoRequisicao dados)
    {
        return Ok(await _servico.AlterarAsync(id, dados, IdUsuarioLogado));
    }
}
