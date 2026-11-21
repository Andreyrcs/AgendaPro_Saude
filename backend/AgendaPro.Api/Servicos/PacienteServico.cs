using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class PacienteServico : IPacienteServico
{
    private readonly IUsuarioRepositorio _usuarios;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IClinicaRepositorio _clinicas;                                     //

    public PacienteServico(IUsuarioRepositorio usuarios, IPacienteRepositorio pacientes,
        IClinicaRepositorio clinicas)                                                    // 
    {
        _usuarios = usuarios;
        _pacientes = pacientes;
        _clinicas = clinicas;                                                            // 
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
        var nome = dados.Nome.Trim();

        if (await _usuarios.EmailExisteAsync(email))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já está cadastrado.");

        if (await _pacientes.CpfExisteAsync(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este CPF já está cadastrado.");

        int? idClinica = null;                                                           // ←
        if (!string.IsNullOrWhiteSpace(dados.Codigo))                                    // ←
        {                                                                                // ←
            var codigo = dados.Codigo.Trim().ToUpperInvariant();                         // ←
            idClinica = await _clinicas.BuscarIdPorCodigoAsync(codigo)                   // ←
                ?? throw new ErroApi(StatusCodes.Status404NotFound,                      // ←
                    "Não achamos uma clínica com esse código. Confira com a recepção."); // ←
        }                                                                                // ←

        var usuario = new Usuario
        {
            Email = email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(dados.Senha, workFactor: 12),
            Papel = "PACIENTE",
            Nome = nome,
            Telefone = dados.Telefone,
            Ativo = true
        };

        var titular = new Paciente
        {
            Nome = nome,
            Cpf = cpf,
            DataNascimento = nascimento.ToDateTime(TimeOnly.MinValue),
            Alergias = dados.Alergias,
            Parentesco = "Titular"
        };

        var (idUsuario, idPaciente) = await _pacientes.CriarContaComTitularAsync(usuario, titular, idClinica);  // ←
        return new PacienteCadastradoResposta(idUsuario, idPaciente, titular.Nome, usuario.Email);
    }
}