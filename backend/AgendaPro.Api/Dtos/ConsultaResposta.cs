namespace AgendaPro.Api.Dtos;

// Apêndice E (Quadro E.1), mais presencaConfirmada, que o app usa (aplicativo/src/servicos/consultas.js).
// pessoa = o familiar completo (seção 5.2: "cada resposta já traz o familiar"; aplicativo-integracao-api.md:74);
// é nulo nas linhas VAGA e OFERECIDA. titulo = título do item de prevenção ligado, ou null
// (aplicativo-integracao-api.md:73 e :221).
public record ConsultaResposta(int Id, DateOnly Data, string Hora, string? Sala, string Status, string? Motivo,
    string Tipo, string? Titulo, bool PresencaConfirmada, FamiliarResposta? Pessoa, MedicoSalaResposta Medico,
    EspecialidadeResumoResposta Especialidade);

// GET /api/pacientes/{id}/consultas (aplicativo-integracao-api.md: { proximas, passadas })
public record ConsultasDaContaResposta(IEnumerable<ConsultaResposta> Proximas, IEnumerable<ConsultaResposta> Passadas);

// DELETE /api/consultas/{id} e "Não vou" (aplicativo-integracao-api.md: { falta, oferecidoAFila })
public record CancelamentoResposta(bool Falta, bool OferecidoAFila);
