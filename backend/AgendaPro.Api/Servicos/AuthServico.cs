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

    public async Task TrocarSenhaAsync(int idUsuario, TrocaSenhaRequisicao dados)
    {
        // Conta desativada depois do login (o token ainda vale, mas a conta não)
        var usuario = await _usuarios.BuscarAtivoPorIdAsync(idUsuario)
            ?? throw new ErroApi(StatusCodes.Status401Unauthorized, "Entre de novo para trocar a senha.");

        if (!BCrypt.Net.BCrypt.Verify(dados.SenhaAtual, usuario.SenhaHash))
            throw new ErroApi(StatusCodes.Status400BadRequest, "A senha atual não confere.");

        var novoHash = BCrypt.Net.BCrypt.HashPassword(dados.NovaSenha, workFactor: 12);
        await _usuarios.AtualizarSenhaAsync(usuario.Id, novoHash);
    }
}