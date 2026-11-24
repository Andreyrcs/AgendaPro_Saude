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

    // Das consultas pedidas, as marcadas a partir de um item de prevenção (Pessoa_Prevencao.IdConsulta),
    // com o título do exame do item (para o "tipo" e o "titulo")
    Task<IEnumerable<PrevencaoDaConsulta>> FiltrarDePrevencaoAsync(IEnumerable<int> idsConsultas);

    // Consultas que ocupam horário: todas, menos CANCELADA e VAGA (OFERECIDA também ocupa)
    Task<IEnumerable<Consulta>> ListarOcupadasAsync(IEnumerable<int> idsMedicos, DateTime de, DateTime ate);

    // Horários VAGA que ainda não passaram, nos médicos da clínica
    Task<IEnumerable<Consulta>> ListarVagasFuturasDaClinicaAsync(int idClinica);

    // null = o retorno já foi marcado por outra consulta (nada é gravado)
    Task<int?> AgendarAsync(int idPaciente, int idMedico, DateTime data, TimeSpan hora, string? motivo, bool pelaRecepcao,
        int? idRetorno);
    Task<int> ReagendarAsync(int idConsulta, int idUsuario, int idPaciente, int idMedico, DateTime data, TimeSpan hora, string? motivo);
    Task CancelarAsync(int idConsulta, bool peloPaciente, int idUsuario);
    Task ConfirmarPresencaAsync(int idConsulta, bool vou, int idUsuario);

    // Depois de cancelar: o trigger gravou falta? O horário foi oferecido à fila?
    Task<(bool Falta, bool OferecidoAFila)> ResultadoCancelamentoAsync(Consulta consulta);

    // Agenda da clínica: todas as linhas do período (consultas de qualquer status, vagas e ofertas)
    Task<IEnumerable<ConsultaCompleta>> ListarDaClinicaAsync(int idClinica, DateTime de, DateTime ate);

    // Ficha dos pacientes: todas as consultas da clínica que têm paciente (inclusive as canceladas)
    Task<IEnumerable<ConsultaCompleta>> ListarComPacienteDaClinicaAsync(int idClinica);

    // Agenda do médico: todas as linhas dele num dia (como a agenda da clínica)
    Task<IEnumerable<ConsultaCompleta>> ListarDoMedicoAsync(int idMedico, DateTime data);

    // Histórico do médico: as consultas dele que têm paciente, da mais recente para a mais antiga
    Task<IEnumerable<ConsultaCompleta>> ListarComPacienteDoMedicoAsync(int idMedico);

    // Consultas da clínica marcadas a partir de um item de prevenção, com o título (para o "tipo" e o "titulo")
    Task<IEnumerable<PrevencaoDaConsulta>> ListarDePrevencaoDaClinicaAsync(int idClinica);

    // Troca o status só se o atual ainda for um dos esperados; devolve false se nada mudou
    Task<bool> MudarStatusAsync(int idConsulta, IEnumerable<string> codigosAtuais, string codigoNovo);
}
