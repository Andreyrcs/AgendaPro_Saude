using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// PUT /api/clinicas/{id}: os campos de pagina-equipe.js:78-80, sem o CNPJ (Apêndice C: "exceto o CNPJ").
// As regras e mensagens são as do cadastro da clínica.
public class AtualizacaoClinicaRequisicao
{
    [Required(ErrorMessage = "Escreva o nome da clínica.")]
    [StringLength(150, ErrorMessage = "O nome da clínica pode ter até 150 caracteres.")]
    public string Nome { get; set; } = "";

    [StringLength(20, ErrorMessage = "O telefone pode ter até 20 caracteres.")]
    public string? Telefone { get; set; }

    [Required(ErrorMessage = "Escreva rua, número e bairro.")]
    [StringLength(250, ErrorMessage = "O endereço pode ter até 250 caracteres.")]
    public string Endereco { get; set; } = "";

    [StringLength(100, ErrorMessage = "A cidade pode ter até 100 caracteres.")]
    public string? Cidade { get; set; }

    [Required(ErrorMessage = "Use a sigla do estado em 2 letras maiúsculas, como SP.")]
    public string Uf { get; set; } = "";

    // Obrigatório: um PUT sem este campo não pode deixar pública uma clínica privada
    [Required(ErrorMessage = "Diga se a clínica aparece na busca.")]
    public bool? Publica { get; set; }
}
