namespace AgendaPro.Api.Dtos;

// Um exame pedido pelo médico (objeto exame de clinica-dados.js:538: consulta, nome, status).
// O médico vem da consulta (a tabela Exames não tem IdMedico).
public record ExameResposta(int Id, int? Consulta, string Nome, string Status, PessoaResumoResposta Pessoa,
    MedicoResumoResposta? Medico);

// Um retorno marcado pelo médico (objeto retorno de clinica-dados.js:537). data = null quando encaminhado.
public record RetornoResposta(int Id, int? Consulta, DateOnly? Data, string? Nota, string Status,
    PessoaResumoResposta Pessoa, MedicoResumoResposta Medico);

// GET /api/pacientes/{id}/acompanhamento (aplicativo-integracao-api.md:200-204; paciente-servicos.js:294-303)
public record RetornoPendenteResposta(int Id, string Titulo, DateOnly Prazo, string Origem, FamiliarResposta Pessoa,
    MedicoResumoResposta Medico, EspecialidadeResumoResposta Especialidade);

public record ExamePendenteResposta(int Id, string Titulo, string Status, string Obs, string Origem,
    FamiliarResposta Pessoa, MedicoResumoResposta? PedidoPor);

public record AcompanhamentoResposta(IEnumerable<RetornoPendenteResposta> Retornos,
    IEnumerable<ExamePendenteResposta> Exames);
