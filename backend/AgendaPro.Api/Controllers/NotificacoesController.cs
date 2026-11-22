using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// Avisos da conta do paciente (Apêndice C)
[ApiController]
[Authorize(Roles = "paciente")]
public class NotificacoesController : ApiControllerBase
{
    private readonly INotificacaoServico _servico;

    public NotificacoesController(INotificacaoServico servico)
    {
        _servico = servico;
    }

    [HttpGet("api/pacientes/{id:int}/notificacoes")]
    public async Task<ActionResult<IEnumerable<NotificacaoResposta>>> Listar(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();
        return Ok(await _servico.ListarAsync(id));
    }

    // 204: o app não espera nada de volta (notificacoes.js:14-17)
    [HttpPut("api/pacientes/{id:int}/notificacoes/lidas")]
    public async Task<IActionResult> MarcarTodasComoLidas(int id)
    {
        if (id != IdUsuarioLogado)
            return Forbid();

        await _servico.MarcarTodasComoLidasAsync(id);
        return NoContent();
    }
}
