/* =====================================================================
   AgendaPro Saúde - script do banco de dados (Microsoft SQL Server)
   Cria o banco, as tabelas, a visão, as procedures e os triggers.
   ===================================================================== */

IF DB_ID('AgendaPro_Saude') IS NULL
    CREATE DATABASE AgendaPro_Saude;
GO

USE AgendaPro_Saude;
GO

CREATE TABLE Clinica (
    Id_Clinica INT IDENTITY(1,1) PRIMARY KEY,
    Nome_Clinica VARCHAR(150) NOT NULL,
    Endereco VARCHAR(250) NOT NULL,
    Telefone VARCHAR(20),
    CNPJ VARCHAR(18),
    Cidade NVARCHAR(100),
    UF CHAR(2),
    Codigo CHAR(8),
    Publica BIT NOT NULL DEFAULT 1,

    CONSTRAINT CK_Clinica_UF
        CHECK (UF IS NULL OR UF COLLATE Latin1_General_BIN LIKE '[A-Z][A-Z]'),

    CONSTRAINT CK_Clinica_Codigo
        CHECK (Codigo IS NULL OR Codigo COLLATE Latin1_General_BIN LIKE '[A-Z][A-Z][A-Z]-[0-9][0-9][0-9][0-9]')
);

CREATE TABLE Usuarios (
    Id_Usuario INT IDENTITY(1,1) PRIMARY KEY,
    Email VARCHAR(150) NOT NULL UNIQUE,
    SenhaHash VARCHAR(255) NOT NULL,
    Papel VARCHAR(20) NOT NULL,
    Nome NVARCHAR(150),
    Telefone VARCHAR(20),
    IdClinica INT NULL,
    Ativo BIT NOT NULL DEFAULT 1,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FaltasSemAviso TINYINT NOT NULL DEFAULT 0,
    Restricao VARCHAR(15) NOT NULL DEFAULT 'NORMAL',
    RestricaoAte DATE NULL,

    CONSTRAINT FK_Usuarios_Clinica
        FOREIGN KEY (IdClinica)
        REFERENCES Clinica(Id_Clinica),

    CONSTRAINT CK_Usuarios_Papel
        CHECK (Papel IN ('PACIENTE', 'MEDICO', 'RECEPCAO', 'DONO')),

    CONSTRAINT CK_Usuarios_Restricao
        CHECK (Restricao IN ('NORMAL', 'SO_FILA', 'SO_RECEPCAO')),

    CONSTRAINT CK_Usuarios_Clinica
        CHECK (
            (Papel = 'PACIENTE' AND IdClinica IS NULL)
            OR
            (Papel <> 'PACIENTE' AND IdClinica IS NOT NULL)
        )
);

CREATE TABLE Especialidades (
    Id_Especialidade INT IDENTITY(1,1) PRIMARY KEY,
    IdClinica INT NOT NULL,
    Nome_Espec NVARCHAR(100) NOT NULL,
    DuracaoPadrao INT NOT NULL,

    CONSTRAINT FK_Especialidades_Clinica
        FOREIGN KEY (IdClinica)
        REFERENCES Clinica(Id_Clinica),

    CONSTRAINT CK_Especialidades_Duracao
        CHECK (DuracaoPadrao > 0),

    CONSTRAINT UQ_Especialidades_Clinica_Nome
        UNIQUE (IdClinica, Nome_Espec)
);

