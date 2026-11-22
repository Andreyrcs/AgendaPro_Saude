namespace AgendaPro.Api.Modelos;

public class ExamePrevencao
{
    public int Id { get; set; }
    public int? IdCampanha { get; set; }
    public string Titulo { get; set; } = "";
    public string? Nota { get; set; }
    public string? Especialidade { get; set; }
}
