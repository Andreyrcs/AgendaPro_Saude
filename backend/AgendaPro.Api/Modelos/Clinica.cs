namespace AgendaPro.Api.Modelos;

public class Clinica
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Endereco { get; set; } = "";
    public string? Telefone { get; set; }
    public string? Cnpj { get; set; }
    public string? Cidade { get; set; }
    public string? Uf { get; set; }
    public string? Codigo { get; set; }
    public bool Publica { get; set; }
}
