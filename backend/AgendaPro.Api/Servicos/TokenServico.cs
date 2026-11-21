using System.Text;
using AgendaPro.Api.Modelos;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AgendaPro.Api.Servicos;

public class TokenServico : ITokenServico
{
    private readonly string _chave;
    private readonly string _emissor;
    private readonly int _horasEquipe;
    private readonly int _diasPaciente;

    public TokenServico(IConfiguration configuracao)
    {
        _chave = configuracao["Jwt:Chave"]
            ?? throw new InvalidOperationException("A chave 'Jwt:Chave' não foi configurada.");
        _emissor = configuracao["Jwt:Emissor"]
            ?? throw new InvalidOperationException("O emissor 'Jwt:Emissor' não foi configurado.");
        _horasEquipe = configuracao.GetValue<int>("Jwt:HorasValidadeEquipe");
        _diasPaciente = configuracao.GetValue<int>("Jwt:DiasValidadePaciente");
    }

    public (string Token, DateTime ExpiraEm) Gerar(Usuario usuario, string papel, int? idMedico)
    {
        var expiraEm = papel == "paciente"
            ? DateTime.UtcNow.AddDays(_diasPaciente)
            : DateTime.UtcNow.AddHours(_horasEquipe);

        var claims = new Dictionary<string, object>
        {
            [JwtRegisteredClaimNames.Sub] = usuario.Id.ToString(),
            ["role"] = papel
        };
        if (usuario.IdClinica.HasValue) claims["clinica"] = usuario.IdClinica.Value;
        if (idMedico.HasValue) claims["medico"] = idMedico.Value;

        var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_chave));

        var descritor = new SecurityTokenDescriptor
        {
            Claims = claims,
            Expires = expiraEm,
            Issuer = _emissor,
            SigningCredentials = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256)
        };

        var token = new JsonWebTokenHandler().CreateToken(descritor);
        return (token, expiraEm);
    }
}