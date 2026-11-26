using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// PUT /api/consultas/{id}/status: { "status": "na_recepcao" } (relatorio-integracao.md:55).
// Valores do Apêndice D: na_recepcao, confirmada (desfazer a chegada), em_atendimento, atendida.
public class StatusRequisicao
{
    [Required(ErrorMessage = "Escolha o status.")]
    public string Status { get; set; } = "";
}
