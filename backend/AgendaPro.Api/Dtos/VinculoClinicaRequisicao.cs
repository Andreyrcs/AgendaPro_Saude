namespace AgendaPro.Api.Dtos;

// POST /api/pacientes/{id}/clinicas (pendência 8): o app envia { codigo } e a web envia { clinicaId }.
// Pelo id só se acha clínica pública; a privada só é achada pelo código (seção 5.5).
public class VinculoClinicaRequisicao
{
    public string? Codigo { get; set; }
    public int? ClinicaId { get; set; }
}
