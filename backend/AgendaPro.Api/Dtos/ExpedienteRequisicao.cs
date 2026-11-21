using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// Formato da tela de horários (pagina-horarios.js:141-144), com as horas em HH:MM.
// semana = segunda a sexta; sabado = sábado; almoco = o mesmo para os dias de atendimento.
public class ExpedienteRequisicao
{
    public PeriodoRequisicao? Semana { get; set; }
    public PeriodoRequisicao? Sabado { get; set; }
    public PeriodoRequisicao? Almoco { get; set; }
}

public class PeriodoRequisicao
{
    [Required(ErrorMessage = "Informe a hora de começo.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Informe a hora no formato HH:MM.")]
    public string Inicio { get; set; } = "";

    [Required(ErrorMessage = "Informe a hora de fim.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Informe a hora no formato HH:MM.")]
    public string Fim { get; set; } = "";
}
