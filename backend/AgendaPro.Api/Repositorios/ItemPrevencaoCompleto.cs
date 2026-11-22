using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Um item de prevenção da pessoa (Pessoa_Prevencao) com o exame sugerido e a pessoa.
// O título, a nota e a especialidade do item vêm do exame (aplicativo-integracao-api.md:216-217).
public class ItemPrevencaoCompleto
{
    public PessoaPrevencao Item { get; set; } = new();
    public ExamePrevencao Exame { get; set; } = new();
    public Paciente Paciente { get; set; } = new();
}
