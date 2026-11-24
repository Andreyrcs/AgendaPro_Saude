using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Tarefas;

// Apêndice K: lembrete de confirmação na véspera. A cada minuto, avisa quem tem consulta amanhã e ainda não respondeu.
public class LembretesServico : BackgroundService
{
    private readonly IServiceScopeFactory _escopos;
    private readonly ILogger<LembretesServico> _log;

    public LembretesServico(IServiceScopeFactory escopos, ILogger<LembretesServico> log)
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
                using var escopo = _escopos.CreateScope();
                await escopo.ServiceProvider.GetRequiredService<INotificacaoRepositorio>().LembrarConsultasDeAmanhaAsync();
            }
            catch (Exception erro)
            {
                // Um erro não para a tarefa: tenta de novo no minuto seguinte
                _log.LogError(erro, "Erro ao gravar os lembretes de confirmação");
            }
        }
    }
}
