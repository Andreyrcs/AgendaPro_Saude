using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class LoginRequisicao
{
    [Required(ErrorMessage = "Informe o e-mail.")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Informe a senha.")]
    public string Senha { get; set; } = "";
}