using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class FaltaServico : IFaltaServico
{
    private readonly IFaltaRepositorio _faltas;
    private readonly IConsultaRepositorio _consultas;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IClinicaRepositorio _clinicas;

    public FaltaServico(IFaltaRepositorio faltas, IConsultaRepositorio consultas, IPacienteRepositorio pacientes,
        IClinicaRepositorio clinicas)
    {
        _faltas = faltas;
        _consultas = consultas;
        _pacientes = pacientes;
        _clinicas = clinicas;
    }

    // Ficha do paciente: todas as faltas da pessoa nesta clínica, inclusive as retiradas (histórico)
    public async Task<IEnumerable<FaltaResposta>?> ListarDaClinicaAsync(int idClinica, int? idPaciente, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        if (idPaciente is null)
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha o paciente.");

        // Só pessoas de contas vinculadas à clínica (pendência 14 do CLAUDE.md)
        var pessoa = await _pacientes.BuscarPorIdAsync(idPaciente.Value);
        if (pessoa is null || !await _clinicas.ContaVinculadaAsync(pessoa.IdUsuario, idClinica))
            throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");

        var faltas = await _faltas.ListarDaPessoaNaClinicaAsync(idPaciente.Value, idClinica);
        return faltas.Select(Resposta).ToList();
    }

    // Médico ou equipe (Apêndice I). @IdUsuario da procedure = quem está logado (regra 1)
    public async Task<FaltaResposta?> RegistrarAsync(int idConsulta, UsuarioLogado logado)
    {
        var consulta = await _consultas.BuscarAsync(idConsulta)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Consulta não encontrada.");

        var pode = logado.EhMedico
            ? consulta.Medico.Id == logado.IdMedico
            : consulta.Medico.IdClinica == logado.IdClinica;
        if (!pode)
            return null;

        // A procedure confere só a data; a hora fica aqui: antes de a consulta começar não existe falta
        // (a mesma regra das telas da recepção e do médico). DateTime.Now: hora local, como em HorariosLivresAsync.
        if (consulta.Consulta.DataConsulta.Date + consulta.Consulta.HoraInicio > DateTime.Now)
            throw new ErroApi(StatusCodes.Status400BadRequest, "A consulta ainda não começou. A falta só pode ser registrada depois do horário.");

        // A procedure confere status e data (erro 50032) e o trigger grava a falta
        await _faltas.RegistrarAsync(idConsulta, logado.IdUsuario);

        var falta = await _faltas.BuscarPorConsultaAsync(idConsulta);
        return Resposta(falta!);
    }

    // Recepção e dono. A sp_RetirarFalta não confere a clínica: a API confere antes
    public async Task<FaltaResposta?> RetirarAsync(int idFalta, RetiradaFaltaRequisicao dados, UsuarioLogado logado)
    {
        var falta = await _faltas.BuscarAsync(idFalta)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Falta não encontrada ou já retirada.");
        if (falta.Medico.IdClinica != logado.IdClinica)
            return null;

        // Já retirada: a procedure responde com o erro 50033
        await _faltas.RetirarAsync(idFalta, logado.IdUsuario, dados.Motivo.Trim());

        return Resposta((await _faltas.BuscarAsync(idFalta))!);
    }

    // Paciente: só a própria conta (regra 2). Recepção e dono: só conta vinculada à clínica (regra 3)
    public async Task<SituacaoResposta?> SituacaoAsync(int idConta, UsuarioLogado logado)
    {
        if (logado.EhPaciente)
        {
            if (idConta != logado.IdUsuario)
                return null;
        }
        else if (logado.IdClinica is null || !await _clinicas.ContaVinculadaAsync(idConta, logado.IdClinica.Value))
            return null;

        var situacao = await _faltas.BuscarSituacaoAsync(idConta)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");

        return new SituacaoResposta(
            situacao.FaltasRegistradas,
            TradutorStatus.DaRestricao(situacao.Restricao),
            situacao.RestricaoAte is null ? null : DateOnly.FromDateTime(situacao.RestricaoAte.Value));
    }

    // motivo: o banco não tem coluna. A falta vem de "faltou" (marcada pelo médico ou pela recepção) ou
    // do cancelamento no dia depois de "Vou" (trg_Consultas_Falta); textos de clinica.js:673 e clinica-dados.js:429.
    // por: quem registrou; quando foi a própria conta do paciente, "Paciente" (clinica-dados.js:429).
    private static FaltaResposta Resposta(FaltaCompleta f)
    {
        var motivo = f.Status.Codigo == "CANCELADA"
            ? "Cancelou no dia, depois de confirmar presença"
            : "Não compareceu";

        var por = f.RegistradaPor is null ? null
            : f.RegistradaPor.Papel == "PACIENTE" ? "Paciente"
            : f.RegistradaPor.Nome;

        return new FaltaResposta(
            f.Falta.Id,
            f.Falta.IdConsulta,
            DateOnly.FromDateTime(f.Falta.DataFalta),
            FormatadorTexto.Hora(f.Consulta.HoraInicio),
            new PessoaResumoResposta(f.Paciente.Id, f.Paciente.Nome),
            new MedicoResumoResposta(f.Medico.Id, f.Medico.Nome),
            f.Falta.ConfirmouPresenca,
            motivo,
            por,
            f.Falta.Retirada,
            f.RetiradaPor?.Nome,
            f.Falta.RetiradaEm is null ? null : DateOnly.FromDateTime(f.Falta.RetiradaEm.Value),
            f.Falta.MotivoRetirada);
    }
}
