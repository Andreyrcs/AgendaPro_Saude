namespace AgendaPro.Api.Servicos;

public static class ValidadorCnpj
{
    public static string SoNumeros(string cnpj) => new string(cnpj.Where(char.IsDigit).ToArray());

    // Mesma conta de validarCNPJ (frontend/assets/js/api.js): 14 números, não todos iguais,
    // e os dois dígitos verificadores
    public static bool Valido(string cnpj)
    {
        if (cnpj.Length != 14 || cnpj.Distinct().Count() == 1)
            return false;

        var digito1 = Digito(cnpj[..12]);
        var digito2 = Digito(cnpj[..12] + digito1);
        return cnpj[12] - '0' == digito1 && cnpj[13] - '0' == digito2;
    }

    // 00.000.000/0000-00, como formatarCNPJ (api.js)
    public static string Formatar(string cnpj) =>
        $"{cnpj[..2]}.{cnpj[2..5]}.{cnpj[5..8]}/{cnpj[8..12]}-{cnpj[12..]}";

    private static int Digito(string numeros)
    {
        int[] pesos = numeros.Length == 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        var soma = 0;
        for (var i = 0; i < numeros.Length; i++)
            soma += (numeros[i] - '0') * pesos[i];

        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
