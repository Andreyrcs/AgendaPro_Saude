using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// PUT /api/faltas/{id}/retirar: { motivo } (seção 5.5: a recepção informa o motivo, que fica no histórico).
// Até 300: Faltas.MotivoRetirada e o maxlength de pagina-pacientes.js:201.
public class RetiradaFaltaRequisicao
{
    [Required(ErrorMessage = "Informe o motivo.")]
    [StringLength(300, ErrorMessage = "O motivo pode ter até 300 caracteres.")]
    public string Motivo { get; set; } = "";
}
