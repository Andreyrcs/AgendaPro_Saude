using AgendaPRO.API.Data;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPRO.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TesteController : ControllerBase
    {
        private readonly AgendaProContext _context;

        public TesteController(AgendaProContext context)
        {
            _context = context;
        }

        [HttpGet("conexao")]
        public IActionResult TestarConexao()
        {
            try
            {
                var banco = _context.Database.ProviderName;

                return Ok(new
                {
                    mensagem = "Conexao realizada com sucesso.",
                    banco = "AgendaPro"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    mensagem = "Erro ao conectar com o banco.",
                    erro = ex.Message
                });
            }
        }
    }
}
