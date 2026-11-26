using Microsoft.AspNetCore.Mvc;

namespace AgendaPro.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected int IdUsuarioLogado => int.Parse(User.FindFirst("sub")!.Value);

    protected string PapelLogado => User.FindFirst("role")!.Value;

    protected int? ClinicaLogada => LerNumero("clinica");

    protected int? MedicoLogado => LerNumero("medico");

    private int? LerNumero(string claim)
    {
        var valor = User.FindFirst(claim)?.Value;
        return valor is null ? null : int.Parse(valor);
    }
}