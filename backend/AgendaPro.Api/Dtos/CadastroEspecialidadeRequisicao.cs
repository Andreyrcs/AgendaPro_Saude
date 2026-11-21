using System.ComponentModel.DataAnnotations;

namespace AgendaPro.Api.Dtos;

public class CadastroEspecialidadeRequisicao
{
    [Required(ErrorMessage = "Escreva o nome da especialidade.")]
    [StringLength(100, ErrorMessage = "O nome da especialidade pode ter até 100 caracteres.")]
    public string Nome { get; set; } = "";

    [Required(ErrorMessage = "Escolha a duração da consulta.")]
    [Range(1, int.MaxValue, ErrorMessage = "Escolha a duração da consulta.")]
    public int? Duracao { get; set; }
}
