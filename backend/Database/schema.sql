CREATE DATABASE IF NOT EXISTS agenda_pro;

USE agenda_pro;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    status_usuario VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL,

    CONSTRAINT chk_status_usuario
        CHECK (status_usuario IN ('ATIVO', 'INATIVO'))
);

CREATE TABLE agendar_reuniao (
    id_reuniao INT AUTO_INCREMENT PRIMARY KEY,
    titulo_reuniao VARCHAR(255) NOT NULL,
    pauta_reuniao VARCHAR(300) NULL,
    data_reuniao DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    local_reuniao VARCHAR(255) NULL,
    link_reuniao VARCHAR(255) NULL,
    id_organizador INT NOT NULL,
    status_reuniao VARCHAR(20) NOT NULL DEFAULT 'AGENDADA',
    tipo_reuniao VARCHAR(20) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL,

    CONSTRAINT fk_agendar_reuniao_organizador
        FOREIGN KEY (id_organizador)
        REFERENCES usuarios(id_usuario),

    CONSTRAINT chk_status_reuniao
        CHECK (status_reuniao IN ('AGENDADA', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA')),

    CONSTRAINT chk_tipo_reuniao
        CHECK (tipo_reuniao IN ('PRESENCIAL', 'ONLINE')),

    CONSTRAINT chk_horario_reuniao
        CHECK (hora_fim > hora_inicio),

    CONSTRAINT chk_local_ou_link_reuniao
        CHECK (
            (tipo_reuniao = 'PRESENCIAL' AND local_reuniao IS NOT NULL)
            OR
            (tipo_reuniao = 'ONLINE' AND link_reuniao IS NOT NULL)
        )
);

CREATE TABLE participantes_reuniao (
    id_reuniao INT NOT NULL,
    id_usuario INT NOT NULL,
    status_participacao VARCHAR(20) NOT NULL DEFAULT 'CONVIDADO',
    data_confirmacao DATETIME NULL,
    compareceu BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id_reuniao, id_usuario),

    CONSTRAINT fk_participantes_reuniao_reuniao
        FOREIGN KEY (id_reuniao)
        REFERENCES agendar_reuniao(id_reuniao)
        ON DELETE CASCADE,

    CONSTRAINT fk_participantes_reuniao_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT chk_status_participacao
        CHECK (status_participacao IN ('CONVIDADO', 'CONFIRMADO', 'RECUSADO'))
);

CREATE INDEX idx_agendar_reuniao_data_status
ON agendar_reuniao (data_reuniao, status_reuniao);

CREATE INDEX idx_agendar_reuniao_organizador
ON agendar_reuniao (id_organizador);

CREATE INDEX idx_participantes_reuniao_usuario
ON participantes_reuniao (id_usuario);

CREATE INDEX idx_participantes_reuniao_confirmacao
ON participantes_reuniao (data_confirmacao);