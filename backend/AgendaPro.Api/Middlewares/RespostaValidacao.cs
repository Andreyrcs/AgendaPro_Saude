using AgendaPro.Api.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Middlewares;

public static class RespostaValidacao
{
    public static IActionResult Criar(ActionContext contexto)
    {
        var erros = contexto.ModelState.Where(campo => campo.Value!.Errors.Count > 0).ToList();

        string mensagem;
        if (erros.Any(campo => campo.Key.StartsWith('$')))
        {
            mensagem = "Confira o formato dos dados enviados.";
        }
        else
        {
            mensagem = erros
                .SelectMany(campo => campo.Value!.Errors)
                .Select(erro => erro.ErrorMessage)
                .FirstOrDefault(texto => !string.IsNullOrWhiteSpace(texto))
                ?? "Confira os dados enviados.";
        }

        return new BadRequestObjectResult(new RespostaErro(mensagem));
    }
}