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
}
