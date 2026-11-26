using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IAuthServico
{
    Task<LoginResposta> EntrarAsync(LoginRequisicao dados);
    Task TrocarSenhaAsync(int idUsuario, TrocaSenhaRequisicao dados);
}