CREATE TABLE Pacientes (
    Id_Paciente INT IDENTITY(1,1) PRIMARY KEY,
    IdUsuario INT NOT NULL,
    Nome_paciente NVARCHAR(150) NOT NULL,
    CPF CHAR(11) NOT NULL,
    Data_Nascimento DATE NOT NULL,
    Alergias NVARCHAR(MAX),
    Parentesco NVARCHAR(50) NOT NULL,
    Cor CHAR(7) NOT NULL DEFAULT '#CFE2F6',

    CONSTRAINT FK_Pacientes_Usuarios
        FOREIGN KEY (IdUsuario)
        REFERENCES Usuarios(Id_Usuario),

    CONSTRAINT UQ_Pacientes_CPF
        UNIQUE (CPF),

    CONSTRAINT CK_Pacientes_CPF
        CHECK (CPF LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),

    CONSTRAINT CK_Pacientes_Nascimento
        CHECK (Data_Nascimento <= CAST(GETDATE() AS DATE)),

    CONSTRAINT CK_Pacientes_Cor
        CHECK (Cor LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);

CREATE INDEX IX_Pacientes_Usuario
ON Pacientes (IdUsuario);

CREATE TABLE Medicos (
    Id_Medico INT IDENTITY(1,1) PRIMARY KEY,
    IdUsuario INT NOT NULL UNIQUE,
    IdEspecialidade INT NOT NULL,
    IdClinica INT NOT NULL,
    Nome NVARCHAR(150) NOT NULL,
    CRM VARCHAR(30) NOT NULL UNIQUE,
    Sala VARCHAR(30),

    CONSTRAINT FK_Medicos_Usuarios
        FOREIGN KEY (IdUsuario)
        REFERENCES Usuarios(Id_Usuario),

    CONSTRAINT FK_Medicos_Especialidades
        FOREIGN KEY (IdEspecialidade)
        REFERENCES Especialidades(Id_Especialidade),

    CONSTRAINT FK_Medicos_Clinica
        FOREIGN KEY (IdClinica)
        REFERENCES Clinica(Id_Clinica)
);

CREATE TABLE Horarios_Atendimento (
    Id_Horario INT IDENTITY(1,1) PRIMARY KEY,
    IdMedico INT NOT NULL,
    Dia_Semana TINYINT NOT NULL,
    Hora_Inicio TIME NOT NULL,
    Hora_Fim TIME NOT NULL,
    InicioAlmoco TIME,
    FimAlmoco TIME,

    CONSTRAINT FK_Horarios_Medicos
        FOREIGN KEY (IdMedico)
        REFERENCES Medicos(Id_Medico),

    CONSTRAINT CK_Horarios_Dia
        CHECK (Dia_Semana BETWEEN 0 AND 6),

    CONSTRAINT CK_Horarios_Expediente
        CHECK (Hora_Inicio < Hora_Fim),

    CONSTRAINT CK_Horarios_Almoco
        CHECK (
            (InicioAlmoco IS NULL AND FimAlmoco IS NULL)
            OR
            (
                InicioAlmoco IS NOT NULL
                AND FimAlmoco IS NOT NULL
                AND InicioAlmoco < FimAlmoco
                AND InicioAlmoco >= Hora_Inicio
                AND FimAlmoco <= Hora_Fim
            )
        ),

    CONSTRAINT UQ_Horarios_Medico_Dia
        UNIQUE (IdMedico, Dia_Semana)
);

CREATE TABLE Status_Consulta (
    Id_Status INT NOT NULL PRIMARY KEY,
    Codigo_consulta VARCHAR(30) NOT NULL UNIQUE,
    Descricao_consulta NVARCHAR(150) NOT NULL
);

INSERT INTO Status_Consulta (Id_Status, Codigo_consulta, Descricao_consulta)
VALUES
(1, 'CONFIRMADA',     'Consulta confirmada'),
(2, 'NA_RECEPCAO',    'Paciente na recepção'),
(3, 'EM_ATENDIMENTO', 'Consulta em andamento'),
(4, 'ATENDIDA',       'Consulta concluída'),
(5, 'FALTOU',         'Paciente não compareceu'),
(6, 'CANCELADA',      'Consulta cancelada'),
(7, 'VAGA',           'Horário disponível'),
(8, 'OFERECIDA',      'Vaga oferecida ao paciente');

CREATE TABLE Consultas (
    Id_Consulta INT IDENTITY(1,1) PRIMARY KEY,
    IdPaciente INT NULL,
    IdMedico INT NOT NULL,
    DataConsulta DATE NOT NULL,
    HoraInicio TIME NOT NULL,
    HoraFim TIME NOT NULL,
    IdStatus INT NOT NULL,
    Sala VARCHAR(30),
    Motivo NVARCHAR(500),
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    PresencaConfirmada BIT NULL,
    ConfirmadaEm DATETIME2 NULL,
    CanceladaEm DATETIME2 NULL,

    CONSTRAINT FK_Consultas_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Consultas_Medicos
        FOREIGN KEY (IdMedico)
        REFERENCES Medicos(Id_Medico),

    CONSTRAINT FK_Consultas_Status
        FOREIGN KEY (IdStatus)
        REFERENCES Status_Consulta(Id_Status),

    CONSTRAINT CK_Consultas_Horario
        CHECK (HoraInicio < HoraFim),

    CONSTRAINT CK_Consultas_Paciente
        CHECK (
            (IdStatus IN (7, 8) AND IdPaciente IS NULL)
            OR
            (IdStatus NOT IN (7, 8) AND IdPaciente IS NOT NULL)
        )
);

CREATE TABLE Feriados (
    Id_Feriado INT IDENTITY(1,1) PRIMARY KEY,
    Data_Feriado DATE NOT NULL UNIQUE,
    Nome_Feriado NVARCHAR(120) NOT NULL
);

CREATE TABLE Lista_Espera (
    Id_Lista INT IDENTITY(1,1) PRIMARY KEY,
    IdPaciente INT NOT NULL,
    IdMedico INT NOT NULL,
    Posicao INT NOT NULL,
    DataEntrada DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UsaApp BIT NOT NULL DEFAULT 0,
    StatusOferta VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
    IdConsultaOfertada INT,
    OfertadaEm DATETIME2,

    CONSTRAINT FK_Lista_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Lista_Medicos
        FOREIGN KEY (IdMedico)
        REFERENCES Medicos(Id_Medico),

    CONSTRAINT FK_Lista_Consultas
        FOREIGN KEY (IdConsultaOfertada)
        REFERENCES Consultas(Id_Consulta),

    CONSTRAINT CK_Lista_Posicao
        CHECK (Posicao > 0),

    CONSTRAINT CK_Lista_Status
        CHECK (StatusOferta IN ('AGUARDANDO','OFERECIDA','EXPIRADA','ACEITA','SAIU'))
);

CREATE TABLE Retornos (
    Id_Retorno INT IDENTITY(1,1) PRIMARY KEY,
    IdPaciente INT NOT NULL,
    IdMedico INT NOT NULL,
    IdConsultaOrigem INT,
    DataRetorno DATE,
    Nota NVARCHAR(500),
    Status VARCHAR(20) NOT NULL DEFAULT 'ENCAMINHADO',

    CONSTRAINT FK_Retornos_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Retornos_Medicos
        FOREIGN KEY (IdMedico)
        REFERENCES Medicos(Id_Medico),

    CONSTRAINT FK_Retornos_Consultas
        FOREIGN KEY (IdConsultaOrigem)
        REFERENCES Consultas(Id_Consulta),

    CONSTRAINT CK_Retornos_Status
        CHECK (Status IN ('ENCAMINHADO','AGENDADO','REALIZADO','CANCELADO'))
);

CREATE TABLE Exames (
    Id_Exame INT IDENTITY(1,1) PRIMARY KEY,
    IdPaciente INT NOT NULL,
    IdConsulta INT,
    NomeExame NVARCHAR(150) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT FK_Exames_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Exames_Consultas
        FOREIGN KEY (IdConsulta)
        REFERENCES Consultas(Id_Consulta),

    CONSTRAINT CK_Exames_Status
        CHECK (Status IN ('PENDENTE', 'REALIZADO'))
);

CREATE TABLE Campanhas_Prevencao (
    Id_Campanha INT IDENTITY(1,1) PRIMARY KEY,
    Mes TINYINT NOT NULL,
    Ano SMALLINT NOT NULL,
    Nome NVARCHAR(150) NULL,
    Tema NVARCHAR(200) NOT NULL,

    CONSTRAINT CK_Campanhas_Mes
        CHECK (Mes BETWEEN 1 AND 12),

    CONSTRAINT UQ_Campanhas_Mes_Ano
        UNIQUE (Mes, Ano)
);

CREATE TABLE Exames_Prevencao (
    Id_ExamePrevencao INT IDENTITY(1,1) PRIMARY KEY,
    IdCampanha INT NULL,
    Titulo NVARCHAR(150) NOT NULL,
    Nota NVARCHAR(300) NULL,
    Especialidade NVARCHAR(100) NULL,

    CONSTRAINT FK_ExamesPrev_Campanhas
        FOREIGN KEY (IdCampanha)
        REFERENCES Campanhas_Prevencao(Id_Campanha)
);

CREATE TABLE Pessoa_Prevencao (
    Id_PessoaPrevencao INT IDENTITY(1,1) PRIMARY KEY,
    IdPaciente INT NOT NULL,
    IdCampanha INT NOT NULL,
    IdExamePrevencao INT NOT NULL,
    IdConsulta INT,
    Status VARCHAR(20) NOT NULL DEFAULT 'NAO_AGENDADO',

    CONSTRAINT FK_Prevencao_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Prevencao_Campanhas
        FOREIGN KEY (IdCampanha)
        REFERENCES Campanhas_Prevencao(Id_Campanha),

    CONSTRAINT FK_Prevencao_Exames
        FOREIGN KEY (IdExamePrevencao)
        REFERENCES Exames_Prevencao(Id_ExamePrevencao),

    CONSTRAINT FK_Prevencao_Consultas
        FOREIGN KEY (IdConsulta)
        REFERENCES Consultas(Id_Consulta),

    CONSTRAINT CK_Prevencao_Status
        CHECK (Status IN ('NAO_AGENDADO','AGENDADO','REALIZADO')),

    CONSTRAINT UQ_Prevencao_Paciente_Exame
        UNIQUE (IdPaciente, IdCampanha, IdExamePrevencao)
);

CREATE TABLE Notificacoes (
    Id_Notificacao INT IDENTITY(1,1) PRIMARY KEY,
    IdUsuario INT NOT NULL,
    Tipo VARCHAR(50) NOT NULL,
    Mensagem NVARCHAR(500) NOT NULL,
    DataEnvio DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Lida BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_Notificacoes_Usuarios
        FOREIGN KEY (IdUsuario)
        REFERENCES Usuarios(Id_Usuario)
);

CREATE TABLE Paciente_Clinica (
    IdUsuario INT NOT NULL,
    IdClinica INT NOT NULL,
    VinculadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Paciente_Clinica
        PRIMARY KEY (IdUsuario, IdClinica),

    CONSTRAINT FK_PacClinica_Usuarios
        FOREIGN KEY (IdUsuario)
        REFERENCES Usuarios(Id_Usuario),

    CONSTRAINT FK_PacClinica_Clinica
        FOREIGN KEY (IdClinica)
        REFERENCES Clinica(Id_Clinica)
);

CREATE TABLE Faltas (
    Id_Falta INT IDENTITY(1,1) PRIMARY KEY,
    IdConsulta INT NOT NULL UNIQUE,
    IdPaciente INT NOT NULL,
    IdUsuario INT NOT NULL,
    DataFalta DATE NOT NULL,
    ConfirmouPresenca BIT NOT NULL,
    RegistradaPor INT,
    Retirada BIT NOT NULL DEFAULT 0,
    RetiradaPor INT,
    RetiradaEm DATETIME2,
    MotivoRetirada NVARCHAR(300),

    CONSTRAINT FK_Faltas_Consultas
        FOREIGN KEY (IdConsulta)
        REFERENCES Consultas(Id_Consulta),

    CONSTRAINT FK_Faltas_Pacientes
        FOREIGN KEY (IdPaciente)
        REFERENCES Pacientes(Id_Paciente),

    CONSTRAINT FK_Faltas_Usuarios
        FOREIGN KEY (IdUsuario)
        REFERENCES Usuarios(Id_Usuario),

    CONSTRAINT FK_Faltas_Registrou
        FOREIGN KEY (RegistradaPor)
        REFERENCES Usuarios(Id_Usuario),

    CONSTRAINT FK_Faltas_Retirou
        FOREIGN KEY (RetiradaPor)
        REFERENCES Usuarios(Id_Usuario)
);

CREATE TABLE Parametros (
    Nome VARCHAR(40) NOT NULL PRIMARY KEY,
    Valor INT NOT NULL,
    Descricao NVARCHAR(200) NOT NULL
);

INSERT INTO Parametros (Nome, Valor, Descricao)
VALUES
('FALTAS_PARA_RESTRICAO', 2,  N'Faltas sem aviso, depois de confirmar presença, que geram a restrição'),
('DIAS_DE_RESTRICAO',     30, N'Dias de cada nível de restrição'),
('MINUTOS_OFERTA',        30, N'Tempo para aceitar uma vaga oferecida');

CREATE INDEX IX_Consultas_Medico_Data
ON Consultas (IdMedico, DataConsulta, HoraInicio);

CREATE INDEX IX_Consultas_Paciente_Data
ON Consultas (IdPaciente, DataConsulta);

CREATE INDEX IX_ListaEspera_Medico_Status
ON Lista_Espera (IdMedico, StatusOferta, Posicao)
INCLUDE (IdPaciente, DataEntrada, UsaApp);

CREATE UNIQUE INDEX UX_ListaEspera_Medico_Posicao
ON Lista_Espera (IdMedico, Posicao)
WHERE StatusOferta IN ('AGUARDANDO','OFERECIDA');

CREATE UNIQUE INDEX UX_ListaEspera_Paciente_Medico
ON Lista_Espera (IdPaciente, IdMedico)
WHERE StatusOferta IN ('AGUARDANDO','OFERECIDA');

CREATE UNIQUE INDEX UX_ListaEspera_ConsultaOfertada
ON Lista_Espera (IdConsultaOfertada)
WHERE IdConsultaOfertada IS NOT NULL
  AND StatusOferta IN ('OFERECIDA','ACEITA');

CREATE INDEX IX_Notificacoes_Usuario_Lida
ON Notificacoes (IdUsuario, Lida, DataEnvio);

CREATE INDEX IX_Exames_Paciente
ON Exames (IdPaciente);

CREATE INDEX IX_Retornos_Paciente
ON Retornos (IdPaciente);

CREATE UNIQUE INDEX UX_Clinica_Codigo
ON Clinica (Codigo)
WHERE Codigo IS NOT NULL;

CREATE UNIQUE INDEX UX_Clinica_CNPJ
ON Clinica (CNPJ)
WHERE CNPJ IS NOT NULL;

CREATE INDEX IX_Faltas_Usuario
ON Faltas (IdUsuario, Retirada);
GO

CREATE OR ALTER VIEW vw_SituacaoConta AS
SELECT
    U.Id_Usuario,
    CASE WHEN U.Restricao <> 'NORMAL' AND U.RestricaoAte >= CAST(GETDATE() AS DATE)
         THEN U.Restricao ELSE 'NORMAL' END AS Restricao,
    CASE WHEN U.Restricao <> 'NORMAL' AND U.RestricaoAte >= CAST(GETDATE() AS DATE)
         THEN U.RestricaoAte END AS RestricaoAte,
    (SELECT COUNT(*) FROM Faltas F
      WHERE F.IdUsuario = U.Id_Usuario AND F.Retirada = 0) AS FaltasRegistradas
FROM Usuarios U
WHERE U.Papel = 'PACIENTE';
GO


CREATE OR ALTER PROCEDURE sp_AdquirirLock
    @Recurso NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Resultado INT;

    EXEC @Resultado = sp_getapplock
        @Resource = @Recurso,
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 5000;

    IF @Resultado < 0
        THROW 50011, 'Recurso ocupado por outra operação. Tente novamente.', 1;
END;
GO

CREATE OR ALTER PROCEDURE sp_ReordenarFila
    @IdMedico INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Iniciou BIT = IIF(@@TRANCOUNT = 0, 1, 0);

    BEGIN TRY
        IF @Iniciou = 1 BEGIN TRANSACTION;

        UPDATE Lista_Espera
        SET Posicao = Posicao + 1000000
        WHERE IdMedico = @IdMedico
          AND StatusOferta IN ('AGUARDANDO', 'OFERECIDA');

        UPDATE L
        SET L.Posicao = N.NovaPosicao
        FROM Lista_Espera L
        INNER JOIN (
            SELECT
                Id_Lista,
                ROW_NUMBER() OVER (ORDER BY Posicao, DataEntrada, Id_Lista) AS NovaPosicao
            FROM Lista_Espera
            WHERE IdMedico = @IdMedico
              AND StatusOferta IN ('AGUARDANDO', 'OFERECIDA')
        ) N
            ON N.Id_Lista = L.Id_Lista;

        IF @Iniciou = 1 COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @Iniciou = 1 AND @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AgendarConsulta
    @IdPaciente INT,
    @IdMedico INT,
    @DataConsulta DATE,
    @HoraInicio TIME,
    @Motivo NVARCHAR(500) = NULL,
    @PelaRecepcao BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @Duracao INT,
        @SalaMedico VARCHAR(30),
        @DiaSemana INT,
        @HoraFim TIME,
        @InicioMin INT,
        @FimMin INT,
        @IdHorario INT,
        @InicioAlmoco TIME,
        @FimAlmoco TIME,
        @IdConfirmada INT,
        @IdCancelada INT,
        @IdVaga INT,
        @IdOferecida INT,
        @IdConsultaVaga INT,
        @IdConsulta INT,
        @Restricao VARCHAR(15),
        @Recurso NVARCHAR(255);

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1
            FROM Pacientes
            WHERE Id_Paciente = @IdPaciente
        )
            THROW 50001, 'Paciente não encontrado.', 1;

        SELECT @Restricao = S.Restricao
        FROM Pacientes P
        INNER JOIN vw_SituacaoConta S
            ON S.Id_Usuario = P.IdUsuario
        WHERE P.Id_Paciente = @IdPaciente;

        IF @PelaRecepcao = 0 AND @Restricao = 'SO_FILA'
            THROW 50013, N'Por enquanto, você pode agendar só pela lista de espera.', 1;

        IF @PelaRecepcao = 0 AND @Restricao = 'SO_RECEPCAO'
            THROW 50014, N'Por enquanto, agende pela recepção da clínica.', 1;

        SELECT
            @Duracao = E.DuracaoPadrao,
            @SalaMedico = M.Sala
        FROM Medicos M
        INNER JOIN Especialidades E
            ON E.Id_Especialidade = M.IdEspecialidade
        WHERE M.Id_Medico = @IdMedico;

        IF @Duracao IS NULL
            THROW 50002, 'Médico não encontrado.', 1;

        IF @DataConsulta < CAST(GETDATE() AS DATE)
           OR (
                @DataConsulta = CAST(GETDATE() AS DATE)
                AND @HoraInicio <= CAST(SYSDATETIME() AS TIME)
              )
            THROW 50010, 'Não é permitido agendar em data ou horário passado.', 1;

        SET @InicioMin = DATEDIFF(
            MINUTE,
            CAST('00:00' AS TIME),
            @HoraInicio
        );

        SET @FimMin = @InicioMin + @Duracao;

        IF @FimMin >= 1440
            THROW 50003, 'Horário ultrapassa o limite do dia.', 1;

        SET @HoraFim = CONVERT(
            TIME,
            DATEADD(
                MINUTE,
                @FimMin,
                CAST('19000101' AS DATETIME2)
            )
        );

        SET @DiaSemana =
            DATEDIFF(DAY, '19000107', @DataConsulta) % 7;

        IF EXISTS (
            SELECT 1
            FROM Feriados
            WHERE Data_Feriado = @DataConsulta
        )
            THROW 50004, 'Não é permitido agendar em feriados.', 1;

        SELECT
            @IdHorario = Id_Horario,
            @InicioAlmoco = InicioAlmoco,
            @FimAlmoco = FimAlmoco
        FROM Horarios_Atendimento
        WHERE IdMedico = @IdMedico
          AND Dia_Semana = @DiaSemana;

        IF @IdHorario IS NULL
            THROW 50005, 'Médico não atende neste dia.', 1;

        IF NOT EXISTS (
            SELECT 1
            FROM Horarios_Atendimento
            WHERE Id_Horario = @IdHorario
              AND @HoraInicio >= Hora_Inicio
              AND @HoraFim <= Hora_Fim
        )
            THROW 50006, 'Horário fora do expediente.', 1;

        IF @InicioAlmoco IS NOT NULL
           AND @HoraInicio < @FimAlmoco
           AND @HoraFim > @InicioAlmoco
            THROW 50007, 'Horário coincide com o almoço.', 1;

        SELECT @IdConfirmada = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA';
        SELECT @IdCancelada  = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA';
        SELECT @IdVaga       = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
        SELECT @IdOferecida  = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';

        SET @Recurso = CONCAT('agenda_medico_', @IdMedico, '_', CONVERT(CHAR(8), @DataConsulta, 112));
        EXEC sp_AdquirirLock @Recurso;

        SET @Recurso = CONCAT('agenda_paciente_', @IdPaciente, '_', CONVERT(CHAR(8), @DataConsulta, 112));
        EXEC sp_AdquirirLock @Recurso;

        IF EXISTS (
            SELECT 1
            FROM Consultas
            WHERE IdMedico = @IdMedico
              AND DataConsulta = @DataConsulta
              AND IdStatus = @IdOferecida
              AND HoraInicio < @HoraFim
              AND HoraFim > @HoraInicio
        )
            THROW 50012, 'Horário reservado para oferta da lista de espera.', 1;

        IF EXISTS (
            SELECT 1
            FROM Consultas
            WHERE IdMedico = @IdMedico
              AND DataConsulta = @DataConsulta
              AND IdStatus NOT IN (@IdCancelada, @IdVaga)
              AND HoraInicio < @HoraFim
              AND HoraFim > @HoraInicio
        )
            THROW 50008, N'Este horário acabou de ser ocupado. Escolha outro.', 1;

        IF EXISTS (
            SELECT 1
            FROM Consultas
            WHERE IdPaciente = @IdPaciente
              AND DataConsulta = @DataConsulta
              AND IdStatus NOT IN (@IdCancelada, @IdVaga)
              AND HoraInicio < @HoraFim
              AND HoraFim > @HoraInicio
        )
            THROW 50009, 'Paciente já possui consulta neste horário.', 1;

        SELECT TOP (1) @IdConsultaVaga = Id_Consulta
        FROM Consultas
        WHERE IdMedico = @IdMedico
          AND DataConsulta = @DataConsulta
          AND HoraInicio = @HoraInicio
          AND HoraFim = @HoraFim
          AND IdStatus = @IdVaga;

        IF @IdConsultaVaga IS NOT NULL
        BEGIN
            UPDATE Consultas
            SET IdPaciente = @IdPaciente,
                IdStatus = @IdConfirmada,
                Sala = @SalaMedico,
                Motivo = @Motivo
            WHERE Id_Consulta = @IdConsultaVaga;

            SET @IdConsulta = @IdConsultaVaga;
        END
        ELSE
        BEGIN
            INSERT INTO Consultas (
                IdPaciente,
                IdMedico,
                DataConsulta,
                HoraInicio,
                HoraFim,
                IdStatus,
                Sala,
                Motivo
            )
            VALUES (
                @IdPaciente,
                @IdMedico,
                @DataConsulta,
                @HoraInicio,
                @HoraFim,
                @IdConfirmada,
                @SalaMedico,
                @Motivo
            );

            SET @IdConsulta = SCOPE_IDENTITY();
        END;

        COMMIT TRANSACTION;

        SELECT @IdConsulta AS IdConsulta;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_EntrarListaEspera
    @IdPaciente INT,
    @IdMedico INT,
    @UsaApp BIT = 0,
    @PelaRecepcao BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdLista INT, @Posicao INT, @Restricao VARCHAR(15), @Recurso NVARCHAR(255);

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Pacientes WHERE Id_Paciente = @IdPaciente)
            THROW 50001, 'Paciente não encontrado.', 1;

        IF NOT EXISTS (SELECT 1 FROM Medicos WHERE Id_Medico = @IdMedico)
            THROW 50002, 'Médico não encontrado.', 1;

        SELECT @Restricao = S.Restricao
        FROM Pacientes P
        INNER JOIN vw_SituacaoConta S
            ON S.Id_Usuario = P.IdUsuario
        WHERE P.Id_Paciente = @IdPaciente;

        IF @PelaRecepcao = 0 AND @Restricao = 'SO_RECEPCAO'
            THROW 50014, N'Por enquanto, agende pela recepção da clínica.', 1;

        SET @Recurso = CONCAT('fila_medico_', @IdMedico);
        EXEC sp_AdquirirLock @Recurso;

        IF EXISTS (
            SELECT 1
            FROM Lista_Espera
            WHERE IdPaciente = @IdPaciente
              AND IdMedico = @IdMedico
              AND StatusOferta IN ('AGUARDANDO', 'OFERECIDA')
        )
            THROW 50040, 'Paciente já está na lista de espera deste médico.', 1;

        SELECT @Posicao = ISNULL(MAX(Posicao), 0) + 1
        FROM Lista_Espera
        WHERE IdMedico = @IdMedico
          AND StatusOferta IN ('AGUARDANDO', 'OFERECIDA');

        INSERT INTO Lista_Espera (IdPaciente, IdMedico, Posicao, UsaApp)
        VALUES (@IdPaciente, @IdMedico, @Posicao, @UsaApp);

        SET @IdLista = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT @IdLista AS Id_Lista, @Posicao AS Posicao;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_OferecerVaga
    @IdConsulta INT,
    @IdListaOfertada INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @Iniciou BIT = IIF(@@TRANCOUNT = 0, 1, 0),
        @IdMedico INT,
        @Data DATE,
        @HoraInicio TIME,
        @HoraFim TIME,
        @IdVaga INT,
        @IdOferecida INT,
        @IdCancelada INT,
        @IdLista INT,
        @IdPaciente INT,
        @IdUsuario INT,
        @NomeMedico NVARCHAR(150),
        @Recurso NVARCHAR(255);

    SET @IdListaOfertada = NULL;

    BEGIN TRY
        IF @Iniciou = 1 BEGIN TRANSACTION;

        SELECT @IdVaga      = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
        SELECT @IdOferecida = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';
        SELECT @IdCancelada = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA';

        SELECT
            @IdMedico = IdMedico,
            @Data = DataConsulta,
            @HoraInicio = HoraInicio,
            @HoraFim = HoraFim
        FROM Consultas
        WHERE Id_Consulta = @IdConsulta
          AND IdStatus = @IdVaga;

        IF @IdMedico IS NULL
            THROW 50020, 'Vaga não encontrada ou não está disponível.', 1;

        IF @Data > CAST(GETDATE() AS DATE)
           OR (@Data = CAST(GETDATE() AS DATE) AND @HoraInicio > CAST(SYSDATETIME() AS TIME))
        BEGIN

            SET @Recurso = CONCAT('agenda_medico_', @IdMedico, '_', CONVERT(CHAR(8), @Data, 112));
            EXEC sp_AdquirirLock @Recurso;

            SET @Recurso = CONCAT('fila_medico_', @IdMedico);
            EXEC sp_AdquirirLock @Recurso;

            SELECT TOP (1)
                @IdLista = L.Id_Lista,
                @IdPaciente = L.IdPaciente
            FROM Lista_Espera L
            WHERE L.IdMedico = @IdMedico
              AND L.StatusOferta = 'AGUARDANDO'
              AND NOT EXISTS (
                    SELECT 1
                    FROM Consultas C
                    WHERE C.IdPaciente = L.IdPaciente
                      AND C.DataConsulta = @Data
                      AND C.IdStatus NOT IN (@IdCancelada, @IdVaga, @IdOferecida)
                      AND C.HoraInicio < @HoraFim
                      AND C.HoraFim > @HoraInicio
              )
            ORDER BY L.Posicao;

            IF @IdLista IS NOT NULL
            BEGIN

                UPDATE Consultas
                SET IdStatus = @IdOferecida
                WHERE Id_Consulta = @IdConsulta
                  AND IdStatus = @IdVaga;

                IF @@ROWCOUNT = 1
                BEGIN
                    UPDATE Lista_Espera
                    SET StatusOferta = 'OFERECIDA',
                        IdConsultaOfertada = @IdConsulta,
                        OfertadaEm = SYSDATETIME()
                    WHERE Id_Lista = @IdLista;

                    SELECT @IdUsuario = IdUsuario
                    FROM Pacientes
                    WHERE Id_Paciente = @IdPaciente;

                    SELECT @NomeMedico = Nome
                    FROM Medicos
                    WHERE Id_Medico = @IdMedico;

                    INSERT INTO Notificacoes (IdUsuario, Tipo, Mensagem)
                    VALUES (
                        @IdUsuario,
                        'VAGA_OFERECIDA',
                        CONCAT(
                            N'Vaga liberada com ', @NomeMedico,
                            N' em ', CONVERT(VARCHAR(10), @Data, 103),
                            N' às ', LEFT(CONVERT(VARCHAR(8), @HoraInicio), 5),
                            N'. Aceite ou recuse a oferta.'
                        )
                    );

                    SET @IdListaOfertada = @IdLista;
                END;
            END;
        END;

        IF @Iniciou = 1 COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @Iniciou = 1 AND @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AceitarOferta
    @IdLista INT,
    @Motivo NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @IdConsulta INT,
        @IdMedico INT,
        @IdPaciente INT,
        @IdUsuario INT,
        @Data DATE,
        @HoraInicio TIME,
        @HoraFim TIME,
        @IdConfirmada INT,
        @IdCancelada INT,
        @IdVaga INT,
        @IdOferecida INT,
        @Recurso NVARCHAR(255);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT
            @IdConsulta = IdConsultaOfertada,
            @IdMedico = IdMedico,
            @IdPaciente = IdPaciente
        FROM Lista_Espera
        WHERE Id_Lista = @IdLista
          AND StatusOferta = 'OFERECIDA';

        IF @IdConsulta IS NULL
            THROW 50021, 'Não há oferta ativa para esta entrada da lista de espera.', 1;

        SELECT @Data = DataConsulta
        FROM Consultas
        WHERE Id_Consulta = @IdConsulta;

        SET @Recurso = CONCAT('agenda_medico_', @IdMedico, '_', CONVERT(CHAR(8), @Data, 112));
        EXEC sp_AdquirirLock @Recurso;

        SET @Recurso = CONCAT('fila_medico_', @IdMedico);
        EXEC sp_AdquirirLock @Recurso;

        SELECT @IdConfirmada = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA';
        SELECT @IdCancelada  = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA';
        SELECT @IdVaga       = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
        SELECT @IdOferecida  = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';

        IF NOT EXISTS (
            SELECT 1
            FROM Lista_Espera
            WHERE Id_Lista = @IdLista
              AND StatusOferta = 'OFERECIDA'
              AND IdConsultaOfertada = @IdConsulta
        )
            THROW 50021, 'Não há oferta ativa para esta entrada da lista de espera.', 1;

        SELECT
            @HoraInicio = HoraInicio,
            @HoraFim = HoraFim
        FROM Consultas
        WHERE Id_Consulta = @IdConsulta
          AND IdStatus = @IdOferecida;

        IF @HoraInicio IS NULL
            THROW 50022, 'A vaga oferecida não está mais disponível.', 1;

        IF @Data < CAST(GETDATE() AS DATE)
           OR (@Data = CAST(GETDATE() AS DATE) AND @HoraInicio <= CAST(SYSDATETIME() AS TIME))
            THROW 50010, 'Não é permitido agendar em data ou horário passado.', 1;

        IF EXISTS (
            SELECT 1
            FROM Consultas
            WHERE IdPaciente = @IdPaciente
              AND DataConsulta = @Data
              AND IdStatus NOT IN (@IdCancelada, @IdVaga, @IdOferecida)
              AND HoraInicio < @HoraFim
              AND HoraFim > @HoraInicio
        )
            THROW 50009, 'Paciente já possui consulta neste horário.', 1;

        UPDATE Consultas
        SET IdPaciente = @IdPaciente,
            IdStatus = @IdConfirmada,
            Motivo = @Motivo
        WHERE Id_Consulta = @IdConsulta
          AND IdStatus = @IdOferecida;

        UPDATE Lista_Espera
        SET StatusOferta = 'ACEITA'
        WHERE Id_Lista = @IdLista;

        EXEC sp_ReordenarFila @IdMedico;

        SELECT @IdUsuario = IdUsuario
        FROM Pacientes
        WHERE Id_Paciente = @IdPaciente;

        INSERT INTO Notificacoes (IdUsuario, Tipo, Mensagem)
        VALUES (
            @IdUsuario,
            'CONSULTA_CONFIRMADA',
            CONCAT(
                N'Consulta confirmada em ', CONVERT(VARCHAR(10), @Data, 103),
                N' às ', LEFT(CONVERT(VARCHAR(8), @HoraInicio), 5), N'.'
            )
        );

        COMMIT TRANSACTION;

        SELECT @IdConsulta AS IdConsulta;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_RecusarOferta
    @IdLista INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @Iniciou BIT = IIF(@@TRANCOUNT = 0, 1, 0),
        @IdConsulta INT,
        @IdMedico INT,
        @Data DATE,
        @IdVaga INT,
        @IdOferecida INT,
        @Recurso NVARCHAR(255);

    BEGIN TRY
        IF @Iniciou = 1 BEGIN TRANSACTION;

        SELECT
            @IdConsulta = IdConsultaOfertada,
            @IdMedico = IdMedico
        FROM Lista_Espera
        WHERE Id_Lista = @IdLista
          AND StatusOferta = 'OFERECIDA';

        IF @IdConsulta IS NULL
            THROW 50023, 'Não há oferta ativa para esta entrada da lista de espera.', 1;

        SELECT @Data = DataConsulta
        FROM Consultas
        WHERE Id_Consulta = @IdConsulta;

        SET @Recurso = CONCAT('agenda_medico_', @IdMedico, '_', CONVERT(CHAR(8), @Data, 112));
        EXEC sp_AdquirirLock @Recurso;

        SET @Recurso = CONCAT('fila_medico_', @IdMedico);
        EXEC sp_AdquirirLock @Recurso;

        SELECT @IdVaga      = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
        SELECT @IdOferecida = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';

        UPDATE Lista_Espera
        SET StatusOferta = 'EXPIRADA'
        WHERE Id_Lista = @IdLista
          AND StatusOferta = 'OFERECIDA';

        IF @@ROWCOUNT = 0
            THROW 50023, 'Não há oferta ativa para esta entrada da lista de espera.', 1;

        UPDATE Consultas
        SET IdStatus = @IdVaga
        WHERE Id_Consulta = @IdConsulta
          AND IdStatus = @IdOferecida;

        EXEC sp_ReordenarFila @IdMedico;

        EXEC sp_OferecerVaga @IdConsulta;

        IF @Iniciou = 1 COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @Iniciou = 1 AND @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_ExpirarOfertasVencidas
    @Minutos INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @Minutos = ISNULL(@Minutos, (SELECT Valor FROM Parametros WHERE Nome = 'MINUTOS_OFERTA'));

    DECLARE @IdLista INT;

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT Id_Lista
        FROM Lista_Espera
        WHERE StatusOferta = 'OFERECIDA'
          AND OfertadaEm < DATEADD(MINUTE, -@Minutos, SYSDATETIME());

    OPEN cur;
    FETCH NEXT FROM cur INTO @IdLista;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            EXEC sp_RecusarOferta @IdLista;
        END TRY
        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;
        END CATCH;

        FETCH NEXT FROM cur INTO @IdLista;
    END;

    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER PROCEDURE sp_CancelarConsulta
    @IdConsulta   INT,
    @PeloPaciente BIT = 0,
    @IdUsuario    INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @IdConfirmada INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA'),
        @IdCancelada  INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA');

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Consultas
                       WHERE Id_Consulta = @IdConsulta AND IdStatus = @IdConfirmada)
            THROW 50030, N'Consulta não encontrada ou não pode mais ser cancelada.', 1;

        EXEC sp_set_session_context @key = N'CanceladoPeloPaciente', @value = @PeloPaciente;
        EXEC sp_set_session_context @key = N'IdUsuarioLogado',       @value = @IdUsuario;

        UPDATE Consultas
        SET IdStatus = @IdCancelada,
            CanceladaEm = SYSDATETIME()
        WHERE Id_Consulta = @IdConsulta;

        EXEC sp_set_session_context @key = N'CanceladoPeloPaciente', @value = NULL;
        EXEC sp_set_session_context @key = N'IdUsuarioLogado',       @value = NULL;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        EXEC sp_set_session_context @key = N'CanceladoPeloPaciente', @value = NULL;
        EXEC sp_set_session_context @key = N'IdUsuarioLogado',       @value = NULL;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER TRIGGER trg_VagaLiberada
