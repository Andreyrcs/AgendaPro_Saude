namespace AgendaPro.Api.Dtos;

// aplicativo/docs/aplicativo-integracao-api.md, "Horários livres"
public record DiaLivreResposta(DateOnly Data, IEnumerable<string> Horas);

public record HorariosLivresResposta(MedicoResumoResposta Medico, IEnumerable<DiaLivreResposta> Dias);
