using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class CadastroPacienteRequisicao
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(150, ErrorMessage = "O nome pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o e-mail.")]
    [StringLength(150, ErrorMessage = "O e-mail pode ter até 150 caracteres.")]
    [RegularExpression(@"^\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*$", ErrorMessage = "Informe um e-mail válido.")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Informe a senha.")]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "A senha deve ter de 8 a 64 caracteres.")]
    public string Senha { get; set; } = "";

    [StringLength(20, ErrorMessage = "O telefone pode ter até 20 caracteres.")]
    public string? Telefone { get; set; }

    [Required(ErrorMessage = "Informe o CPF.")]
    public string Cpf { get; set; } = "";

    [Required(ErrorMessage = "Informe a data de nascimento.")]
    public DateOnly? Nascimento { get; set; }

    public string? Alergias { get; set; }

    public string? Codigo { get; set; }
}