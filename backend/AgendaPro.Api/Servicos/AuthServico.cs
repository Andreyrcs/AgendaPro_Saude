using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class AuthServico : IAuthServico
{
    private const string MensagemFalha = "E-mail ou senha incorretos";

    private readonly IUsuarioRepositorio _usuarios;
    private readonly IMedicoRepositorio _medicos;
    private readonly ITokenServico _tokens;

    public AuthServico(IUsuarioRepositorio usuarios, IMedicoRepositorio medicos, ITokenServico tokens)
    {
        _usuarios = usuarios;
        _medicos = medicos;
        _tokens = tokens;
    }

    public async Task<LoginResposta> EntrarAsync(LoginRequisicao dados)
    {
        var usuario = await _usuarios.BuscarAtivoPorEmailAsync(dados.Email.Trim().ToLowerInvariant());

        if (usuario is null || !BCrypt.Net.BCrypt.Verify(dados.Senha, usuario.SenhaHash))
            throw new ErroApi(StatusCodes.Status401Unauthorized, MensagemFalha);

        var papel = usuario.Papel.ToLowerInvariant();
        int? idMedico = papel == "medico"
            ? await _medicos.BuscarIdPorUsuarioAsync(usuario.Id)
            : null;

        var (token, expiraEm) = _tokens.Gerar(usuario, papel, idMedico);

        return new LoginResposta(token, expiraEm,
            new UsuarioLogadoResposta(usuario.Id, usuario.Nome, usuario.Email, papel, usuario.IdClinica, idMedico));
    }
}