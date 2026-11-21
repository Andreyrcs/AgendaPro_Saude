using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class PacienteServico : IPacienteServico
{
    private readonly IUsuarioRepositorio _usuarios;
    private readonly IPacienteRepositorio _pacientes;

    public PacienteServico(IUsuarioRepositorio usuarios, IPacienteRepositorio pacientes)
    {
        _usuarios = usuarios;
        _pacientes = pacientes;
    }

    public async Task<PacienteCadastradoResposta> CadastrarAsync(CadastroPacienteRequisicao dados)
    {
        var cpf = ValidadorCpf.SoNumeros(dados.Cpf);
        if (!ValidadorCpf.Valido(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "CPF inválido.");

        var nascimento = dados.Nascimento!.Value;
        if (nascimento > DateOnly.FromDateTime(DateTime.Today))
            throw new ErroApi(StatusCodes.Status400BadRequest, "A data de nascimento não pode ser no futuro.");

        var email = dados.Email.Trim().ToLowerInvariant();
        if (await _usuarios.EmailExisteAsync(email))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já está cadastrado.");

        if (await _pacientes.CpfExisteAsync(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este CPF já está cadastrado.");

        var usuario = new Usuario
        {
            Email = email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(dados.Senha, workFactor: 12),
            Papel = "PACIENTE",
            Nome = dados.Nome.Trim(),
            Telefone = string.IsNullOrWhiteSpace(dados.Telefone) ? null : dados.Telefone.Trim(),
            Ativo = true
        };

        var titular = new Paciente
        {
            Nome = usuario.Nome,
            Cpf = cpf,
            DataNascimento = nascimento.ToDateTime(TimeOnly.MinValue),
            Parentesco = "Titular"
        };

        var (idUsuario, idPaciente) = await _pacientes.CriarContaComTitularAsync(usuario, titular);
        return new PacienteCadastradoResposta(idUsuario, idPaciente, titular.Nome, email);
    }
}