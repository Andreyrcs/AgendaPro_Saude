using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

// L3: feriados do calendário. A tabela Feriados (Apêndice Q) não tem clínica: cada feriado vale para todas.
// A sp_AgendarConsulta (erro 50004) e os horários livres já leem esta tabela, então cadastrar ou remover
// um feriado muda na hora o que pode ser agendado.
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

    public async Task<FeriadoResposta> CadastrarAsync(FeriadoRequisicao dados)
    {
        var feriado = new Feriado { Data = dados.Data!.Value.ToDateTime(TimeOnly.MinValue), Nome = dados.Nome.Trim() };
        if (feriado.Nome == "")
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escreva o nome do feriado.");

        if (await _horarios.FeriadoExisteNaDataAsync(feriado.Data))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Já existe um feriado nesta data.");

        feriado.Id = await _horarios.CriarFeriadoAsync(feriado);
        return Resposta(feriado);
    }

    public async Task RemoverAsync(int id)
    {
        if (!await _horarios.RemoverFeriadoAsync(id))
            throw new ErroApi(StatusCodes.Status404NotFound, "Feriado não encontrado.");
    }
}
