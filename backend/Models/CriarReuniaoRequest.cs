namespace AgendaPRO.API.Models
{
    public class CriarReuniaoRequest
    {
        public string TituloReuniao { get; set; } = string.Empty;
        public string? PautaReuniao { get; set; }
        public DateTime DataReuniao { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFim { get; set; }
        public string? LocalReuniao { get; set; }
        public string? LinkReuniao { get; set; }
        public int IdUsuarioLogado { get; set; }
        public string TipoReuniao { get; set; } = string.Empty;
    }
}
