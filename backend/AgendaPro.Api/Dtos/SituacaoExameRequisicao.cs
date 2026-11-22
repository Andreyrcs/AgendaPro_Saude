using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// PUT /api/exames/{id}: { status } com os valores do Apêndice D: pendente ou realizado (pagina-pacientes.js:256)
public class SituacaoExameRequisicao
{
    [Required(ErrorMessage = "Escolha a situação.")]
    public string Status { get; set; } = "";
}
