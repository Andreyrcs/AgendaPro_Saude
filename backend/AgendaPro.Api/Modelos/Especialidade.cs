namespace AgendaPro.Api.Modelos;

public class Especialidade
{
    public int Id { get; set; }
    public int IdClinica { get; set; }
    public string Nome { get; set; } = "";
    public int DuracaoPadrao { get; set; }
}