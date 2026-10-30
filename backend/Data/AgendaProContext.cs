using AgendaPRO.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgendaPRO.API.Data
{
    public class AgendaProContext : DbContext
    {
        public AgendaProContext(DbContextOptions<AgendaProContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Reuniao> Reunioes { get; set; }
        public DbSet<ParticipanteReuniao> ParticipantesReuniao { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Reuniao>()
                .HasOne(r => r.Organizador)
                .WithMany()
                .HasForeignKey(r => r.IdOrganizador);

            modelBuilder.Entity<ParticipanteReuniao>()
                .HasKey(p => new { p.IdReuniao, p.IdUsuario });

            modelBuilder.Entity<ParticipanteReuniao>()
                .HasOne(p => p.Reuniao)
                .WithMany()
                .HasForeignKey(p => p.IdReuniao);

            modelBuilder.Entity<ParticipanteReuniao>()
                .HasOne(p => p.Usuario)
                .WithMany()
                .HasForeignKey(p => p.IdUsuario);
        }
    }
}
