using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// POST /api/clinicas/{id}/equipe: { nome, email } (pagina-equipe.js:148). A senha é provisória e gerada pela API.
public class CadastroRecepcionistaRequisicao
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(150, ErrorMessage = "O nome pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Informe o e-mail.")]
    [StringLength(150, ErrorMessage = "O e-mail pode ter até 150 caracteres.")]
    public string Email { get; set; } = "";
}
