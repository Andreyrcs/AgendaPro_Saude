namespace AgendaPro.Api.Modelos;

public class Notificacao
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public string Tipo { get; set; } = "";
    public string Mensagem { get; set; } = "";
    public DateTime DataEnvio { get; set; }
    public bool Lida { get; set; }
}
