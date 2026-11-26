using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// null (ou false) = outra clínica ou clínica sem vínculo com a conta: o controller responde Forbid().
// Pessoa de outra conta: 403 "Você só pode gerenciar a sua família." (lançado pelo serviço).
public interface IListaEsperaServico
{
    Task<FilaPacienteResposta?> MinhaFilaAsync(int idConta);
    Task<IEnumerable<FilaMedicoResposta>?> FilaDaClinicaAsync(int idClinica, UsuarioLogado logado);
    Task<FilaPacienteResposta?> EntrarAsync(EntradaFilaRequisicao dados, UsuarioLogado logado);
    Task<bool> SairAsync(int id, UsuarioLogado logado);

    // Aceitar devolve a consulta criada; recusar devolve null
    Task<ConsultaResposta?> ResponderVagaAsync(int id, RespostaVagaRequisicao dados, UsuarioLogado logado);

    Task<OfertaResposta?> OferecerAsync(int idConsulta, UsuarioLogado logado);
}
