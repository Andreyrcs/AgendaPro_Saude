using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

// L3: feriados do calendário. A tabela Feriados (Apêndice Q) não tem clínica: cada feriado vale para todas.
// Só leitura: os feriados entram pelo script backend/docs/dados-feriados.sql. A sp_AgendarConsulta
// (erro 50004) e os horários livres leem esta tabela.
public class FeriadoServico : IFeriadoServico
{
    private readonly IHorarioRepositorio _horarios;

    public FeriadoServico(IHorarioRepositorio horarios)
    {
        _horarios = horarios;
    }

    private static FeriadoResposta Resposta(Feriado f) => new(f.Id, DateOnly.FromDateTime(f.Data), f.Nome);

    public async Task<IEnumerable<FeriadoResposta>> ListarAsync(DateOnly de, DateOnly ate)
    {
        if (ate < de)
            throw new ErroApi(StatusCodes.Status400BadRequest, "O fim do período precisa ser depois do começo.");

        var feriados = await _horarios.ListarFeriadosAsync(de.ToDateTime(TimeOnly.MinValue), ate.ToDateTime(TimeOnly.MinValue));
        return feriados.Select(Resposta).ToList();
    }
}
