using AgendaPro.Api.Dtos;

namespace AgendaPro.Api.Servicos;

// Retornos e exames pedidos pelo médico. null = consulta ou exame de outro médico ou de outra clínica,
// ou ação que o perfil não faz: o controller responde Forbid().
public interface IAcompanhamentoServico
{
    Task<RetornoResposta?> MarcarRetornoAsync(RetornoRequisicao dados, UsuarioLogado logado);
    Task<ExameResposta?> PedirExameAsync(ExameRequisicao dados, UsuarioLogado logado);
    Task<ExameResposta?> MudarSituacaoExameAsync(int idExame, SituacaoExameRequisicao dados, UsuarioLogado logado);

    // "Depois da consulta" do paciente: retornos e exames pendentes da família
    Task<AcompanhamentoResposta> ListarDaContaAsync(int idConta);
}
