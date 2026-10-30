using System.ComponentModel.DataAnnotations.Schema;

namespace AgendaPRO.API.Models
{
    [Table("participantes_reuniao")]
    public class ParticipanteReuniao
    {
        [Column("id_reuniao")]
        public int IdReuniao { get; set; }

        [Column("id_usuario")]
        public int IdUsuario { get; set; }

        [Column("status_participacao")]
        public string StatusParticipacao { get; set; } = "CONVIDADO";

        [Column("data_confirmacao")]
        public DateTime? DataConfirmacao { get; set; }

        [Column("compareceu")]
        public bool Compareceu { get; set; }

        public Reuniao? Reuniao { get; set; }
        public Usuario? Usuario { get; set; }
    }
}
