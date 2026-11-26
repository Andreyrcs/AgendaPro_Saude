using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// null = outra clínica, outro médico ou outra conta: o controller responde Forbid().
public interface IFaltaServico
{
    Task<IEnumerable<FaltaResposta>?> ListarDaClinicaAsync(int idClinica, int? idPaciente, UsuarioLogado logado);
    Task<FaltaResposta?> RegistrarAsync(int idConsulta, UsuarioLogado logado);
    Task<FaltaResposta?> RetirarAsync(int idFalta, RetiradaFaltaRequisicao dados, UsuarioLogado logado);
    Task<SituacaoResposta?> SituacaoAsync(int idConta, UsuarioLogado logado);
}
