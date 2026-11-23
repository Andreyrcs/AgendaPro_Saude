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
        // Registro repetido que passou pela checagem do serviço porque dois pedidos chegaram juntos
        // (2627 = UNIQUE/PRIMARY KEY, 2601 = índice UNIQUE). Responde 409 em vez do 500 genérico.
        catch (SqlException erro) when (erro.Number is 2627 or 2601)
        {
            _log.LogWarning("Registro repetido recusado pelo banco em {Rota}", contexto.Request.Path);

            await Responder(contexto, StatusCodes.Status409Conflict, MensagemDeRepetido(erro.Message));
        }
        catch (Exception erro)
        {
            _log.LogError(erro, "Erro inesperado em {Rota}", contexto.Request.Path);

            await Responder(contexto, StatusCodes.Status500InternalServerError,
                "Não foi possível concluir agora. Tente de novo.");
        }
    }

    // A mensagem do SQL Server muda com o idioma do servidor, mas sempre cita o objeto entre aspas
    // ('dbo.Usuarios') e o nome do índice ou restrição. A escolha usa só esses nomes.
    // As mensagens são as mesmas que os serviços já usam na checagem prévia.
    private static string MensagemDeRepetido(string mensagemDoBanco)
    {
        bool Cita(string nome) => mensagemDoBanco.Contains(nome, StringComparison.OrdinalIgnoreCase);

        if (Cita("UX_Clinica_Codigo")) return "Não foi possível gerar o código da clínica. Tente de novo.";
        if (Cita("'dbo.Usuarios'")) return "Este e-mail já tem uma conta. Entre com ele ou use outro.";
        if (Cita("'dbo.Pacientes'")) return "Este CPF já está cadastrado.";
        if (Cita("'dbo.Clinica'")) return "Já existe uma clínica com este CNPJ.";
        if (Cita("'dbo.Medicos'")) return "Já existe um médico com este CRM.";
        if (Cita("'dbo.Especialidades'")) return "Essa especialidade já existe nesta clínica.";
        if (Cita("'dbo.Pessoa_Prevencao'")) return "Essa pessoa já está nesse item da prevenção.";
        if (Cita("'dbo.Lista_Espera'")) return "Paciente já está na lista de espera deste médico.";
        if (Cita("'dbo.Feriados'")) return "Já existe um feriado nesta data.";
        return "Este cadastro já existe.";
    }

    private static Task Responder(HttpContext contexto, int status, string mensagem)
    {
        contexto.Response.StatusCode = status;
        return contexto.Response.WriteAsJsonAsync(new RespostaErro(mensagem));
    }
}