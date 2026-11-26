using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// null (ou false) = outra clínica, ou outro médico: o controller responde Forbid()
public interface IMedicoServico
{
    Task<IEnumerable<MedicoResposta>?> ListarPorClinicaAsync(int idClinica, UsuarioLogado logado);
    Task<MedicoCadastradoResposta?> CadastrarAsync(int idClinica, CadastroMedicoRequisicao dados, UsuarioLogado logado);
    Task<MedicoResposta?> AtualizarAsync(int id, AtualizacaoMedicoRequisicao dados, UsuarioLogado logado);
    Task<bool> SalvarExpedienteAsync(int id, ExpedienteRequisicao dados, UsuarioLogado logado);
    Task<MedicoResposta?> ObterAsync(int id, UsuarioLogado logado);
    Task<bool> DesativarAsync(int id, UsuarioLogado logado);
}
