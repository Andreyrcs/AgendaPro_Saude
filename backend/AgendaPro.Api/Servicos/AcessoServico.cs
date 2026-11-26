using AgendaPro.Api.Dtos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class AcessoServico : IAcessoServico
{
    private readonly IClinicaRepositorio _clinicas;

    public AcessoServico(IClinicaRepositorio clinicas)
    {
        _clinicas = clinicas;
    }

    // Equipe: a clínica do token (Usuarios.IdClinica; regra 3 do CLAUDE.md).
    // Paciente: precisa do vínculo (dedução da seção 5.5 e do Apêndice C; pendência no CLAUDE.md).
    public async Task<bool> PodeUsarClinicaAsync(UsuarioLogado logado, int idClinica)
    {
        if (logado.EhPaciente)
            return await _clinicas.ContaVinculadaAsync(logado.IdUsuario, idClinica);

        return logado.IdClinica == idClinica;
    }
}
