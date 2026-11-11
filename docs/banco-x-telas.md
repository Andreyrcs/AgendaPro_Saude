# Banco de dados × telas

Onde cada coluna do script SQL Server (`agendapro_saude_sqlserver`) aparece no sistema.
Ignorados: IDs, `SenhaHash` e colunas internas (`CriadoEm`, `OfertadaEm`). Situação em 11/11/2026.

Legenda: **web-rec** = área da recepção · **web-med** = área do médico · **web-pac** = área do paciente
(computador e celular) · **app** = app Expo · ➕ = acrescentado agora · ⛔ = fica sem tela (motivo ao lado).

## Usuarios
| Coluna | Onde aparece |
|---|---|
| Email | Login (web e app), cadastro de paciente (web e app), equipe (web-rec), ➕ e-mail de acesso no cadastro de médico (web-rec) |
| Papel | Login leva cada papel à sua área; Equipe mostra a função |
| Nome | Cadastros, menu lateral, Minha conta, Perfil (app) |
| Telefone | Cadastro de paciente (web e app; obrigatório no app), Minha conta (web-rec) |
| IdClinica | Sessão: cada tela da clínica mostra só os dados dela |
| Ativo | ⛔ interna: "Remover da equipe" desativa a conta; ninguém digita esse valor |
| FaltasSemAviso, Restricao, RestricaoAte | Ficha do paciente (web-rec), Início/Agendar (web-pac e app), Perfil (app) |

## Pacientes
| Coluna | Onde aparece |
|---|---|
| Nome_paciente | Cadastro do titular, Adicionar familiar, Família, ficha |
| Data_Nascimento | Cadastro do titular (➕ obrigatória na web), Adicionar familiar (➕ obrigatória na web); a idade é calculada |
| Alergias | Cadastro do titular (app), Adicionar familiar (➕ no celular web), ficha do familiar |
| Parentesco | ➕ Adicionar familiar (obrigatório: Filho(a), Cônjuge, Pai/Mãe, Irmão(ã), Outro) e ficha; titular = "Titular" |
| Cor | Adicionar familiar (computador e app); no celular web é escolhida sozinha |

## Paciente_Clinica
| Coluna | Onde aparece |
|---|---|
| IdClinica (vínculo) | Escolher clínica (web), ➕ código da clínica no cadastro do app |
| VinculadoEm | ⛔ interna (data do vínculo, não muda nada para o usuário) |

## Clinica
| Coluna | Onde aparece |
|---|---|
| Nome_Clinica, Endereco, Telefone, CNPJ, Cidade | Cadastro da clínica, Clínica e equipe (web-rec), Escolher clínica, Perfil/consulta (paciente) |
| Codigo | Clínica e equipe, Escolher clínica, ➕ cadastro do app |
| Publica | Cadastro da clínica e Clínica e equipe ("aparecer na busca") |

## Medicos
| Coluna | Onde aparece |
|---|---|
| Nome, IdEspecialidade, Sala | Médicos (web-rec), agenda, consultas do paciente |
| CRM | ➕ cadastro e edição em Médicos (obrigatório, único), tabela de médicos, perfil do médico (web-med) |
| IdUsuario | ➕ o cadastro do médico cria a conta de acesso (e-mail + senha provisória) |

## Especialidades
| Coluna | Onde aparece |
|---|---|
| Nome_Espec | Especialidades (web-rec), agendamento (paciente) |
| DuracaoPadrao | ➕ campo no cadastro de especialidade; a duração das consultas passa a vir dela (antes era por médico em Horários) |

## Horarios_Atendimento
| Coluna | Onde aparece |
|---|---|
| Dia_Semana, Hora_Inicio, Hora_Fim | Horários (web-rec): "segunda a sexta" e "sábado" (a API grava uma linha por dia) |
| InicioAlmoco, FimAlmoco | ➕ campos de almoço em Horários; agenda, horários livres e mapa de calor usam o almoço de cada médico |

## Consultas
| Coluna | Onde aparece |
|---|---|
| DataConsulta, HoraInicio, HoraFim | Agenda (web-rec, web-med), consultas do paciente |
| IdStatus | Selos de status em todas as telas |
| Sala | Consulta do paciente, detalhe do médico |
| Motivo | ➕ Nova consulta (web-rec), menu da consulta na agenda, ➕ detalhe do médico; consulta do paciente |
| PresencaConfirmada | "Vou"/"Não vou" (paciente), agenda e ➕ detalhe do médico |
| ConfirmadaEm, CanceladaEm | ⛔ internas: usadas na regra de falta, não precisam ser lidas pelas pessoas |

## Lista_Espera
| Coluna | Onde aparece |
|---|---|
| Posicao, DataEntrada, UsaApp | Lista de espera (web-rec), ficha, lista de espera do paciente |
| StatusOferta, IdConsultaOfertada | Vaga oferecida (agenda e paciente) |

## Retornos
| Coluna | Onde aparece |
|---|---|
| DataRetorno, Nota | Retorno com nota (web-med); ➕ ficha do paciente (web-rec) e "Depois da consulta" (web-pac) |
| Status | ➕ ficha do paciente: Encaminhado à recepção / Agendado (com atalho para marcar) |

## Exames
| Coluna | Onde aparece |
|---|---|
| NomeExame | ➕ médico pede exame no detalhe da consulta; ficha (web-rec); "Depois da consulta" (paciente) |
| Status | ➕ ficha: Pendente → "Marcar como realizado" |

## Campanhas_Prevencao e Pessoa_Prevencao
| Coluna | Onde aparece |
|---|---|
| Nome, Mes, Ano, TipoExame | Calendário de prevenção (web-pac e app) |
| Status | "Falta fazer / Agendado / Já fiz" na prevenção |

## Notificacoes
| Coluna | Onde aparece |
|---|---|
| Tipo, Mensagem, DataEnvio, Lida | Notificações (celular web), ➕ avisos novos no Início (computador), ➕ tela Avisos no app |

## Faltas
| Coluna | Onde aparece |
|---|---|
| DataFalta, ConfirmouPresenca | Ficha do paciente (web-rec) |
| RegistradaPor | ➕ ficha: "registrada por" |
| Retirada, RetiradaPor, RetiradaEm, MotivoRetirada | ➕ "Retirar (justificada)" pede o motivo; a retirada fica no histórico |

## Feriados
| Coluna | Onde aparece |
|---|---|
| Data_Feriado, Nome_Feriado | Horários (web-rec, "dias fechados"), agenda (dias fechados) |

A tabela não tem coluna de clínica: os feriados são nacionais e cadastrados pela equipe do sistema, não pela clínica.
Por isso não há tela para criar feriado.

## Campos das telas que o banco não tem
- **Clínica: unidade e UF**: aparecem no cadastro e no cabeçalho. O banco não tem essas colunas: falta incluir ou tirar.
- **Cadastro de paciente na web: documento (CPF)**: obrigatório na tela, sem coluna no banco.
- **Médico: telefone**: o banco só tem o telefone da conta (`Usuarios.Telefone`), por isso a API grava lá.
