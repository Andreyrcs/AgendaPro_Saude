namespace AgendaPro.Api.Dtos;

// GET /api/clinicas/{id}/equipe: cada pessoa da equipe (pagina-equipe.js:106-110 usa nome, e-mail e papel)
public record MembroEquipeResposta(int IdUsuario, string? Nome, string Email, string Papel);

// POST /api/clinicas/{id}/equipe: a senha provisória aparece uma única vez (seção 5.3; api.js:332)
public record RecepcionistaCadastradaResposta(ContaCriadaResposta Usuario, string SenhaProvisoria);
