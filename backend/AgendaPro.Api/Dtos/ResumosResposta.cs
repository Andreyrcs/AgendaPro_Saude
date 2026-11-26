namespace AgendaPro.Api.Dtos;

// Dados relacionados que vêm juntos nas respostas (Apêndice E: pessoa, medico e especialidade com id e nome)
public record PessoaResumoResposta(int Id, string Nome);

public record MedicoResumoResposta(int Id, string Nome);

// Médico com a sala (Medicos.Sala), na consulta, nos horários livres e na fila do paciente.
// O app mostra a sala ao escolher o horário (aplicativo-integracao-api.md: Medico com "sala"; AgendarTela.js:257)
public record MedicoSalaResposta(int Id, string Nome, string? Sala);

public record EspecialidadeResumoResposta(int Id, string Nome);

public record ContaCriadaResposta(int IdUsuario, string Nome, string Email, string Papel);
