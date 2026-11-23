/* =====================================================================
   AgendaPro Saúde - testes do banco (SQL Server)

   PASSO 1: selecione do "CREATE OR ALTER PROCEDURE" até o "END;" final
            (o bloco não tem linha em branco) e aperte Ctrl+Enter.
   PASSO 2: rode a linha abaixo sozinha (cursor nela + Ctrl+Enter):

   EXEC AgendaPro_Saude.dbo.sp_TesteSistema;

   No fim aparece uma tabela com cada teste e PASSOU ou FALHOU.
   Pode rodar o EXEC de novo quando quiser: ele apaga os dados do
   teste anterior (e não roda se o banco tiver dados reais).
   Não rode entre 23h50 e 0h (o teste 12 usa uma consulta às 23h58).
   ===================================================================== */
USE AgendaPro_Saude;

CREATE OR ALTER PROCEDURE sp_TesteSistema
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Clinica WHERE ISNULL(Codigo, '') <> 'TST-0001')
    BEGIN
        RAISERROR (N'O banco tem dados que não são do teste. Teste cancelado.', 16, 1);
        RETURN;
    END;
    /* ---------- limpa o teste anterior ---------- */
    DELETE FROM Faltas;
    DELETE FROM Notificacoes;
    DELETE FROM Lista_Espera;
    DELETE FROM Retornos;
    DELETE FROM Exames;
    DELETE FROM Pessoa_Prevencao;
    DELETE FROM Exames_Prevencao WHERE IdCampanha IN (SELECT Id_Campanha FROM Campanhas_Prevencao WHERE Tema LIKE N'TESTE%');
    DELETE FROM Campanhas_Prevencao WHERE Tema LIKE N'TESTE%';
    DELETE FROM Consultas;
    DELETE FROM Paciente_Clinica;
    DELETE FROM Pacientes;
    DELETE FROM Horarios_Atendimento;
    DELETE FROM Medicos;
    DELETE FROM Usuarios;
    DELETE FROM Especialidades;
    DELETE FROM Clinica;
    DECLARE @R TABLE (Id INT IDENTITY(1,1), Teste NVARCHAR(150), Resultado VARCHAR(6), Detalhe NVARCHAR(400));
    DECLARE @Id1 TABLE (Id INT);
    DECLARE @Id2 TABLE (Id INT, Pos INT);
    DECLARE
        @Hoje   DATE = CAST(GETDATE() AS DATE),
        @Amanha DATE = DATEADD(DAY, 1, CAST(GETDATE() AS DATE)),
        @sConf INT, @sCanc INT, @sVaga INT, @sOfer INT, @sFalt INT,
        @Clinica INT, @Espec INT, @Medico INT,
        @UMed INT, @URec INT, @UDono INT, @UP1 INT, @UP2 INT, @UP3 INT, @UP4 INT,
        @P1 INT, @P2 INT, @P3 INT, @P4 INT,
        @C1 INT, @C2 INT, @C3 INT, @CF1 INT, @CF2 INT, @CF3 INT, @CHoje INT, @CAmanha INT,
        @L3 INT, @L4 INT, @L3b INT, @L1 INT, @L4b INT,
        @Vaga INT, @IdFalta INT, @n INT,
        @Restr VARCHAR(15), @Ate DATE;
    SELECT @sConf = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA';
    SELECT @sCanc = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA';
    SELECT @sVaga = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
    SELECT @sOfer = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';
    SELECT @sFalt = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'FALTOU';
    /* =====================================================================
       1. Clínica: código válido e inválido
       ===================================================================== */
    BEGIN TRY
        INSERT INTO Clinica (Nome_Clinica, Endereco, Telefone, Cidade, Codigo, Publica)
        VALUES (N'Clínica Teste', N'Rua Teste, 100', '(15) 3333-0000', N'Sorocaba', 'TST-0001', 1);
        SET @Clinica = SCOPE_IDENTITY();
        INSERT @R VALUES (N'1a. Cadastrar clínica com código TST-0001', 'PASSOU', N'Clínica criada');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'1a. Cadastrar clínica com código TST-0001', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        INSERT INTO Clinica (Nome_Clinica, Endereco, Codigo) VALUES (N'Clínica Errada', N'Rua X', 'ab-12');
        INSERT @R VALUES (N'1b. Recusar código inválido (ab-12)', 'FALHOU', N'Aceitou um código inválido');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'1b. Recusar código inválido (ab-12)', IIF(ERROR_NUMBER() = 547, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       2. Usuários: equipe precisa de clínica
       ===================================================================== */
    BEGIN TRY
        INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome) VALUES ('semclinica@teste.com', 'x', 'RECEPCAO', N'Sem Clínica');
        INSERT @R VALUES (N'2. Recusar recepção sem clínica', 'FALHOU', N'Aceitou recepção sem clínica');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'2. Recusar recepção sem clínica', IIF(ERROR_NUMBER() = 547, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* ---------- cadastro base ---------- */
    INSERT INTO Especialidades (IdClinica, Nome_Espec, DuracaoPadrao) VALUES (@Clinica, N'Clínico Geral', 30);
    SET @Espec = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, IdClinica) VALUES ('dono@teste.com', 'x', 'DONO', N'Dono Teste', @Clinica);
    SET @UDono = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, IdClinica) VALUES ('medico@teste.com', 'x', 'MEDICO', N'Dra. Teste', @Clinica);
    SET @UMed = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome, IdClinica) VALUES ('recepcao@teste.com', 'x', 'RECEPCAO', N'Recepção Teste', @Clinica);
    SET @URec = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome) VALUES ('p1@teste.com', 'x', 'PACIENTE', N'Paciente Um');
    SET @UP1 = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome) VALUES ('p2@teste.com', 'x', 'PACIENTE', N'Paciente Dois');
    SET @UP2 = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome) VALUES ('p3@teste.com', 'x', 'PACIENTE', N'Paciente Três');
    SET @UP3 = SCOPE_IDENTITY();
    INSERT INTO Usuarios (Email, SenhaHash, Papel, Nome) VALUES ('p4@teste.com', 'x', 'PACIENTE', N'Paciente Quatro');
    SET @UP4 = SCOPE_IDENTITY();
    INSERT INTO Paciente_Clinica (IdUsuario, IdClinica)
    VALUES (@UP1, @Clinica), (@UP2, @Clinica), (@UP3, @Clinica), (@UP4, @Clinica);
    INSERT INTO Medicos (IdUsuario, IdEspecialidade, IdClinica, Nome, CRM, Sala)
    VALUES (@UMed, @Espec, @Clinica, N'Dra. Teste', 'CRM-SP 000001', 'Sala 1');
    SET @Medico = SCOPE_IDENTITY();
    INSERT INTO Horarios_Atendimento (IdMedico, Dia_Semana, Hora_Inicio, Hora_Fim)
    VALUES (@Medico, 0, '00:00', '23:59'), (@Medico, 1, '00:00', '23:59'), (@Medico, 2, '00:00', '23:59'),
           (@Medico, 3, '00:00', '23:59'), (@Medico, 4, '00:00', '23:59'), (@Medico, 5, '00:00', '23:59'),
           (@Medico, 6, '00:00', '23:59');
    INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco) VALUES (@UP1, N'Paciente Um', '11111111111', '1990-01-10', N'Titular');
    SET @P1 = SCOPE_IDENTITY();
    INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco) VALUES (@UP2, N'Paciente Dois', '22222222222', '1985-05-20', N'Titular');
    SET @P2 = SCOPE_IDENTITY();
    INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco) VALUES (@UP3, N'Paciente Três', '33333333333', '2000-03-15', N'Titular');
    SET @P3 = SCOPE_IDENTITY();
    INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco, Cor) VALUES (@UP4, N'Paciente Quatro', '44444444444', '1978-11-02', N'Titular', '#F6D5CF');
    SET @P4 = SCOPE_IDENTITY();
    /* =====================================================================
       3. Paciente com nascimento no futuro
       ===================================================================== */
    BEGIN TRY
        INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco)
        VALUES (@UP1, N'Futuro', '55555555555', DATEADD(DAY, 10, @Hoje), N'Filho');
        INSERT @R VALUES (N'3. Recusar nascimento no futuro', 'FALHOU', N'Aceitou data futura');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'3. Recusar nascimento no futuro', IIF(ERROR_NUMBER() = 547, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       3b. CPF: repetido e com letras
       ===================================================================== */
    BEGIN TRY
        INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco) VALUES (@UP1, N'Repetido', '11111111111', '2015-01-01', N'Filho(a)');
        INSERT @R VALUES (N'3b. Recusar CPF repetido', 'FALHOU', N'Aceitou CPF repetido');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'3b. Recusar CPF repetido', IIF(ERROR_NUMBER() IN (2627, 2601), 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        INSERT INTO Pacientes (IdUsuario, Nome_paciente, CPF, Data_Nascimento, Parentesco) VALUES (@UP1, N'Letras', '1234567890A', '2015-01-01', N'Filho(a)');
        INSERT @R VALUES (N'3c. Recusar CPF fora do formato', 'FALHOU', N'Aceitou CPF com letra');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'3c. Recusar CPF fora do formato', IIF(ERROR_NUMBER() = 547, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       4. Agendar e impedir dois pacientes no mesmo horário
       ===================================================================== */
    BEGIN TRY
        DELETE FROM @Id1;
        INSERT INTO @Id1 EXEC sp_AgendarConsulta @IdPaciente = @P1, @IdMedico = @Medico, @DataConsulta = @Amanha, @HoraInicio = '10:00';
        SELECT @C1 = Id FROM @Id1;
        INSERT @R VALUES (N'4a. Agendar consulta (amanhã 10h)', IIF(@C1 IS NOT NULL, 'PASSOU', 'FALHOU'), CONCAT(N'Consulta ', @C1));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'4a. Agendar consulta (amanhã 10h)', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        EXEC sp_AgendarConsulta @IdPaciente = @P2, @IdMedico = @Medico, @DataConsulta = @Amanha, @HoraInicio = '10:00';
        INSERT @R VALUES (N'4b. Recusar outro paciente no mesmo horário', 'FALHOU', N'Agendou em cima');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'4b. Recusar outro paciente no mesmo horário', IIF(ERROR_NUMBER() = 50008, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       5. Cancelar com fila: a vaga é oferecida ao 1º da fila
       ===================================================================== */
    BEGIN TRY
        DELETE FROM @Id2;
        INSERT INTO @Id2 EXEC sp_EntrarListaEspera @IdPaciente = @P3, @IdMedico = @Medico, @UsaApp = 1;
        SELECT @L3 = Id FROM @Id2;
        DELETE FROM @Id2;
        INSERT INTO @Id2 EXEC sp_EntrarListaEspera @IdPaciente = @P4, @IdMedico = @Medico, @UsaApp = 1;
        SELECT @L4 = Id FROM @Id2;
        EXEC sp_CancelarConsulta @IdConsulta = @C1, @PeloPaciente = 1, @IdUsuario = @UP1;
        SELECT @Vaga = Id_Consulta FROM Consultas
        WHERE IdMedico = @Medico AND DataConsulta = @Amanha AND HoraInicio = '10:00' AND IdStatus = @sOfer;
        INSERT @R VALUES (N'5. Cancelar: vaga criada e oferecida ao 1º da fila',
            CASE WHEN (SELECT IdStatus FROM Consultas WHERE Id_Consulta = @C1) = @sCanc
                  AND @Vaga IS NOT NULL
                  AND (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L3) = 'OFERECIDA'
                 THEN 'PASSOU' ELSE 'FALHOU' END,
            CONCAT(N'Vaga ', @Vaga, N'; fila do paciente 3: ', (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L3)));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'5. Cancelar: vaga criada e oferecida ao 1º da fila', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       6. 1º recusa -> passa ao 2º; 2º aceita -> consulta confirmada
       ===================================================================== */
    BEGIN TRY
        EXEC sp_RecusarOferta @IdLista = @L3;
        INSERT @R VALUES (N'6a. Recusar: vaga passa ao 2º da fila',
            IIF((SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L4) = 'OFERECIDA', 'PASSOU', 'FALHOU'),
            CONCAT(N'Fila do paciente 4: ', (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L4)));
        DELETE FROM @Id1;
        INSERT INTO @Id1 EXEC sp_AceitarOferta @IdLista = @L4;
        INSERT @R VALUES (N'6b. Aceitar: consulta confirmada para o 2º',
            CASE WHEN (SELECT IdStatus FROM Consultas WHERE Id_Consulta = @Vaga) = @sConf
                  AND (SELECT IdPaciente FROM Consultas WHERE Id_Consulta = @Vaga) = @P4
                 THEN 'PASSOU' ELSE 'FALHOU' END,
            CONCAT(N'Consulta ', @Vaga));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'6. Recusar / aceitar oferta', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       7. Oferta sem resposta em 30 min passa ao próximo
       ===================================================================== */
    BEGIN TRY
        DELETE FROM @Id1;
        INSERT INTO @Id1 EXEC sp_AgendarConsulta @IdPaciente = @P2, @IdMedico = @Medico, @DataConsulta = @Amanha, @HoraInicio = '11:00';
        SELECT @C2 = Id FROM @Id1;
        DELETE FROM @Id2;
        INSERT INTO @Id2 EXEC sp_EntrarListaEspera @IdPaciente = @P3, @IdMedico = @Medico;
        SELECT @L3b = Id FROM @Id2;
        DELETE FROM @Id2;
        INSERT INTO @Id2 EXEC sp_EntrarListaEspera @IdPaciente = @P1, @IdMedico = @Medico;
        SELECT @L1 = Id FROM @Id2;
        EXEC sp_CancelarConsulta @IdConsulta = @C2, @PeloPaciente = 0, @IdUsuario = @URec;
        UPDATE Lista_Espera SET OfertadaEm = DATEADD(MINUTE, -31, SYSDATETIME()) WHERE Id_Lista = @L3b;
        EXEC sp_ExpirarOfertasVencidas;
        INSERT @R VALUES (N'7. Oferta vencida (30 min) passa ao próximo',
            CASE WHEN (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L3b) = 'EXPIRADA'
                  AND (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L1) = 'OFERECIDA'
                 THEN 'PASSOU' ELSE 'FALHOU' END,
            CONCAT(N'Paciente 3: ', (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L3b),
                   N'; paciente 1: ', (SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L1)));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'7. Oferta vencida (30 min) passa ao próximo', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       8 a 11. Regras de falta (conta do paciente 2)
       Consultas de hoje já confirmadas pelo paciente ("Vou").
       ===================================================================== */
    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus, PresencaConfirmada, ConfirmadaEm)
    VALUES (@P2, @Medico, @Hoje, '00:01', '00:31', @sConf, 1, SYSDATETIME());
    SET @CF1 = SCOPE_IDENTITY();
    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus, PresencaConfirmada, ConfirmadaEm)
    VALUES (@P2, @Medico, @Hoje, '00:32', '01:02', @sConf, 1, SYSDATETIME());
    SET @CF2 = SCOPE_IDENTITY();
    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus, PresencaConfirmada, ConfirmadaEm)
    VALUES (@P2, @Medico, @Hoje, '01:03', '01:33', @sConf, 1, SYSDATETIME());
    SET @CF3 = SCOPE_IDENTITY();
    BEGIN TRY
        EXEC sp_RegistrarFalta @IdConsulta = @CF1, @IdUsuario = @URec;
        SELECT @Restr = Restricao FROM vw_SituacaoConta WHERE Id_Usuario = @UP2;
        INSERT @R VALUES (N'8a. 1ª falta: registra, sem restrição',
            CASE WHEN @Restr = 'NORMAL' AND EXISTS (SELECT 1 FROM Faltas WHERE IdConsulta = @CF1)
                 THEN 'PASSOU' ELSE 'FALHOU' END,
            CONCAT(N'Situação: ', @Restr));
        EXEC sp_RegistrarFalta @IdConsulta = @CF2, @IdUsuario = @URec;
        SELECT @Restr = Restricao, @Ate = RestricaoAte FROM vw_SituacaoConta WHERE Id_Usuario = @UP2;
        INSERT @R VALUES (N'8b. 2ª falta: só lista de espera por 30 dias',
            IIF(@Restr = 'SO_FILA' AND @Ate = DATEADD(DAY, 30, @Hoje), 'PASSOU', 'FALHOU'),
            CONCAT(N'Situação: ', @Restr, N' até ', CONVERT(VARCHAR(10), @Ate, 103)));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'8. Registrar faltas', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        EXEC sp_AgendarConsulta @IdPaciente = @P2, @IdMedico = @Medico, @DataConsulta = @Amanha, @HoraInicio = '14:00';
        INSERT @R VALUES (N'9a. Com SO_FILA: agendamento pelo app bloqueado', 'FALHOU', N'Agendou mesmo com restrição');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'9a. Com SO_FILA: agendamento pelo app bloqueado', IIF(ERROR_NUMBER() = 50013, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        DELETE FROM @Id1;
        INSERT INTO @Id1 EXEC sp_AgendarConsulta @IdPaciente = @P2, @IdMedico = @Medico, @DataConsulta = @Amanha, @HoraInicio = '14:00', @PelaRecepcao = 1;
        SELECT @C3 = Id FROM @Id1;
        INSERT @R VALUES (N'9b. Com SO_FILA: recepção consegue agendar', IIF(@C3 IS NOT NULL, 'PASSOU', 'FALHOU'), CONCAT(N'Consulta ', @C3));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'9b. Com SO_FILA: recepção consegue agendar', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        EXEC sp_RegistrarFalta @IdConsulta = @CF3, @IdUsuario = @URec;
        SELECT @Restr = Restricao FROM vw_SituacaoConta WHERE Id_Usuario = @UP2;
        INSERT @R VALUES (N'10a. Nova falta durante restrição: só recepção', IIF(@Restr = 'SO_RECEPCAO', 'PASSOU', 'FALHOU'), CONCAT(N'Situação: ', @Restr));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'10a. Nova falta durante restrição: só recepção', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        EXEC sp_EntrarListaEspera @IdPaciente = @P2, @IdMedico = @Medico;
        INSERT @R VALUES (N'10b. Com SO_RECEPCAO: lista de espera bloqueada', 'FALHOU', N'Entrou na fila mesmo com restrição');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'10b. Com SO_RECEPCAO: lista de espera bloqueada', IIF(ERROR_NUMBER() = 50014, 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        SELECT @IdFalta = Id_Falta FROM Faltas WHERE IdConsulta = @CF3;
        EXEC sp_RetirarFalta @IdFalta = @IdFalta, @IdUsuario = @URec, @Motivo = N'Atestado médico';
        SELECT @Restr = Restricao FROM vw_SituacaoConta WHERE Id_Usuario = @UP2;
        INSERT @R VALUES (N'11. Recepção retira falta justificada: volta ao normal', IIF(@Restr = 'NORMAL', 'PASSOU', 'FALHOU'), CONCAT(N'Situação: ', @Restr));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'11. Recepção retira falta justificada: volta ao normal', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       12. Disse "Vou" e cancelou no próprio dia -> conta como falta
       ===================================================================== */
    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus)
    VALUES (@P3, @Medico, @Hoje, '23:58', '23:59', @sConf);
    SET @CHoje = SCOPE_IDENTITY();
    BEGIN TRY
        EXEC sp_ConfirmarPresenca @IdConsulta = @CHoje, @Vou = 1, @IdUsuario = @UP3;
        INSERT @R VALUES (N'12a. Responder "Vou" grava a confirmação',
            IIF((SELECT PresencaConfirmada FROM Consultas WHERE Id_Consulta = @CHoje) = 1, 'PASSOU', 'FALHOU'), NULL);
        EXEC sp_ConfirmarPresenca @IdConsulta = @CHoje, @Vou = 0, @IdUsuario = @UP3;
        INSERT @R VALUES (N'12b. "Não vou" no dia, depois de "Vou": cancela e conta falta',
            CASE WHEN (SELECT IdStatus FROM Consultas WHERE Id_Consulta = @CHoje) = @sCanc
                  AND EXISTS (SELECT 1 FROM Faltas WHERE IdConsulta = @CHoje AND ConfirmouPresenca = 1)
                 THEN 'PASSOU' ELSE 'FALHOU' END, NULL);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'12. Confirmar presença no dia', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       13. "Não vou" na véspera -> cancela sem falta
       ===================================================================== */
    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus)
    VALUES (@P4, @Medico, @Amanha, '15:00', '15:30', @sConf);
    SET @CAmanha = SCOPE_IDENTITY();
    BEGIN TRY
        EXEC sp_ConfirmarPresenca @IdConsulta = @CAmanha, @Vou = 0, @IdUsuario = @UP4;
        INSERT @R VALUES (N'13. "Não vou" na véspera: cancela sem falta',
            CASE WHEN (SELECT IdStatus FROM Consultas WHERE Id_Consulta = @CAmanha) = @sCanc
                  AND NOT EXISTS (SELECT 1 FROM Faltas WHERE IdConsulta = @CAmanha)
                 THEN 'PASSOU' ELSE 'FALHOU' END, NULL);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'13. "Não vou" na véspera: cancela sem falta', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       14. Sair da lista de espera
       ===================================================================== */
    BEGIN TRY
        DELETE FROM @Id2;
        INSERT INTO @Id2 EXEC sp_EntrarListaEspera @IdPaciente = @P4, @IdMedico = @Medico;
        SELECT @L4b = Id FROM @Id2;
        EXEC sp_SairListaEspera @IdLista = @L4b;
        INSERT @R VALUES (N'14. Sair da lista de espera',
            IIF((SELECT StatusOferta FROM Lista_Espera WHERE Id_Lista = @L4b) = 'SAIU', 'PASSOU', 'FALHOU'), NULL);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        INSERT @R VALUES (N'14. Sair da lista de espera', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       15. Prevenção: incluir exame da campanha e recusar repetido
       ===================================================================== */
    DECLARE @Camp INT, @ExPrev INT;
    BEGIN TRY
        INSERT INTO Campanhas_Prevencao (Mes, Ano, Nome, Tema) VALUES (12, 1999, N'Dezembro Teste', N'TESTE - campanha');
        SET @Camp = SCOPE_IDENTITY();
        INSERT INTO Exames_Prevencao (IdCampanha, Titulo, Nota, Especialidade) VALUES (@Camp, N'Consulta preventiva', N'Uma vez por ano', N'Clínico Geral');
        SET @ExPrev = SCOPE_IDENTITY();
        INSERT INTO Pessoa_Prevencao (IdPaciente, IdCampanha, IdExamePrevencao) VALUES (@P1, @Camp, @ExPrev);
        INSERT @R VALUES (N'15a. Incluir exame de prevenção para o paciente',
            IIF((SELECT Status FROM Pessoa_Prevencao WHERE IdPaciente = @P1 AND IdExamePrevencao = @ExPrev) = 'NAO_AGENDADO', 'PASSOU', 'FALHOU'), NULL);
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'15a. Incluir exame de prevenção para o paciente', 'FALHOU', ERROR_MESSAGE());
    END CATCH;
    BEGIN TRY
        INSERT INTO Pessoa_Prevencao (IdPaciente, IdCampanha, IdExamePrevencao) VALUES (@P1, @Camp, @ExPrev);
        INSERT @R VALUES (N'15b. Recusar o mesmo exame repetido', 'FALHOU', N'Aceitou repetido');
    END TRY
    BEGIN CATCH
        INSERT @R VALUES (N'15b. Recusar o mesmo exame repetido', IIF(ERROR_NUMBER() IN (2627, 2601), 'PASSOU', 'FALHOU'), ERROR_MESSAGE());
    END CATCH;
    /* =====================================================================
       RESULTADO
       ===================================================================== */
    SELECT @n = COUNT(*) FROM @R WHERE Resultado = 'PASSOU';
    INSERT @R (Teste, Resultado, Detalhe)
    SELECT CONCAT(N'TOTAL: ', @n, N' de ', COUNT(*), N' passaram'), NULL, NULL FROM @R;
    SELECT Teste, Resultado, Detalhe FROM @R ORDER BY Id;
END;
