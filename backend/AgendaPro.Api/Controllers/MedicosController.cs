using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class MedicosController : ApiControllerBase
{
    private readonly IMedicoServico _servico;

    public MedicosController(IMedicoServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/medicos")]
    public async Task<ActionResult<IEnumerable<MedicoResposta>>> ListarPorClinica(int idClinica)
    {
        var resposta = await _servico.ListarPorClinicaAsync(idClinica, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPost("api/clinicas/{idClinica:int}/medicos")]
    public async Task<ActionResult<MedicoCadastradoResposta>> Cadastrar(int idClinica, CadastroMedicoRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(idClinica, dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "recepcao,dono,medico")]
    [HttpPut("api/medicos/{id:int}")]
    public async Task<ActionResult<MedicoResposta>> Atualizar(int id, AtualizacaoMedicoRequisicao dados)
    {
        var resposta = await _servico.AtualizarAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPut("api/medicos/{id:int}/expediente")]
    public async Task<IActionResult> SalvarExpediente(int id, ExpedienteRequisicao dados)
    {
        if (!await _servico.SalvarExpedienteAsync(id, dados, Logado))
            return Forbid();
        return NoContent();
    }
}
