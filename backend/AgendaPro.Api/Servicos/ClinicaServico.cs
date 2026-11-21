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
}
