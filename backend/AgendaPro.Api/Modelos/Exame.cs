namespace AgendaPro.Api.Modelos;

public class Exame
{
    public int Id { get; set; }
    public int IdPaciente { get; set; }
    public int? IdConsulta { get; set; }
    public string NomeExame { get; set; } = "";
    public string Status { get; set; } = "";
}
