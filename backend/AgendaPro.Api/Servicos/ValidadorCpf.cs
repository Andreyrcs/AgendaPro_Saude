namespace AgendaPro.Api.Servicos;

public static class ValidadorCpf
{
    public static string SoNumeros(string cpf) =>
        new string(cpf.Where(char.IsDigit).ToArray());

    public static bool Valido(string cpf)
    {
        if (cpf.Length != 11 || cpf.Distinct().Count() == 1)
            return false;

        var digitos = cpf.Select(c => c - '0').ToArray();


        var soma = 0;
        for (var i = 0; i < 9; i++) soma += digitos[i] * (10 - i);
        var resto = soma % 11;
        var primeiro = resto < 2 ? 0 : 11 - resto;
        if (digitos[9] != primeiro) return false;

        soma = 0;
        for (var i = 0; i < 10; i++) soma += digitos[i] * (11 - i);
        resto = soma % 11;
        var segundo = resto < 2 ? 0 : 11 - resto;
        return digitos[10] == segundo;
    }
}