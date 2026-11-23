using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class PacienteServico : IPacienteServico
{
    private readonly IUsuarioRepositorio _usuarios;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IClinicaRepositorio _clinicas;
    private readonly IConsultaRepositorio _consultas;
    private readonly IListaEsperaRepositorio _fila;
    private readonly IFaltaRepositorio _faltas;
    private readonly IAcompanhamentoRepositorio _acompanhamento;

    public PacienteServico(IUsuarioRepositorio usuarios, IPacienteRepositorio pacientes,
        IClinicaRepositorio clinicas,
        IConsultaRepositorio consultas, IListaEsperaRepositorio fila, IFaltaRepositorio faltas,
        IAcompanhamentoRepositorio acompanhamento)
    {
        _usuarios = usuarios;
        _pacientes = pacientes;
        _clinicas = clinicas;
        _consultas = consultas;
        _fila = fila;
        _faltas = faltas;
        _acompanhamento = acompanhamento;
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
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já tem uma conta. Entre com ele ou use outro.");

        if (await _pacientes.CpfExisteAsync(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este CPF já está cadastrado.");

        int? idClinica = null;
        if (!string.IsNullOrWhiteSpace(dados.Codigo))
        {
            var codigo = dados.Codigo.Trim().ToUpperInvariant();
            idClinica = await _clinicas.BuscarIdPorCodigoAsync(codigo)
                ?? throw new ErroApi(StatusCodes.Status404NotFound,
                    "Não achamos uma clínica com esse código. Confira com a recepção.");
        }

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

        var (idUsuario, idPaciente) = await _pacientes.CriarContaComTitularAsync(usuario, titular, idClinica);
        return new PacienteCadastradoResposta(idUsuario, idPaciente, titular.Nome, usuario.Email);
    }

    // Opções de parentesco do familiar (relatorio-integracao.md:133; paciente-servicos.js:148).
    // "Titular" fica de fora: só o dono da conta é titular.
    private static readonly HashSet<string> Parentescos = new() { "Filho(a)", "Cônjuge", "Pai/Mãe", "Irmão(ã)", "Outro" };

    // Ids dos filtros da tela de pacientes (pagina-pacientes.js:62-66)
    private static readonly HashSet<string> Filtros = new() { "hoje", "fila", "faltas" };

    public async Task<IEnumerable<FamiliarResposta>> ListarFamiliaresAsync(int idConta)
    {
        var pessoas = await _pacientes.ListarDaContaAsync(idConta);
        return pessoas.Select(Familiar).ToList();
    }

    // Perfil (web e app): dados do titular e da conta. A conta desativada já recebe 401 antes daqui.
    public async Task<ContaPacienteResposta> ObterContaAsync(int idConta)
    {
        var conta = await _usuarios.BuscarAtivoPorIdAsync(idConta);
        var titular = (await _pacientes.ListarDaContaAsync(idConta)).FirstOrDefault(p => p.Parentesco == "Titular");
        if (conta is null || titular is null)
            throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");

        return new ContaPacienteResposta(titular.Nome, titular.Cpf, conta.Email, conta.Telefone,
            DateOnly.FromDateTime(titular.DataNascimento));
    }

    // Mesmas regras do titular para CPF e nascimento (seção 5.4; pendência 1 do CLAUDE.md: CPF repetido é 400)
    public async Task<FamiliarResposta> AdicionarFamiliarAsync(int idConta, FamiliarRequisicao dados)
    {
        var cpf = ValidadorCpf.SoNumeros(dados.Cpf);
        if (!ValidadorCpf.Valido(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "CPF inválido.");

        if (!Parentescos.Contains(dados.Relacao))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha o parentesco.");

        var nascimento = dados.Nascimento!.Value;
        if (nascimento > DateOnly.FromDateTime(DateTime.Today))
            throw new ErroApi(StatusCodes.Status400BadRequest, "A data de nascimento não pode ser no futuro.");

        if (await _pacientes.CpfExisteAsync(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este CPF já está cadastrado.");

        var familiar = new Paciente
        {
            IdUsuario = idConta,
            Nome = dados.Nome.Trim(),
            Cpf = cpf,
            DataNascimento = nascimento.ToDateTime(TimeOnly.MinValue),
            Alergias = dados.Alergias,
            Parentesco = dados.Relacao,
            Cor = dados.Cor ?? ""   // vazio = a cor padrão do banco
        };

        var id = await _pacientes.CriarFamiliarAsync(familiar);
        return Familiar((await _pacientes.BuscarPorIdAsync(id))!);
    }

    // Editar uma pessoa da própria família (titular ou familiar), com as mesmas regras do cadastro.
    // O titular continua "Titular" (o parentesco enviado é ignorado); um familiar não pode virar titular.
    // Sem cor no corpo, a cor atual fica.
    public async Task<FamiliarResposta> AtualizarFamiliarAsync(int idConta, int idPessoa, FamiliarRequisicao dados)
    {
        var pessoa = await _pacientes.BuscarPorIdAsync(idPessoa)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
        if (pessoa.IdUsuario != idConta)
            throw new ErroApi(StatusCodes.Status403Forbidden, "Você só pode gerenciar a sua família.");

        var cpf = ValidadorCpf.SoNumeros(dados.Cpf);
        if (!ValidadorCpf.Valido(cpf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "CPF inválido.");

        var titular = pessoa.Parentesco == "Titular";
        if (!titular && !Parentescos.Contains(dados.Relacao))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha o parentesco.");

        var nascimento = dados.Nascimento!.Value;
        if (nascimento > DateOnly.FromDateTime(DateTime.Today))
            throw new ErroApi(StatusCodes.Status400BadRequest, "A data de nascimento não pode ser no futuro.");

        if (await _pacientes.CpfExisteAsync(cpf, pessoa.Id))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este CPF já está cadastrado.");

        pessoa.Nome = dados.Nome.Trim();
        pessoa.Cpf = cpf;
        pessoa.DataNascimento = nascimento.ToDateTime(TimeOnly.MinValue);
        pessoa.Alergias = string.IsNullOrWhiteSpace(dados.Alergias) ? null : dados.Alergias.Trim();
        if (!titular) pessoa.Parentesco = dados.Relacao;
        if (!string.IsNullOrEmpty(dados.Cor)) pessoa.Cor = dados.Cor;

        await _pacientes.AtualizarAsync(pessoa);
        return Familiar((await _pacientes.BuscarPorIdAsync(pessoa.Id))!);
    }

    // Seção 5.5: busca por nome ou CPF, filtros e a ficha com consultas, faltas e fila.
    // Só pessoas das contas vinculadas à clínica (Apêndice C); consultas, faltas e filas só desta clínica.
    public async Task<IEnumerable<PacienteDaClinicaResposta>?> ListarDaClinicaAsync(int idClinica, string? busca,
        string? filtro, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        if (!string.IsNullOrEmpty(filtro) && !Filtros.Contains(filtro))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Use um destes filtros: hoje, fila ou faltas.");

        // Como pagina-pacientes.js:79-84: 3 ou mais números, só com números e pontuação, é busca por CPF
        string? nome = null, cpf = null;
        var termo = busca?.Trim() ?? "";
        if (termo != "")
        {
            var digitos = ValidadorCpf.SoNumeros(termo);
            if (digitos.Length >= 3 && termo.All(ch => char.IsDigit(ch) || ch is '.' or '-' || char.IsWhiteSpace(ch)))
                cpf = digitos;
            else
                nome = termo;
        }

        var pessoas = await _pacientes.ListarDaClinicaAsync(idClinica, nome, cpf);
        var consultas = (await _consultas.ListarComPacienteDaClinicaAsync(idClinica)).ToList();
        var prevencao = ConsultaServico.Titulos(await _consultas.ListarDePrevencaoDaClinicaAsync(idClinica));
        var faltas = (await _faltas.ListarNaoRetiradasDaClinicaAsync(idClinica)).ToList();
        var filas = (await _fila.ListarAtivasDaClinicaAsync(idClinica)).ToList();
        var retornos = (await _acompanhamento.ListarRetornosDaClinicaAsync(idClinica)).ToList();
        var exames = (await _acompanhamento.ListarExamesDaClinicaAsync(idClinica)).ToList();

        var lista = pessoas.Select(p => new PacienteDaClinicaResposta(
            p.Id,
            p.Nome,
            p.Cpf,
            DateOnly.FromDateTime(p.DataNascimento),
            p.Parentesco,
            p.IdUsuario,
            faltas.Count(f => f.IdPaciente == p.Id),
            consultas.Where(c => c.Paciente!.Id == p.Id)
                .Select(c => ConsultaServico.Resposta(c, prevencao))
                .ToList(),
            filas.Where(e => e.Paciente.Id == p.Id)
                .Select(e => new FilaDaPessoaResposta(e.Entrada.Id, e.Entrada.Posicao,
                    new MedicoResumoResposta(e.Medico.Id, e.Medico.Nome),
                    DateOnly.FromDateTime(e.Entrada.DataEntrada), e.Entrada.UsaApp))
                .ToList(),
            retornos.Where(r => r.Paciente.Id == p.Id).Select(AcompanhamentoServico.RespostaRetorno).ToList(),
            exames.Where(x => x.Paciente.Id == p.Id).Select(AcompanhamentoServico.RespostaExame).ToList()));

        var hoje = DateOnly.FromDateTime(DateTime.Today);
        return filtro switch
        {
            "hoje" => lista.Where(p => p.Consultas.Any(c => c.Data == hoje)).ToList(),
            "fila" => lista.Where(p => p.Filas.Any()).ToList(),
            "faltas" => lista.Where(p => p.Faltas > 0).ToList(),
            _ => lista.ToList()
        };
    }

    // curto = primeiro nome (primeiroNome em aplicativo/src/utilitarios/texto.js).
    // Usado também pelo acompanhamento e pela prevenção, para a pessoa sair no mesmo formato.
    internal static FamiliarResposta Familiar(Paciente p) =>
        new(p.Id, p.Nome, p.Nome.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "",
            p.Cpf, p.Parentesco, DateOnly.FromDateTime(p.DataNascimento), p.Cor, p.Alergias,
            p.Parentesco == "Titular");
}