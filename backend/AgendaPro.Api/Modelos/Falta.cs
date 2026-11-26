namespace AgendaPro.Api.Modelos;

public class Falta
{
    public int Id { get; set; }
    public int IdConsulta { get; set; }
    public int IdPaciente { get; set; }
    public int IdUsuario { get; set; }
    public DateTime DataFalta { get; set; }
    public bool ConfirmouPresenca { get; set; }
    public int? RegistradaPor { get; set; }
    public bool Retirada { get; set; }
    public int? RetiradaPor { get; set; }
    public DateTime? RetiradaEm { get; set; }
    public string? MotivoRetirada { get; set; }
}
