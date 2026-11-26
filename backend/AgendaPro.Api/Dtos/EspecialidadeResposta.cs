namespace AgendaPro.Api.Dtos;

// "duracao" é o nome que o front lê e envia (pagina-especialidades.js:98 e :126; clinica-dados.js:116)
public record EspecialidadeResposta(int Id, string Nome, int Duracao);