ON Consultas
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(IdStatus)
        RETURN;

    DECLARE
        @IdCancelada INT,
        @IdVaga INT,
        @IdOferecida INT,
        @IdNova INT;

    SELECT @IdCancelada = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA';
    SELECT @IdVaga      = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'VAGA';
    SELECT @IdOferecida = Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'OFERECIDA';

    DECLARE @Novas TABLE (IdConsulta INT);

    INSERT INTO Consultas (IdPaciente, IdMedico, DataConsulta, HoraInicio, HoraFim, IdStatus, Sala)
    OUTPUT inserted.Id_Consulta INTO @Novas (IdConsulta)
    SELECT
        NULL,
        i.IdMedico,
        i.DataConsulta,
        i.HoraInicio,
        i.HoraFim,
        @IdVaga,
        i.Sala
    FROM inserted i
    INNER JOIN deleted d
        ON d.Id_Consulta = i.Id_Consulta
    WHERE i.IdStatus = @IdCancelada
      AND d.IdStatus <> @IdCancelada
      AND (
            i.DataConsulta > CAST(GETDATE() AS DATE)
            OR (i.DataConsulta = CAST(GETDATE() AS DATE) AND i.HoraInicio > CAST(SYSDATETIME() AS TIME))
          )
      AND NOT EXISTS (
            SELECT 1
            FROM Consultas c
            WHERE c.IdMedico = i.IdMedico
              AND c.DataConsulta = i.DataConsulta
              AND c.HoraInicio = i.HoraInicio
              AND c.HoraFim = i.HoraFim
              AND c.IdStatus IN (@IdVaga, @IdOferecida)
      );

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT IdConsulta FROM @Novas;

    OPEN cur;
    FETCH NEXT FROM cur INTO @IdNova;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_OferecerVaga @IdNova;
        FETCH NEXT FROM cur INTO @IdNova;
    END;

    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER PROCEDURE sp_AplicarFalta
    @IdConsulta    INT,
    @IdPaciente    INT,
    @DataFalta     DATE,
    @Confirmou     BIT,
    @RegistradaPor INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE
        @IdUsuario INT,
        @Restricao VARCHAR(15),
        @Ate       DATE,
        @Faltas    INT,
        @Hoje      DATE = CAST(GETDATE() AS DATE),
        @Dias      INT  = (SELECT Valor FROM Parametros WHERE Nome = 'DIAS_DE_RESTRICAO'),
        @Limite    INT  = (SELECT Valor FROM Parametros WHERE Nome = 'FALTAS_PARA_RESTRICAO');

    SELECT @IdUsuario = IdUsuario FROM Pacientes WHERE Id_Paciente = @IdPaciente;

    INSERT INTO Faltas (IdConsulta, IdPaciente, IdUsuario, DataFalta, ConfirmouPresenca, RegistradaPor)
    VALUES (@IdConsulta, @IdPaciente, @IdUsuario, @DataFalta, ISNULL(@Confirmou, 0), @RegistradaPor);

    -- Só a falta de quem confirmou presença conta para a restrição.
    IF @Confirmou = 1
    BEGIN
        SELECT @Restricao = Restricao, @Ate = RestricaoAte, @Faltas = FaltasSemAviso
        FROM Usuarios
        WHERE Id_Usuario = @IdUsuario;

        IF @Restricao <> 'NORMAL' AND @Ate >= @Hoje
        BEGIN
            -- nova falta durante uma restrição: só agenda com a recepção
            UPDATE Usuarios
            SET Restricao = 'SO_RECEPCAO',
                RestricaoAte = DATEADD(DAY, @Dias, @Hoje),
                FaltasSemAviso = 0
            WHERE Id_Usuario = @IdUsuario;

            INSERT INTO Notificacoes (IdUsuario, Tipo, Mensagem)
            VALUES (@IdUsuario, 'RESTRICAO',
                    CONCAT(N'Por ', @Dias, N' dias, agende suas consultas pela recepção da clínica.'));
        END
        ELSE IF @Faltas + 1 >= @Limite
        BEGIN
            UPDATE Usuarios
            SET Restricao = 'SO_FILA',
                RestricaoAte = DATEADD(DAY, @Dias, @Hoje),
                FaltasSemAviso = 0
            WHERE Id_Usuario = @IdUsuario;

            INSERT INTO Notificacoes (IdUsuario, Tipo, Mensagem)
            VALUES (@IdUsuario, 'RESTRICAO',
                    CONCAT(N'Por ', @Dias, N' dias, você pode agendar só pela lista de espera.'));
        END
        ELSE
        BEGIN
            UPDATE Usuarios
            SET Restricao = 'NORMAL', RestricaoAte = NULL, FaltasSemAviso = @Faltas + 1
            WHERE Id_Usuario = @IdUsuario;
        END;
    END;
