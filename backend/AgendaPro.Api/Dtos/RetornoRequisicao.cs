using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/retornos: { consulta, data, nota } (medico.js:945). Paciente e médico saem da consulta.
// Com data: retorno AGENDADO; sem data: ENCAMINHADO à recepção (Apêndice C).
public class RetornoRequisicao
{
    [Required(ErrorMessage = "Escolha a consulta.")]
    public int? Consulta { get; set; }

    public DateOnly? Data { get; set; }

    // Até 500: coluna Retornos.Nota
    [StringLength(500, ErrorMessage = "A nota pode ter até 500 caracteres.")]
    public string? Nota { get; set; }
}
