using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/exames: { consulta, nome } (medico.js:765). O paciente sai da consulta.
public class ExameRequisicao
{
    [Required(ErrorMessage = "Escolha a consulta.")]
    public int? Consulta { get; set; }

    // Até 150: coluna Exames.NomeExame e o maxlength de medico.js:759
    [Required(ErrorMessage = "Informe o exame.")]
    [StringLength(150, ErrorMessage = "O nome do exame pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";
}
