using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Retornos e exames pedidos pelo médico (tabelas Retornos e Exames)
public interface IAcompanhamentoRepositorio
{
    Task<int> CriarRetornoAsync(Retorno retorno);

    // O médico marca com data definida: a consulta e o retorno entram na mesma transação
    Task<int> CriarRetornoComConsultaAsync(Retorno retorno, TimeSpan hora, string motivo);
    Task<RetornoCompleto?> BuscarRetornoAsync(int idRetorno);

    Task<int> CriarExameAsync(Exame exame);
    Task<ExameCompleto?> BuscarExameAsync(int idExame);
    Task MudarStatusExameAsync(int idExame, string codigo);

    // Agenda do médico: os retornos que ele marcou e os exames pedidos nas consultas dele
    Task<IEnumerable<RetornoCompleto>> ListarRetornosDoMedicoAsync(int idMedico);
    Task<IEnumerable<ExameCompleto>> ListarExamesDoMedicoAsync(int idMedico);

    // Ficha dos pacientes: os da clínica (pelo médico)
    Task<IEnumerable<RetornoCompleto>> ListarRetornosDaClinicaAsync(int idClinica);
    Task<IEnumerable<ExameCompleto>> ListarExamesDaClinicaAsync(int idClinica);

    // Acompanhamento do paciente: só os pendentes, de todas as pessoas da conta
    Task<IEnumerable<RetornoCompleto>> ListarRetornosPendentesDaContaAsync(int idConta);
    Task<IEnumerable<ExameCompleto>> ListarExamesPendentesDaContaAsync(int idConta);
}
