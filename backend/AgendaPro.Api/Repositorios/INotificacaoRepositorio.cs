using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Avisos da conta (tabela Notificacoes). Quem grava são as procedures do banco; a API lê, marca como
// lidos e grava o lembrete de confirmação (LEMBRETE).
public interface INotificacaoRepositorio
{
    Task<IEnumerable<Notificacao>> ListarDaContaAsync(int idUsuario);
    Task MarcarTodasComoLidasAsync(int idUsuario);

    // Um lembrete por consulta de amanhã ainda sem resposta; devolve quantos foram gravados
    Task<int> LembrarConsultasDeAmanhaAsync();
}
