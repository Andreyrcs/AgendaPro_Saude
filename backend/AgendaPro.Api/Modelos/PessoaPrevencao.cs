namespace AgendaPro.Api.Modelos;

public class PessoaPrevencao
{
    public int Id { get; set; }
    public int IdPaciente { get; set; }
    public int IdCampanha { get; set; }
    public int IdExamePrevencao { get; set; }
    public int? IdConsulta { get; set; }
    public string Status { get; set; } = "";
}
