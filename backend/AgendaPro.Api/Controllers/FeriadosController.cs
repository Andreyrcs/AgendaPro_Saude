using AgendaPro.Api.Dtos;
using AgendaPro.Api.Servicos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

// L3: feriados (tabela global do Apêndice Q, sem clínica). Todos os perfis leem; ninguém grava pela API.
// Como um feriado vale para todas as clínicas, deixar o dono ou a recepção de uma clínica criar ou apagar
// feriados mexeria na agenda das outras (seção 5.4, isolamento). Os feriados nacionais entram pelo script
// backend/docs/dados-feriados.sql.
[ApiController]
public class FeriadosController : ApiControllerBase
{
    private readonly IFeriadoServico _servico;

    public FeriadosController(IFeriadoServico servico)
    {
        _servico = servico;
    }

    [Authorize(Roles = "paciente,medico,recepcao,dono")]
    [HttpGet("api/feriados")]
    public async Task<ActionResult<IEnumerable<FeriadoResposta>>> Listar([FromQuery] PeriodoAgendaRequisicao periodo)
    {
        return Ok(await _servico.ListarAsync(periodo.De!.Value, periodo.Ate!.Value));
    }
}
