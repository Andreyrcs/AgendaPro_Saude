namespace AgendaPro.Api.Modelos;

public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string SenhaHash { get; set; } = "";
    public string Papel { get; set; } = "";
    public string? Nome { get; set; }
    public string? Telefone { get; set; }
    public int? IdClinica { get; set; }
    public bool Ativo { get; set; }
}