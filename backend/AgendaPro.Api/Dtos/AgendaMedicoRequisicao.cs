using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

// GET /api/medicos/{id}/agenda?data=AAAA-MM-DD (Apêndice C)
public class AgendaMedicoRequisicao
{
    [Required(ErrorMessage = "Informe a data.")]
    public DateOnly? Data { get; set; }
}
