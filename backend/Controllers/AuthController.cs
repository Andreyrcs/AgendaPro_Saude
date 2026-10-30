using AgendaPRO.API.Data;
using AgendaPRO.API.Models;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPRO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AgendaProContext _context;

        public AuthController(AgendaProContext context)
        {
            _context = context;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Senha))
            {
                return BadRequest(new { mensagem = "E-mail e senha são obrigatorios." });
            }

            var usuario = _context.Usuarios
                .FirstOrDefault(u => u.Email == request.Email && u.StatusUsuario == "ATIVO");

            if (usuario == null)
            {
                return BadRequest(new { mensagem = "E-mail ou senha invalidos." });
            }

            var senhaCorreta = BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash);

            if (!senhaCorreta)
            {
                return BadRequest(new { mensagem = "E-mail ou senha invalidos." });
            }

            return Ok(new
            {
                mensagem = "Login realizado com sucesso.",
                usuario = new
                {
                    idUsuario = usuario.IdUsuario,
                    nome = usuario.Nome,
                    email = usuario.Email
                }
            });
        }
    }
}
