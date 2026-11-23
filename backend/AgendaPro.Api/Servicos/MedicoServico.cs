using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class MedicoServico : IMedicoServico
{
    private const int Sabado = 6;

    private readonly IMedicoRepositorio _medicos;
    private readonly IEspecialidadeRepositorio _especialidades;
    private readonly IUsuarioRepositorio _usuarios;
    private readonly IHorarioRepositorio _horarios;

    public MedicoServico(IMedicoRepositorio medicos, IEspecialidadeRepositorio especialidades,
        IUsuarioRepositorio usuarios, IHorarioRepositorio horarios)
    {
        _medicos = medicos;
        _especialidades = especialidades;
        _usuarios = usuarios;
        _horarios = horarios;
    }

    public async Task<IEnumerable<MedicoResposta>?> ListarPorClinicaAsync(int idClinica, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var medicos = (await _medicos.ListarCompletosPorClinicaAsync(idClinica)).ToList();
        var expedientes = (await _horarios.ListarPorMedicosAsync(medicos.Select(m => m.Medico.Id))).ToList();

        return medicos.Select(m => Resposta(m, expedientes.Where(h => h.IdMedico == m.Medico.Id))).ToList();
    }

    public async Task<MedicoCadastradoResposta?> CadastrarAsync(int idClinica, CadastroMedicoRequisicao dados, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        await ConferirEspecialidadeAsync(dados.Especialidade!.Value, idClinica);

        var email = dados.Email.Trim().ToLowerInvariant();
        if (await _usuarios.EmailExisteAsync(email))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já tem uma conta.");

        // pagina-medicos.js:155: a tela põe o CRM em maiúsculas
        var crm = dados.Crm.Trim().ToUpperInvariant();
        if (await _medicos.CrmExisteAsync(crm, null))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Já existe um médico com este CRM.");

        var telefone = TelefoneFormatado(dados.Telefone);
        var nome = dados.Nome.Trim();
        var senhaProvisoria = GeradorSenhaProvisoria.Gerar();

        var conta = new Usuario
        {
            Email = email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(senhaProvisoria, workFactor: 12),
            Papel = "MEDICO",
            Nome = nome,
            Telefone = telefone,
            IdClinica = idClinica,
            Ativo = true
        };

        var medico = new Medico
        {
            IdEspecialidade = dados.Especialidade.Value,
            IdClinica = idClinica,
            Nome = nome,
            Crm = crm,
            Sala = Opcional(dados.Sala)
        };

        var idMedico = await _medicos.CriarComContaAsync(conta, medico);
        var completo = (await _medicos.BuscarCompletoAsync(idMedico))!.Value;

        return new MedicoCadastradoResposta(
            Resposta(completo, []),
            new ContaCriadaResposta(medico.IdUsuario, nome, email, "medico"),
            senhaProvisoria);
    }

    public async Task<MedicoResposta?> AtualizarAsync(int id, AtualizacaoMedicoRequisicao dados, UsuarioLogado logado)
    {
        var medico = await BuscarOuFalharAsync(id);
        if (!PodeMexer(medico, logado))
            return null;

        await ConferirEspecialidadeAsync(dados.Especialidade!.Value, medico.IdClinica);

        var crm = dados.Crm.Trim().ToUpperInvariant();

        // O CRM é o registro profissional conferido pela clínica: o médico edita os próprios dados de perfil
        // (Apêndice G), mas só a recepção e o dono trocam o CRM. Mandar o mesmo CRM continua valendo.
        if (logado.EhMedico && crm != medico.Crm)
            throw new ErroApi(StatusCodes.Status403Forbidden, "Só a recepção pode alterar o CRM.");

        if (await _medicos.CrmExisteAsync(crm, medico.Id))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Já existe um médico com este CRM.");

        medico.Nome = dados.Nome.Trim();
        medico.Crm = crm;
        medico.IdEspecialidade = dados.Especialidade.Value;
        medico.Sala = Opcional(dados.Sala);

        await _medicos.AtualizarAsync(medico, TelefoneFormatado(dados.Telefone));

        var completo = (await _medicos.BuscarCompletoAsync(id))!.Value;
        var expediente = await _horarios.ListarPorMedicosAsync([id]);
        return Resposta(completo, expediente);
    }

    // L2: perfil do médico (CRM, especialidade, sala, telefone e expediente). O próprio médico ou a equipe da clínica.
    public async Task<MedicoResposta?> ObterAsync(int id, UsuarioLogado logado)
    {
        var medico = await BuscarOuFalharAsync(id);
        if (!PodeMexer(medico, logado))
            return null;

        var completo = (await _medicos.BuscarCompletoAsync(id))!.Value;
        var expediente = await _horarios.ListarPorMedicosAsync([id]);
        return Resposta(completo, expediente);
    }

    // L6: desativa a conta do médico (Usuarios.Ativo = 0), sem apagar nada. Ele some das listas e dos horários livres,
    // não recebe consulta nem fila nova e não entra mais (o token vira 401). As consultas antigas continuam no histórico.
    // Recusa enquanto houver consulta por atender ou gente na fila dele, para ninguém ficar com consulta ou fila presa.
    public async Task<bool> DesativarAsync(int id, UsuarioLogado logado)
    {
        var medico = await BuscarOuFalharAsync(id);
        if (logado.IdClinica != medico.IdClinica)
            return false;

        var (consultas, fila) = await _medicos.ContarCompromissosAsync(id);
        if (consultas > 0)
            throw new ErroApi(StatusCodes.Status400BadRequest,
                "Este médico tem consultas marcadas. Cancele ou reagende antes de desativar.");
        if (fila > 0)
            throw new ErroApi(StatusCodes.Status400BadRequest,
                "Este médico tem pacientes na lista de espera. Tire-os da fila antes de desativar.");

        await _usuarios.DesativarAsync(medico.IdUsuario);
        return true;
    }

    // PUT /api/medicos/{id}/expediente: semana → dias 1 a 5, sábado → dia 6, domingo nunca (pagina-horarios.js:93)
    public async Task<bool> SalvarExpedienteAsync(int id, ExpedienteRequisicao dados, UsuarioLogado logado)
    {
        var medico = await BuscarOuFalharAsync(id);
        if (logado.IdClinica != medico.IdClinica)
            return false;

        var semana = Periodo(dados.Semana, "O fim do expediente precisa ser depois do começo.");
        var sabado = Periodo(dados.Sabado, "O fim do expediente precisa ser depois do começo.");
        var almoco = Periodo(dados.Almoco, "O fim do almoço precisa ser depois do começo.");

        var dias = new List<HorarioAtendimento>();
        if (semana is not null)
            for (byte dia = 1; dia <= 5; dia++)
                dias.Add(Dia(id, dia, semana.Value, almoco));
        if (sabado is not null)
            dias.Add(Dia(id, Sabado, sabado.Value, almoco));

        await _horarios.SubstituirExpedienteAsync(id, dias);
        return true;
    }

    // O almoço é um só, mas CK_Horarios_Almoco exige que ele caiba no horário de cada dia:
    // cabe inteiro → grava; não encosta no horário do dia → NULL nesse dia; corta pela metade → 400.
    private static HorarioAtendimento Dia(int idMedico, byte dia, (TimeSpan Inicio, TimeSpan Fim) horario,
        (TimeSpan Inicio, TimeSpan Fim)? almoco)
    {
        var linha = new HorarioAtendimento
        {
            IdMedico = idMedico,
            DiaSemana = dia,
            HoraInicio = horario.Inicio,
            HoraFim = horario.Fim
        };

        if (almoco is { } a)
        {
            var cabe = a.Inicio >= horario.Inicio && a.Fim <= horario.Fim;
            var encosta = a.Inicio < horario.Fim && a.Fim > horario.Inicio;

            if (cabe)
            {
                linha.InicioAlmoco = a.Inicio;
                linha.FimAlmoco = a.Fim;
            }
            else if (encosta)
                throw new ErroApi(StatusCodes.Status400BadRequest, "O almoço precisa ficar dentro do expediente.");
        }

        return linha;
    }

    private static (TimeSpan Inicio, TimeSpan Fim)? Periodo(PeriodoRequisicao? periodo, string mensagemFimAntes)
    {
        if (periodo is null)
            return null;

        var inicio = FormatadorTexto.Hora(periodo.Inicio);
        var fim = FormatadorTexto.Hora(periodo.Fim);
        if (inicio >= fim)
            throw new ErroApi(StatusCodes.Status400BadRequest, mensagemFimAntes);

        return (inicio, fim);
    }


    private async Task<Medico> BuscarOuFalharAsync(int id) =>
        await _medicos.BuscarPorIdAsync(id)
        ?? throw new ErroApi(StatusCodes.Status404NotFound, "Médico não encontrado.");

    // O médico mexe só no próprio cadastro; a equipe, só nos médicos da própria clínica
    private static bool PodeMexer(Medico medico, UsuarioLogado logado) =>
        logado.EhMedico ? logado.IdMedico == medico.Id : logado.IdClinica == medico.IdClinica;

    private async Task ConferirEspecialidadeAsync(int idEspecialidade, int idClinica)
    {
        var especialidade = await _especialidades.BuscarPorIdAsync(idEspecialidade);
        if (especialidade is null || especialidade.IdClinica != idClinica)
            throw new ErroApi(StatusCodes.Status404NotFound, "Especialidade não encontrada.");
    }

    private static string? TelefoneFormatado(string? telefone)
    {
        var formatado = FormatadorTexto.Telefone(telefone);
        if (formatado?.Length > 20)
            throw new ErroApi(StatusCodes.Status400BadRequest, "O telefone pode ter até 20 caracteres.");
        return formatado;
    }

    private static string? Opcional(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();

    private static MedicoResposta Resposta((Medico Medico, Especialidade Especialidade, Usuario Conta) m,
        IEnumerable<HorarioAtendimento> expediente) =>
        new(m.Medico.Id, m.Medico.Nome, m.Medico.Crm, m.Medico.Sala, m.Conta.Telefone,
            new EspecialidadeResposta(m.Especialidade.Id, m.Especialidade.Nome, m.Especialidade.DuracaoPadrao),
            Expediente(expediente.ToList()));

    // O banco guarda um dia por linha; a tela mostra "segunda a sexta", "sábado" e um almoço
    private static ExpedienteResposta? Expediente(List<HorarioAtendimento> dias)
    {
        if (dias.Count == 0)
            return null;

        var semana = dias.Where(d => d.DiaSemana is >= 1 and <= 5).OrderBy(d => d.DiaSemana).FirstOrDefault();
        var sabado = dias.FirstOrDefault(d => d.DiaSemana == Sabado);
        var comAlmoco = dias.Where(d => d.InicioAlmoco is not null).OrderBy(d => d.DiaSemana).FirstOrDefault();

        return new ExpedienteResposta(
            semana is null ? null : Texto(semana.HoraInicio, semana.HoraFim),
            sabado is null ? null : Texto(sabado.HoraInicio, sabado.HoraFim),
            comAlmoco is null ? null : Texto(comAlmoco.InicioAlmoco!.Value, comAlmoco.FimAlmoco!.Value));
    }

    private static PeriodoResposta Texto(TimeSpan inicio, TimeSpan fim) =>
        new(FormatadorTexto.Hora(inicio), FormatadorTexto.Hora(fim));
}
