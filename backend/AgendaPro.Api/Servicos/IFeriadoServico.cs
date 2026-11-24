using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IFeriadoServico
{
    Task<IEnumerable<FeriadoResposta>> ListarAsync(DateOnly de, DateOnly ate);
}
