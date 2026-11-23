using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IClinicaServico
{
    Task<ClinicaCadastradaResposta> CadastrarAsync(CadastroClinicaRequisicao dados);

    // Paciente: busca das públicas e busca pelo código (pública ou privada)
    Task<IEnumerable<ClinicaResposta>> BuscarPublicasAsync(string? busca);
    Task<ClinicaResposta> BuscarPorCodigoAsync(string codigo);

    // Dono e equipe. null (ou false) = outra clínica: o controller responde Forbid()
    Task<ClinicaResposta?> ObterAsync(int idClinica, UsuarioLogado logado);
    Task<ClinicaResposta?> AtualizarAsync(int idClinica, AtualizacaoClinicaRequisicao dados, UsuarioLogado logado);
    Task<IEnumerable<MembroEquipeResposta>?> ListarEquipeAsync(int idClinica, UsuarioLogado logado);
    Task<RecepcionistaCadastradaResposta?> CadastrarRecepcionistaAsync(int idClinica, CadastroRecepcionistaRequisicao dados, UsuarioLogado logado);
    Task<bool> RemoverDaEquipeAsync(int idClinica, int idUsuario, UsuarioLogado logado);

    // Clínicas da conta do paciente. Vincular devolve a clínica e se o vínculo é novo (201) ou já existia (200)
    Task<IEnumerable<ClinicaResposta>> ListarDaContaAsync(int idConta);
    Task<(ClinicaResposta Clinica, bool Novo)> VincularAsync(int idConta, VinculoClinicaRequisicao dados);
}
