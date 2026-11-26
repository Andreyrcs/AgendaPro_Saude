using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// Igual ao cadastro, sem o e-mail: ele só é pedido no cadastro, porque cria a conta (pagina-medicos.js:130-131)
public class AtualizacaoMedicoRequisicao
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(150, ErrorMessage = "O nome pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o CRM.")]
    [StringLength(30, ErrorMessage = "O CRM pode ter até 30 caracteres.")]
    public string Crm { get; set; } = "";

    [Required(ErrorMessage = "Escolha a especialidade.")]
    public int? Especialidade { get; set; }

    [StringLength(30, ErrorMessage = "A sala pode ter até 30 caracteres.")]
    public string? Sala { get; set; }

    [StringLength(20, ErrorMessage = "O telefone pode ter até 20 caracteres.")]
    public string? Telefone { get; set; }
}
