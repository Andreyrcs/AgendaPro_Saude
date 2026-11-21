namespace AgendaPro.Api.Servicos;

public static class ValidadorCpf
{
    public static string SoNumeros(string cpf) => new string(cpf.Where(char.IsDigit).ToArray());

    public static bool Valido(string cpf)
    {
        if (cpf.Length != 11)
            return false;

        var soma = 0;
        for (var i = 0; i < 9; i++)
            soma += (cpf[i] - '0') * (10 - i);
        var resto = soma % 11;
        var digito1 = resto < 2 ? 0 : 11 - resto;
        if (cpf[9] - '0' != digito1)
            return false;

        soma = 0;
        for (var i = 0; i < 10; i++)
            soma += (cpf[i] - '0') * (11 - i);
        resto = soma % 11;
        var digito2 = resto < 2 ? 0 : 11 - resto;
        return cpf[10] - '0' == digito2;
    }
}