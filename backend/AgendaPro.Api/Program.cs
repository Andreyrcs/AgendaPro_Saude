using AgendaPro.Api.Repositorios;
using AgendaPro.Api.Servicos;

var builder = WebApplication.CreateBuilder(args);

// 1. Registrar os serviços (ANTES do Build)
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddSingleton<IFabricaConexao, FabricaConexao>();
builder.Services.AddScoped<IEspecialidadeRepositorio, EspecialidadeRepositorio>();
builder.Services.AddScoped<IEspecialidadeServico, EspecialidadeServico>();

var app = builder.Build();

// 2. Montar o caminho das requisições (DEPOIS do Build)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(opcoes =>
    {
        opcoes.SwaggerEndpoint("/openapi/v1.json", "AgendaPro Saúde API");
    });
}

app.UseAuthorization();
app.MapControllers();

app.Run();