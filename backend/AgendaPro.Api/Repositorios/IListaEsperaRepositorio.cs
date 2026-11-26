// Uma entrada da fila com os dados relacionados (cada parte é o modelo da sua tabela).
// Conta = dono da conta da pessoa (o telefone vem de Usuarios.Telefone).
// VagaOferecida = a consulta OFERECIDA a essa entrada, ou nula.
global using FilaCompleta = (
    AgendaPro.Api.Modelos.ListaEspera Entrada,
    AgendaPro.Api.Modelos.Paciente Paciente,
    AgendaPro.Api.Modelos.Usuario Conta,
    AgendaPro.Api.Modelos.Medico Medico,
    AgendaPro.Api.Modelos.Especialidade Especialidade,
    AgendaPro.Api.Modelos.Consulta? VagaOferecida);

namespace AgendaPro.Api.Repositorios;

public interface IListaEsperaRepositorio
{
    Task<FilaCompleta?> BuscarAsync(int idLista);

    // Entradas ativas (AGUARDANDO ou OFERECIDA)
    Task<IEnumerable<FilaCompleta>> ListarAtivasDaContaAsync(int idConta);
    Task<IEnumerable<FilaCompleta>> ListarAtivasDaClinicaAsync(int idClinica);
    Task<int> ContarAtivasDoMedicoAsync(int idMedico);

    // Parametros.MINUTOS_OFERTA: prazo para responder a vaga oferecida
    Task<int> MinutosOfertaAsync();

    Task<int> EntrarAsync(int idPaciente, int idMedico, bool usaApp, bool pelaRecepcao);
    Task SairAsync(int idLista);
    Task<int> AceitarAsync(int idLista, string motivo);
    Task RecusarAsync(int idLista);
    Task<int?> OferecerVagaAsync(int idConsulta);
    Task ExpirarOfertasVencidasAsync();
}
