using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// aplicativo-integracao-api.md: { aceitar: true | false }
public class RespostaVagaRequisicao
{
    [Required(ErrorMessage = "Responda se aceita a vaga.")]
    public bool? Aceitar { get; set; }
}
