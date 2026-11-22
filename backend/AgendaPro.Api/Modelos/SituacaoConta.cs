namespace AgendaPro.Api.Modelos;

// Uma linha da visão vw_SituacaoConta: a restrição vencida já vem como NORMAL (seção 8.4)
public class SituacaoConta
{
    public int IdUsuario { get; set; }
    public string Restricao { get; set; } = "";
    public DateTime? RestricaoAte { get; set; }
    public int FaltasRegistradas { get; set; }
}
