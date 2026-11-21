using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IAuthServico
{
    Task<LoginResposta> EntrarAsync(LoginRequisicao dados);
}