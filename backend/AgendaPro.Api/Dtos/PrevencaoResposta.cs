namespace AgendaPro.Api.Dtos;

// GET /api/pacientes/{id}/prevencao (aplicativo-integracao-api.md:206-217; relatorio-integracao.md:179-181).
// Exame sugerido (Exames_Prevencao): idCampanha null nas sugestões gerais; especialidade é o NOME.
public record ExamePrevencaoResposta(int Id, int? IdCampanha, string Titulo, string? Nota, string? Especialidade);

// Item da pessoa (Pessoa_Prevencao): titulo, nota e especialidade vêm do exame; consulta = IdConsulta
public record ItemPrevencaoResposta(int Id, int Exame, string Titulo, string? Nota, string? Especialidade,
    string Status, FamiliarResposta Pessoa, int? Consulta);

// Um mês (Campanhas_Prevencao): mes = "AAAA-MM", campanha = Nome (pode ser null), tema = Tema
public record MesPrevencaoResposta(int Id, string Mes, string? Campanha, string Tema,
    IEnumerable<ExamePrevencaoResposta> Exames, IEnumerable<ItemPrevencaoResposta> Itens);
