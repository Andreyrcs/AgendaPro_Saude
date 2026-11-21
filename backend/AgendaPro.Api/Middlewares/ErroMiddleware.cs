using AgendaPro.Api.Dtos;
using Microsoft.Data.SqlClient;

namespace AgendaPro.Api.Middlewares;

public class ErroMiddleware
{
    // Erros das procedures que significam "não encontrado" (Quadro 5.1)
    private static readonly HashSet<int> CodigosNaoEncontrado =
        new() { 50001, 50002, 50020, 50031, 50033, 50041 };

    private readonly RequestDelegate _proximo;
    private readonly ILogger<ErroMiddleware> _log;

    public ErroMiddleware(RequestDelegate proximo, ILogger<ErroMiddleware> log)
    {
        _proximo = proximo;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext contexto)
    {
        try
        {
            await _proximo(contexto);
        }
        catch (ErroApi erro)
        {
            await Responder(contexto, erro.StatusCode, erro.Message);
        }
        catch (SqlException erro) when (erro.Number >= 50001 && erro.Number <= 50041)
        {
            var status = CodigosNaoEncontrado.Contains(erro.Number)
                ? StatusCodes.Status404NotFound
                : StatusCodes.Status400BadRequest;

            _log.LogWarning("O banco recusou a operação: erro {Numero} em {Rota}",
                erro.Number, contexto.Request.Path);

            await Responder(contexto, status, erro.Message);
        }
        catch (Exception erro)
        {
            _log.LogError(erro, "Erro inesperado em {Rota}", contexto.Request.Path);

            await Responder(contexto, StatusCodes.Status500InternalServerError,
                "Não foi possível concluir agora. Tente de novo.");
        }
    }

    private static Task Responder(HttpContext contexto, int status, string mensagem)
    {
        contexto.Response.StatusCode = status;
        return contexto.Response.WriteAsJsonAsync(new RespostaErro(mensagem));
    }
}