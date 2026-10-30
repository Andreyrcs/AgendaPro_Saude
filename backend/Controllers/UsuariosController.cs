using AgendaPRO.API.Data;
using AgendaPRO.API.Models;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPRO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly AgendaProContext _context;

        public UsuariosController(AgendaProContext context)
        {
            _context = context;
        }

        [HttpPost]
        public IActionResult CriarUsuario([FromBody] CriarUsuarioRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nome))
            {
                return BadRequest(new { mensagem = "O nome é obrigatorio." });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { mensagem = "O e-mail é obrigatorio." });
            }

            if (string.IsNullOrWhiteSpace(request.Senha) || request.Senha.Length < 6)
            {
                return BadRequest(new { mensagem = "A senha precisa ter pelo menos 6 caracteres." });
            }

            var emailJaExiste = _context.Usuarios.Any(u => u.Email == request.Email);

            if (emailJaExiste)
            {
                return BadRequest(new { mensagem = "Este e-mail ja está cadastrado." });
            }

            var senhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

            var usuario = new Usuario
            {
                Nome = request.Nome,
                Email = request.Email,
                SenhaHash = senhaHash,
                StatusUsuario = "ATIVO",
                CriadoEm = DateTime.Now
            };

            _context.Usuarios.Add(usuario);
            _context.SaveChanges();

            return Ok(new
            {
                mensagem = "Usuario cadastrado com sucesso.",
                idUsuario = usuario.IdUsuario
            });
        }

        [HttpGet]
        public IActionResult ListarUsuarios()
        {
            var usuarios = _context.Usuarios
                .OrderBy(u => u.Nome)
                .Select(u => new
                {
                    idUsuario = u.IdUsuario,
                    nome = u.Nome,
                    email = u.Email,
                    statusUsuario = u.StatusUsuario
                })
                .ToList();

            return Ok(usuarios);
        }

        [HttpGet("buscar-por-email")]
        public IActionResult BuscarUsuarioPorEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { mensagem = "E-mail é obrigatorio." });
            }

            var usuario = _context.Usuarios
                .Where(u => u.Email == email)
                .Select(u => new
                {
                    idUsuario = u.IdUsuario,
                    nome = u.Nome,
                    email = u.Email,
                    statusUsuario = u.StatusUsuario
                })
                .FirstOrDefault();

            if (usuario == null)
            {
                return NotFound(new { mensagem = "Usuario nao encontrado." });
            }

            return Ok(usuario);
        }
    }
}
