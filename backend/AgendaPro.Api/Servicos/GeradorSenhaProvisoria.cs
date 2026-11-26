using System.Security.Cryptography;

namespace AgendaPro.Api.Servicos;

// Mesmo formato de gerarSenhaProvisoria (frontend/assets/js/api.js): 5 letras sem i, l e o,
// mais um número de 100 a 999. RandomNumberGenerator sorteia sem padrão previsível.
public static class GeradorSenhaProvisoria
{
    private const string Letras = "abcdefghjkmnpqrstuvwxyz";

    public static string Gerar()
    {
        var senha = "";
        for (var i = 0; i < 5; i++)
            senha += Letras[RandomNumberGenerator.GetInt32(Letras.Length)];

        return senha + RandomNumberGenerator.GetInt32(100, 1000);
    }
}
