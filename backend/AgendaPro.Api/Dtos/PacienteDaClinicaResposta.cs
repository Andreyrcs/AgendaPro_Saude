namespace AgendaPro.Api.Dtos;

// GET /api/clinicas/{id}/pacientes: cada pessoa com a ficha (seção 5.5: consultas, faltas, posição na fila
// e histórico). É o que pagina-pacientes.js monta hoje por pessoa (linhas 19-53).
// idConta = a conta (Usuarios) da pessoa, usada em GET /api/pacientes/{id}/situacao.
// Lote C: retornos e exames da pessoa nesta clínica (seção 5.5: a recepção acompanha os pedidos na ficha
// e marca cada exame como realizado; pagina-pacientes.js:203-216).
public record PacienteDaClinicaResposta(int Id, string Nome, string Cpf, DateOnly Nascimento, string Relacao,
    int IdConta, int Faltas, IEnumerable<ConsultaResposta> Consultas, IEnumerable<FilaDaPessoaResposta> Filas,
    IEnumerable<RetornoResposta> Retornos, IEnumerable<ExameResposta> Exames);

// Uma entrada ativa da lista de espera da pessoa nesta clínica
public record FilaDaPessoaResposta(int Id, int Posicao, MedicoResumoResposta Medico, DateOnly Desde, bool UsaApp);
