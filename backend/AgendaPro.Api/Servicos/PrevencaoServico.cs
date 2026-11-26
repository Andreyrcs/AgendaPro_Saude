using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class PrevencaoServico : IPrevencaoServico
{
    private const string SoSuaFamilia = "Você só pode gerenciar a sua família.";

    private readonly IPrevencaoRepositorio _prevencao;
    private readonly IPacienteRepositorio _pacientes;
    private readonly IConsultaRepositorio _consultas;

    public PrevencaoServico(IPrevencaoRepositorio prevencao, IPacienteRepositorio pacientes, IConsultaRepositorio consultas)
    {
        _prevencao = prevencao;
        _pacientes = pacientes;
        _consultas = consultas;
    }

    // Do mês passado até 5 meses à frente, como as duas telas (dados.js:252; dadosFicticios.js:190).
    // As sugestões gerais (IdCampanha nulo) entram em todo mês (relatorio-integracao.md:106).
    public async Task<IEnumerable<MesPrevencaoResposta>> ListarAsync(int idConta)
    {
        var hoje = DateTime.Today;
        var mesAtual = hoje.Year * 12 + (hoje.Month - 1);

        var campanhas = (await _prevencao.ListarCampanhasAsync(mesAtual - 1, mesAtual + 5)).ToList();
        var ids = campanhas.Select(c => c.Id).ToList();
        var exames = (await _prevencao.ListarExamesAsync(ids)).ToList();
        var itens = (await _prevencao.ListarItensDaContaAsync(idConta, ids)).ToList();

        return campanhas.Select(c => new MesPrevencaoResposta(
            c.Id,
            $"{c.Ano:D4}-{c.Mes:D2}",
            c.Nome,
            c.Tema,
            // Primeiro os da campanha, depois os gerais (a mesma ordem de sugestoesDoMes)
            exames.Where(e => e.IdCampanha == c.Id || e.IdCampanha is null)
                .OrderBy(e => e.IdCampanha is null).ThenBy(e => e.Id)
                .Select(RespostaExame).ToList(),
            itens.Where(i => i.Item.IdCampanha == c.Id).Select(RespostaItem).ToList()))
            .ToList();
    }

    // Mesmas conferências e textos de prevencao.js:20-29 e paciente-servicos.js:204-210
    public async Task<ItemPrevencaoResposta> IncluirAsync(int idConta, InclusaoPrevencaoRequisicao dados)
    {
        var ano = int.Parse(dados.Mes[..4]);
        var mes = int.Parse(dados.Mes[5..]);
        var campanha = await _prevencao.BuscarCampanhaAsync(ano, mes)
            ?? throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha uma campanha.");

        var pessoa = await _pacientes.BuscarPorIdAsync(dados.Pessoa!.Value)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Paciente não encontrado.");
        if (pessoa.IdUsuario != idConta)
            throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);

        // O exame precisa ser desta campanha ou uma sugestão geral
        var exame = await _prevencao.BuscarExameAsync(dados.Exame!.Value);
        if (exame is null || (exame.IdCampanha is not null && exame.IdCampanha != campanha.Id))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Escolha o exame ou check-up.");

        if (await _prevencao.ItemExisteAsync(pessoa.Id, campanha.Id, exame.Id))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Essa pessoa já está nesse item da prevenção.");

        var id = await _prevencao.CriarItemAsync(new PessoaPrevencao
        {
            IdPaciente = pessoa.Id,
            IdCampanha = campanha.Id,
            IdExamePrevencao = exame.Id,
            Status = "NAO_AGENDADO"
        });

        return RespostaItem((await _prevencao.BuscarItemAsync(id))!);
    }

    // Situação do item e, ao marcar a partir dele, a consulta ligada (aplicativo-integracao-api.md:220-221).
    // pendente desliga a consulta (prevencao.js:71).
    public async Task<ItemPrevencaoResposta> AlterarAsync(int idItem, ItemPrevencaoRequisicao dados, int idConta)
    {
        var item = await _prevencao.BuscarItemAsync(idItem)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Item de prevenção não encontrado.");
        if (item.Paciente.IdUsuario != idConta)
            throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);

        var codigo = TradutorStatus.ParaPrevencao(dados.Status)
            ?? throw new ErroApi(StatusCodes.Status400BadRequest, "Situação inválida.");

        var idConsulta = item.Item.IdConsulta;
        if (codigo == "NAO_AGENDADO")
        {
            idConsulta = null;
        }
        else if (dados.IdConsulta is not null)
        {
            var consulta = await _consultas.BuscarAsync(dados.IdConsulta.Value)
                ?? throw new ErroApi(StatusCodes.Status404NotFound, "Consulta não encontrada.");
            if (consulta.Paciente is null || consulta.Paciente.IdUsuario != idConta)
                throw new ErroApi(StatusCodes.Status403Forbidden, SoSuaFamilia);
            idConsulta = consulta.Consulta.Id;
        }

        await _prevencao.AtualizarItemAsync(idItem, codigo, idConsulta);
        return RespostaItem((await _prevencao.BuscarItemAsync(idItem))!);
    }

    private static ExamePrevencaoResposta RespostaExame(ExamePrevencao e) =>
        new(e.Id, e.IdCampanha, e.Titulo, e.Nota, e.Especialidade);

    private static ItemPrevencaoResposta RespostaItem(ItemPrevencaoCompleto i) =>
        new(i.Item.Id,
            i.Exame.Id,
            i.Exame.Titulo,
            i.Exame.Nota,
            i.Exame.Especialidade,
            TradutorStatus.DaPrevencao(i.Item.Status),
            PacienteServico.Familiar(i.Paciente),
            i.Item.IdConsulta);
}
