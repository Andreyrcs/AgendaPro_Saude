using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class EntradaFilaRequisicao
{
    [Required(ErrorMessage = "Escolha quem vai entrar na fila.")]
    public int? Pessoa { get; set; }

    [Required(ErrorMessage = "Escolha o médico.")]
    public int? Medico { get; set; }

    // Só a recepção informa (caixa "usa o app" de pagina-lista-espera.js:205); para o paciente é sempre true
    public bool? UsaApp { get; set; }
}
