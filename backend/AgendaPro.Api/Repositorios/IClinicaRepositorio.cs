using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Repositorios;

public interface IClinicaRepositorio
{
    Task<int?> BuscarIdPorCodigoAsync(string codigo);
    Task<bool> CnpjExisteAsync(string cnpj);
    Task<bool> ContaVinculadaAsync(int idConta, int idClinica);
    Task<(int IdClinica, int IdUsuario)> CriarComDonoAsync(Clinica clinica, Usuario dono);

    Task<Clinica?> BuscarPorIdAsync(int id);
    Task<Clinica?> BuscarPorCodigoAsync(string codigo);

    // Clínicas públicas cujo nome ou cidade contém o texto, sem diferenciar acento
    Task<IEnumerable<Clinica>> BuscarPublicasAsync(string busca);

    // Clínicas vinculadas à conta do paciente (Paciente_Clinica), na ordem do vínculo
    Task<IEnumerable<Clinica>> ListarDaContaAsync(int idConta);
    Task VincularContaAsync(int idConta, int idClinica);

    // Altera tudo, menos o CNPJ e o código
    Task AtualizarAsync(Clinica clinica);
}
