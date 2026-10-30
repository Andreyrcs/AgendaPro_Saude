# AgendaPRO.API

Backend do projeto AgendaPro.

Essa é a parte da API do nosso sistema de agendamento de reunioes. O banco usado pelo grupo é MySQL, e a API foi feita em C# com ASP.NET Core Web API.

Para acessar o banco foi usado Entity Framework Core, porque fica mais simples trabalhar com as tabelas usando classes no C#.

## Tecnologias

C#  
ASP.NET Core Web API  
MySQL  
Entity Framework Core  
Pomelo.EntityFrameworkCore.MySql  
BCrypt  

## Banco de dados

O script do banco fica em:

Database/schema.sql

As tabelas principais sao:

usuarios  
agendar_reuniao  
participantes_reuniao  

A tabela usuarios guarda os dados do usuario, como nome, email, senha hash e status.

A tabela agendar_reuniao guarda os dados da reuniao, como titulo, pauta, data, horario, tipo, local ou link e organizador.

A tabela participantes_reuniao guarda os usuarios convidados para cada reuniao.

## O que foi feito

cadastro de usuario  
login  
criacao de reuniao  
listagem das minhas reunioes  
listagem de convites pendentes  
adicionar participante  
aceitar convite  
recusar convite  
cancelar reuniao  
listar usuarios  
buscar usuario por email  

## Observacoes

A senha nao fica salva aberta no banco. Ela é salva como hash usando BCrypt.

A reuniao pode ser PRESENCIAL ou ONLINE.

Se for presencial, precisa ter local.

Se for online, precisa ter link.

Somente o organizador pode cancelar a reuniao ou adicionar participantes.

O participante só pode aceitar ou recusar o proprio convite.

Ainda nao foi usado JWT. Para o trabalho, o frontend envia o idUsuarioLogado nas requisicoes, e o backend usa esse id para validar permissoes.

## Como rodar

Primeiro crie o banco usando o arquivo:

Database/schema.sql

Depois confira a connection string no appsettings.json.

Exemplo:

Server=localhost;Database=agenda_pro;User=root;Password=sua_senha;

Troque sua_senha pela senha do MySQL da maquina.

Para rodar pelo terminal:

dotnet restore

dotnet run

Depois teste no navegador:

GET http://localhost:5000/api/teste/conexao

A porta pode mudar dependendo de como o projeto rodar na maquina.

## Rotas principais

Teste de conexao:

GET /api/teste/conexao

Criar usuario:

POST /api/usuarios

Login:

POST /api/auth/login

Listar usuarios:

GET /api/usuarios

Buscar usuario por email:

GET /api/usuarios/buscar-por-email?email=email@email.com

Criar reuniao:

POST /api/reunioes

Listar minhas reunioes:

GET /api/reunioes/minhas?idUsuarioLogado=1

Listar convites pendentes:

GET /api/reunioes/convites?idUsuarioLogado=1

Adicionar participante:

POST /api/reunioes/1/participantes

Aceitar convite:

PUT /api/reunioes/1/participantes/2/confirmar?idUsuarioLogado=2

Recusar convite:

PUT /api/reunioes/1/participantes/2/recusar?idUsuarioLogado=2

Cancelar reuniao:

DELETE /api/reunioes/1?idUsuarioLogado=1

## Exemplos simples

Cadastro:

{
  "nome": "Thiago",
  "email": "thiago@email.com",
  "senha": "123456"
}

Login:

{
  "email": "thiago@email.com",
  "senha": "123456"
}

Criar reuniao presencial:

{
  "tituloReuniao": "Reuniao teste",
  "pautaReuniao": "Teste com MySQL",
  "dataReuniao": "2026-05-20",
  "horaInicio": "09:00:00",
  "horaFim": "10:00:00",
  "localReuniao": "Sala A29",
  "linkReuniao": null,
  "idUsuarioLogado": 1,
  "tipoReuniao": "PRESENCIAL"
}

Criar reuniao online:

{
  "tituloReuniao": "Reuniao online",
  "pautaReuniao": "Teste com MySQL",
  "dataReuniao": "2026-05-20",
  "horaInicio": "09:00:00",
  "horaFim": "10:00:00",
  "localReuniao": null,
  "linkReuniao": "https://meet.google.com/teste",
  "idUsuarioLogado": 1,
  "tipoReuniao": "ONLINE"
}

Adicionar participante:

{
  "idUsuarioLogado": 1,
  "idUsuario": 2
}

## Fluxo principal

O usuario cria uma reuniao.

Depois o organizador pode adicionar participantes.

Quando alguem é adicionado, fica com status CONVIDADO.

Se o participante aceitar, o status muda para CONFIRMADO.

Se recusar, muda para RECUSADO.

Na tela de minhas reunioes, o usuario só deve ver as reunioes que ele criou ou as que ele aceitou participar.

## Status

O backend esta funcional para o fluxo principal do projeto:

cadastro, login, criar reuniao, adicionar participante, aceitar convite, recusar convite e cancelar reuniao.