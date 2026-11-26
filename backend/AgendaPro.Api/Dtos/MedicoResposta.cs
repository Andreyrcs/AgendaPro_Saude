namespace AgendaPro.Api.Dtos;

public record PeriodoResposta(string Inicio, string Fim);

public record ExpedienteResposta(PeriodoResposta? Semana, PeriodoResposta? Sabado, PeriodoResposta? Almoco);

public record MedicoResposta(int Id, string Nome, string Crm, string? Sala, string? Telefone,
    EspecialidadeResposta Especialidade, ExpedienteResposta? Expediente);

// POST /api/clinicas/{id}/medicos: a senha provisória aparece uma única vez (seção 5.3; api.js:337-346)
public record MedicoCadastradoResposta(MedicoResposta Medico, ContaCriadaResposta Usuario, string SenhaProvisoria);
