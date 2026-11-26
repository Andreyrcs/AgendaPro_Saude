namespace AgendaPro.Api.Dtos;

// Uma falta para a ficha do paciente. Os nomes são os do objeto falta de clinica-dados.js:468-473
// (consulta, data, hora, confirmou, motivo, por, retirada, retiradaPor, retiradaEm, motivoRetirada).
// motivo e por não têm coluna: saem do status da consulta e de quem registrou (FaltaServico).
public record FaltaResposta(int Id, int Consulta, DateOnly Data, string Hora, PessoaResumoResposta Pessoa,
    MedicoResumoResposta Medico, bool Confirmou, string Motivo, string? Por, bool Retirada, string? RetiradaPor,
    DateOnly? RetiradaEm, string? MotivoRetirada);
