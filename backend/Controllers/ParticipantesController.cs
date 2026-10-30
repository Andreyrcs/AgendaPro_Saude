using AgendaPRO.API.Data;
using AgendaPRO.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaPRO.API.Controllers
{
    [ApiController]
    [Route("api/reunioes/{idReuniao}/participantes")]
    public class ParticipantesController : ControllerBase
    {
        private readonly AgendaProContext _context;

        public ParticipantesController(AgendaProContext context)
        {
            _context = context;
        }

        [HttpPost]
        public IActionResult AdicionarParticipante(int idReuniao, [FromBody] AdicionarParticipanteRequest request)
        {
            var reuniao = _context.Reunioes.FirstOrDefault(r => r.IdReuniao == idReuniao);

            if (reuniao == null)
            {
                return NotFound(new { mensagem = "Reuniao nao encontrada." });
            }

            if (reuniao.IdOrganizador != request.IdUsuarioLogado)
            {
                return StatusCode(403, new { mensagem = "Apenas o organizador pode adicionar participantes." });
            }

            var usuario = _context.Usuarios
                .FirstOrDefault(u => u.IdUsuario == request.IdUsuario && u.StatusUsuario == "ATIVO");

            if (usuario == null)
            {
                return BadRequest(new { mensagem = "Usuario nao encontrado ou inativo." });
            }

            var jaExiste = _context.ParticipantesReuniao
                .Any(p => p.IdReuniao == idReuniao && p.IdUsuario == request.IdUsuario);

            if (jaExiste)
            {
                return BadRequest(new { mensagem = "Usuario ja está vinculado a esta reuniao." });
            }

            var participante = new ParticipanteReuniao
            {
                IdReuniao = idReuniao,
                IdUsuario = request.IdUsuario,
                StatusParticipacao = "CONVIDADO",
                Compareceu = false
            };

            _context.ParticipantesReuniao.Add(participante);
            _context.SaveChanges();

            return Ok(new { mensagem = "Participante adicionado com sucesso." });
        }

        [HttpGet]
        public IActionResult ListarParticipantes(int idReuniao)
        {
            var participantes = _context.ParticipantesReuniao
                .Include(p => p.Usuario)
                .Where(p => p.IdReuniao == idReuniao)
                .Select(p => new
                {
                    idUsuario = p.IdUsuario,
                    nome = p.Usuario!.Nome,
                    email = p.Usuario.Email,
                    statusParticipacao = p.StatusParticipacao,
                    dataConfirmacao = p.DataConfirmacao,
                    compareceu = p.Compareceu
                })
                .ToList();

            return Ok(participantes);
        }

        [HttpPut("{idUsuario}/confirmar")]
        public IActionResult ConfirmarParticipacao(int idReuniao, int idUsuario, [FromQuery] int idUsuarioLogado)
        {
            if (idUsuario != idUsuarioLogado)
            {
                return StatusCode(403, new { mensagem = "Voce só pode confirmar a sua propria participacao." });
            }

            var participante = _context.ParticipantesReuniao
                .FirstOrDefault(p => p.IdReuniao == idReuniao && p.IdUsuario == idUsuario);

            if (participante == null)
            {
                return NotFound(new { mensagem = "Participante nao encontrado nesta reuniao." });
            }

            participante.StatusParticipacao = "CONFIRMADO";
            participante.DataConfirmacao = DateTime.Now;

            _context.SaveChanges();

            return Ok(new { mensagem = "Participacao confirmada com sucesso." });
        }

        [HttpPut("{idUsuario}/recusar")]
        public IActionResult RecusarParticipacao(int idReuniao, int idUsuario, [FromQuery] int idUsuarioLogado)
        {
            if (idUsuario != idUsuarioLogado)
            {
                return StatusCode(403, new { mensagem = "Voce só pode recusar a sua propria participacao." });
            }

            var participante = _context.ParticipantesReuniao
                .FirstOrDefault(p => p.IdReuniao == idReuniao && p.IdUsuario == idUsuario);

            if (participante == null)
            {
                return NotFound(new { mensagem = "Participante nao encontrado nesta reuniao." });
            }

            participante.StatusParticipacao = "RECUSADO";
            participante.DataConfirmacao = null;

            _context.SaveChanges();

            return Ok(new { mensagem = "Participacao recusada com sucesso." });
        }
    }
}
