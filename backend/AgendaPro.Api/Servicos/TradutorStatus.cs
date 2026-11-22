namespace AgendaPro.Api.Servicos;

// Apêndice D: código gravado no banco (Status_Consulta.Codigo_consulta) → valor usado nas telas
public static class TradutorStatus
{
    private static readonly Dictionary<string, string> Consulta = new()
    {
        ["CONFIRMADA"] = "confirmada",
        ["NA_RECEPCAO"] = "na_recepcao",
        ["EM_ATENDIMENTO"] = "em_atendimento",
        ["ATENDIDA"] = "atendida",
        ["FALTOU"] = "faltou",
        ["CANCELADA"] = "cancelada",
        ["VAGA"] = "livre",
        ["OFERECIDA"] = "oferecido"
    };

    public static string DaConsulta(string codigo) => Consulta[codigo];

    // Restrição por faltas (Usuarios.Restricao e vw_SituacaoConta)
    private static readonly Dictionary<string, string> Restricao = new()
    {
        ["NORMAL"] = "normal",
        ["SO_FILA"] = "so_fila",
        ["SO_RECEPCAO"] = "so_recepcao"
    };

    public static string DaRestricao(string codigo) => Restricao[codigo];
}
