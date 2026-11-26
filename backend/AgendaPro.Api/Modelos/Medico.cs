namespace AgendaPro.Api.Modelos;

public class Medico
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public int IdEspecialidade { get; set; }
    public int IdClinica { get; set; }
    public string Nome { get; set; } = "";
    public string Crm { get; set; } = "";
    public string? Sala { get; set; }
}
