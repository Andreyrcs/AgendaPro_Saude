using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class AcompanhamentoServico : IAcompanhamentoServico
{
    // Apêndice I: retorno só de consulta em atendimento ou atendida. Pedir exame: a mesma condição,
    // que é quando o medico.js:755 mostra o campo (decisão do Lote C).
    private static readonly string[] EmAtendimentoOuAtendida = ["EM_ATENDIMENTO", "ATENDIDA"];

    private readonly IAcompanhamentoRepositorio _acompanhamento;
    private readonly IConsultaRepositorio _consultas;

    public AcompanhamentoServico(IAcompanhamentoRepositorio acompanhamento, IConsultaRepositorio consultas)
    {
        _acompanhamento = acompanhamento;
        _consultas = consultas;
    }

    // Motivo da consulta de retorno (até 500: coluna Consultas.Motivo)
    internal static string MotivoRetorno(string? motivo)
    {
        var texto = motivo is null || motivo.StartsWith("Retorno") ? motivo ?? "Retorno" : "Retorno · " + motivo;
        return texto.Length > 500 ? texto[..500] : texto;
    }

    // Com data definida: a consulta de retorno fica marcada (AGENDADO); sem data: ENCAMINHADO à recepção (Apêndice C)
    public async Task<RetornoResposta?> MarcarRetornoAsync(RetornoRequisicao dados, UsuarioLogado logado)
    {
        var consulta = await ConsultaDoMedicoAsync(dados.Consulta!.Value, logado);
        if (consulta is null)
            return null;

        if (!EmAtendimentoOuAtendida.Contains(consulta.Value.Status.Codigo))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Só dá para marcar retorno de consulta em atendimento ou atendida.");

        var retorno = new Retorno
        {
            IdPaciente = consulta.Value.Paciente!.Id,
            IdMedico = consulta.Value.Medico.Id,
            IdConsultaOrigem = consulta.Value.Consulta.Id,
            DataRetorno = dados.Data?.ToDateTime(TimeOnly.MinValue),
            Nota = string.IsNullOrWhiteSpace(dados.Nota) ? null : dados.Nota.Trim(),
            Status = dados.Data is null ? "ENCAMINHADO" : "AGENDADO"
        };

        if (dados.Data is not null && dados.Hora is null)
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha o horário do retorno.");

        var id = dados.Data is null
            ? await _acompanhamento.CriarRetornoAsync(retorno)
            : await _acompanhamento.CriarRetornoComConsultaAsync(retorno, FormatadorTexto.Hora(dados.Hora!), MotivoRetorno(null));
        return RespostaRetorno((await _acompanhamento.BuscarRetornoAsync(id))!);
    }

    public async Task<ExameResposta?> PedirExameAsync(ExameRequisicao dados, UsuarioLogado logado)
    {
        var consulta = await ConsultaDoMedicoAsync(dados.Consulta!.Value, logado);
        if (consulta is null)
            return null;

        if (!EmAtendimentoOuAtendida.Contains(consulta.Value.Status.Codigo))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Só dá para pedir exame de consulta em atendimento ou atendida.");

        var exame = new Exame
        {
            IdPaciente = consulta.Value.Paciente!.Id,
            IdConsulta = consulta.Value.Consulta.Id,
            NomeExame = dados.Nome.Trim(),
            Status = "PENDENTE"
        };

        var id = await _acompanhamento.CriarExameAsync(exame);
        return RespostaExame((await _acompanhamento.BuscarExameAsync(id))!);
    }

    // Recepção e dono: exames da clínica, pendente ou realizado (Apêndice D).
    // Médico: só exames das próprias consultas, e só volta para pendente; marcar como realizado
    // é da recepção (Apêndice I). Decisão do Lote C.
    public async Task<ExameResposta?> MudarSituacaoExameAsync(int idExame, SituacaoExameRequisicao dados, UsuarioLogado logado)
    {
        var exame = await _acompanhamento.BuscarExameAsync(idExame)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Exame não encontrado.");

        var dele = logado.EhMedico
            ? exame.Medico?.Id == logado.IdMedico
            : exame.Medico?.IdClinica == logado.IdClinica;
        if (!dele)
            return null;

        var codigo = TradutorStatus.ParaExame(dados.Status)
            ?? throw new ErroApi(StatusCodes.Status400BadRequest, "Situação inválida.");

        if (logado.EhMedico && codigo == "REALIZADO")
            return null;

        await _acompanhamento.MudarStatusExameAsync(idExame, codigo);
        return RespostaExame((await _acompanhamento.BuscarExameAsync(idExame))!);
    }

    // Formato de aplicativo-integracao-api.md:200-204, com os textos de paciente-servicos.js:294-303
    public async Task<AcompanhamentoResposta> ListarDaContaAsync(int idConta)
    {
        var retornos = (await _acompanhamento.ListarRetornosPendentesDaContaAsync(idConta))
            .Select(r => new RetornoPendenteResposta(
                r.Retorno.Id,
                "Retorno com " + r.Medico.Nome,
                // Encaminhado ainda não tem data
                r.Retorno.DataRetorno is null ? (DateOnly?)null : DateOnly.FromDateTime(r.Retorno.DataRetorno.Value),
                (r.Retorno.Status == "ENCAMINHADO" ? "A recepção vai combinar a data com você" : "Retorno marcado")
                    + (r.Retorno.Nota is null ? "" : " · " + r.Retorno.Nota),
                PacienteServico.Familiar(r.Paciente),
                new MedicoResumoResposta(r.Medico.Id, r.Medico.Nome),
                new EspecialidadeResumoResposta(r.Especialidade.Id, r.Especialidade.Nome)))
            .OrderBy(r => r.Prazo ?? DateOnly.MaxValue) // sem data, por último
            .ToList();

        var exames = (await _acompanhamento.ListarExamesPendentesDaContaAsync(idConta))
            .Select(e => new ExamePendenteResposta(
                e.Exame.Id,
                e.Exame.NomeExame,
                TradutorStatus.DoExame(e.Exame.Status),
                e.Medico is null ? "" : "Pedido por " + e.Medico.Nome,
                "",
                PacienteServico.Familiar(e.Paciente),
                e.Medico is null ? null : new MedicoResumoResposta(e.Medico.Id, e.Medico.Nome)))
            .ToList();

        return new AcompanhamentoResposta(retornos, exames);
    }

    // Consulta que o médico logado atendeu; null = de outro médico (Forbid)
    private async Task<ConsultaCompleta?> ConsultaDoMedicoAsync(int idConsulta, UsuarioLogado logado)
    {
        var consulta = await _consultas.BuscarAsync(idConsulta)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Consulta não encontrada.");

        return consulta.Medico.Id == logado.IdMedico ? consulta : null;
    }

    // Usados também pela agenda do médico (ConsultaServico) e pela ficha do paciente (PacienteServico)
    internal static ExameResposta RespostaExame(ExameCompleto e) =>
        new(e.Exame.Id,
            e.Exame.IdConsulta,
            e.Exame.NomeExame,
            TradutorStatus.DoExame(e.Exame.Status),
            new PessoaResumoResposta(e.Paciente.Id, e.Paciente.Nome),
            e.Medico is null ? null : new MedicoResumoResposta(e.Medico.Id, e.Medico.Nome));

    internal static RetornoResposta RespostaRetorno(RetornoCompleto r) =>
        new(r.Retorno.Id,
            r.Retorno.IdConsultaOrigem,
            r.Retorno.DataRetorno is null ? null : DateOnly.FromDateTime(r.Retorno.DataRetorno.Value),
            r.Retorno.Nota,
            TradutorStatus.DoRetorno(r.Retorno.Status),
            new PessoaResumoResposta(r.Paciente.Id, r.Paciente.Nome),
            new MedicoResumoResposta(r.Medico.Id, r.Medico.Nome));
}
