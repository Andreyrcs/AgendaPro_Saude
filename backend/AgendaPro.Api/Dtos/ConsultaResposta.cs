namespace AgendaPro.Api.Dtos;

// Apêndice E (Quadro E.1), mais presencaConfirmada, que o app usa (aplicativo/src/servicos/consultas.js)
public record ConsultaResposta(int Id, DateOnly Data, string Hora, string? Sala, string Status, string? Motivo,
    string Tipo, bool PresencaConfirmada, PessoaResumoResposta? Pessoa, MedicoResumoResposta Medico,
    EspecialidadeResumoResposta Especialidade);

// GET /api/pacientes/{id}/consultas (aplicativo-integracao-api.md: { proximas, passadas })
public record ConsultasDaContaResposta(IEnumerable<ConsultaResposta> Proximas, IEnumerable<ConsultaResposta> Passadas);

// DELETE /api/consultas/{id} e "Não vou" (aplicativo-integracao-api.md: { falta, oferecidoAFila })
public record CancelamentoResposta(bool Falta, bool OferecidoAFila);
