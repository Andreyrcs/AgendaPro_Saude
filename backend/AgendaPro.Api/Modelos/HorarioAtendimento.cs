namespace AgendaPro.Api.Modelos;

public class HorarioAtendimento
{
    public int Id { get; set; }
    public int IdMedico { get; set; }
    public byte DiaSemana { get; set; }
    public TimeSpan HoraInicio { get; set; }
    public TimeSpan HoraFim { get; set; }
    public TimeSpan? InicioAlmoco { get; set; }
    public TimeSpan? FimAlmoco { get; set; }
}