END;
GO

CREATE OR ALTER PROCEDURE sp_ConfirmarPresenca
    @IdConsulta INT,
    @Vou        BIT,
    @IdUsuario  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdConfirmada INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA');

    IF NOT EXISTS (SELECT 1 FROM Consultas
                   WHERE Id_Consulta = @IdConsulta
                     AND IdStatus = @IdConfirmada
                     AND CAST(DataConsulta AS DATETIME) + CAST(HoraInicio AS DATETIME) > GETDATE())
        THROW 50031, N'Consulta não encontrada ou já realizada.', 1;

    IF @Vou = 1
        UPDATE Consultas
        SET PresencaConfirmada = 1, ConfirmadaEm = SYSDATETIME()
        WHERE Id_Consulta = @IdConsulta;
    ELSE
        EXEC sp_CancelarConsulta @IdConsulta, 1, @IdUsuario;
END;
GO

CREATE OR ALTER PROCEDURE sp_RegistrarFalta
    @IdConsulta INT,
    @IdUsuario  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @IdConfirmada  INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CONFIRMADA'),
        @IdNaRecepcao  INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'NA_RECEPCAO'),
        @IdFaltou      INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'FALTOU');

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM Consultas
                       WHERE Id_Consulta = @IdConsulta
                         AND IdStatus IN (@IdConfirmada, @IdNaRecepcao)
                         AND DataConsulta <= CAST(GETDATE() AS DATE))
            THROW 50032, N'Só é possível registrar falta de consulta do dia ou anterior.', 1;

        EXEC sp_set_session_context @key = N'IdUsuarioLogado', @value = @IdUsuario;

        UPDATE Consultas SET IdStatus = @IdFaltou WHERE Id_Consulta = @IdConsulta;   -- o trigger faz o resto

        EXEC sp_set_session_context @key = N'IdUsuarioLogado', @value = NULL;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        EXEC sp_set_session_context @key = N'IdUsuarioLogado', @value = NULL;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_RetirarFalta
    @IdFalta   INT,
    @IdUsuario INT,
    @Motivo    NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdConta INT, @Confirmou BIT, @Hoje DATE = CAST(GETDATE() AS DATE);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @IdConta = IdUsuario, @Confirmou = ConfirmouPresenca
        FROM Faltas WITH (UPDLOCK)
        WHERE Id_Falta = @IdFalta AND Retirada = 0;

        IF @IdConta IS NULL
            THROW 50033, N'Falta não encontrada ou já retirada.', 1;

        UPDATE Faltas
        SET Retirada = 1, RetiradaPor = @IdUsuario, RetiradaEm = SYSDATETIME(), MotivoRetirada = @Motivo
        WHERE Id_Falta = @IdFalta;

        IF @Confirmou = 1
            UPDATE Usuarios
            SET Restricao      = CASE WHEN Restricao <> 'NORMAL' AND RestricaoAte >= @Hoje THEN 'NORMAL' ELSE Restricao END,
                RestricaoAte   = CASE WHEN Restricao <> 'NORMAL' AND RestricaoAte >= @Hoje THEN NULL ELSE RestricaoAte END,
                FaltasSemAviso = CASE WHEN FaltasSemAviso > 0 THEN FaltasSemAviso - 1 ELSE 0 END
            WHERE Id_Usuario = @IdConta;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_SairListaEspera
    @IdLista INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdMedico INT, @Recurso NVARCHAR(255);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @IdMedico = IdMedico
        FROM Lista_Espera
        WHERE Id_Lista = @IdLista AND StatusOferta = 'AGUARDANDO';

        IF @IdMedico IS NULL
            THROW 50041, N'Entrada da lista de espera não encontrada.', 1;

        SET @Recurso = CONCAT('fila_medico_', @IdMedico);
        EXEC sp_AdquirirLock @Recurso;

        UPDATE Lista_Espera SET StatusOferta = 'SAIU' WHERE Id_Lista = @IdLista;

        EXEC sp_ReordenarFila @IdMedico;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER TRIGGER trg_Consultas_Falta
