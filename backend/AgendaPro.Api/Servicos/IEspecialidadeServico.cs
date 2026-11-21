using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// Quando o método devolve null, quem pediu não pode ver ou mexer nessa clínica: o controller responde Forbid().
public interface IEspecialidadeServico
{
    Task<IEnumerable<EspecialidadeResposta>?> ListarPorClinicaAsync(int idClinica, UsuarioLogado logado);
    Task<EspecialidadeResposta?> ObterAsync(int id, UsuarioLogado logado);
    Task<EspecialidadeResposta?> CadastrarAsync(int idClinica, CadastroEspecialidadeRequisicao dados, UsuarioLogado logado);
    Task<IEnumerable<HorariosLivresResposta>?> HorariosLivresAsync(int idEspecialidade, UsuarioLogado logado);
}
