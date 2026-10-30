using AgendaPRO.API.Data;
using AgendaPRO.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaPRO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReunioesController : ControllerBase
    {
        private readonly AgendaProContext _context;

        public ReunioesController(AgendaProContext context)
        {
            _context = context;
        }

        [HttpPost]
        public IActionResult CriarReuniao([FromBody] CriarReuniaoRequest request)
        {
            var erro = ValidarDadosReuniao(request.TituloReuniao, request.DataReuniao, request.HoraInicio, request.HoraFim, request.TipoReuniao, request.LocalReuniao, request.LinkReuniao);

            if (erro != null)
            {
                return BadRequest(new { mensagem = erro });
            }

            var organizador = _context.Usuarios
                .FirstOrDefault(u => u.IdUsuario == request.IdUsuarioLogado && u.StatusUsuario == "ATIVO");

            if (organizador == null)
            {
                return BadRequest(new { mensagem = "Organizador nao encontrado ou inativo." });
            }

            var dataBuscada = request.DataReuniao.Date;
            var horaInicio = request.HoraInicio;
            var horaFim = request.HoraFim;

            var reunioesDoDia = _context.Reunioes
                .Where(r => r.IdOrganizador == request.IdUsuarioLogado
                         && (r.StatusReuniao == "AGENDADA" || r.StatusReuniao == "EM_ANDAMENTO")
                         && r.DataReuniao == dataBuscada)
                .ToList();

            var temConflito = reunioesDoDia.Any(r => r.HoraInicio < horaFim && horaInicio < r.HoraFim);

            if (temConflito)
            {
                return BadRequest(new { mensagem = "Você já possui um agendamento nesse horário. Verifique os horários disponíveis." });
            }

            var reuniao = new Reuniao
            {
                TituloReuniao = request.TituloReuniao,
                PautaReuniao = request.PautaReuniao,
                DataReuniao = request.DataReuniao.Date,
                HoraInicio = request.HoraInicio,
                HoraFim = request.HoraFim,
                LocalReuniao = request.LocalReuniao,
                LinkReuniao = request.LinkReuniao,
                IdOrganizador = request.IdUsuarioLogado,
                TipoReuniao = request.TipoReuniao.ToUpper(),
                StatusReuniao = "AGENDADA",
                CriadoEm = DateTime.Now
            };

            _context.Reunioes.Add(reuniao);
            _context.SaveChanges();

            return Ok(new
            {
                mensagem = "Reuniao criada com sucesso.",
                idReuniao = reuniao.IdReuniao
            });
        }

        [HttpGet]
        public IActionResult ListarReunioes()
        {
            var reunioes = _context.Reunioes
                .Include(r => r.Organizador)
                .OrderBy(r => r.DataReuniao)
                .ThenBy(r => r.HoraInicio)
                .Select(r => MontarRetornoReuniao(r))
                .ToList();

            return Ok(reunioes);
        }

        [HttpGet("minhas")]
        public IActionResult ListarMinhasReunioes([FromQuery] int idUsuarioLogado)
        {
            if (idUsuarioLogado <= 0)
            {
                return BadRequest(new { mensagem = "Usuario logado invalido." });
            }

            var idsReunioesConfirmadas = _context.ParticipantesReuniao
                .Where(p => p.IdUsuario == idUsuarioLogado && p.StatusParticipacao == "CONFIRMADO")
                .Select(p => p.IdReuniao)
                .ToList();

            var reunioes = _context.Reunioes
                .Include(r => r.Organizador)
                .Where(r => r.IdOrganizador == idUsuarioLogado || idsReunioesConfirmadas.Contains(r.IdReuniao))
                .OrderBy(r => r.DataReuniao)
                .ThenBy(r => r.HoraInicio)
                .Select(r => MontarRetornoReuniao(r))
                .ToList();

            return Ok(reunioes);
        }

        [HttpGet("convites")]
        public IActionResult ListarConvitesPendentes([FromQuery] int idUsuarioLogado)
        {
            if (idUsuarioLogado <= 0)
            {
                return BadRequest(new { mensagem = "Usuario logado invalido." });
            }

            var convites = _context.ParticipantesReuniao
                .Include(p => p.Reuniao)
                    .ThenInclude(r => r!.Organizador)
                .Where(p => p.IdUsuario == idUsuarioLogado
                    && p.StatusParticipacao == "CONVIDADO"
                    && p.Reuniao!.StatusReuniao != "CANCELADA")
                .OrderBy(p => p.Reuniao!.DataReuniao)
                .ThenBy(p => p.Reuniao!.HoraInicio)
                .Select(p => new
                {
                    idReuniao = p.Reuniao!.IdReuniao,
                    tituloReuniao = p.Reuniao.TituloReuniao,
                    pautaReuniao = p.Reuniao.PautaReuniao,
                    dataReuniao = p.Reuniao.DataReuniao.ToString("yyyy-MM-dd"),
                    horaInicio = p.Reuniao.HoraInicio.ToString(@"hh\:mm"),
                    horaFim = p.Reuniao.HoraFim.ToString(@"hh\:mm"),
                    localReuniao = p.Reuniao.LocalReuniao,
                    linkReuniao = p.Reuniao.LinkReuniao,
                    statusReuniao = p.Reuniao.StatusReuniao,
                    tipoReuniao = p.Reuniao.TipoReuniao,
                    idOrganizador = p.Reuniao.IdOrganizador,
                    nomeOrganizador = p.Reuniao.Organizador!.Nome,
                    statusParticipacao = p.StatusParticipacao
                })
                .ToList();

            return Ok(convites);
        }

        [HttpGet("{id}")]
        public IActionResult BuscarReuniaoPorId(int id)
        {
            var reuniao = _context.Reunioes
                .Include(r => r.Organizador)
                .FirstOrDefault(r => r.IdReuniao == id);

            if (reuniao == null)
            {
                return NotFound(new { mensagem = "Reuniao nao encontrada." });
            }

            return Ok(MontarRetornoReuniao(reuniao));
        }

        [HttpPut("{id}")]
        public IActionResult AtualizarReuniao(int id, [FromBody] AtualizarReuniaoRequest request)
        {
            var reuniao = _context.Reunioes.FirstOrDefault(r => r.IdReuniao == id);

            if (reuniao == null)
            {
                return NotFound(new { mensagem = "Reuniao nao encontrada." });
            }

            if (reuniao.IdOrganizador != request.IdUsuarioLogado)
            {
                return StatusCode(403, new { mensagem = "Voce nao tem permissao para alterar esta reuniao." });
            }

            if (reuniao.StatusReuniao == "CANCELADA")
            {
                return BadRequest(new { mensagem = "Nao é possivel alterar uma reuniao cancelada." });
            }

            var erro = ValidarDadosReuniao(request.TituloReuniao, request.DataReuniao, request.HoraInicio, request.HoraFim, request.TipoReuniao, request.LocalReuniao, request.LinkReuniao);

            if (erro != null)
            {
                return BadRequest(new { mensagem = erro });
            }

            reuniao.TituloReuniao = request.TituloReuniao;
            reuniao.PautaReuniao = request.PautaReuniao;
            reuniao.DataReuniao = request.DataReuniao.Date;
            reuniao.HoraInicio = request.HoraInicio;
            reuniao.HoraFim = request.HoraFim;
            reuniao.LocalReuniao = request.LocalReuniao;
            reuniao.LinkReuniao = request.LinkReuniao;
            reuniao.TipoReuniao = request.TipoReuniao.ToUpper();
            reuniao.AtualizadoEm = DateTime.Now;

            _context.SaveChanges();

            return Ok(new { mensagem = "Reuniao atualizada com sucesso." });
        }

        [HttpPut("{id}/status")]
        public IActionResult AtualizarStatusReuniao(int id, [FromQuery] int idUsuarioLogado, [FromQuery] string status)
        {
            var reuniao = _context.Reunioes.FirstOrDefault(r => r.IdReuniao == id);

            if (reuniao == null)
                return NotFound(new { mensagem = "Reuniao nao encontrada." });

            if (reuniao.IdOrganizador != idUsuarioLogado)
                return StatusCode(403, new { mensagem = "Voce nao tem permissao para alterar esta reuniao." });

            var statusPermitidos = new[] { "EM_ANDAMENTO", "ENCERRADA" };
            status = status.ToUpper();

            if (!statusPermitidos.Contains(status))
                return BadRequest(new { mensagem = "Status invalido. Use EM_ANDAMENTO ou ENCERRADA." });

            if (reuniao.StatusReuniao == "CANCELADA")
                return BadRequest(new { mensagem = "Nao e possivel alterar o status de uma reuniao cancelada." });

            if (reuniao.StatusReuniao == "ENCERRADA")
                return BadRequest(new { mensagem = "Esta reuniao ja esta encerrada." });

            reuniao.StatusReuniao = status;
            reuniao.AtualizadoEm = DateTime.Now;
            _context.SaveChanges();

            return Ok(new { mensagem = "Status atualizado com sucesso." });
        }

        [HttpDelete("{id}")]
        public IActionResult CancelarReuniao(int id, [FromQuery] int idUsuarioLogado)
        {
            var reuniao = _context.Reunioes.FirstOrDefault(r => r.IdReuniao == id);

            if (reuniao == null)
            {
                return NotFound(new { mensagem = "Reuniao nao encontrada." });
            }

            if (reuniao.IdOrganizador != idUsuarioLogado)
            {
                return StatusCode(403, new { mensagem = "Voce nao tem permissao para cancelar esta reuniao." });
            }

            if (reuniao.StatusReuniao == "CANCELADA")
            {
                return BadRequest(new { mensagem = "Esta reuniao ja está cancelada." });
            }

            reuniao.StatusReuniao = "CANCELADA";
            reuniao.AtualizadoEm = DateTime.Now;

            _context.SaveChanges();

            return Ok(new { mensagem = "Reuniao cancelada com sucesso." });
        }

        private string? ValidarDadosReuniao(string titulo, DateTime data, TimeSpan horaInicio, TimeSpan horaFim, string tipo, string? local, string? link)
        {
            if (string.IsNullOrWhiteSpace(titulo))
            {
                return "O titulo da reuniao é obrigatorio.";
            }

            if (data == default)
            {
                return "A data da reuniao é obrigatoria.";
            }

            if (horaFim <= horaInicio)
            {
                return "A hora final deve ser maior que a hora inicial.";
            }

            tipo = tipo.ToUpper();

            if (tipo != "PRESENCIAL" && tipo != "ONLINE")
            {
                return "O tipo da reuniao deve ser PRESENCIAL ou ONLINE.";
            }

            if (tipo == "PRESENCIAL" && string.IsNullOrWhiteSpace(local))
            {
                return "Reunioes presenciais precisam de local.";
            }

            if (tipo == "ONLINE" && string.IsNullOrWhiteSpace(link))
            {
                return "Reunioes online precisam de link.";
            }

            return null;
        }

        private static object MontarRetornoReuniao(Reuniao r)
        {
            return new
            {
                idReuniao = r.IdReuniao,
                tituloReuniao = r.TituloReuniao,
                pautaReuniao = r.PautaReuniao,
                dataReuniao = r.DataReuniao.ToString("yyyy-MM-dd"),
                horaInicio = r.HoraInicio.ToString(@"hh\:mm"),
                horaFim = r.HoraFim.ToString(@"hh\:mm"),
                localReuniao = r.LocalReuniao,
                linkReuniao = r.LinkReuniao,
                statusReuniao = r.StatusReuniao,
                tipoReuniao = r.TipoReuniao,
                idOrganizador = r.IdOrganizador,
                nomeOrganizador = r.Organizador == null ? "" : r.Organizador.Nome
            };
        }
    }
}
