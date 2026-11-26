using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Faltas (tabela Faltas), sp_RegistrarFalta, sp_RetirarFalta e a visão vw_SituacaoConta
public interface IFaltaRepositorio
{
    Task<FaltaCompleta?> BuscarAsync(int idFalta);
    Task<FaltaCompleta?> BuscarPorConsultaAsync(int idConsulta);

    // Todas as faltas da pessoa em consultas da clínica, inclusive as retiradas (histórico da ficha)
    Task<IEnumerable<FaltaCompleta>> ListarDaPessoaNaClinicaAsync(int idPaciente, int idClinica);

    // Faltas não retiradas em consultas da clínica (para contar as de cada pessoa)
    Task<IEnumerable<Falta>> ListarNaoRetiradasDaClinicaAsync(int idClinica);

    Task RegistrarAsync(int idConsulta, int idUsuario);
    Task RetirarAsync(int idFalta, int idUsuario, string motivo);

    Task<SituacaoConta?> BuscarSituacaoAsync(int idConta);
}
