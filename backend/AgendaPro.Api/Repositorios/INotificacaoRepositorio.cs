using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Avisos da conta (tabela Notificacoes). Quem grava são as procedures do banco; a API só lê e marca como lidos.
public interface INotificacaoRepositorio
{
    Task<IEnumerable<Notificacao>> ListarDaContaAsync(int idUsuario);
    Task MarcarTodasComoLidasAsync(int idUsuario);
}
