using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// GET /api/clinicas/{id}/agenda?de=AAAA-MM-DD&ate=AAAA-MM-DD (Apêndice C)
public class PeriodoAgendaRequisicao
{
    [Required(ErrorMessage = "Informe a data de começo.")]
    public DateOnly? De { get; set; }

    [Required(ErrorMessage = "Informe a data de fim.")]
    public DateOnly? Ate { get; set; }
}
