using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/retornos: { consulta, data, hora, nota }. Paciente e médico saem da consulta.
// Com data e hora: a consulta de retorno fica marcada (AGENDADO); sem data: ENCAMINHADO à recepção (Apêndice C).
public class RetornoRequisicao
{
    [Required(ErrorMessage = "Escolha a consulta.")]
    public int? Consulta { get; set; }

    public DateOnly? Data { get; set; }

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Informe a hora no formato HH:MM.")]
    public string? Hora { get; set; }

    // Até 500: coluna Retornos.Nota
    [StringLength(500, ErrorMessage = "A nota pode ter até 500 caracteres.")]
    public string? Nota { get; set; }
}
