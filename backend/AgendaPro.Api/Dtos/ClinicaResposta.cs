namespace AgendaPro.Api.Dtos;

// Os campos do objeto clínica que o front usa (frontend/assets/js/api.js: semear e cadastrarClinica)
public record ClinicaResposta(int Id, string Nome, string Endereco, string? Telefone, string? Cnpj,
    string? Cidade, string? Uf, string? Codigo, bool Publica);
