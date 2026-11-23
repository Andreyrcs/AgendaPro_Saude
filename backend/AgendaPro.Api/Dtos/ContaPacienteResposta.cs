namespace AgendaPro.Api.Dtos;

// GET /api/pacientes/{id}: os dados da conta para o Perfil (web e app). Nome, CPF e nascimento são do titular;
// e-mail e telefone, da conta (Usuarios).
public record ContaPacienteResposta(string Nome, string Cpf, string Email, string? Telefone, DateOnly Nascimento);
