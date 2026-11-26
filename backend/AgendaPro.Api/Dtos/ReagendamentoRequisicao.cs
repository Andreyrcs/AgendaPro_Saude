using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// docs/relatorio-integracao.md:56: { medico, data, hora }
public class ReagendamentoRequisicao
{
    [Required(ErrorMessage = "Escolha o médico.")]
    public int? Medico { get; set; }

    [Required(ErrorMessage = "Escolha o dia.")]
    public DateOnly? Data { get; set; }

    [Required(ErrorMessage = "Escolha o horário.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Informe a hora no formato HH:MM.")]
    public string Hora { get; set; } = "";
}
