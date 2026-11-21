using System.Text;

namespace AgendaPro.Api.Servicos;

// Tratamentos de texto usados por mais de um serviço (repetem o que frontend/assets/js/api.js faz)
public static class FormatadorTexto
{
    // Como formatarTelefone (api.js): com 10 ou mais números vira (00) 0000-0000;
    // com menos, fica como foi digitado
    public static string? Telefone(string? telefone)
    {
        if (string.IsNullOrWhiteSpace(telefone))
            return null;

        var valor = telefone.Trim();
        var t = new string(valor.Where(char.IsDigit).ToArray());
        if (t.Length < 10)
            return valor;

        return "(" + t[..2] + ") " + t[2..^4] + "-" + t[^4..];
    }

    // Horas no formato HH:MM (regra 9 do CLAUDE.md); o DTO já conferiu o formato
    public static TimeSpan Hora(string hhmm) =>
        TimeSpan.ParseExact(hhmm, @"hh\:mm", System.Globalization.CultureInfo.InvariantCulture);

    public static string Hora(TimeSpan hora) => hora.ToString(@"hh\:mm");

    // Como semAcento (api.js): minúsculas e sem os acentos
    public static string SemAcento(string texto)
    {
        var decomposto = texto.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        return new string(decomposto.Where(ch => ch < '̀' || ch > 'ͯ').ToArray());
    }
}
