using AgendaPro.Api.Repositorios;
using AgendaPro.Api.Servicos;
using AgendaPro.Api.Middlewares;
using AgendaPro.Api.Tarefas;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;


var builder = WebApplication.CreateBuilder(args);

// 1. Registrar os serviços (ANTES do Build)
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(opcoes =>
    {
        opcoes.InvalidModelStateResponseFactory = RespostaValidacao.Criar;
    });
builder.Services.AddOpenApi(opcoes =>
{
    opcoes.AddDocumentTransformer((documento, contexto, cancelamento) =>
    {
        documento.Components ??= new OpenApiComponents();
        documento.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        documento.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Cole aqui o token devolvido pelo POST /api/auth/login."
        };

        documento.Security ??= [];
        documento.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", documento)] = []
        });

        return Task.CompletedTask;
    });
});
builder.Services.AddSingleton<IFabricaConexao, FabricaConexao>();
builder.Services.AddScoped<IEspecialidadeRepositorio, EspecialidadeRepositorio>();
builder.Services.AddScoped<IEspecialidadeServico, EspecialidadeServico>();
builder.Services.AddScoped<IUsuarioRepositorio, UsuarioRepositorio>();
builder.Services.AddScoped<IPacienteRepositorio, PacienteRepositorio>();
builder.Services.AddScoped<IPacienteServico, PacienteServico>();
builder.Services.AddScoped<IMedicoRepositorio, MedicoRepositorio>();
builder.Services.AddSingleton<ITokenServico, TokenServico>();
builder.Services.AddScoped<IAuthServico, AuthServico>();
builder.Services.AddScoped<IClinicaRepositorio, ClinicaRepositorio>();
builder.Services.AddScoped<IClinicaServico, ClinicaServico>();
builder.Services.AddScoped<IAcessoServico, AcessoServico>();
builder.Services.AddScoped<IHorarioRepositorio, HorarioRepositorio>();
builder.Services.AddScoped<IMedicoServico, MedicoServico>();
builder.Services.AddScoped<IConsultaRepositorio, ConsultaRepositorio>();
builder.Services.AddScoped<IConsultaServico, ConsultaServico>();
builder.Services.AddScoped<IListaEsperaRepositorio, ListaEsperaRepositorio>();
builder.Services.AddScoped<IListaEsperaServico, ListaEsperaServico>();
builder.Services.AddHostedService<ExpiracaoOfertasServico>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opcoes =>
    {
        opcoes.MapInboundClaims = false;
        opcoes.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Chave"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Emissor"],
            ValidateAudience = false,
            ValidateLifetime = true,
            RoleClaimType = "role"
        };
    });

var app = builder.Build();
app.UseMiddleware<ErroMiddleware>();

// 2. Montar o caminho das requisições (DEPOIS do Build)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(opcoes =>
    {
        opcoes.SwaggerEndpoint("/openapi/v1.json", "AgendaPro Saúde API");
    });
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();