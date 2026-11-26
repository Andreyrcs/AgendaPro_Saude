namespace AgendaPro.Api.Modelos;

public class Consulta
{
    public int Id { get; set; }
    public int? IdPaciente { get; set; }
    public int IdMedico { get; set; }
    public DateTime DataConsulta { get; set; }
    public TimeSpan HoraInicio { get; set; }
    public TimeSpan HoraFim { get; set; }
    public int IdStatus { get; set; }
    public string? Sala { get; set; }
    public string? Motivo { get; set; }
    public DateTime CriadoEm { get; set; }
    public bool? PresencaConfirmada { get; set; }
    public DateTime? ConfirmadaEm { get; set; }
    public DateTime? CanceladaEm { get; set; }
}
