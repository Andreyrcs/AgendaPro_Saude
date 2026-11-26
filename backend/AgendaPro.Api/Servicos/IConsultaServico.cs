using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// null = outra clínica, outro médico ou clínica sem vínculo com a conta: o controller responde Forbid().
// Pessoa de outra conta: 403 "Você só pode gerenciar a sua família." (lançado pelo serviço).
public interface IConsultaServico
{
    Task<ConsultaResposta?> ObterAsync(int id, UsuarioLogado logado);
    Task<ConsultasDaContaResposta> ListarDaContaAsync(int idConta);
    Task<ConsultaResposta?> AgendarAsync(AgendamentoRequisicao dados, UsuarioLogado logado);
    Task<ConsultaResposta?> ReagendarAsync(int id, ReagendamentoRequisicao dados, UsuarioLogado logado);
    Task<CancelamentoResposta?> CancelarAsync(int id, UsuarioLogado logado);

    // "Vou" devolve a consulta; "Não vou" devolve o resultado do cancelamento
    Task<object> ResponderPresencaAsync(int id, PresencaRequisicao dados, UsuarioLogado logado);

    Task<IEnumerable<ConsultaResposta>?> AgendaDaClinicaAsync(int idClinica, PeriodoAgendaRequisicao periodo, UsuarioLogado logado);

    // null = agenda de outro médico: Forbid()
    Task<AgendaMedicoResposta?> AgendaDoMedicoAsync(int idMedico, AgendaMedicoRequisicao dia, UsuarioLogado logado);

    // Chegada, desfazer a chegada, início e fim do atendimento (Apêndice I). null = sem permissão: Forbid()
    Task<ConsultaResposta?> MudarStatusAsync(int id, StatusRequisicao dados, UsuarioLogado logado);
}
