using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class TrocaSenhaRequisicao
{
    [Required(ErrorMessage = "Digite a senha que você usa hoje.")]
    public string SenhaAtual { get; set; } = "";

    [Required(ErrorMessage = "A senha deve ter de 8 a 64 caracteres.")]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "A senha deve ter de 8 a 64 caracteres.")]
    public string NovaSenha { get; set; } = "";
}
