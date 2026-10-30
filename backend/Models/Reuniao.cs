using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgendaPRO.API.Models
{
    [Table("agendar_reuniao")]
    public class Reuniao
    {
        [Key]
        [Column("id_reuniao")]
        public int IdReuniao { get; set; }

        [Column("titulo_reuniao")]
        public string TituloReuniao { get; set; } = string.Empty;

        [Column("pauta_reuniao")]
        public string? PautaReuniao { get; set; }

        [Column("data_reuniao")]
        public DateTime DataReuniao { get; set; }

        [Column("hora_inicio")]
        public TimeSpan HoraInicio { get; set; }

        [Column("hora_fim")]
        public TimeSpan HoraFim { get; set; }

        [Column("local_reuniao")]
        public string? LocalReuniao { get; set; }

        [Column("link_reuniao")]
        public string? LinkReuniao { get; set; }

        [Column("id_organizador")]
        public int IdOrganizador { get; set; }

        [Column("status_reuniao")]
        public string StatusReuniao { get; set; } = "AGENDADA";

        [Column("tipo_reuniao")]
        public string TipoReuniao { get; set; } = string.Empty;

        [Column("criado_em")]
        public DateTime CriadoEm { get; set; }

        [Column("atualizado_em")]
        public DateTime? AtualizadoEm { get; set; }

        public Usuario? Organizador { get; set; }
    }
}
