using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/feriados (L3). A tabela Feriados é a do Apêndice Q: uma data por feriado, valendo para todas as clínicas.
public class FeriadoRequisicao
{
    [Required(ErrorMessage = "Escolha a data do feriado.")]
    public DateOnly? Data { get; set; }

    [Required(ErrorMessage = "Escreva o nome do feriado.")]
    [StringLength(120, ErrorMessage = "O nome do feriado pode ter até 120 caracteres.")]
    public string Nome { get; set; } = "";
}
