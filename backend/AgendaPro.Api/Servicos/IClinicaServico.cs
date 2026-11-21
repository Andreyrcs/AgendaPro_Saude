using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IClinicaServico
{
    Task<ClinicaCadastradaResposta> CadastrarAsync(CadastroClinicaRequisicao dados);
}
