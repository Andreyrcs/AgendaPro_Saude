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

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "paciente")]
    [HttpGet("api/clinicas")]
    public async Task<ActionResult<IEnumerable<ClinicaResposta>>> Buscar([FromQuery] string? busca)
    {
        return Ok(await _servico.BuscarPublicasAsync(busca));
    }

    [Authorize(Roles = "paciente")]
    [HttpGet("api/clinicas/codigo/{codigo}")]
    public async Task<ActionResult<ClinicaResposta>> BuscarPorCodigo(string codigo)
    {
        return Ok(await _servico.BuscarPorCodigoAsync(codigo));
    }

    // L1: dados da própria clínica, com o código, para o dono e a recepção.
    // O médico também lê a dele, mas recebe só o id e o nome (o selo do menu lateral): sem CNPJ, código,
    // endereço nem telefone. De outra clínica, 403.
    [Authorize(Roles = "recepcao,dono,medico")]
    [HttpGet("api/clinicas/{idClinica:int}")]
    public async Task<IActionResult> Obter(int idClinica)
    {
        var resposta = await _servico.ObterAsync(idClinica, Logado);
        if (resposta is null)
            return Forbid();
        if (PapelLogado == "medico")
            return Ok(new ClinicaNomeResposta(resposta.Id, resposta.Nome));
        return Ok(resposta);
    }

    [Authorize(Roles = "dono")]
    [HttpPut("api/clinicas/{idClinica:int}")]
    public async Task<ActionResult<ClinicaResposta>> Atualizar(int idClinica, AtualizacaoClinicaRequisicao dados)
    {
        var resposta = await _servico.AtualizarAsync(idClinica, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/equipe")]
    public async Task<ActionResult<IEnumerable<MembroEquipeResposta>>> ListarEquipe(int idClinica)
    {
        var resposta = await _servico.ListarEquipeAsync(idClinica, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "dono")]
    [HttpPost("api/clinicas/{idClinica:int}/equipe")]
    public async Task<ActionResult<RecepcionistaCadastradaResposta>> CadastrarRecepcionista(int idClinica,
        CadastroRecepcionistaRequisicao dados)
    {
        var resposta = await _servico.CadastrarRecepcionistaAsync(idClinica, dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    [Authorize(Roles = "dono")]
    [HttpPost("api/clinicas/{idClinica:int}/equipe/{usuarioId:int}/senha-provisoria")]
    public async Task<ActionResult<SenhaProvisoriaResposta>> GerarSenhaProvisoria(int idClinica, int usuarioId)
    {
        var resposta = await _servico.GerarSenhaProvisoriaAsync(idClinica, usuarioId, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "dono")]
    [HttpDelete("api/clinicas/{idClinica:int}/equipe/{usuarioId:int}")]
    public async Task<IActionResult> RemoverDaEquipe(int idClinica, int usuarioId)
    {
        if (!await _servico.RemoverDaEquipeAsync(idClinica, usuarioId, Logado))
            return Forbid();
        return NoContent();
    }

    [Authorize(Roles = "paciente")]
    [HttpGet("api/pacientes/{id:int}/clinicas")]
    public async Task<ActionResult<IEnumerable<ClinicaResposta>>> ListarDaConta(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarDaContaAsync(id));
    }

    // Vínculo novo: 201. Já estava vinculada: 200 (nada é gravado)
    [Authorize(Roles = "paciente")]
    [HttpPost("api/pacientes/{id:int}/clinicas")]
    public async Task<ActionResult<ClinicaResposta>> Vincular(int id, VinculoClinicaRequisicao dados)
    {
        if (id != IdUsuarioLogado)
            return Forbid();

        var (clinica, novo) = await _servico.VincularAsync(id, dados);
        if (novo)
            return StatusCode(StatusCodes.Status201Created, clinica);
        return Ok(clinica);
    }
}
