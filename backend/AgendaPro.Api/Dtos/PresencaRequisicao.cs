using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// docs/relatorio-integracao.md:120: { vou: true | false }
public class PresencaRequisicao
{
    [Required(ErrorMessage = "Responda se vai à consulta.")]
    public bool? Vou { get; set; }
}
