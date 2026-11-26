namespace AgendaPro.Api.Repositorios;

// Uma consulta marcada a partir de um item de prevenção (Pessoa_Prevencao.IdConsulta) e o título do exame
// do item (Exames_Prevencao.Titulo). A consulta sai com "tipo": "prevencao" e esse "titulo"
// (aplicativo-integracao-api.md:221).
public class PrevencaoDaConsulta
{
    public int IdConsulta { get; set; }
    public string Titulo { get; set; } = "";
}
