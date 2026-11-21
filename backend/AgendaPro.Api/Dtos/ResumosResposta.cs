namespace AgendaPro.Api.Dtos;

// Dados relacionados que vêm juntos nas respostas (Apêndice E: pessoa, medico e especialidade com id e nome)
public record PessoaResumoResposta(int Id, string Nome);

public record MedicoResumoResposta(int Id, string Nome);

public record EspecialidadeResumoResposta(int Id, string Nome);

public record ContaCriadaResposta(int IdUsuario, string Nome, string Email, string Papel);
