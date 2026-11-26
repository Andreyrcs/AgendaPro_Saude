@echo off
rem Dois cliques: liga tudo para a apresentacao. Passo a passo em docs/apresentacao.md
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apresentacao.ps1" %*
pause
