using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

public interface IAcessoServico
{
    // Equipe: só a própria clínica (seção 5.4). Paciente: só clínica vinculada à conta (Paciente_Clinica).
    Task<bool> PodeUsarClinicaAsync(UsuarioLogado logado, int idClinica);
}
