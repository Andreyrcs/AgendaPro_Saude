using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Calendário de prevenção (Campanhas_Prevencao, Exames_Prevencao e Pessoa_Prevencao)
public interface IPrevencaoRepositorio
{
    // Campanhas de um intervalo de meses, contados como Ano * 12 + (Mes - 1)
    Task<IEnumerable<CampanhaPrevencao>> ListarCampanhasAsync(int mesDe, int mesAte);
    Task<CampanhaPrevencao?> BuscarCampanhaAsync(int ano, int mes);

    // Exames sugeridos dessas campanhas e as sugestões gerais (IdCampanha nulo)
    Task<IEnumerable<ExamePrevencao>> ListarExamesAsync(IEnumerable<int> idsCampanhas);
    Task<ExamePrevencao?> BuscarExameAsync(int idExame);

    // Itens das pessoas da conta nessas campanhas
    Task<IEnumerable<ItemPrevencaoCompleto>> ListarItensDaContaAsync(int idConta, IEnumerable<int> idsCampanhas);
    Task<ItemPrevencaoCompleto?> BuscarItemAsync(int idItem);

    Task<bool> ItemExisteAsync(int idPaciente, int idCampanha, int idExame);
    Task<int> CriarItemAsync(PessoaPrevencao item);
    Task AtualizarItemAsync(int idItem, string status, int? idConsulta);
}
