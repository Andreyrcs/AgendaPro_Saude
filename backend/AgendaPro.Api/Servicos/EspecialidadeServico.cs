using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class EspecialidadeServico : IEspecialidadeServico
{
    // clinica-dados.js:120 (ABRE_MESES): a agenda fica aberta para marcar até 2 meses à frente de hoje
    private const int MesesAbertos = 2;

    private readonly IEspecialidadeRepositorio _repositorio;
    private readonly IMedicoRepositorio _medicos;
    private readonly IHorarioRepositorio _horarios;
    private readonly IConsultaRepositorio _consultas;
    private readonly IAcessoServico _acesso;

    public EspecialidadeServico(IEspecialidadeRepositorio repositorio, IMedicoRepositorio medicos,
        IHorarioRepositorio horarios, IConsultaRepositorio consultas, IAcessoServico acesso)
    {
        _repositorio = repositorio;
        _medicos = medicos;
        _horarios = horarios;
        _consultas = consultas;
        _acesso = acesso;
    }

    private static EspecialidadeResposta Resposta(Especialidade e) => new(e.Id, e.Nome, e.DuracaoPadrao);

    public async Task<IEnumerable<EspecialidadeResposta>?> ListarPorClinicaAsync(int idClinica, UsuarioLogado logado)
    {
        if (!await _acesso.PodeUsarClinicaAsync(logado, idClinica))
            return null;

        var especialidades = await _repositorio.ListarPorClinicaAsync(idClinica);
        return especialidades.Select(Resposta).ToList();
    }

    private async Task<Especialidade> BuscarOuFalharAsync(int id) =>
        await _repositorio.BuscarPorIdAsync(id)
        ?? throw new ErroApi(StatusCodes.Status404NotFound, "Especialidade não encontrada.");

    public async Task<EspecialidadeResposta?> ObterAsync(int id, UsuarioLogado logado)
    {
        var especialidade = await BuscarOuFalharAsync(id);
        if (!await _acesso.PodeUsarClinicaAsync(logado, especialidade.IdClinica))
            return null;

        return Resposta(especialidade);
    }

    public async Task<EspecialidadeResposta?> CadastrarAsync(int idClinica, CadastroEspecialidadeRequisicao dados, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var nome = dados.Nome.Trim();
        if (await _repositorio.NomeExisteNaClinicaAsync(idClinica, nome))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Essa especialidade já existe nesta clínica.");

        var especialidade = new Especialidade { IdClinica = idClinica, Nome = nome, DuracaoPadrao = dados.Duracao!.Value };
        especialidade.Id = await _repositorio.CriarAsync(especialidade);
        return Resposta(especialidade);
    }

    // L5: a recepção e o dono corrigem o nome ou a duração. A duração nova vale para os horários e agendamentos
    // daqui para a frente; as consultas já marcadas guardam o próprio horário de fim.
    public async Task<EspecialidadeResposta?> AtualizarAsync(int id, CadastroEspecialidadeRequisicao dados, UsuarioLogado logado)
    {
        var especialidade = await BuscarOuFalharAsync(id);
        if (logado.IdClinica != especialidade.IdClinica)
            return null;

        var nome = dados.Nome.Trim();
        if (await _repositorio.NomeExisteNaClinicaAsync(especialidade.IdClinica, nome, id))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Essa especialidade já existe nesta clínica.");

        especialidade.Nome = nome;
        especialidade.DuracaoPadrao = dados.Duracao!.Value;
        await _repositorio.AtualizarAsync(especialidade);
        return Resposta(especialidade);
    }

    // Os mesmos horários "livre" da agenda da clínica (clinica-dados.js:119-121 e :244-245):
    // de agora até hoje + 2 meses; grade a partir do início do expediente, de DuracaoPadrao em DuracaoPadrao,
    // pulando o almoço sem reiniciar a grade; sem feriados; sem horário que encoste numa consulta ativa.
    public async Task<IEnumerable<HorariosLivresResposta>?> HorariosLivresAsync(int idEspecialidade, UsuarioLogado logado)
    {
        var especialidade = await BuscarOuFalharAsync(idEspecialidade);
        if (!await _acesso.PodeUsarClinicaAsync(logado, especialidade.IdClinica))
            return null;

        var medicos = (await _medicos.ListarPorEspecialidadeAsync(idEspecialidade)).ToList();
        var ids = medicos.Select(m => m.Id).ToList();

        var agora = DateTime.Now;
        var hoje = agora.Date;
        var ate = hoje.AddMonths(MesesAbertos);
        var duracao = TimeSpan.FromMinutes(especialidade.DuracaoPadrao);

        var expedientes = (await _horarios.ListarPorMedicosAsync(ids)).ToList();
        var feriados = (await _horarios.ListarFeriadosAsync(hoje, ate)).Select(f => f.Data.Date).ToHashSet();
        var ocupadas = (await _consultas.ListarOcupadasAsync(ids, hoje, ate)).ToList();

        var resposta = new List<HorariosLivresResposta>();
        foreach (var medico in medicos)
        {
            var dias = new List<DiaLivreResposta>();
            for (var dia = hoje; dia <= ate; dia = dia.AddDays(1))
            {
                if (feriados.Contains(dia))
                    continue;

                // Dia_Semana: 0 = domingo ... 6 = sábado, a mesma conta da sp_AgendarConsulta
                var expediente = expedientes.FirstOrDefault(h => h.IdMedico == medico.Id && h.DiaSemana == (int)dia.DayOfWeek);
                if (expediente is null)
                    continue;

                var horas = new List<string>();
                for (var inicio = expediente.HoraInicio; inicio + duracao <= expediente.HoraFim; inicio += duracao)
                {
                    var fim = inicio + duracao;
                    var noAlmoco = expediente.InicioAlmoco is not null
                        && inicio < expediente.FimAlmoco && fim > expediente.InicioAlmoco;
                    var passou = dia == hoje && inicio <= agora.TimeOfDay;
                    var ocupado = ocupadas.Any(c => c.IdMedico == medico.Id && c.DataConsulta.Date == dia
                        && c.HoraInicio < fim && c.HoraFim > inicio);

                    if (!noAlmoco && !passou && !ocupado)
                        horas.Add(FormatadorTexto.Hora(inicio));
                }

                if (horas.Count > 0)
                    dias.Add(new DiaLivreResposta(DateOnly.FromDateTime(dia), horas));
            }

            resposta.Add(new HorariosLivresResposta(new MedicoSalaResposta(medico.Id, medico.Nome, medico.Sala), dias));
        }

        return resposta;
    }
}
