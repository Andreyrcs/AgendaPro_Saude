using AgendaPro.Api.Modelos;

namespace AgendaPro.Api.Servicos;

public interface ITokenServico
{
    (string Token, DateTime ExpiraEm) Gerar(Usuario usuario, string papel, int? idMedico);
}