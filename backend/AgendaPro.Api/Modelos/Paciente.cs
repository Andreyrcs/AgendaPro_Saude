namespace AgendaPro.Api.Modelos;

public class Paciente
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public string Nome { get; set; } = "";
    public string Cpf { get; set; } = "";
    public DateTime DataNascimento { get; set; }
    public string? Alergias { get; set; }
    public string Parentesco { get; set; } = "";
}