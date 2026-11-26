namespace AgendaPro.Api.Modelos;

public class ListaEspera
{
    public int Id { get; set; }
    public int IdPaciente { get; set; }
    public int IdMedico { get; set; }
    public int Posicao { get; set; }
    public DateTime DataEntrada { get; set; }
    public bool UsaApp { get; set; }
    public string StatusOferta { get; set; } = "";
    public int? IdConsultaOfertada { get; set; }
    public DateTime? OfertadaEm { get; set; }
}
