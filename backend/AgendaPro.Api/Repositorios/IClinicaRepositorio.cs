using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IClinicaRepositorio
{
    Task<int?> BuscarIdPorCodigoAsync(string codigo);
    Task<bool> CnpjExisteAsync(string cnpj);
    Task<bool> ContaVinculadaAsync(int idConta, int idClinica);
    Task<(int IdClinica, int IdUsuario)> CriarComDonoAsync(Clinica clinica, Usuario dono);
}
