using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// Retornos e exames pedidos pelo médico, e o "Depois da consulta" do paciente (Apêndice C)
[ApiController]
public class AcompanhamentoController : ApiControllerBase
{
    private readonly IAcompanhamentoServico _servico;

    public AcompanhamentoController(IAcompanhamentoServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    // Apêndice I: marcar retorno só pelo médico
    [Authorize(Roles = "medico")]
    [HttpPost("api/retornos")]
    public async Task<ActionResult<RetornoResposta>> MarcarRetorno(RetornoRequisicao dados)
    {
        var resposta = await _servico.MarcarRetornoAsync(dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    // Apêndice I: pedir exame só pelo médico
    [Authorize(Roles = "medico")]
    [HttpPost("api/exames")]
    public async Task<ActionResult<ExameResposta>> PedirExame(ExameRequisicao dados)
    {
        var resposta = await _servico.PedirExameAsync(dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    // Apêndice C: médico e recepção; dono incluído (Apêndice G: tudo o que a recepção faz)
    [Authorize(Roles = "medico,recepcao,dono")]
    [HttpPut("api/exames/{id:int}")]
    public async Task<ActionResult<ExameResposta>> MudarSituacaoExame(int id, SituacaoExameRequisicao dados)
    {
        var resposta = await _servico.MudarSituacaoExameAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente")]
    [HttpGet("api/pacientes/{id:int}/acompanhamento")]
    public async Task<ActionResult<AcompanhamentoResposta>> ListarDaConta(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarDaContaAsync(id));
    }
}
