namespace AgendaPro.Api.Middlewares;

public class ErroApi : Exception
{
    public int StatusCode { get; }

    public ErroApi(int statusCode, string mensagem) : base(mensagem)
    {
        StatusCode = statusCode;
    }
}