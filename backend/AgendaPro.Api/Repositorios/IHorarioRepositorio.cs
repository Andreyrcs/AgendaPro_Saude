using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

// Expediente dos médicos (Horarios_Atendimento) e dias sem atendimento (Feriados)
public interface IHorarioRepositorio
{
    Task<IEnumerable<HorarioAtendimento>> ListarPorMedicosAsync(IEnumerable<int> idsMedicos);
    Task SubstituirExpedienteAsync(int idMedico, IEnumerable<HorarioAtendimento> dias);
    Task<IEnumerable<Feriado>> ListarFeriadosAsync(DateTime de, DateTime ate);
    Task<bool> FeriadoExisteNaDataAsync(DateTime data);
    Task<int> CriarFeriadoAsync(Feriado feriado);
    Task<bool> RemoverFeriadoAsync(int id);
}
