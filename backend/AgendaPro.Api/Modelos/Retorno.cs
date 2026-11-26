namespace AgendaPro.Api.Modelos;

public class Retorno
{
    public int Id { get; set; }
    public int IdPaciente { get; set; }
    public int IdMedico { get; set; }
    public int? IdConsultaOrigem { get; set; }
    public DateTime? DataRetorno { get; set; }
    public string? Nota { get; set; }
    public string Status { get; set; } = "";
}
