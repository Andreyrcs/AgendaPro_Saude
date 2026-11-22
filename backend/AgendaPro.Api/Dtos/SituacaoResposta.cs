namespace AgendaPro.Api.Dtos;

// GET /api/pacientes/{id}/situacao: { faltas, restricao, ate } (aplicativo-integracao-api.md, "Situação do paciente")
public record SituacaoResposta(int Faltas, string Restricao, DateOnly? Ate);
