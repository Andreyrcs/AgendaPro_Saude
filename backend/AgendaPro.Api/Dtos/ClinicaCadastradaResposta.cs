namespace AgendaPro.Api.Dtos;

public record ClinicaResumoResposta(int Id, string Nome, string Codigo, bool Publica);

public record DonoCadastradoResposta(int IdUsuario, string Nome, string Email, string Papel);

public record ClinicaCadastradaResposta(ClinicaResumoResposta Clinica, DonoCadastradoResposta Usuario);
