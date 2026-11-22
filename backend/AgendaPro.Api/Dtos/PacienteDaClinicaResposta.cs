namespace AgendaPro.Api.Dtos;

// GET /api/clinicas/{id}/pacientes: cada pessoa com a ficha (seção 5.5: consultas, faltas, posição na fila
// e histórico). É o que pagina-pacientes.js monta hoje por pessoa (linhas 19-53).
// idConta = a conta (Usuarios) da pessoa, usada em GET /api/pacientes/{id}/situacao.
public record PacienteDaClinicaResposta(int Id, string Nome, string Cpf, DateOnly Nascimento, string Relacao,
    int IdConta, int Faltas, IEnumerable<ConsultaResposta> Consultas, IEnumerable<FilaDaPessoaResposta> Filas);

// Uma entrada ativa da lista de espera da pessoa nesta clínica
public record FilaDaPessoaResposta(int Id, int Posicao, MedicoResumoResposta Medico, DateOnly Desde, bool UsaApp);
