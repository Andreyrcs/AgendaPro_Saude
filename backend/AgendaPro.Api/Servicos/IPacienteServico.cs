using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IPacienteServico
{
    Task<PacienteCadastradoResposta> CadastrarAsync(CadastroPacienteRequisicao dados);

    // Família da conta (o controller já conferiu que a conta é a do token)
    Task<IEnumerable<FamiliarResposta>> ListarFamiliaresAsync(int idConta);
    Task<FamiliarResposta> AdicionarFamiliarAsync(int idConta, FamiliarRequisicao dados);

    // Pacientes da clínica com a ficha. null = outra clínica: o controller responde Forbid()
    Task<IEnumerable<PacienteDaClinicaResposta>?> ListarDaClinicaAsync(int idClinica, string? busca, string? filtro, UsuarioLogado logado);
}