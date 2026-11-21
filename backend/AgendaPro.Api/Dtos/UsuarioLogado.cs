namespace AgendaPro.Api.Dtos;

// Quem está logado, lido do token pelo controller (claims sub, role, clinica e medico)
public record UsuarioLogado(int IdUsuario, string Papel, int? IdClinica, int? IdMedico)
{
    public bool EhPaciente => Papel == "paciente";
    public bool EhMedico => Papel == "medico";
    public bool EhRecepcaoOuDono => Papel is "recepcao" or "dono";
}
