using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Uma falta com os dados relacionados, lida de várias tabelas de uma vez (multi-mapeamento do Dapper).
// Cada propriedade é o modelo da sua tabela.
public class FaltaCompleta
{
    public Falta Falta { get; set; } = new();
    public Consulta Consulta { get; set; } = new();
    public Paciente Paciente { get; set; } = new();
    public Medico Medico { get; set; } = new();
    public StatusConsulta Status { get; set; } = new();

    // Quem registrou (Faltas.RegistradaPor) e quem retirou (Faltas.RetiradaPor); podem ser nulos
    public Usuario? RegistradaPor { get; set; }
    public Usuario? RetiradaPor { get; set; }
}