ON Consultas
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(IdStatus)
        RETURN;

    DECLARE
        @IdFaltou     INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'FALTOU'),
        @IdCancelada  INT = (SELECT Id_Status FROM Status_Consulta WHERE Codigo_consulta = 'CANCELADA'),
        @Registrou    INT = CAST(SESSION_CONTEXT(N'IdUsuarioLogado') AS INT),
        @PeloPaciente BIT = ISNULL(CAST(SESSION_CONTEXT(N'CanceladoPeloPaciente') AS BIT), 0),
        @IdC INT, @IdP INT, @Data DATE, @Conf BIT;

    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT i.Id_Consulta, i.IdPaciente, i.DataConsulta, ISNULL(i.PresencaConfirmada, 0)
        FROM inserted i
        INNER JOIN deleted d ON d.Id_Consulta = i.Id_Consulta
        WHERE (i.IdStatus = @IdFaltou AND d.IdStatus <> @IdFaltou)
           OR (i.IdStatus = @IdCancelada AND d.IdStatus <> @IdCancelada
               AND @PeloPaciente = 1
               AND i.PresencaConfirmada = 1
               AND i.DataConsulta = CAST(GETDATE() AS DATE));

    OPEN cur;
    FETCH NEXT FROM cur INTO @IdC, @IdP, @Data, @Conf;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_AplicarFalta @IdC, @IdP, @Data, @Conf, @Registrou;
        FETCH NEXT FROM cur INTO @IdC, @IdP, @Data, @Conf;
    END;

    CLOSE cur;
    DEALLOCATE cur;
END;
GO
