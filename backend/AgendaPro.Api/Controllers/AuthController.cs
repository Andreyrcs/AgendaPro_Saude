using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthServico _servico;

    public AuthController(IAuthServico servico)
    {
        _servico = servico;
    }

    [AllowAnonymous]
    [HttpPost("api/auth/login")]
    public async Task<ActionResult<LoginResposta>> Entrar(LoginRequisicao dados)
    {
        return Ok(await _servico.EntrarAsync(dados));
    }
}