namespace AgendaPro.Api.Dtos;

// Os campos do objeto clínica que o front usa (frontend/assets/js/api.js: semear e cadastrarClinica)
public record ClinicaResposta(int Id, string Nome, string Endereco, string? Telefone, string? Cnpj,
    string? Cidade, string? Uf, string? Codigo, bool Publica);

// GET /api/clinicas/{id} para o médico: só o nome da clínica em que ele atua
public record ClinicaNomeResposta(int Id, string Nome);
