/* =====================================================================
   AgendaPro Saúde - dados do calendário de prevenção
   (Campanhas_Prevencao e Exames_Prevencao)

   O script do banco (Apêndice Q) cria as tabelas de prevenção vazias, e nenhuma rota da API cadastra
   campanhas. Este arquivo grava as campanhas e os exames sugeridos que as telas já usam
   (frontend/assets/js/dados.js:42-63 e aplicativo/src/dados/dadosFicticios.js:154-176), de outubro de 2026
   a abril de 2027, mais as duas sugestões gerais (IdCampanha nulo, valem para todo mês).

   REAPLIQUE este arquivo sempre que o banco for recriado pelo script do Apêndice Q:
       sqlcmd -S .\SQLEXPRESS -E -C -I -f 65001 -d AgendaPro_Saude -i backend\docs\dados-prevencao.sql
   (-f 65001 lê o arquivo como UTF-8, por causa dos acentos.)
   Pode rodar mais de uma vez: o que já existe não é gravado de novo.

   Pendência: o ideal é estes dados irem para o script do banco (Apêndice Q).
   ===================================================================== */

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

USE AgendaPro_Saude;
GO

-- Campanhas (um registro por mês: UQ_Campanhas_Mes_Ano). Nome NULL = mês sem campanha com nome.
DECLARE @Campanhas TABLE (Mes TINYINT, Ano SMALLINT, Nome NVARCHAR(150) NULL, Tema NVARCHAR(200));
INSERT INTO @Campanhas (Mes, Ano, Nome, Tema) VALUES
(10, 2026, N'Outubro Rosa',             N'Prevenção do câncer de mama'),
(11, 2026, N'Novembro Azul',            N'Saúde do homem'),
(12, 2026, NULL,                        N'Antes das férias'),
( 1, 2027, N'Janeiro Branco',           N'Saúde mental'),
( 2, 2027, NULL,                        N'Volta às aulas'),
( 3, 2027, N'Março Lilás',              N'Prevenção do câncer do colo do útero'),
( 4, 2027, N'Vacinação contra a gripe', N'Campanha anual');

INSERT INTO Campanhas_Prevencao (Mes, Ano, Nome, Tema)
SELECT N.Mes, N.Ano, N.Nome, N.Tema
FROM @Campanhas N
WHERE NOT EXISTS (SELECT 1 FROM Campanhas_Prevencao C WHERE C.Mes = N.Mes AND C.Ano = N.Ano);

-- Exames sugeridos de cada campanha. Especialidade = NOME da especialidade (NULL = não se marca pela clínica).
DECLARE @Exames TABLE (Mes TINYINT NULL, Ano SMALLINT NULL, Titulo NVARCHAR(150), Nota NVARCHAR(300) NULL,
                       Especialidade NVARCHAR(100) NULL);
INSERT INTO @Exames (Mes, Ano, Titulo, Nota, Especialidade) VALUES
(10,   2026, N'Mamografia',                       N'A cada 2 anos, dos 50 aos 74 anos',                 N'Ginecologia'),
(10,   2026, N'Consulta com ginecologista',       N'Inclui o exame clínico das mamas',                  N'Ginecologia'),
(11,   2026, N'Exame de próstata (PSA)',          N'Conforme orientação médica, a partir dos 50 anos',  N'Clínica geral'),
( 1,   2027, N'Consulta de saúde mental',         N'Conversa sobre sono, humor e estresse',             N'Psiquiatria'),
( 2,   2027, N'Consulta anual com pediatra',      N'Conferir a caderneta de vacinação',                 N'Pediatria'),
( 3,   2027, N'Exame preventivo (Papanicolau)',   N'Frequência conforme orientação médica',             N'Ginecologia'),
( 4,   2027, N'Vacina da gripe',                  N'Grupo prioritário: 60 anos ou mais',                NULL),
-- Sugestões gerais: sem campanha, valem para todo mês
(NULL, NULL, N'Check-up anual com clínica geral', N'Uma vez por ano',                                   N'Clínica geral'),
(NULL, NULL, N'Revisão no dentista',              N'A cada 6 meses',                                    NULL);

INSERT INTO Exames_Prevencao (IdCampanha, Titulo, Nota, Especialidade)
SELECT C.Id_Campanha, N.Titulo, N.Nota, N.Especialidade
FROM @Exames N
LEFT JOIN Campanhas_Prevencao C ON C.Mes = N.Mes AND C.Ano = N.Ano
WHERE NOT EXISTS (
    SELECT 1 FROM Exames_Prevencao E
    WHERE E.Titulo = N.Titulo
      AND ((E.IdCampanha IS NULL AND N.Mes IS NULL) OR E.IdCampanha = C.Id_Campanha));
GO
