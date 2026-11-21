using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Tarefas;

// Seção 7.1: serviço em segundo plano que chama sp_ExpirarOfertasVencidas a cada minuto.
// A procedure recusa as ofertas sem resposta depois do prazo de Parametros (MINUTOS_OFERTA)
// e passa a vaga ao próximo da fila.
public class ExpiracaoOfertasServico : BackgroundService
{
    private readonly IServiceScopeFactory _escopos;
    private readonly ILogger<ExpiracaoOfertasServico> _log;

    public ExpiracaoOfertasServico(IServiceScopeFactory escopos, ILogger<ExpiracaoOfertasServico> log)
    {
        _escopos = escopos;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken parar)
    {
        using var relogio = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (await relogio.WaitForNextTickAsync(parar))
        {
            try
            {
                // O repositório é Scoped: cada volta cria o seu escopo
                using var escopo = _escopos.CreateScope();
                var fila = escopo.ServiceProvider.GetRequiredService<IListaEsperaRepositorio>();
                await fila.ExpirarOfertasVencidasAsync();
            }
            catch (Exception erro)
            {
                // Um erro não para a tarefa: tenta de novo no minuto seguinte
                _log.LogError(erro, "Erro ao expirar as ofertas da lista de espera");
            }
        }
    }
}
