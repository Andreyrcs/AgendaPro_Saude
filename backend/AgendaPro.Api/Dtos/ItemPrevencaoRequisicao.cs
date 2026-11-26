using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// PUT /api/prevencao/{id}: { status, idConsulta? } (aplicativo-integracao-api.md:220-221).
// status: pendente, agendado ou feito (Apêndice D). Mensagem de prevencao.js:64.
public class ItemPrevencaoRequisicao
{
    [Required(ErrorMessage = "Situação inválida.")]
    public string Status { get; set; } = "";

    public int? IdConsulta { get; set; }
}
