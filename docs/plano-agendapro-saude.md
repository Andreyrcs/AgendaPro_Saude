# AgendaPro Saúde — Documentação Completa do Sistema

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Tela da Clínica / Recepção](#2-tela-da-clínica--recepção)
3. [Tela do Médico](#3-tela-do-médico)
4. [App do Paciente — Mobile](#4-app-do-paciente--mobile)
5. [App do Paciente — Desktop](#5-app-do-paciente--desktop)
6. [Dados Compartilhados e Simulação](#6-dados-compartilhados-e-simulação)
7. [Comunicação Entre Telas](#7-comunicação-entre-telas)
8. [Acessibilidade e UX](#8-acessibilidade-e-ux)
9. [Glossário de Status](#9-glossário-de-status)

---

## 1. Visão Geral do Sistema

### O que é

O **AgendaPro Saúde** é um sistema de agendamento de consultas médicas para clínicas e consultórios. Ele simula o fluxo completo entre três atores principais: a **recepção da clínica**, o **médico** e o **paciente**.

### Público-alvo

| Ator | Interface | Arquivo |
|------|-----------|---------|
| Recepcionista / Admin da clínica | Dashboard com calendário, gestão de pacientes, lista de espera | `clinica.html` + sub-páginas |
| Médico | Agenda pessoal, histórico, perfil profissional | `medico.html` |
| Paciente (celular) | App mobile dentro de mockup de iPhone | `paciente-mobile.html` |
| Paciente (computador) | Versão desktop do app do paciente | `paciente-desktop.html` |

### Arquitetura Técnica

- **Frontend puro** — HTML, CSS e JavaScript vanilla, sem frameworks ou bundlers
- **Dados simulados** — Gerados deterministicamente via seeded PRNG (pseudo-random number generator) em `clinica-dados.js`, usando dados base de `dados.js`
- **Persistência local** — `localStorage` para preferências do usuário, comunicação entre telas e estado de retornos/notificações
- **Sem backend real** — O diretório `backend/` existe mas não é utilizado pelo sistema frontend
- **Relógio simulado** — Na tela do médico, o horário começa em 10:40 e avança em tempo real

### Estrutura de Arquivos

```
frontend/
├── index.html                    # Landing page pública
├── paciente-mobile.html          # App do paciente (mobile)
├── paciente-desktop.html         # App do paciente (desktop)
├── clinica.html                  # Dashboard da clínica/recepção
├── medico.html                   # Tela do médico
├── lista-espera.html             # Sub-página: lista de espera
├── pacientes.html                # Sub-página: lista de pacientes
├── nova-consulta.html            # Sub-página: agendar consulta
├── medicos.html                  # Sub-página: gestão de médicos
├── horarios.html                 # Sub-página: horários de atendimento
├── especialidades.html           # Sub-página: especialidades
├── conta.html                    # Sub-página: conta da clínica
├── assets/
│   ├── js/
│   │   ├── dados.js              # Dados base compartilhados (window.DADOS)
│   │   ├── comum.js              # Utilitários compartilhados (window.AP)
│   │   ├── icones.js             # Sprite de ícones SVG
│   │   ├── movimento.js          # Biblioteca de animações (window.MOV)
│   │   ├── clinica-dados.js      # Dados gerados da clínica (window.CLIDADOS)
│   │   ├── clinica-casca.js      # Shell/sidebar da clínica (window.CASCA)
│   │   ├── medico.js             # Lógica da tela do médico
│   │   ├── paciente-desktop.js   # Lógica do app desktop do paciente
│   │   ├── calendario-paciente.js# Widget de calendário do paciente
│   │   ├── pagina-pacientes.js   # Lógica da sub-página de pacientes
│   │   └── ...                   # Demais scripts das sub-páginas
│   └── css/
│       ├── tokens.css            # Design tokens (cores, espaçamentos, fontes)
│       ├── clinica/              # CSS da área da clínica (17 arquivos)
│       │   ├── base.css, layout.css, lateral.css, botoes.css
│       │   ├── cabecalho.css, contadores.css, agenda.css
│       │   ├── selos.css, avisos.css, paginas.css, ...
│       ├── medico/
│       │   └── medico.css        # CSS específico do médico
│       ├── app.css               # CSS do app mobile do paciente
│       ├── paciente-desktop.css  # CSS do app desktop do paciente
│       └── calendario.css        # CSS do widget de calendário
```

---

## 2. Tela da Clínica / Recepção

**Arquivo principal:** `clinica.html`
**Scripts:** `clinica-casca.js` (shell), `clinica-dados.js` (dados), scripts das sub-páginas
**CSS:** 17 arquivos em `assets/css/clinica/`

### 2.1 Dashboard Principal

A tela principal da clínica é o centro de operações da recepção. Ela exibe:

#### Barra Lateral (Sidebar)

- **Navegação principal** com 8 links:
  - Agenda (dashboard principal)
  - Lista de espera
  - Pacientes
  - Nova consulta
  - Médicos
  - Horários
  - Especialidades
  - Conta
- **Recolhível** — clicando no botão de toggle, a sidebar colapsa de 16rem para 72px
- **Persistência** — O estado (aberta/recolhida) é salvo em `localStorage` chave `agendapro.recepcao.pref`
- **Tooltips** — Quando recolhida, ao passar o mouse nos itens aparece uma dica com o nome

#### Calendário da Agenda (3 vistas)

**Vista Dia:**
- Grade temporal vertical com linhas a cada 30 minutos
- Blocos coloridos para cada consulta, posicionados via CSS Grid com `--ini` (início em minutos) e `--dur` (duração)
- Cores por médico para distinguir visualmente
- Indicador vermelho de "agora" que se move em tempo real
- Intervalo de almoço destacado visualmente

**Vista Semana:**
- 6 colunas (segunda a sábado), cada uma com a grade temporal
- Cabeçalho com dia da semana e data
- Hoje destacado visualmente
- Feriados sinalizados (ex: 2 de novembro, 20 de novembro)

**Vista Mês:**
- Calendário mensal estilo grade com dias clicáveis
- Exibe contagem de consultas por dia
- Indicador visual de dias com vagas oferecidas (bolinha)
- Ao clicar em um dia, exibe lista de consultas daquele dia abaixo do calendário

#### Mapa de Calor

- Visualização da ocupação da clínica ao longo da semana
- Cores indicam intensidade de agendamentos por faixa horária

#### Painel de Espera

- Lista dos pacientes na fila de espera por médico
- Posição na fila e tempo de espera
- Ações rápidas para gerenciar a fila

#### Próximos Pacientes

- Lista dos próximos pacientes agendados para o dia
- Status atual (confirmada, na recepção, em atendimento)
- Acesso rápido aos detalhes

### 2.2 Regras de Negócio — Fluxo de Consultas

#### Ciclo de Status de uma Consulta

```
Confirmada → Na recepção → Em atendimento → Atendida
                                           → Faltou
```

| Status | Descrição | Quem altera |
|--------|-----------|-------------|
| `confirmada` | Paciente confirmou presença | Sistema / Paciente |
| `chegou` (Na recepção) | Paciente chegou na clínica | Recepção |
| `em` (Em atendimento) | Médico está atendendo | Médico / Recepção |
| `atendida` | Consulta finalizada | Médico |
| `faltou` | Paciente não compareceu | Médico / Recepção |
| `cancelada` | Consulta cancelada | Paciente / Recepção |
| `vaga` | Horário livre no calendário | Sistema |
| `oferecida` | Vaga oferecida a paciente da lista de espera | Sistema |

#### Drag-and-drop para Reagendar

- Na vista de dia/semana, o recepcionista pode arrastar um bloco de consulta para outro horário
- O sistema valida se o novo horário está disponível
- A consulta é movida mantendo todos os dados

#### Cancelamento com Integração à Lista de Espera

1. Recepcionista cancela uma consulta
2. O horário é liberado e automaticamente oferecido ao próximo paciente na lista de espera daquele médico
3. O paciente recebe notificação (via app) com countdown de 30 minutos para aceitar
4. Se aceitar, a consulta é remarcada; se recusar ou expirar, passa para o próximo da fila

#### Menu de Contexto

- Clique com botão direito em um bloco de consulta abre menu contextual
- Opções: ver detalhes, reagendar, cancelar, registrar chegada

### 2.3 Sub-páginas

#### Lista de Espera (`lista-espera.html`)
- Exibe filas de espera organizadas por médico
- Para cada paciente: nome, posição na fila, tempo de espera, se usa o app
- Ações: reordenar, remover da fila, oferecer vaga

#### Pacientes (`pacientes.html`)
- Tabela com todos os pacientes que têm consulta no período ou estão na lista de espera
- **Busca** por nome com filtro em tempo real
- **Filtros**: Todos, Com consulta hoje, Na lista de espera, Já faltaram
- **Paginação**: 20 pacientes por página com navegação (1 … 4 5 6 … 47)
- **Ficha do paciente**: ao clicar em um paciente, exibe painel lateral com:
  - Número de consultas, faltas, posição na fila
  - Lista de espera (com link para a fila)
  - Próximas consultas
  - Histórico (últimas 6)
  - Botão "Marcar consulta"

#### Nova Consulta (`nova-consulta.html`)
- Fluxo de agendamento passo a passo
- Seleção de paciente, médico, especialidade
- Calendário de 2 meses mostrando disponibilidade
- Seleção de horário disponível
- Confirmação

#### Médicos (`medicos.html`)
- Lista de médicos cadastrados com especialidade, CRM, sala
- Visualização de agenda individual

#### Horários (`horarios.html`)
- Configuração dos horários de atendimento por médico
- Dias da semana, horário de início/fim, intervalo de almoço

#### Especialidades (`especialidades.html`)
- Lista de especialidades oferecidas pela clínica
- Duração padrão de consulta por especialidade

#### Conta (`conta.html`)
- Dados da clínica: nome, CNPJ, endereço, telefone
- Configurações gerais

---

## 3. Tela do Médico

**Arquivo principal:** `medico.html` (599 linhas)
**Script:** `medico.js` (1427 linhas)
**CSS:** `medico/medico.css` (636 linhas)

### 3.1 Estrutura da Tela

A tela do médico possui três seções principais acessíveis pela sidebar:

1. **Minha Agenda** (padrão)
2. **Histórico**
3. **Perfil**

Além de um link "Área da clínica" que redireciona para `clinica.html`.

### 3.2 Barra Superior

- **Folha de calendário** com a data de hoje (estilo "tear-off")
- **Título** dinâmico: muda conforme a seção ativa
- **Subtítulo**: "Dr. Paulo Menezes · Cardiologia"
- **Contadores** (3 cards):
  - Consultas hoje (total)
  - Realizadas (atendida + em atendimento)
  - Ainda por vir (confirmada + na recepção)

### 3.3 Minha Agenda

#### Vista Dia
- Grade temporal vertical idêntica à da clínica, mas para um único médico
- Cada bloco mostra: nome do paciente, horário, status (selo colorido)
- **Indicador "agora"**: linha vermelha que avança em tempo real (relógio simulado iniciando 10:40)
- Clicar em um bloco abre o diálogo de detalhe da consulta

#### Vista Semana
- 6 colunas (segunda a sábado) com a grade temporal
- **Diferencial**: na tela do médico, os blocos da semana exibem o nome do paciente e horário diretamente (override de `display: none` para `display: grid` no CSS)
- Fontes menores (0.6875rem nome, 0.625rem hora) para caber no bloco

#### Vista Mês
- Dois meses lado a lado em grade de calendário
- Cada dia mostra o número de consultas agendadas
- Indicador visual para dias com vagas oferecidas
- Ao clicar em um dia, exibe lista de consultas abaixo com:
  - Nome do paciente, horário, status
  - Botão "Ver dia completo" que troca para vista dia

#### Lista de Pacientes do Dia (sidebar direita)
- Aparece apenas nas vistas Dia e Semana
- Lista ordenada dos pacientes do dia selecionado
- Cada item mostra: nome, horário, status (selo)
- Paciente "Em atendimento" destacado com fundo verde
- Clicar abre o diálogo de detalhe

### 3.4 Diálogo: Detalhe da Consulta

Ao clicar em uma consulta, abre um `<dialog>` modal com:

**Informações:**
- Nome do paciente (título)
- Horário (início — fim)
- Data por extenso
- Status (selo colorido)
- Sala de atendimento
- Notas de retorno anteriores (se houver)

**Ações disponíveis (dependem do status):**

| Status | Ações disponíveis |
|--------|-------------------|
| `em` (Em atendimento) | Finalizar atendimento, Marcar retorno |
| `chegou` (Na recepção) | Finalizar atendimento |
| `confirmada` | Finalizar atendimento, Registrar ausência |
| `atendida` | Marcar retorno |
| `faltou` | (nenhuma) |

**Regra importante:** O botão "Marcar retorno" só aparece para pacientes com status `atendida` ou `em` (em atendimento). Não aparece para `confirmada`, `chegou` (na recepção) ou `faltou`.

### 3.5 Diálogo: Marcar Retorno

O médico tem duas opções para agendar um retorno:

#### Opção 1: Marcar data específica
- O médico escolhe uma data para o retorno
- Preenche uma nota opcional (ex: "Retorno para avaliar exames de sangue")
- Botão: "Confirmar retorno" com ícone de calendário

#### Opção 2: Encaminhar para recepção
- O médico apenas registra que o paciente precisa de retorno
- A recepção recebe a notificação e agenda quando o paciente passar por lá
- Nota opcional
- Botão: "Encaminhar para recepção" com ícone de envio

**Implementação técnica:**
- Fieldset com dois radio buttons estilizados como cards
- Ao selecionar "Encaminhar para recepção", o campo de data é ocultado
- Os dados são salvos em `localStorage 'medico.retornos'`
- Uma notificação é enviada para a recepção via `localStorage 'medico.notif'`

### 3.6 Histórico

Seção que exibe todas as consultas passadas do médico.

**Contadores do topo:**
- Realizadas (total de atendidas)
- Canceladas
- Ausências (faltas)

**Filtros:**
- **Por status**: Todos | Atendidas | Canceladas | Ausências (botões pill)
- **Por data**: Input de calendário (`<input type="date">`) para filtrar consultas de um dia específico, com botão "Limpar data"

**Lista de consultas:**
- Cada item mostra: nome do paciente, horário, data, selo de status
- Se houver nota de retorno, exibe badge indicando quantidade de notas
- Ordenação: data mais recente primeiro

**Paginação:**
- 10 consultas por página
- Navegação: `Anterior` | 1 … 4 5 6 … N | `Próxima`
- Indicador "1–10 de 45"
- Mesmo padrão visual da paginação de pacientes na recepção

### 3.7 Perfil do Médico

Layout de cartão visual com:

**Cartão principal:**
- Fundo com gradiente (escuro → verde escuro)
- Avatar com iniciais em círculo colorido (sobrepondo o gradiente)
- Nome e especialidade

**Estatísticas:**
- Realizadas (total histórico)
- Hoje (consultas do dia)
- Retornos (contagem de retornos agendados, lido do localStorage)

**Informações profissionais (coluna esquerda):**
- CRM
- Especialidade
- Sala
- Duração da consulta

**Expediente (coluna direita):**
- Dias da semana com horários (ex: "Seg a Sex: 08:00 — 17:00")
- Sábado (se aplicável)
- Dados vindos de `CLIDADOS.EXPEDIENTE[medicoId]`

**Próximos atendimentos:**
- Lista dos próximos 8 pacientes agendados
- Nome, horário, data, status

---

## 4. App do Paciente — Mobile

**Arquivo principal:** `paciente-mobile.html`
**Script:** `app.js` (não explorado diretamente, mas equivalente a `paciente-desktop.js`)
**CSS:** `app.css` (2250 linhas)

### 4.1 Interface

O app mobile é apresentado dentro de um **mockup de iPhone** (390×844px) com:
- Borda arredondada simulando o dispositivo
- Barra de status simulada (hora 9:41, sinais de rede, bateria)
- Barra de navegação inferior com 4 abas: Início, Agenda, Família, Perfil

**Painel informativo (desktop):** À esquerda do mockup, um painel explica o sistema com links de navegação rápida e dicas de teste.

### 4.2 Telas (12 telas)

#### 4.2.1 Início
- Saudação personalizada ("Bom dia, [nome]!")
- Mini widget de chat do assistente de saúde
- Card de próxima consulta com folha de calendário
- Status da lista de espera (se aplicável)
- Cards dos membros da família
- Botão "Marcar consulta"

#### 4.2.2 Assistente de Saúde (Chat)
Chatbot de triagem baseado em palavras-chave:

**Detecção de emergência:**
- Palavras: "dor no peito", "falta de ar", "infarto", "AVC", "desmaio", etc.
- Resposta: alerta vermelho com botão "Ligar SAMU 192"

**Suporte a crise:**
- Palavras: "suicídio", "me matar", etc.
- Resposta: card do CVV com "Ligar 188"

**Sugestão de especialidade:**
- Mapeamento de sintomas para especialidades:
  - Cabeça → Neurologia
  - Costas → Ortopedia
  - Pele → Dermatologia
  - etc.
- Exibe cards de especialidades sugeridas com botão para agendar

**Resposta genérica:**
- Quando não reconhece palavras-chave, sugere ligar para a clínica

#### 4.2.3 Agenda
- **Duas abas**: Calendário | Lista
- **Calendário**: Widget interativo mensal com:
  - Navegação por swipe ou botões
  - Dias com consultas marcados visualmente
  - Ao tocar em um dia, expande mostrando consultas
  - Animações FLIP para transições suaves
- **Lista**: Próximas consultas em cards sequenciais
- Link para "Depois da consulta" (acompanhamento)

#### 4.2.4 Família
- Grade com cards dos membros da família (5 pessoas)
- Cada card mostra: avatar SVG personalizado, nome, relação, idade
- Indicador de próxima consulta
- Botão "Adicionar familiar"

#### 4.2.5 Pessoa (perfil individual)
- Tela de detalhe de um membro da família
- Consultas agendadas
- Retornos e exames pendentes
- Alergias
- Botão para marcar consulta

#### 4.2.6 Prevenção
- Calendário de prevenção com campanhas mensais
- Filtrável por membro da família
- Itens com status: não agendado, agendado, realizado
- Ação de desfazer disponível

#### 4.2.7 Acompanhamento (Depois da Consulta)
- **Retornos** agendados com prazo (selo de cor indicando urgência)
- **Exames** solicitados com status de realização
- Ação "Ligar para agendar" para retornos sem data

#### 4.2.8 Perfil
- Avatar e nome do titular
- Email
- **Tamanho do texto**: Normal | Grande | Extra grande (segmentado de 3 opções)
- **Movimento reduzido**: toggle on/off
- **Preferências de notificação**: toggles para lembretes de consulta, alertas de fila, lembretes de prevenção
- Botão "Sair"

#### 4.2.9 Espera (Lista de Espera)
- Exibe posição na fila com número grande e destaque visual
- **Visualização da fila**: bolinhas representando cada posição, a do paciente destacada
- Simulação: botão para simular avanço da fila
- Quando chega na posição 1: notificação com ações "Confirmar" ou "Ver detalhes"

#### 4.2.10 Consulta (Detalhe)
- Data, horário, local, motivo da consulta
- Médico com avatar e especialidade
- Ações: "Reagendar" e "Cancelar"
- Cancelamento abre drawer de confirmação

#### 4.2.11 Agendar
- Seletor de pessoa (para quem é a consulta)
- Lista de médicos disponíveis com horários
- Slots de horário como chips clicáveis
- Confirmação com animação de "carimbo" (stamp) celebratório
- Detecção de conflito para agendamentos simultâneos

#### 4.2.12 Adicionar Familiar
- Formulário: nome, relação, data de nascimento, alergias
- **Seletor de cor**: 8 opções de cores para o avatar
- Preview do avatar em tempo real

### 4.3 Regras de Negócio — Paciente

#### Oferta de Vaga da Lista de Espera

1. Quando a posição do paciente chega em 1, o sistema oferece a vaga
2. Abre drawer com **countdown de 30 minutos** para decidir
3. **Aceitar**: consulta é marcada, animação de carimbo
4. **Recusar**: vaga passa para o próximo na fila
5. **Expirar**: mesmo efeito de recusar

#### Agendamento

- Paciente pode agendar para si ou para qualquer familiar
- Exibe apenas médicos com horários disponíveis
- "Primeiro livre" destaca o horário mais cedo disponível
- Após confirmar, animação celebratória e opção de ver no calendário

#### Navegação

- **Mobile**: hash-based routing (`#inicio`, `#agenda`, `#familia`, etc.)
- **Transições**: fade de opacidade (120-200ms) entre telas
- **Drawer/gaveta**: modal bottom-sheet com slide-up, focus trap, Escape para fechar

---

## 5. App do Paciente — Desktop

**Arquivo principal:** `paciente-desktop.html`
**Script:** `paciente-desktop.js` (2266+ linhas)
**CSS:** `paciente-desktop.css`

### 5.1 Diferenças do Mobile

O app desktop oferece as **mesmas 12 telas** do mobile, mas com layout adaptado:

| Aspecto | Mobile | Desktop |
|---------|--------|---------|
| Layout | Tela cheia dentro de mockup de iPhone | Sidebar + área de conteúdo em grid |
| Navegação | Barra inferior (4 abas) | Sidebar lateral com 7 itens + perfil no rodapé |
| Largura do conteúdo | 390px (fixo) | Máx. 940px, centralizado |
| Sidebar | N/A | Recolhível (16rem → 72px), com tooltips |
| Chat | Tela cheia | Altura calc(100vh - 158px), máx. 680px |
| Drawer | Bottom-sheet (slide-up) | Modal centralizado (máx. 480px, border-radius 20px) |

### 5.2 Sidebar

- **7 itens de navegação:**
  1. Início
  2. Assistente de saúde
  3. Agenda
  4. Família
  5. Prevenção
  6. Depois da consulta
  7. Link para clínica
- **Perfil** no rodapé: avatar + nome do titular
- **Toggle**: botão com chevron que alterna aberta/recolhida
- **Tooltips**: quando recolhida e viewport > 860px, mostra o nome ao hover
- **Persistência**: estado salvo em `localStorage 'ap-menu'`

### 5.3 Preferências Persistidas

| Chave localStorage | Valores | Efeito |
|---------------------|---------|--------|
| `ap-texto` | `normal`, `grande`, `muito-grande` | Tamanho da fonte (100%, 118.75%, 137.5%) |
| `ap-movimento` | `sistema`, `reduzido` | Desativa animações |
| `ap-menu` | `aberto`, `recolhido` | Estado da sidebar |

---

## 6. Dados Compartilhados e Simulação

### 6.1 Dados Base (`dados.js` → `window.DADOS`)

Contém os dados estáticos do sistema:

**Clínica:**
- Nome, endereço, telefone, CNPJ

**Pessoas (5 membros da família):**
- Titular + 4 dependentes
- Cada pessoa: nome, nome curto, relação, data de nascimento, alergias, cor do avatar, características visuais do avatar (tom de pele, cabelo, óculos, roupa)

**Especialidades (9):**
- Nome, duração padrão da consulta

**Médicos (11):**
- Nome, CRM, especialidade, sala, cor de destaque

**Feriados:**
- 2 de novembro (Finados)
- 20 de novembro (Consciência Negra)

**Filas de espera:**
- Organizadas por médico
- Cada entrada: nome, posição, data de entrada, se usa o app

**Acompanhamento:**
- Retornos pendentes com prazos
- Exames solicitados com status

**Prevenção:**
- Calendário de campanhas de saúde por mês

**Notificações:**
- Lista de notificações simuladas para o app do paciente

### 6.2 Dados Gerados (`clinica-dados.js` → `window.CLIDADOS`)

Gera deterministicamente as consultas usando seeded PRNG:

**Funções exportadas:**
- `consultas` — Array com todas as consultas (passadas e futuras)
- `data(iso)` — Parser de data ISO
- `somaDias(iso, n)` — Soma dias a uma data
- `txt(minutos)` — Converte minutos para "HH:MM"
- `INICIO` / `FIM` — Horário de início/fim do expediente (em minutos)
- `DURACAO` — Duração padrão da consulta
- `EXPEDIENTE` — Mapa de horários por médico

**Cada consulta contém:**
```javascript
{
    medico: "paulo",           // ID do médico
    paciente: "Maria Silva",   // Nome do paciente
    data: "2026-10-20",        // Data ISO
    ini: 540,                  // Início em minutos (09:00)
    fim: 570,                  // Fim em minutos (09:30)
    status: "confirmada",      // Status atual
    sala: "Sala 3",            // Sala de atendimento
    motivo: "Consulta de rotina" // Motivo (opcional)
}
```

### 6.3 Utilitários Compartilhados (`comum.js` → `window.AP`)

**Funções de data:**
- `data(iso)` — Parse de data ISO para objeto Date
- `hoje()` — Data de hoje (a data real do computador)
- `diasAte(iso)` — Dias até uma data futura
- `relativo(iso)` — "hoje", "amanhã", "em 3 dias", "há 2 dias"
- `extenso(iso)` — "segunda, 20 de outubro"
- `curto(iso)` — "seg, 20 out"

**Funções visuais:**
- `folha(iso)` — Componente "folha de calendário" (dia tear-off) com mês, dia e dia da semana
- `avatar(pessoa, tamanho)` — SVG inline completo com tom de pele, cabelo, óculos, roupa
- `avatarMedico(medico, tamanho)` — Círculo colorido com iniciais
- `icone(nome, classe)` — SVG `<use>` referenciando o sprite de ícones
- `marca(tamanho)` — Logo SVG do AgendaPro Saúde

**Utilitários:**
- `esc(s)` — Escape HTML seguro
- `iniciais(nome)` — Extrai iniciais (ignorando "Dr.", "Dra.", "Psic.")
- `ordinal(n, genero)` — "4ª" (feminino) ou "4º" (masculino)
- `movimentoReduzido()` — Verifica preferência de movimento reduzido

### 6.4 Biblioteca de Animações (`movimento.js` → `window.MOV`)

- `mola(opcoes)` — Simulação de spring physics, gera easing CSS `linear()` estilo Apple
- `flip(el, de, opcoes)` — Animação FLIP (First, Last, Invert, Play)
- `contador(el, para)` — Contador numérico animado
- `rolar(el, novo, direcao)` — Transição tipo "rolling numbers"
- `tremer(el)` — Shake para feedback de erro
- `chuvaDeFolhas(alvo)` — Confetti celebratório (12 folhas)
- `canal.enviar(msg)` / `canal.ouvir(fn)` — Comunicação entre páginas via postMessage + localStorage

---

## 7. Comunicação Entre Telas

### 7.1 Namespaces de localStorage

Cada área do sistema usa um namespace próprio para evitar colisões:

| Namespace | Área | Exemplo de chaves |
|-----------|------|-------------------|
| `agendapro.recepcao.*` | Clínica/Recepção | `agendapro.recepcao.pref` (sidebar), `agendapro.clinica.v1` (dados), `agendapro.recepcao.conta` (conta) |
| `medico.*` | Médico | `medico-menu` (sidebar), `medico.notif` (notificações), `medico.retornos` (retornos agendados) |
| `ap-*` | Paciente | `ap-menu` (sidebar), `ap-texto` (tamanho), `ap-movimento` (animação) |

### 7.2 Fluxo de Comunicação Médico → Recepção

```
                    localStorage
Médico ──────────────────────────────> Recepção
       'medico.notif'
       'medico.retornos'
```

**Eventos emitidos pelo médico:**

1. **`atendimento_finalizado`** — Quando o médico clica "Finalizar atendimento"
   ```javascript
   { tipo: 'atendimento_finalizado', medico: 'paulo', paciente: 'Maria', horario: '09:00', data: '2026-10-20', ts: timestamp }
   ```

2. **`retorno_agendado`** — Quando o médico marca retorno com data específica
   ```javascript
   { tipo: 'retorno_agendado', medico: 'paulo', paciente: 'Maria', data: '2026-11-20', nota: 'Avaliar exames', ts: timestamp }
   ```

3. **`retorno_recepcao`** — Quando o médico encaminha retorno para recepção
   ```javascript
   { tipo: 'retorno_recepcao', medico: 'paulo', paciente: 'Maria', data: '', nota: 'Paciente precisa retornar em 30 dias', ts: timestamp }
   ```

### 7.3 Comunicação Clínica ↔ Paciente (App)

- **BroadcastChannel** / **postMessage** para comunicação quando o app do paciente está em iframe
- **`localStorage` storage events** como fallback para comunicação cross-tab
- Usados para: oferta de vaga da lista de espera, confirmações de agendamento

---

## 8. Acessibilidade e UX

### 8.1 Movimento Reduzido

Todas as interfaces respeitam `prefers-reduced-motion: reduce`:
- Animações de entrada (fade, slide) são desativadas ou reduzidas a opacity simples
- Transições de sidebar tornam-se instantâneas
- Drawer/gaveta abre sem animação
- Spring physics desativada

O paciente pode forçar movimento reduzido nas configurações do perfil (toggle "Movimento reduzido"), que salva em `localStorage 'ap-movimento'` e sobrescreve a preferência do sistema.

### 8.2 Tamanho de Texto

O app do paciente oferece 3 tamanhos via controle segmentado:
- **Normal**: 100% (16px base)
- **Grande**: 118.75% (~19px base)
- **Extra grande**: 137.5% (~22px base)

Aplicado via `html[data-texto]` e herdado por todo o layout.

### 8.3 Recursos de Acessibilidade

| Recurso | Implementação |
|---------|---------------|
| Skip link | `a.pular` para pular direto ao conteúdo principal |
| ARIA live region | `div#anunciador[aria-live="polite"]` para anúncios de mudança de página, paginação, ações |
| ARIA labels | Todos os botões de ícone têm `aria-label` descritivo |
| ARIA current | `aria-current="page"` no item ativo da sidebar |
| ARIA selected | `aria-selected` nos tabs de vista e itens de tabela |
| Focus trap | Drawers e dialogs prendem o Tab dentro dos elementos focáveis |
| Focus visible | Outline de 3px sólido para navegação por teclado |
| Semântica | `role="tablist"`, `role="tab"`, `role="tabpanel"` para abas; `<dialog>` nativo para modais |
| Teclado | Enter/Space em itens de consulta abre o detalhe; Escape fecha dialogs/drawers |

---

## 9. Glossário de Status

### Status de Consulta

| Código | Rótulo exibido | Cor do selo | Descrição |
|--------|----------------|-------------|-----------|
| `confirmada` | Confirmada | Cinza (neutro) | Paciente confirmou presença |
| `chegou` | Na recepção | Âmbar/amarelo | Paciente chegou e está aguardando |
| `em` | Em atendimento | Escuro (noite) | Médico está atendendo |
| `atendida` | Atendida | Verde (menta) | Consulta realizada com sucesso |
| `faltou` | Faltou | Vermelho (perigo) | Paciente não compareceu |
| `cancelada` | Cancelada | — | Consulta foi cancelada |
| `vaga` | Vaga aberta | — | Horário sem paciente |
| `oferecida` | Oferecida à fila | — | Vaga sendo oferecida a paciente da lista de espera |

### Transições Permitidas

```
confirmada ──→ chegou ──→ em ──→ atendida
     │            │        │
     │            │        └──→ faltou (raro, se saiu durante)
     │            └──→ faltou
     └──→ faltou
     └──→ cancelada
```

### Ações por Ator

| Ação | Quem pode fazer | Pré-condição |
|------|-----------------|--------------|
| Registrar chegada | Recepção | Status = confirmada |
| Iniciar atendimento | Recepção / Médico | Status = chegou |
| Finalizar atendimento | Médico | Status = em, chegou ou confirmada |
| Registrar ausência | Médico | Status = confirmada ou chegou |
| Marcar retorno | Médico | Status = atendida ou em |
| Cancelar consulta | Paciente / Recepção | Status = confirmada |
| Reagendar | Recepção (drag-and-drop) | Qualquer status ativo |

---

*Documento gerado em novembro de 2026 como parte do sistema AgendaPro Saúde.*
