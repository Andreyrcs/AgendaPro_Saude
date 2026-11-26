namespace AgendaPro.Api.Dtos;

// GET /api/medicos/{id}/agenda (Apêndice C: consultas do dia e histórico de atendimentos).
// exames e retornos: o que o detalhe da consulta mostra (medico.js:747-791).
public record AgendaMedicoResposta(IEnumerable<ConsultaResposta> Consultas, IEnumerable<ConsultaResposta> Historico,
    IEnumerable<ExameResposta> Exames, IEnumerable<RetornoResposta> Retornos);
