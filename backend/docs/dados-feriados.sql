/* =====================================================================
   AgendaPro Saúde - feriados nacionais (tabela Feriados)

   A tabela Feriados (Apêndice Q) não tem coluna de clínica: cada feriado vale para TODAS as clínicas.
   Por isso a API só lê os feriados (GET /api/feriados), e nenhum perfil grava: se o dono ou a recepção de
   uma clínica pudesse criar ou apagar feriados, mexeria na agenda das outras (seção 5.4, isolamento).
   Os feriados entram por este arquivo. Com um feriado gravado, a sp_AgendarConsulta recusa o dia
   (erro 50004) e o dia some dos horários livres.

   São os feriados nacionais de 2026 e 2027 (Lei 662/1949, Lei 6.802/1980 e Lei 14.759/2023) e a
   Sexta-feira Santa. Carnaval e Corpus Christi ficam de fora: são ponto facultativo, e não feriado
   nacional, e muitas clínicas abrem nesses dias.

   REAPLIQUE este arquivo sempre que o banco for recriado pelo script banco/agendapro_saude_sqlserver.sql:
       sqlcmd -S localhost -E -C -I -f 65001 -d <nome do banco> -i backend\docs\dados-feriados.sql
   O banco é escolhido pelo -d (este arquivo não tem USE, para não gravar no banco errado).
   (-f 65001 lê o arquivo como UTF-8, por causa dos acentos.)
   Pode rodar mais de uma vez: a data que já existe não é gravada de novo (Data_Feriado é UNIQUE).
   ===================================================================== */

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

DECLARE @Feriados TABLE (Data DATE, Nome NVARCHAR(120));
INSERT INTO @Feriados (Data, Nome) VALUES
('2026-01-01', N'Confraternização Universal'),
('2026-04-03', N'Sexta-feira Santa'),
('2026-04-21', N'Tiradentes'),
('2026-05-01', N'Dia do Trabalho'),
('2026-09-07', N'Independência do Brasil'),
('2026-10-12', N'Nossa Senhora Aparecida'),
('2026-11-02', N'Finados'),
('2026-11-15', N'Proclamação da República'),
('2026-11-20', N'Dia Nacional de Zumbi e da Consciência Negra'),
('2026-12-25', N'Natal'),
('2027-01-01', N'Confraternização Universal'),
('2027-03-26', N'Sexta-feira Santa'),
('2027-04-21', N'Tiradentes'),
('2027-05-01', N'Dia do Trabalho'),
('2027-09-07', N'Independência do Brasil'),
('2027-10-12', N'Nossa Senhora Aparecida'),
('2027-11-02', N'Finados'),
('2027-11-15', N'Proclamação da República'),
('2027-11-20', N'Dia Nacional de Zumbi e da Consciência Negra'),
('2027-12-25', N'Natal');

INSERT INTO Feriados (Data_Feriado, Nome_Feriado)
SELECT N.Data, N.Nome
FROM @Feriados N
WHERE NOT EXISTS (SELECT 1 FROM Feriados F WHERE F.Data_Feriado = N.Data);

SELECT COUNT(*) AS Feriados_no_banco FROM Feriados;
GO
