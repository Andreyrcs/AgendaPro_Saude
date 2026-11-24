using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class EspecialidadesController : ApiControllerBase
{
    private readonly IEspecialidadeServico _servico;

    public EspecialidadesController(IEspecialidadeServico servico)
    {
        _servico = servico;
    }

    private UsuarioLogado Logado => new(IdUsuarioLogado, PapelLogado, ClinicaLogada, MedicoLogado);

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/clinicas/{idClinica:int}/especialidades")]
    public async Task<ActionResult<IEnumerable<EspecialidadeResposta>>> ListarPorClinica(int idClinica)
    {
        var resposta = await _servico.ListarPorClinicaAsync(idClinica, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/especialidades/{id:int}")]
    public async Task<ActionResult<EspecialidadeResposta>> Obter(int id)
    {
        var resposta = await _servico.ObterAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    [Authorize(Roles = "recepcao,dono")]
    [HttpPost("api/clinicas/{idClinica:int}/especialidades")]
    public async Task<ActionResult<EspecialidadeResposta>> Cadastrar(int idClinica, CadastroEspecialidadeRequisicao dados)
    {
        var resposta = await _servico.CadastrarAsync(idClinica, dados, Logado);
        if (resposta is null)
            return Forbid();
        return StatusCode(StatusCodes.Status201Created, resposta);
    }

    // L5: editar o nome e a duração de uma especialidade da própria clínica
    [Authorize(Roles = "recepcao,dono")]
    [HttpPut("api/especialidades/{id:int}")]
    public async Task<ActionResult<EspecialidadeResposta>> Atualizar(int id, CadastroEspecialidadeRequisicao dados)
    {
        var resposta = await _servico.AtualizarAsync(id, dados, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }

    // O médico também lê: escolhe o horário do retorno com data definida
    [Authorize(Roles = "paciente,recepcao,dono,medico")]
    [HttpGet("api/especialidades/{id:int}/horarios-livres")]
    public async Task<ActionResult<IEnumerable<HorariosLivresResposta>>> HorariosLivres(int id)
    {
        var resposta = await _servico.HorariosLivresAsync(id, Logado);
        if (resposta is null)
            return Forbid();
        return Ok(resposta);
    }
}
