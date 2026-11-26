using System.Text.RegularExpressions;
using AgendaPro.Api.Dtos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Modelos;
using AgendaPro.Api.Repositorios;

namespace AgendaPro.Api.Servicos;

public class ClinicaServico : IClinicaServico
{
    // As 27 siglas aceitas em Clinica.UF (UFS em frontend/assets/js/api.js)
    private static readonly HashSet<string> Ufs = new()
    {
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
        "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    };

    // Palavras puladas ao escolher as letras do código (gerarCodigo em api.js)
    private static readonly HashSet<string> PalavrasFracas = new()
    {
        "clinica", "centro", "medico", "medica", "consultorio",
        "de", "da", "do", "das", "dos", "e", "saude"
    };

    private readonly IClinicaRepositorio _clinicas;
    private readonly IUsuarioRepositorio _usuarios;

    public ClinicaServico(IClinicaRepositorio clinicas, IUsuarioRepositorio usuarios)
    {
        _clinicas = clinicas;
        _usuarios = usuarios;
    }

    public async Task<ClinicaCadastradaResposta> CadastrarAsync(CadastroClinicaRequisicao dados)
    {
        var c = dados.Clinica;
        var d = dados.Dono;

        var numerosCnpj = ValidadorCnpj.SoNumeros(c.Cnpj);
        if (!ValidadorCnpj.Valido(numerosCnpj))
            throw new ErroApi(StatusCodes.Status400BadRequest, "CNPJ inválido. Confira os 14 números.");
        var cnpj = ValidadorCnpj.Formatar(numerosCnpj);

        if (await _clinicas.CnpjExisteAsync(cnpj))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Já existe uma clínica com este CNPJ.");

        var email = d.Email.Trim().ToLowerInvariant();
        if (await _usuarios.EmailExisteAsync(email))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já tem uma conta. Use outro ou entre com ele.");

        var uf = c.Uf.Trim().ToUpperInvariant();
        if (!Ufs.Contains(uf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Use a sigla do estado em 2 letras maiúsculas, como SP.");

        var telefone = FormatadorTexto.Telefone(c.Telefone);
        if (telefone?.Length > 20)
            throw new ErroApi(StatusCodes.Status400BadRequest, "O telefone pode ter até 20 caracteres.");

        var nome = c.Nome.Trim();
        var cidade = string.IsNullOrWhiteSpace(c.Cidade) ? null : c.Cidade.Trim();
        var codigo = await GerarCodigoAsync(nome);
        var nomeDono = d.Nome.Trim();

        var clinica = new Clinica
        {
            Nome = nome,
            Endereco = c.Endereco.Trim(),
            Telefone = telefone,
            Cnpj = cnpj,
            Cidade = cidade,
            Uf = uf,
            Codigo = codigo,
            Publica = c.Publica
        };

        var dono = new Usuario
        {
            Email = email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(d.Senha, workFactor: 12),
            Papel = "DONO",
            Nome = nomeDono,
            Ativo = true
        };

        var (idClinica, idUsuario) = await _clinicas.CriarComDonoAsync(clinica, dono);

        return new ClinicaCadastradaResposta(
            new ClinicaResumoResposta(idClinica, nome, codigo, clinica.Publica),
            new DonoCadastradoResposta(idUsuario, nomeDono, email, "dono"));
    }

    // Como gerarCodigo (api.js): 3 letras da primeira palavra "forte" do nome, sem acento,
    // completadas com X, mais um número de 1000 a 9999; sorteia de novo se o código já existir
    private async Task<string> GerarCodigoAsync(string nome)
    {
        var semAcento = FormatadorTexto.SemAcento(nome);

        var palavra = Regex.Split(semAcento, "[^a-z]+")
            .FirstOrDefault(p => p != "" && !PalavrasFracas.Contains(p));
        if (string.IsNullOrEmpty(palavra))
            palavra = Regex.Replace(semAcento, "[^a-z]", "");
        if (palavra == "")
            palavra = "cli";

        var prefixo = (palavra + "xxx")[..3].ToUpperInvariant();

        string codigo;
        do
        {
            codigo = prefixo + "-" + Random.Shared.Next(1000, 10000);
        } while (await _clinicas.BuscarIdPorCodigoAsync(codigo) is not null);

        return codigo;
    }

    // Mesmo texto de clinicaPorCodigo (api.js:415) e do cadastro do paciente
    private const string CodigoNaoEncontrado = "Não achamos uma clínica com esse código. Confira com a recepção.";

    private static ClinicaResposta Resposta(Clinica c) =>
        new(c.Id, c.Nome, c.Endereco, c.Telefone, c.Cnpj, c.Cidade, c.Uf, c.Codigo, c.Publica);

    // Apêndice C: busca das clínicas públicas pelo nome ou pela cidade; sem texto, todas as públicas
    public async Task<IEnumerable<ClinicaResposta>> BuscarPublicasAsync(string? busca)
    {
        var clinicas = await _clinicas.BuscarPublicasAsync(busca?.Trim() ?? "");
        return clinicas.Select(Resposta).ToList();
    }

    // Pública ou privada (seção 5.5: a privada só é achada pelo código)
    public async Task<ClinicaResposta> BuscarPorCodigoAsync(string codigo)
    {
        var clinica = await _clinicas.BuscarPorCodigoAsync(codigo.Trim().ToUpperInvariant())
            ?? throw new ErroApi(StatusCodes.Status404NotFound, CodigoNaoEncontrado);
        return Resposta(clinica);
    }

    // Só o dono, só a própria clínica; o CNPJ e o código não mudam. Regras do cadastro (api.js: atualizarClinica)
    // L1: dono e recepção leem os dados da própria clínica, com o código AAA-0000 (casca e equipe.html)
    public async Task<ClinicaResposta?> ObterAsync(int idClinica, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var clinica = await _clinicas.BuscarPorIdAsync(idClinica)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Clínica não encontrada.");
        return Resposta(clinica);
    }

    public async Task<ClinicaResposta?> AtualizarAsync(int idClinica, AtualizacaoClinicaRequisicao dados, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var clinica = await _clinicas.BuscarPorIdAsync(idClinica)
            ?? throw new ErroApi(StatusCodes.Status404NotFound, "Clínica não encontrada.");

        var uf = dados.Uf.Trim().ToUpperInvariant();
        if (!Ufs.Contains(uf))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Use a sigla do estado em 2 letras maiúsculas, como SP.");

        var telefone = FormatadorTexto.Telefone(dados.Telefone);
        if (telefone?.Length > 20)
            throw new ErroApi(StatusCodes.Status400BadRequest, "O telefone pode ter até 20 caracteres.");

        clinica.Nome = dados.Nome.Trim();
        clinica.Endereco = dados.Endereco.Trim();
        clinica.Telefone = telefone;
        clinica.Cidade = string.IsNullOrWhiteSpace(dados.Cidade) ? null : dados.Cidade.Trim();
        clinica.Uf = uf;
        clinica.Publica = dados.Publica!.Value;

        await _clinicas.AtualizarAsync(clinica);
        return Resposta(clinica);
    }

    public async Task<IEnumerable<MembroEquipeResposta>?> ListarEquipeAsync(int idClinica, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var equipe = await _usuarios.ListarEquipeAsync(idClinica);
        return equipe.Select(u => new MembroEquipeResposta(u.Id, u.Nome, u.Email, u.Papel.ToLowerInvariant())).ToList();
    }

    // Seção 5.3: o dono cria a conta da recepcionista, com senha provisória mostrada uma única vez
    public async Task<RecepcionistaCadastradaResposta?> CadastrarRecepcionistaAsync(int idClinica,
        CadastroRecepcionistaRequisicao dados, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var email = dados.Email.Trim().ToLowerInvariant();
        if (await _usuarios.EmailExisteAsync(email))
            throw new ErroApi(StatusCodes.Status400BadRequest, "Este e-mail já tem uma conta.");

        var nome = dados.Nome.Trim();
        var senhaProvisoria = GeradorSenhaProvisoria.Gerar();

        var conta = new Usuario
        {
            Email = email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(senhaProvisoria, workFactor: 12),
            Papel = "RECEPCAO",
            Nome = nome,
            IdClinica = idClinica,
            Ativo = true
        };

        var idUsuario = await _usuarios.CriarAsync(conta);
        return new RecepcionistaCadastradaResposta(
            new ContaCriadaResposta(idUsuario, nome, email, "recepcao"), senhaProvisoria);
    }

    // O dono gera outra senha provisória para alguém da equipe (a anterior deixa de valer)
    public async Task<SenhaProvisoriaResposta?> GerarSenhaProvisoriaAsync(int idClinica, int idUsuario, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return null;

        var conta = await _usuarios.BuscarAtivoPorIdAsync(idUsuario);
        if (conta is null || conta.Papel is not ("RECEPCAO" or "MEDICO") || conta.IdClinica != idClinica)
            throw new ErroApi(StatusCodes.Status404NotFound, "Pessoa não encontrada na equipe.");

        var senha = GeradorSenhaProvisoria.Gerar();
        await _usuarios.AtualizarSenhaAsync(idUsuario, BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12));
        return new SenhaProvisoriaResposta(senha);
    }

    // Só recepcionistas ativas da própria clínica; o dono não remove a si mesmo (api.js: removerDaEquipe)
    public async Task<bool> RemoverDaEquipeAsync(int idClinica, int idUsuario, UsuarioLogado logado)
    {
        if (logado.IdClinica != idClinica)
            return false;

        if (idUsuario == logado.IdUsuario)
            throw new ErroApi(StatusCodes.Status400BadRequest, "Você não pode remover a sua própria conta.");

        var conta = await _usuarios.BuscarAtivoPorIdAsync(idUsuario);
        if (conta is null || conta.Papel != "RECEPCAO" || conta.IdClinica != idClinica)
            throw new ErroApi(StatusCodes.Status404NotFound, "Pessoa não encontrada na equipe.");

        await _usuarios.DesativarAsync(idUsuario);
        return true;
    }

    public async Task<IEnumerable<ClinicaResposta>> ListarDaContaAsync(int idConta)
    {
        var clinicas = await _clinicas.ListarDaContaAsync(idConta);
        return clinicas.Select(Resposta).ToList();
    }

    // Pendência 8: { codigo } (app) acha pública ou privada; { clinicaId } (web) só acha pública.
    // Privada pelo id responde como código inexistente (seção 5.5).
    // Já vinculada: não grava de novo (é assim que a web troca de clínica, escolher-clinica.js:50).
    public async Task<(ClinicaResposta Clinica, bool Novo)> VincularAsync(int idConta, VinculoClinicaRequisicao dados)
    {
        Clinica? clinica;
        if (!string.IsNullOrWhiteSpace(dados.Codigo))
            clinica = await _clinicas.BuscarPorCodigoAsync(dados.Codigo.Trim().ToUpperInvariant());
        else if (dados.ClinicaId is not null)
        {
            clinica = await _clinicas.BuscarPorIdAsync(dados.ClinicaId.Value);
            if (clinica is { Publica: false })
                clinica = null;
        }
        else
            throw new ErroApi(StatusCodes.Status400BadRequest, "Informe o código da clínica.");

        if (clinica is null)
            throw new ErroApi(StatusCodes.Status404NotFound, CodigoNaoEncontrado);

        if (await _clinicas.ContaVinculadaAsync(idConta, clinica.Id))
            return (Resposta(clinica), false);

        await _clinicas.VincularContaAsync(idConta, clinica.Id);
        return (Resposta(clinica), true);
    }
}
