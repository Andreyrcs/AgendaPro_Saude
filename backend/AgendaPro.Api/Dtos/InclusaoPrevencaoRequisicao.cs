using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/pacientes/{id}/prevencao: { mes: "AAAA-MM", pessoa, exame }.
// Mensagens do app e da web (aplicativo-integracao-api.md:222-224; prevencao.js:23-29).
public class InclusaoPrevencaoRequisicao
{
    [Required(ErrorMessage = "Escolha uma campanha.")]
    [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$", ErrorMessage = "Escolha uma campanha.")]
    public string Mes { get; set; } = "";

    [Required(ErrorMessage = "Escolha quem vai entrar na prevenção.")]
    public int? Pessoa { get; set; }

    [Required(ErrorMessage = "Escolha o exame ou check-up.")]
    public int? Exame { get; set; }
}
