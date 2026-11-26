using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class ListaEsperaController : ApiControllerBase
{
    private readonly IListaEsperaServico _servico;

    public ListaEsperaController(IListaEsperaServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    // Sem fila: 200 com o corpo null (aplicativo-integracao-api.md: "devolve null ou ...")
    [Authorize(Roles = "paciente")]
    [HttpGet("api/pacientes/{id:int}/lista-espera")]
    public async Task<IActionResult> MinhaFila(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();

        var fila = await _servico.MinhaFilaAsync(id);
        if (fila is null)
            return Content("null", "application/json");
        return Ok(fila);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/lista-espera")]
    public async Task<ActionResult<IEnumerable<FilaMedicoResposta>>> FilaDaClinica(int idClinica)
    {
        var resposta = await _servico.FilaDaClinicaAsync(idClinica, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente,recepcao,dono")]
    [HttpPost("api/lista-espera")]
    public async Task<ActionResult<FilaPacienteResposta>> Entrar(EntradaFilaRequisicao dados)
    {
        var resposta = await _servico.EntrarAsync(dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "paciente,recepcao,dono")]
    [HttpDelete("api/lista-espera/{id:int}")]
    public async Task<IActionResult> Sair(int id)
    {
        if (!await _servico.SairAsync(id, Logado))
            return Forbid();
        return NoContent();
    }

    // Aceitar: 200 com a consulta. Recusar: 204 (o app lê como null)
    [Authorize(Roles = "paciente")]
    [HttpPut("api/lista-espera/{id:int}/vaga")]
    public async Task<ActionResult<ConsultaResposta>> ResponderVaga(int id, RespostaVagaRequisicao dados)
    {
        var consulta = await _servico.ResponderVagaAsync(id, dados, Logado);
        if (consulta is null)
            return NoContent();
        return Ok(consulta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPost("api/consultas/{id:int}/oferecer")]
    public async Task<ActionResult<OfertaResposta>> Oferecer(int id)
    {
        var resposta = await _servico.OferecerAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }
}
