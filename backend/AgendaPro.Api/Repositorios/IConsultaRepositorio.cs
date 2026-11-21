// Uma consulta com os dados relacionados (cada parte é o modelo da sua tabela).
// O paciente é nulo nas linhas VAGA e OFERECIDA (CK_Consultas_Paciente).
global using ConsultaCompleta = (
    AgendaPro.Api.Modelos.Consulta Consulta,
    AgendaPro.Api.Modelos.Paciente? Paciente,
    AgendaPro.Api.Modelos.Medico Medico,
    AgendaPro.Api.Modelos.Especialidade Especialidade,
    AgendaPro.Api.Modelos.StatusConsulta Status);

using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IConsultaRepositorio
{
    Task<ConsultaCompleta?> BuscarAsync(int id);
    Task<IEnumerable<ConsultaCompleta>> ListarPorContaAsync(int idConta);

    // Ids das consultas marcadas a partir de um item de prevenção (Pessoa_Prevencao.IdConsulta)
    Task<IEnumerable<int>> FiltrarDePrevencaoAsync(IEnumerable<int> idsConsultas);

    // Consultas que ocupam horário: todas, menos CANCELADA e VAGA (OFERECIDA também ocupa)
    Task<IEnumerable<Consulta>> ListarOcupadasAsync(IEnumerable<int> idsMedicos, DateTime de, DateTime ate);

    // Horários VAGA que ainda não passaram, nos médicos da clínica
    Task<IEnumerable<Consulta>> ListarVagasFuturasDaClinicaAsync(int idClinica);

    Task<int> AgendarAsync(int idPaciente, int idMedico, DateTime data, TimeSpan hora, string? motivo, bool pelaRecepcao);
    Task<int> ReagendarAsync(int idConsulta, int idUsuario, int idPaciente, int idMedico, DateTime data, TimeSpan hora, string? motivo);
    Task CancelarAsync(int idConsulta, bool peloPaciente, int idUsuario);
    Task ConfirmarPresencaAsync(int idConsulta, bool vou, int idUsuario);

    // Depois de cancelar: o trigger gravou falta? O horário foi oferecido à fila?
    Task<(bool Falta, bool OferecidoAFila)> ResultadoCancelamentoAsync(Consulta consulta);
}
