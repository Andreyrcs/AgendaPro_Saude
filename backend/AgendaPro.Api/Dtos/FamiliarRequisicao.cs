using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/pacientes/{id}/familiares: { nome, cpf, relacao, nascimento, alergias, cor }
// (aplicativo-integracao-api.md, "Familiar"; mensagens de aplicativo/src/servicos/familia.js)
public class FamiliarRequisicao
{
    [Required(ErrorMessage = "Informe o nome do familiar.")]
    [StringLength(150, ErrorMessage = "O nome pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o CPF.")]
    public string Cpf { get; set; } = "";

    [Required(ErrorMessage = "Escolha o parentesco.")]
    public string Relacao { get; set; } = "";

    [Required(ErrorMessage = "Informe a data de nascimento.")]
    public DateOnly? Nascimento { get; set; }

    public string? Alergias { get; set; }

    // CK_Pacientes_Cor: #RRGGBB
    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Use a cor no formato #RRGGBB.")]
    public string? Cor { get; set; }
}
