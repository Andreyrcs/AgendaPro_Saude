using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Um exame com os dados relacionados. Exames não tem IdMedico: o médico é o da consulta em que o exame
// foi pedido. Consulta e médico podem ser nulos porque Exames.IdConsulta aceita NULL.
public class ExameCompleto
{
    public Exame Exame { get; set; } = new();
    public Paciente Paciente { get; set; } = new();
    public Consulta? Consulta { get; set; }
    public Medico? Medico { get; set; }
}
