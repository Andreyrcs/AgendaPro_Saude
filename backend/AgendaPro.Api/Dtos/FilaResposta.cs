namespace AgendaPro.Api.Dtos;

// expiraEm em milissegundos desde 1970 (aplicativo-integracao-api.md, "Lista de espera")
public record VagaOferecidaResposta(DateOnly Data, string Hora, long ExpiraEm);

// GET /api/pacientes/{id}/lista-espera. pessoa = o familiar completo (aplicativo-integracao-api.md:191)
public record FilaPacienteResposta(int Id, int Posicao, int NaFila, DateOnly Desde, FamiliarResposta Pessoa,
    MedicoSalaResposta Medico, EspecialidadeResumoResposta Especialidade, VagaOferecidaResposta? VagaOferecida);

// GET /api/clinicas/{id}/lista-espera: as filas por médico e as vagas que podem ser oferecidas
public record PessoaNaFilaResposta(int Id, int Posicao, PessoaResumoResposta Pessoa, DateOnly Desde, bool UsaApp,
    string? Telefone, VagaOferecidaResposta? VagaOferecida);

public record VagaResposta(int Id, DateOnly Data, string Hora);

public record FilaMedicoResposta(MedicoResumoResposta Medico, EspecialidadeResumoResposta Especialidade,
    IEnumerable<PessoaNaFilaResposta> Pessoas, IEnumerable<VagaResposta> Vagas);

// POST /api/consultas/{id}/oferecer: oferecidaA é null quando ninguém da fila pôde receber a vaga
public record OfertaPessoaResposta(int Id, PessoaResumoResposta Pessoa);

public record OfertaResposta(OfertaPessoaResposta? OferecidaA);
