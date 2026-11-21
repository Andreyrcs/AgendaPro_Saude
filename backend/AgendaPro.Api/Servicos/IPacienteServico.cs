using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IPacienteServico
{
    Task<PacienteCadastradoResposta> CadastrarAsync(CadastroPacienteRequisicao dados);
}