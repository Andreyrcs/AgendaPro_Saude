using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// Calendário de prevenção da conta. Pessoa ou item de outra conta: 403 "Você só pode gerenciar a sua família."
public interface IPrevencaoServico
{
    Task<IEnumerable<MesPrevencaoResposta>> ListarAsync(int idConta);
    Task<ItemPrevencaoResposta> IncluirAsync(int idConta, InclusaoPrevencaoRequisicao dados);
    Task<ItemPrevencaoResposta> AlterarAsync(int idItem, ItemPrevencaoRequisicao dados, int idConta);
}
