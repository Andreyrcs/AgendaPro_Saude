# AgendaPro Saúde: liga tudo para a apresentação (API, web e app) com um IP só.
# Uso: dois cliques em apresentacao.cmd. O passo a passo está em docs\apresentacao.md.
#   apresentacao.cmd -Testar            só confere se o que já está ligado responde pelo IP
#   apresentacao.cmd -LiberarFirewall   uma vez só: libera as portas no firewall (pede administrador)
param([string]$Ip = '', [switch]$Testar, [switch]$LiberarFirewall)

# ───────── IP DA CONEXÃO ─────────
# Vazio: o script acha o IP da rede e pergunta se está certo. Para deixar fixo: $IP_DA_CONEXAO = '192.168.0.10'
$IP_DA_CONEXAO = ''
# ─────────────────────────────────

if ($Ip) { $IP_DA_CONEXAO = $Ip }
$PORTAS = [ordered]@{ '5080' = 'API'; '5500' = 'web'; '8081' = 'app (Expo)' }

function Escrever-Ok($texto) { Write-Host "  [ok] $texto" -ForegroundColor Green }
function Escrever-Falha($texto) { Write-Host "  [x]  $texto" -ForegroundColor Red }

# ── Firewall: uma regra só, para as três portas, nas redes Privadas e Públicas ──
if ($LiberarFirewall) {
    $eu = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $eu.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'O Windows vai pedir permissão de administrador.'
        try {
            Start-Process powershell -Verb RunAs -ErrorAction Stop -ArgumentList "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$PSCommandPath`" -LiberarFirewall"
        } catch { Escrever-Falha 'Permissão negada: o firewall não foi alterado.'; exit 1 }
        exit 0
    }
    try {
        Get-NetFirewallRule -Name 'AgendaPro-Apresentacao' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
        New-NetFirewallRule -Name 'AgendaPro-Apresentacao' -DisplayName 'AgendaPro Saúde (apresentação)' -Direction Inbound `
            -Action Allow -Protocol TCP -LocalPort @($PORTAS.Keys) -Profile Private, Public -ErrorAction Stop | Out-Null
        Escrever-Ok 'Portas 5080, 5500 e 8081 liberadas (redes Privadas e Públicas).'
        Write-Host '  Para desfazer depois, no PowerShell de administrador: Remove-NetFirewallRule -Name AgendaPro-Apresentacao'
    } catch { Escrever-Falha $_.Exception.Message; exit 1 }
    exit 0
}

Write-Host "`nAgendaPro Saúde - apresentação`n" -ForegroundColor Cyan

# ── 1. O IP ──
# A rede com internet (que tem gateway) vem primeiro; as outras ficam na lista, por exemplo o hotspot do Windows
$comGateway = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4DefaultGateway } | ForEach-Object { $_.InterfaceIndex })
$redes = @(Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
    Sort-Object @{ Expression = { $comGateway -notcontains $_.InterfaceIndex } })
if ($redes.Count -eq 0) { Escrever-Falha 'Este computador não está em nenhuma rede. Conecte no Wi-Fi e rode de novo.'; exit 1 }

if (-not $IP_DA_CONEXAO) {
    Write-Host 'Redes deste computador:'
    $redes | ForEach-Object { Write-Host "  $($_.IPAddress)  ($($_.InterfaceAlias))" }
    $resposta = Read-Host "`nIP da conexão [Enter = $($redes[0].IPAddress)]"
    $IP_DA_CONEXAO = if ($resposta.Trim()) { $resposta.Trim() } else { $redes[0].IPAddress }
}
if ($IP_DA_CONEXAO -notmatch '^(\d{1,3}\.){3}\d{1,3}$') {
    Escrever-Falha "`"$IP_DA_CONEXAO`" não é um IP. O formato é como 192.168.0.10, sem http e sem porta."; exit 1
}
if (@($redes.IPAddress) -notcontains $IP_DA_CONEXAO) {
    Escrever-Falha "O IP $IP_DA_CONEXAO não é deste computador. Os IPs dele são: $(@($redes.IPAddress) -join ', ')"; exit 1
}
Write-Host "IP da conexão: $IP_DA_CONEXAO`n" -ForegroundColor Cyan

$api = "http://${IP_DA_CONEXAO}:5080"
$web = "http://${IP_DA_CONEXAO}:5500"

if (-not $Testar) {
    # ── 2. Tudo pronto para ligar? ──
    $falhas = 0
    if (Get-Service -ErrorAction SilentlyContinue | Where-Object { ($_.Name -eq 'MSSQLSERVER' -or $_.Name -like 'MSSQL$*') -and $_.Status -eq 'Running' }) {
        Escrever-Ok 'SQL Server ligado'
    } else { Escrever-Falha 'O SQL Server está parado. Abra "Serviços", ache SQL Server (MSSQLSERVER) e clique em Iniciar.'; $falhas++ }

    foreach ($programa in 'dotnet', 'node', 'npx') {
        if (-not (Get-Command $programa -ErrorAction SilentlyContinue)) { Escrever-Falha "O programa `"$programa`" não foi encontrado."; $falhas++ }
    }
    if (-not (Test-Path "$PSScriptRoot\aplicativo\node_modules\expo")) {
        Escrever-Falha 'Falta instalar o app: na pasta aplicativo, rode npm install.'; $falhas++
    }
    foreach ($porta in $PORTAS.Keys) {
        $uso = Get-NetTCPConnection -State Listen -LocalPort $porta -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($uso) {
            $nome = (Get-Process -Id $uso.OwningProcess -ErrorAction SilentlyContinue).ProcessName
            $dica = if ($nome -eq 'Code') { ' É o Live Server do VS Code: clique em "Port: 5500", no canto de baixo.' } else { '' }
            Escrever-Falha "A porta $porta ($($PORTAS[$porta])) está em uso pelo programa $nome. Feche a janela dele.$dica"; $falhas++
        } else { Escrever-Ok "Porta $porta livre ($($PORTAS[$porta]))" }
    }
    if ($falhas -gt 0) { Write-Host "`nNada foi ligado. Resolva o que está em vermelho e rode de novo." -ForegroundColor Yellow; exit 1 }

    # ── 3. Liga tudo ──
    # O IP vai por variável de ambiente, que vale só para as janelas abertas aqui: nenhum arquivo é alterado.
    $env:Cors__Origens__2 = $web                      # API: aceita a web aberta pelo IP
    $env:EXPO_PUBLIC_IP_CONEXAO = $IP_DA_CONEXAO      # app: endereço da API (src\servicos\config.js)
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $IP_DA_CONEXAO  # Expo: endereço no QR code

    function Abrir-Janela($titulo, $pasta, $comando) {
        Start-Process powershell -WorkingDirectory $pasta -ArgumentList "-NoProfile -ExecutionPolicy Bypass -NoExit -Command `"`$Host.UI.RawUI.WindowTitle = '$titulo'; $comando`""
    }
    Write-Host "`nAbrindo as três janelas (não feche nenhuma)..."
    Abrir-Janela 'AgendaPro - API' "$PSScriptRoot\backend\AgendaPro.Api" 'dotnet run --launch-profile rede-local'
    Abrir-Janela 'AgendaPro - Web' $PSScriptRoot 'node scripts/servir-web.js'
    Abrir-Janela 'AgendaPro - App (QR code)' "$PSScriptRoot\aplicativo" 'npx expo start --clear'
}

# ── 4. Responde pelo IP? (o mesmo caminho que os outros aparelhos usam) ──
function Pedir($url, $metodo = 'GET', $cabecalhos = @{}, $corpo = $null) {
    try {
        $p = @{ Uri = $url; Method = $metodo; Headers = $cabecalhos; UseBasicParsing = $true; TimeoutSec = 8 }
        if ($corpo) { $p.Body = $corpo; $p.ContentType = 'application/json' }
        $r = Invoke-WebRequest @p
        return @{ Codigo = [int]$r.StatusCode; Cabecalhos = $r.Headers; Texto = [string]$r.Content }
    } catch {
        $r = $_.Exception.Response
        return @{ Codigo = $(if ($r) { [int]$r.StatusCode } else { 0 }); Cabecalhos = @{}; Texto = '' }
    }
}
$limite = (Get-Date).AddSeconds($(if ($Testar) { 5 } else { 120 }))
Write-Host 'Esperando responder (a primeira vez demora)...'
do {
    $rApi = Pedir "$api/api/auth/login" 'OPTIONS' @{ Origin = $web; 'Access-Control-Request-Method' = 'POST'; 'Access-Control-Request-Headers' = 'content-type' }
    $rWeb = Pedir "$web/login.html"
    $rApp = Pedir "http://${IP_DA_CONEXAO}:8081/status"
    $todos = $rApi.Codigo -and $rWeb.Codigo -and $rApp.Codigo
    if (-not $todos) { Start-Sleep -Milliseconds 1500 }
} until ($todos -or (Get-Date) -gt $limite)

Write-Host ''
$erros = 0
if (-not $rApi.Codigo) { Escrever-Falha 'A API não respondeu. Veja a mensagem na janela "AgendaPro - API".'; $erros++ }
else {
    Escrever-Ok 'API no ar'
    if ($rApi.Cabecalhos['Access-Control-Allow-Origin'] -eq $web) { Escrever-Ok "API aceita a web pelo IP ($web)" }
    else { Escrever-Falha "A API não aceita a web por $web. Feche a janela da API e rode o apresentacao.cmd de novo."; $erros++ }
    # Um login que não existe precisa voltar "senha incorreta" (401): prova que a API fala com o banco. Nada é gravado.
    $rBanco = Pedir "$api/api/auth/login" 'POST' @{} '{"email":"teste.conexao@exemplo.invalid","senha":"conexao-123"}'
    if ($rBanco.Codigo -eq 401) { Escrever-Ok 'API fala com o banco' }
    elseif ($rBanco.Codigo -eq 429) { Write-Host '  [!]  Muitos logins neste minuto: o teste do banco foi pulado.' -ForegroundColor Yellow }
    else { Escrever-Falha "A API respondeu $($rBanco.Codigo) ao consultar o banco. Veja a janela da API."; $erros++ }
}
if ($rWeb.Codigo -eq 200) { Escrever-Ok 'Web no ar' } else { Escrever-Falha 'A web não respondeu. Veja a janela "AgendaPro - Web".'; $erros++ }
if ($rApp.Codigo -eq 200) { Escrever-Ok 'App (Expo) no ar' } else { Escrever-Falha 'O Expo não respondeu. Veja a janela "AgendaPro - App".'; $erros++ }

Write-Host ''
if ($erros) { Write-Host "Há $erros problema(s) acima." -ForegroundColor Yellow } else { Write-Host 'Tudo certo neste computador.' -ForegroundColor Green }
Write-Host @"

  Notebook 1 (recepção)   $web/login.html
  Notebook 2 (médico)     $web/login.html
  Celular (paciente)      QR code da janela "AgendaPro - App", no Expo Go

  Se o notebook 2 ou o celular não abrir: docs\apresentacao.md, "Se algo não abrir".
"@
if ($erros) { exit 1 }
