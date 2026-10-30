# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

O app mobile é um cliente separado (ver Stack). Quando ele for desenhado, revisar se a linguagem visual dele segue a web ou as convenções de cada sistema.

## Stack

- **Web (existente):** HTML, CSS e JavaScript puros em `frontend/`, consumindo a API via `frontend/assents/js/api.js`.
- **API (existente):** C# com ASP.NET Core Web API, Entity Framework Core (Pomelo) e MySQL, em `backend/`. Senhas com hash BCrypt.
- **Mobile (a construir):** React Native ou Flutter, ainda sem escolha entre os dois. Consome a mesma API REST.
- **Regra:** mantenha o que já funciona. A stack só muda quando um requisito do PIM exigir.

## Users

**Paciente (app mobile e web).** Agenda consultas médicas pelo celular, em casa ou no dia a dia, quase sempre com pressa e muitas vezes sem saber qual especialidade procurar. Também cuida das consultas da família (filhos, pais, avós). Entre esses usuários há idosos e pessoas com pouca familiaridade com tecnologia, e o produto precisa funcionar bem para eles.

**Clínica / recepção (área web administrativa).** Cadastra e gerencia médicos, especialidades, horários e a lista de espera.

Médicos não têm login. A clínica faz o cadastro deles.

## Product Purpose

O AgendaPro Saúde permite que pacientes e familiares marquem consultas sem atrito: a pessoa sente algo, conversa com o assistente, descobre a especialidade certa, agenda um horário ou entra na lista de espera, e depois recebe lembretes de retorno, exames e prevenção.

Tem sucesso quando alguém sem familiaridade com tecnologia consegue ir do "estou sentindo isso" até uma consulta marcada (para si ou para um familiar) sem ajuda de ninguém.

## Positioning

O agendamento começa pelo sintoma, não pela especialidade: um assistente com IA traduz o que o paciente sente na especialidade a procurar e leva direto ao horário ou à lista de espera. Uma mesma conta cuida da família inteira, e o cuidado continua depois da consulta com lembretes de retorno, exames e prevenção.

## Operating Context

- Projeto acadêmico do **PIM IV (UNIP, Análise e Desenvolvimento de Sistemas)**, feito em grupo. A qualidade visual e a UX devem parecer de produto real.
- Requisitos do PIM que trabalhos futuros precisam respeitar:
  - aplicação web com APIs REST, autenticação e segurança (Desenvolvimento Web com .NET);
  - aplicativo mobile integrado à mesma API, com telas principais, fluxo de navegação e sincronização de dados;
  - arquitetura orientada a objetos, em camadas e modular (.NET);
  - banco de dados com procedures e triggers.
- O paciente usa principalmente o celular; a recepção usa a área web administrativa.

## Capabilities and Constraints

**Fluxo do paciente (definido):** conversar com o assistente → receber a especialidade sugerida → agendar um horário ou entrar na lista de espera → gerenciar consultas próprias e de familiares → receber lembretes de retorno, exames e prevenção.

**Fluxo da clínica (definido):** gerenciar médicos, especialidades, horários e lista de espera.

**Assistente:** chat com IA que sugere a especialidade. **Nunca dá diagnóstico.**

**Transição em andamento:** o projeto começou como uma agenda genérica de reuniões. O código atual ainda usa esse modelo: tabelas `usuarios`, `agendar_reuniao`, `participantes_reuniao`; tipos PRESENCIAL/ONLINE; convites com status CONVIDADO/CONFIRMADO/RECUSADO; telas `Dashboard`, `ListaReunioes`, `NovoAtendimento`, `Cadastro`, `RecuperarSenha`. Os termos "reunião", "participante" e "convite" estão sendo trocados pelo vocabulário de saúde, e textos novos não devem usá-los.

**Terminologia:** consulta (não "reunião"), paciente, familiar, especialidade, médico, horário, lista de espera, lembrete (retorno, exame, prevenção), clínica/recepção.

**Pendências técnicas conhecidas:**
- Hoje o frontend envia `idUsuarioLogado` em vez de usar autenticação real (sem JWT). Os requisitos de autenticação e segurança do PIM exigem resolver isso.
- O modelo de dados ainda não tem especialidades, médicos, horários, familiares/dependentes, lista de espera nem lembretes.
- Ainda não há procedures nem triggers no banco.
- A recuperação de senha não está implementada (a tela atual avisa isso).

**Decisões em aberto:**
- React Native ou Flutter para o mobile.
- Qual provedor e modelo de IA o assistente vai usar.
- O que o assistente faz quando os sintomas indicam urgência ou emergência.
- Como os lembretes chegam ao paciente (push, e-mail, dentro do app).
- Que exigências de proteção de dados de saúde (LGPD, dado sensível) o trabalho vai cumprir.

## Brand Commitments

- Nome: **AgendaPro Saúde**.
- Idioma da interface: português do Brasil.
- Voz: linguagem simples, sem jargão técnico nem médico, compreensível para idosos e para quem tem pouca familiaridade com tecnologia.

## Evidence on Hand

- Código funcional do fluxo antigo de reuniões: cadastro, login, criação, listagem, convites e cancelamento (`backend/`, `frontend/`).
- Esquema do banco: `backend/Database/schema.sql`.
- Não existem clínicas, médicos, depoimentos, números de uso, parcerias nem certificações reais. Não invente nada disso.

## Product Principles

1. **Do sintoma à consulta, sem precisar saber o nome da especialidade.** O paciente nunca deve ficar travado por não saber qual médico procurar.
2. **Quem tem menos familiaridade com tecnologia define a régua.** Se um idoso não consegue fazer sozinho, o fluxo não está pronto.
3. **Orientar, nunca diagnosticar.** O assistente aponta para onde ir. A decisão clínica é sempre do médico.
4. **Uma conta, a família inteira.** Agendar para um filho, um pai ou um avô deve ser tão fácil quanto agendar para si.
5. **O cuidado continua depois da consulta.** Retorno, exames e prevenção fazem parte do produto, não são um extra.

## Accessibility & Inclusion

Obrigatória, e não opcional:
- texto legível e bom contraste (tomar WCAG 2.1 AA como referência mínima);
- linguagem simples;
- uso fácil por idosos e por pessoas com pouca familiaridade com tecnologia: alvos de toque grandes, fluxos curtos e sem depender de gestos escondidos ou de memorizar caminhos.
