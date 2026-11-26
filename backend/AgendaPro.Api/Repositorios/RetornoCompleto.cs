using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Um retorno com os dados relacionados, lido de várias tabelas de uma vez (multi-mapeamento do Dapper).
// A especialidade é a do médico que marcou o retorno.
public class RetornoCompleto
{
    public Retorno Retorno { get; set; } = new();
    public Paciente Paciente { get; set; } = new();
    public Medico Medico { get; set; } = new();
    public Especialidade Especialidade { get; set; } = new();
}
