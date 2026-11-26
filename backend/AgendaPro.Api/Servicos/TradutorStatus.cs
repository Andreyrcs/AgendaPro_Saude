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

    // Exame (Exames.Status)
    private static readonly Dictionary<string, string> Exame = new()
    {
        ["PENDENTE"] = "pendente",
        ["REALIZADO"] = "realizado"
    };

    public static string DoExame(string codigo) => Exame[codigo];

    // Caminho contrário (valor da tela → código do banco); null = valor que não está no Apêndice D
    public static string? ParaExame(string valor) => Exame.FirstOrDefault(par => par.Value == valor).Key;

    // Retorno (Retornos.Status)
    private static readonly Dictionary<string, string> Retorno = new()
    {
        ["ENCAMINHADO"] = "encaminhado",
        ["AGENDADO"] = "agendado",
        ["REALIZADO"] = "realizado",
        ["CANCELADO"] = "cancelado"
    };

    public static string DoRetorno(string codigo) => Retorno[codigo];

    // Item de prevenção (Pessoa_Prevencao.Status)
    private static readonly Dictionary<string, string> Prevencao = new()
    {
        ["NAO_AGENDADO"] = "pendente",
        ["AGENDADO"] = "agendado",
        ["REALIZADO"] = "feito"
    };

    public static string DaPrevencao(string codigo) => Prevencao[codigo];

    public static string? ParaPrevencao(string valor) => Prevencao.FirstOrDefault(par => par.Value == valor).Key;
}
