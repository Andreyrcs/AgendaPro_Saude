using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class CadastroClinicaRequisicao
{
    public DadosClinicaRequisicao Clinica { get; set; } = new();

    public DadosDonoRequisicao Dono { get; set; } = new();
}

public class DadosClinicaRequisicao
{
    [Required(ErrorMessage = "Escreva o nome da clínica.")]
    [StringLength(150, ErrorMessage = "O nome da clínica pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o CNPJ.")]
    public string Cnpj { get; set; } = "";

    [StringLength(20, ErrorMessage = "O telefone pode ter até 20 caracteres.")]
    public string? Telefone { get; set; }

    [Required(ErrorMessage = "Escreva rua, número e bairro.")]
    [StringLength(250, ErrorMessage = "O endereço pode ter até 250 caracteres.")]
    public string Endereco { get; set; } = "";

    [StringLength(100, ErrorMessage = "A cidade pode ter até 100 caracteres.")]
    public string? Cidade { get; set; }

    [Required(ErrorMessage = "Use a sigla do estado em 2 letras maiúsculas, como SP.")]
    public string Uf { get; set; } = "";

    public bool Publica { get; set; } = true;
}

public class DadosDonoRequisicao
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(150, ErrorMessage = "O nome pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o e-mail.")]
    [StringLength(150, ErrorMessage = "O e-mail pode ter até 150 caracteres.")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Informe a senha.")]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "A senha deve ter de 8 a 64 caracteres.")]
    public string Senha { get; set; } = "";
}
