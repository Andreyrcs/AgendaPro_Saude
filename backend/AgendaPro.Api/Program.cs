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
builder.Services.AddControllers(opcoes =>
    {
        // Valor da query que não dá para ler (ex.: ?paciente=abc ou ?de=amanha): a mesma mensagem
        // do JSON em formato errado (RespostaValidacao), em vez do texto em inglês do ASP.NET
        opcoes.ModelBindingMessageProvider.SetAttemptedValueIsInvalidAccessor((_, _) => "Confira o formato dos dados enviados.");
        opcoes.ModelBindingMessageProvider.SetValueIsInvalidAccessor(_ => "Confira o formato dos dados enviados.");
        opcoes.ModelBindingMessageProvider.SetNonPropertyAttemptedValueIsInvalidAccessor(_ => "Confira o formato dos dados enviados.");
    })
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
// CORS (Apêndice H): só as páginas da aplicação web podem chamar a API pelo navegador.
// As origens ficam em Cors:Origens no appsettings.json.
var origensWeb = builder.Configuration.GetSection("Cors:Origens").Get<string[]>()
    ?? throw new InvalidOperationException("Configure Cors:Origens no appsettings.json.");
builder.Services.AddCors(opcoes =>
{
    opcoes.AddDefaultPolicy(politica => politica
        .WithOrigins(origensWeb)
        .AllowAnyHeader()
        .AllowAnyMethod());
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
builder.Services.AddScoped<IFaltaRepositorio, FaltaRepositorio>();
builder.Services.AddScoped<IFaltaServico, FaltaServico>();
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

        // Depois de conferir assinatura, emissor e validade: a conta ainda está ativa?
        // A recepcionista removida da equipe perde o acesso na hora (pagina-equipe.js:121), com 401.
        opcoes.Events = new JwtBearerEvents
        {
            OnTokenValidated = async contexto =>
            {
                var usuarios = contexto.HttpContext.RequestServices.GetRequiredService<IUsuarioRepositorio>();
                var sub = contexto.Principal?.FindFirst("sub")?.Value;

                if (!int.TryParse(sub, out var idUsuario) || !await usuarios.EstaAtivoAsync(idUsuario))
                    contexto.Fail("Conta desativada.");
            }
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
// Antes da autenticação: o navegador manda o OPTIONS (pré-voo) sem token,
// e as respostas de erro (401, 403, 400) também precisam do cabeçalho do CORS
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();