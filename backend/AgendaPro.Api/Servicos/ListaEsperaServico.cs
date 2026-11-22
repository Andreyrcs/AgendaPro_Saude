using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class ListaEsperaServico : IListaEsperaServico
{
    private const string SoSuaFamilia = "Você só pode gerenciar a sua família.";

    // Texto do app (aplicativo/src/servicos/espera.js:83)
    private const string MotivoDaVaga = "Vaga da lista de espera";

    private readonly IListaEsperaRepositorio _fila;
    private readonly IConsultaRepositorio _consultas;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IMedicoRepositorio _medicos;
    private readonly IClinicaRepositorio _clinicas;
    private readonly IConsultaServico _consultaServico;

    public ListaEsperaServico(IListaEsperaRepositorio fila, IConsultaRepositorio consultas, IPacienteRepositorio pacientes,
        IMedicoRepositorio medicos, IClinicaRepositorio clinicas, IConsultaServico consultaServico)
    {
        _fila = fila;
        _consultas = consultas;
        _pacientes = pacientes;
        _medicos = medicos;
        _clinicas = clinicas;
        _consultaServico = consultaServico;
    }

    // Uma fila por conta (regra do app, espera.js:57-59): devolve a entrada ativa ou null
    public async Task<FilaPacienteResposta?> MinhaFilaAsync(int idConta)
    {
        var entrada = (await _fila.ListarAtivasDaContaAsync(idConta)).Cast<FilaCompleta?>().FirstOrDefault();
        return entrada is null ? null : await RespostaDoPacienteAsync(entrada.Value);
    }

    public async Task<IEnumerable<FilaMedicoResposta>?> FilaDaClinicaAsync(int idClinica, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var medicos = await _medicos.ListarCompletosPorClinicaAsync(idClinica);
        var entradas = (await _fila.ListarAtivasDaClinicaAsync(idClinica)).ToList();
        var vagas = (await _consultas.ListarVagasFuturasDaClinicaAsync(idClinica)).ToList();
        var minutos = await _fila.MinutosOfertaAsync();

        return medicos.Select(m => new FilaMedicoResposta(
            new MedicoResumoResposta(m.Medico.Id, m.Medico.Nome),
            new EspecialidadeResumoResposta(m.Especialidade.Id, m.Especialidade.Nome),
            entradas.Where(e => e.Medico.Id == m.Medico.Id)
                .Select(e => new PessoaNaFilaResposta(
                    e.Entrada.Id,
                    e.Entrada.Posicao,
                    new PessoaResumoResposta(e.Paciente.Id, e.Paciente.Nome),
                    DateOnly.FromDateTime(e.Entrada.DataEntrada),
                    e.Entrada.UsaApp,
                    e.Conta.Telefone,
                    Vaga(e, minutos)))
                .ToList(),
            vagas.Where(v => v.IdMedico == m.Medico.Id)
                .Select(v => new VagaResposta(v.Id, DateOnly.FromDateTime(v.DataConsulta), FormatadorTexto.Hora(v.HoraInicio)))
                .ToList()))
            .ToList();
    }

    public async Task<FilaPacienteResposta?> EntrarAsync(EntradaFilaRequisicao dados, UsuarioLogado logado)
    {
        var medico = await _medicos.BuscarPorIdAsync(dados.Medico!.Value)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Médico não encontrado.");
        var paciente = await _pacientes.BuscarPorIdAsync(dados.Pessoa!.Value);

        bool usaApp;
        if (logado.EhPaciente)
        {
            if (paciente is null)
                throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
            if (paciente.IdUsuario != logado.IdUsuario)
                throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);
            if (!await _clinicas.ContaVinculadaAsync(logado.IdUsuario, medico.IdClinica))
                return null;
            usaApp = true; // a web e o app do paciente gravam app: true
        }
        else
        {
            if (medico.IdClinica != logado.IdClinica)
                return null;
            if (paciente is null || !await _clinicas.ContaVinculadaAsync(paciente.IdUsuario, medico.IdClinica))
                throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
            usaApp = dados.UsaApp ?? false;
        }

        if ((await _fila.ListarAtivasDaContaAsync(paciente.IdUsuario)).Any())
            throw new ErroApi(StatusCodes.Status400BadRequest, "Você já está numa lista de espera. Saia dela antes de entrar em outra.");

        var idLista = await _fila.EntrarAsync(paciente.Id, medico.Id, usaApp, pelaRecepcao: logado.EhRecepcaoOuDono);
        var entrada = (await _fila.BuscarAsync(idLista))!.Value;
        return await RespostaDoPacienteAsync(entrada);
    }

    public async Task<bool> SairAsync(int id, UsuarioLogado logado)
    {
        var entrada = await BuscarOuFalharAsync(id);

        if (logado.EhPaciente)
            ConferirFamilia(entrada, logado);
        else if (entrada.Medico.IdClinica != logado.IdClinica)
            return false;

        await _fila.SairAsync(id);
        return true;
    }

    public async Task<ConsultaResposta?> ResponderVagaAsync(int id, RespostaVagaRequisicao dados, UsuarioLogado logado)
    {
        var entrada = await BuscarOuFalharAsync(id);
        ConferirFamilia(entrada, logado);

        if (dados.Aceitar!.Value)
        {
            var idConsulta = await _fila.AceitarAsync(id, MotivoDaVaga);
            return await _consultaServico.ObterAsync(idConsulta, logado);
        }

        await _fila.RecusarAsync(id);
        return null;
    }

    public async Task<OfertaResposta?> OferecerAsync(int idConsulta, UsuarioLogado logado)
    {
        var consulta = await _consultas.BuscarAsync(idConsulta)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Consulta não encontrada.");
        if (consulta.Medico.IdClinica != logado.IdClinica)
            return null;

        var idLista = await _fila.OferecerVagaAsync(idConsulta);
        if (idLista is null)
            return new OfertaResposta(null);

        var entrada = (await _fila.BuscarAsync(idLista.Value))!.Value;
        return new OfertaResposta(new OfertaPessoaResposta(entrada.Entrada.Id,
            new PessoaResumoResposta(entrada.Paciente.Id, entrada.Paciente.Nome)));
    }

    private async Task<FilaPacienteResposta> RespostaDoPacienteAsync(FilaCompleta e)
    {
        var naFila = await _fila.ContarAtivasDoMedicoAsync(e.Medico.Id);
        var minutos = await _fila.MinutosOfertaAsync();

        return new FilaPacienteResposta(
            e.Entrada.Id,
            e.Entrada.Posicao,
            naFila,
            DateOnly.FromDateTime(e.Entrada.DataEntrada),
            PacienteServico.Familiar(e.Paciente),
            new MedicoSalaResposta(e.Medico.Id, e.Medico.Nome, e.Medico.Sala),
            new EspecialidadeResumoResposta(e.Especialidade.Id, e.Especialidade.Nome),
            Vaga(e, minutos));
    }

    // Vaga oferecida: data, hora e o fim do prazo (OfertadaEm + MINUTOS_OFERTA) em milissegundos desde 1970.
    // OfertadaEm é gravado com SYSDATETIME(), a hora local do servidor.
    private static VagaOferecidaResposta? Vaga(FilaCompleta e, int minutos)
    {
        if (e.VagaOferecida is null || e.Entrada.OfertadaEm is null)
            return null;

        var expira = DateTime.SpecifyKind(e.Entrada.OfertadaEm.Value.AddMinutes(minutos), DateTimeKind.Local);
        return new VagaOferecidaResposta(
            DateOnly.FromDateTime(e.VagaOferecida.DataConsulta),
            FormatadorTexto.Hora(e.VagaOferecida.HoraInicio),
            new DateTimeOffset(expira).ToUnixTimeMilliseconds());
    }

    private static void ConferirFamilia(FilaCompleta entrada, UsuarioLogado logado)
    {
        if (entrada.Paciente.IdUsuario != logado.IdUsuario)
            throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);
    }

    private async Task<FilaCompleta> BuscarOuFalharAsync(int id) =>
        await _fila.BuscarAsync(id)
        ?? throw new ErroApi(StatusCodes.Status404NotFound, "Entrada da lista de espera não encontrada.");
}
