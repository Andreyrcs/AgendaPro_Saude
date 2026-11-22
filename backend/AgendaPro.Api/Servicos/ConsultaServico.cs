using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class ConsultaServico : IConsultaServico
{
    private const string SoSuaFamilia = "Você só pode gerenciar a sua família.";

    private readonly IConsultaRepositorio _consultas;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IMedicoRepositorio _medicos;
    private readonly IEspecialidadeRepositorio _especialidades;
    private readonly IClinicaRepositorio _clinicas;
    private readonly IAcompanhamentoRepositorio _acompanhamento;

    public ConsultaServico(IConsultaRepositorio consultas, IPacienteRepositorio pacientes, IMedicoRepositorio medicos,
        IEspecialidadeRepositorio especialidades, IClinicaRepositorio clinicas, IAcompanhamentoRepositorio acompanhamento)
    {
        _consultas = consultas;
        _pacientes = pacientes;
        _medicos = medicos;
        _especialidades = especialidades;
        _clinicas = clinicas;
        _acompanhamento = acompanhamento;
    }

    public async Task<ConsultaResposta?> ObterAsync(int id, UsuarioLogado logado)
    {
        var consulta = await BuscarOuFalharAsync(id);
        if (!PodeVer(consulta, logado))
            return null;

        var prevencao = Titulos(await _consultas.FiltrarDePrevencaoAsync([id]));
        return Resposta(consulta, prevencao);
    }

    // Próximas: confirmadas de hoje em diante, da mais cedo para a mais tarde.
    // Passadas: o resto (inclusive as canceladas), da mais recente para a mais antiga (app: consultas.js:33-43).
    public async Task<ConsultasDaContaResposta> ListarDaContaAsync(int idConta)
    {
        var consultas = (await _consultas.ListarPorContaAsync(idConta)).ToList();
        var prevencao = Titulos(await _consultas.FiltrarDePrevencaoAsync(consultas.Select(c => c.Consulta.Id)));

        var hoje = DateTime.Today;
        bool EhProxima(ConsultaCompleta c) => c.Status.Codigo == "CONFIRMADA" && c.Consulta.DataConsulta >= hoje;

        var proximas = consultas.Where(EhProxima)
            .OrderBy(c => c.Consulta.DataConsulta).ThenBy(c => c.Consulta.HoraInicio)
            .Select(c => Resposta(c, prevencao)).ToList();

        var passadas = consultas.Where(c => !EhProxima(c))
            .OrderByDescending(c => c.Consulta.DataConsulta).ThenByDescending(c => c.Consulta.HoraInicio)
            .Select(c => Resposta(c, prevencao)).ToList();

        return new ConsultasDaContaResposta(proximas, passadas);
    }

    public async Task<ConsultaResposta?> AgendarAsync(AgendamentoRequisicao dados, UsuarioLogado logado)
    {
        var medico = await BuscarMedicoOuFalharAsync(dados.Medico!.Value);
        var paciente = await _pacientes.BuscarPorIdAsync(dados.Pessoa!.Value);

        if (logado.EhPaciente)
        {
            if (paciente is null)
                throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
            if (paciente.IdUsuario != logado.IdUsuario)
                throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);
            if (!await _clinicas.ContaVinculadaAsync(logado.IdUsuario, medico.IdClinica))
                return null;
        }
        else
        {
            if (medico.IdClinica != logado.IdClinica)
                return null;
            // A recepção só marca para quem tem a conta vinculada à clínica (texto do erro 50001)
            if (paciente is null || !await _clinicas.ContaVinculadaAsync(paciente.IdUsuario, medico.IdClinica))
                throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
        }

        await ConferirPediatriaAsync(medico, paciente);

        var motivo = string.IsNullOrWhiteSpace(dados.Motivo) ? null : dados.Motivo.Trim();
        var idConsulta = await _consultas.AgendarAsync(paciente.Id, medico.Id,
            dados.Data!.Value.ToDateTime(TimeOnly.MinValue), FormatadorTexto.Hora(dados.Hora), motivo,
            pelaRecepcao: logado.EhRecepcaoOuDono);

        return await ObterAsync(idConsulta, logado);
    }

    // Recepção e dono: cancela e agenda o novo horário para o mesmo paciente, com o mesmo motivo
    public async Task<ConsultaResposta?> ReagendarAsync(int id, ReagendamentoRequisicao dados, UsuarioLogado logado)
    {
        var atual = await BuscarOuFalharAsync(id);
        if (atual.Medico.IdClinica != logado.IdClinica)
            return null;

        var novoMedico = await BuscarMedicoOuFalharAsync(dados.Medico!.Value);
        if (novoMedico.IdClinica != logado.IdClinica)
            return null;

        // Linha VAGA ou OFERECIDA não tem paciente: mesmo texto do erro 50030 do banco
        if (atual.Paciente is null)
            throw new ErroApi(StatusCodes.Status400BadRequest, "Consulta não encontrada ou não pode mais ser cancelada.");

        await ConferirPediatriaAsync(novoMedico, atual.Paciente);

        var idNova = await _consultas.ReagendarAsync(id, logado.IdUsuario, atual.Paciente.Id, novoMedico.Id,
            dados.Data!.Value.ToDateTime(TimeOnly.MinValue), FormatadorTexto.Hora(dados.Hora), atual.Consulta.Motivo);

        return await ObterAsync(idNova, logado);
    }

    public async Task<CancelamentoResposta?> CancelarAsync(int id, UsuarioLogado logado)
    {
        var consulta = await BuscarOuFalharAsync(id);

        if (logado.EhPaciente)
            ConferirFamilia(consulta, logado);
        else if (consulta.Medico.IdClinica != logado.IdClinica)
            return null;

        await _consultas.CancelarAsync(id, peloPaciente: logado.EhPaciente, logado.IdUsuario);
        return await ResultadoAsync(consulta.Consulta);
    }

    public async Task<object> ResponderPresencaAsync(int id, PresencaRequisicao dados, UsuarioLogado logado)
    {
        var consulta = await BuscarOuFalharAsync(id);
        ConferirFamilia(consulta, logado);

        // Seção 5.5 e aplicativo-integracao-api.md:148: a confirmação é pedida a partir da véspera
        if (DateTime.Today < consulta.Consulta.DataConsulta.AddDays(-1))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Só dá para confirmar a partir da véspera da consulta.");

        var vou = dados.Vou!.Value;
        await _consultas.ConfirmarPresencaAsync(id, vou, logado.IdUsuario);

        if (vou)
            return (await ObterAsync(id, logado))!;

        return await ResultadoAsync(consulta.Consulta);
    }

    // Agenda da clínica (Apêndice C): consultas de qualquer status, vagas ("livre") e ofertas ("oferecido")
    public async Task<IEnumerable<ConsultaResposta>?> AgendaDaClinicaAsync(int idClinica, PeriodoAgendaRequisicao periodo,
        UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var de = periodo.De!.Value;
        var ate = periodo.Ate!.Value;
        if (ate < de)
            throw new ErroApi(StatusCodes.Status400BadRequest, "O fim do período precisa ser depois do começo.");

        var consultas = await _consultas.ListarDaClinicaAsync(idClinica,
            de.ToDateTime(TimeOnly.MinValue), ate.ToDateTime(TimeOnly.MinValue));
        var prevencao = Titulos(await _consultas.ListarDePrevencaoDaClinicaAsync(idClinica));

        return consultas.Select(c => Resposta(c, prevencao)).ToList();
    }

    // Agenda do médico (Apêndice C): as linhas dele no dia, como a agenda da clínica (a tela filtra),
    // o histórico (todas as consultas dele com paciente: medico.js:201-203) e os exames e retornos
    // que o detalhe da consulta mostra (medico.js:747-791). Só o próprio médico (Apêndice F, claim medico).
    public async Task<AgendaMedicoResposta?> AgendaDoMedicoAsync(int idMedico, AgendaMedicoRequisicao dia, UsuarioLogado logado)
    {
        if (logado.IdMedico != idMedico)
            return null;

        var data = dia.Data!.Value.ToDateTime(TimeOnly.MinValue);
        var doDia = await _consultas.ListarDoMedicoAsync(idMedico, data);
        var historico = await _consultas.ListarComPacienteDoMedicoAsync(idMedico);
        var prevencao = Titulos(await _consultas.ListarDePrevencaoDaClinicaAsync(logado.IdClinica!.Value));
        var exames = await _acompanhamento.ListarExamesDoMedicoAsync(idMedico);
        var retornos = await _acompanhamento.ListarRetornosDoMedicoAsync(idMedico);

        return new AgendaMedicoResposta(
            doDia.Select(c => Resposta(c, prevencao)).ToList(),
            historico.Select(c => Resposta(c, prevencao)).ToList(),
            exames.Select(AcompanhamentoServico.RespostaExame).ToList(),
            retornos.Select(AcompanhamentoServico.RespostaRetorno).ToList());
    }

    // Apêndice I: quem pode pedir cada status e de qual status a consulta precisa partir.
    // "Recepção" vale também para o dono (Apêndice G).
    private record RegraStatus(string Novo, string[] Atuais, bool Recepcao, bool Medico, string Erro);

    private static readonly Dictionary<string, RegraStatus> RegrasStatus = new()
    {
        ["na_recepcao"] = new("NA_RECEPCAO", ["CONFIRMADA"], Recepcao: true, Medico: false,
            "Só dá para registrar a chegada de consulta confirmada."),
        ["confirmada"] = new("CONFIRMADA", ["NA_RECEPCAO"], Recepcao: true, Medico: false,
            "Só dá para desfazer a chegada de quem está na recepção."),
        ["em_atendimento"] = new("EM_ATENDIMENTO", ["NA_RECEPCAO"], Recepcao: true, Medico: true,
            "Só dá para iniciar o atendimento de quem está na recepção."),
        ["atendida"] = new("ATENDIDA", ["CONFIRMADA", "NA_RECEPCAO", "EM_ATENDIMENTO"], Recepcao: false, Medico: true,
            "Esta consulta não pode mais ser finalizada.")
    };

    public async Task<ConsultaResposta?> MudarStatusAsync(int id, StatusRequisicao dados, UsuarioLogado logado)
    {
        var consulta = await BuscarOuFalharAsync(id);

        // O médico mexe só nas próprias consultas; a equipe, só nas da clínica
        var dele = logado.EhMedico ? consulta.Medico.Id == logado.IdMedico : consulta.Medico.IdClinica == logado.IdClinica;
        if (!dele)
            return null;

        // faltou e cancelada têm rotas próprias (POST /falta e DELETE)
        if (!RegrasStatus.TryGetValue(dados.Status, out var regra))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Status inválido.");

        // Perfil que não faz essa ação (ex.: recepção finalizando o atendimento)
        if (logado.EhMedico ? !regra.Medico : !regra.Recepcao)
            return null;

        if (!await _consultas.MudarStatusAsync(id, regra.Atuais, regra.Novo))
            throw new ErroApi(StatusCodes.Status400BadRequest, regra.Erro);

        return await ObterAsync(id, logado);
    }

    private async Task<CancelamentoResposta> ResultadoAsync(Consulta consulta)
    {
        var (falta, oferecido) = await _consultas.ResultadoCancelamentoAsync(consulta);
        return new CancelamentoResposta(falta, oferecido);
    }

    // Contrato do app (aplicativo-integracao-api.md:85): pediatria só até 18 anos, pela idade de hoje
    private async Task ConferirPediatriaAsync(Medico medico, Paciente paciente)
    {
        var especialidade = await _especialidades.BuscarPorIdAsync(medico.IdEspecialidade);
        if (especialidade is null || FormatadorTexto.SemAcento(especialidade.Nome).Trim() != "pediatria")
            return;

        var hoje = DateTime.Today;
        var idade = hoje.Year - paciente.DataNascimento.Year;
        if (paciente.DataNascimento.Date > hoje.AddYears(-idade))
            idade--;

        if (idade >= 18)
            throw new ErroApi(StatusCodes.Status400BadRequest, "A pediatria atende só crianças e adolescentes até 18 anos.");
    }

    // Paciente: consulta da própria família. Médico: só as próprias (Apêndice G). Recepção e dono: da clínica.
    private static bool PodeVer(ConsultaCompleta consulta, UsuarioLogado logado)
    {
        if (logado.EhPaciente)
        {
            ConferirFamilia(consulta, logado);
            return true;
        }

        if (logado.EhMedico)
            return consulta.Medico.Id == logado.IdMedico;

        return consulta.Medico.IdClinica == logado.IdClinica;
    }

    private static void ConferirFamilia(ConsultaCompleta consulta, UsuarioLogado logado)
    {
        if (consulta.Paciente is null || consulta.Paciente.IdUsuario != logado.IdUsuario)
            throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);
    }

    private async Task<ConsultaCompleta> BuscarOuFalharAsync(int id) =>
        await _consultas.BuscarAsync(id)
        ?? throw new ErroApi(StatusCodes.Status404NotFound, "Consulta não encontrada.");

    private async Task<Medico> BuscarMedicoOuFalharAsync(int id) =>
        await _medicos.BuscarPorIdAsync(id)
        ?? throw new ErroApi(StatusCodes.Status404NotFound, "Médico não encontrado.");

    // Id da consulta → título do item de prevenção ligado a ela
    internal static Dictionary<int, string> Titulos(IEnumerable<PrevencaoDaConsulta> itens) =>
        itens.ToDictionary(p => p.IdConsulta, p => p.Titulo);

    // Usado também pela tela de pacientes (PacienteServico), para as consultas saírem no mesmo formato.
    // Consulta ligada a um item de prevenção: "tipo": "prevencao" e o título do item; as outras: "consulta" e null.
    internal static ConsultaResposta Resposta(ConsultaCompleta c, IReadOnlyDictionary<int, string> prevencao)
    {
        var titulo = prevencao.GetValueOrDefault(c.Consulta.Id);
        return new(c.Consulta.Id,
            DateOnly.FromDateTime(c.Consulta.DataConsulta),
            FormatadorTexto.Hora(c.Consulta.HoraInicio),
            c.Consulta.Sala,
            TradutorStatus.DaConsulta(c.Status.Codigo),
            c.Consulta.Motivo,
            titulo is null ? "consulta" : "prevencao",
            titulo,
            c.Consulta.PresencaConfirmada == true,
            c.Paciente is null ? null : PacienteServico.Familiar(c.Paciente),
            new MedicoSalaResposta(c.Medico.Id, c.Medico.Nome, c.Medico.Sala),
            new EspecialidadeResumoResposta(c.Especialidade.Id, c.Especialidade.Nome));
    }
}
