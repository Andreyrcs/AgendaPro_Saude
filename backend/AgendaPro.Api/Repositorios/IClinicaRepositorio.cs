namespace AgendaPro.Api.Repositorios;

public interface IClinicaRepositorio
{
    Task<int?> BuscarIdPorCodigoAsync(string codigo);
}