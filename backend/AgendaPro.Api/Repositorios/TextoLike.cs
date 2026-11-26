namespace AgendaPro.Api.Repositorios;

// O texto digitado numa busca entra no LIKE como texto, e não como curinga: sem isto, "%" ou "_" acham tudo.
// Escapa \ (o próprio caractere de escape), %, _ e [ (no SQL Server, [a-z] é um intervalo).
// Usar sempre com ESCAPE '\' no LIKE.
public static class TextoLike
{
    public static string? Escapar(string? texto) =>
        texto?.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[");
}
