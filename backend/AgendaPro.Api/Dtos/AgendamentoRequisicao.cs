using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// Apêndice E (Quadro E.1): { pessoa, medico, data, hora, motivo }
public class AgendamentoRequisicao
{
    [Required(ErrorMessage = "Escolha quem vai à consulta.")]
    public int? Pessoa { get; set; }

    [Required(ErrorMessage = "Escolha o médico.")]
    public int? Medico { get; set; }

    [Required(ErrorMessage = "Escolha o dia.")]
    public DateOnly? Data { get; set; }

    [Required(ErrorMessage = "Escolha o horário.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Informe a hora no formato HH:MM.")]
    public string Hora { get; set; } = "";

    [StringLength(500, ErrorMessage = "O motivo pode ter até 500 caracteres.")]
    public string? Motivo { get; set; }
}
