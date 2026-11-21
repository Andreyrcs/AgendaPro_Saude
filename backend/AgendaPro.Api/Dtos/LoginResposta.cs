namespace AgendaPro.Api.Dtos;

public record UsuarioLogadoResposta(int IdUsuario, string? Nome, string Email, string Papel, int? ClinicaId, int? MedicoId);

public record LoginResposta(string Token, DateTime ExpiraEm, UsuarioLogadoResposta Usuario);