namespace AgendaPro.Api.Modelos;

public class CampanhaPrevencao
{
    public int Id { get; set; }
    public int Mes { get; set; }
    public int Ano { get; set; }
    public string? Nome { get; set; }
    public string Tema { get; set; } = "";
}
