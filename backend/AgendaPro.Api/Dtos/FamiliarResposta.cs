namespace AgendaPro.Api.Dtos;

// Formato do familiar (relatorio-integracao.md, "Formato de Familiar"; aplicativo-integracao-api.md).
// curto = primeiro nome (não tem coluna: banco-x-telas.md). relacao = Pacientes.Parentesco.
public record FamiliarResposta(int Id, string Nome, string Curto, string Cpf, string Relacao, DateOnly Nascimento,
    string Cor, string? Alergias, bool Titular);
