# AETHER STUDIO — One-command installer
# Run this in PowerShell:
#   irm https://raw.githubusercontent.com/Santaslileper/aether-studio-piano/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$AgentDir = "$env:USERPROFILE\aether-studio"
$AgentZip = "$env:TEMP\aether-agent.zip"
$AgentUrl = "https://github.com/Santaslileper/aether-studio/releases/latest/download/aether-agent.zip"

Write-Host ""
Write-Host "  AETHER STUDIO // AGENT INSTALLER" -ForegroundColor Yellow
Write-Host "  ================================" -ForegroundColor Yellow
Write-Host ""

# ── 1. Check Python ────────────────────────────────────────────────────────────
Write-Host "[1/5] Checking Python..." -ForegroundColor Cyan
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.([89]|1[0-9])") {
            $python = $cmd
            Write-Host "      Found: $ver" -ForegroundColor Green
            break
        }
    } catch {}
}

if (-not $python) {
    Write-Host "      Python 3.8+ not found. Opening download page..." -ForegroundColor Red
    Start-Process "https://www.python.org/downloads/"
    Write-Host "      Install Python, then re-run this script." -ForegroundColor Red
    exit 1
}

# ── 2. Download agent ─────────────────────────────────────────────────────────
Write-Host "[2/5] Downloading Aether agent..." -ForegroundColor Cyan
if (Test-Path $AgentDir) {
    Write-Host "      Existing install found at $AgentDir — updating." -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Path $AgentDir | Out-Null
}
Invoke-WebRequest -Uri $AgentUrl -OutFile $AgentZip -UseBasicParsing
Expand-Archive -Path $AgentZip -DestinationPath $AgentDir -Force
Remove-Item $AgentZip
Write-Host "      Downloaded to $AgentDir" -ForegroundColor Green

# ── 3. Install Python dependencies ────────────────────────────────────────────
Write-Host "[3/5] Installing Python dependencies..." -ForegroundColor Cyan
& $python -m pip install --upgrade pip --quiet
& $python -m pip install -r "$AgentDir\requirements.txt" --quiet
Write-Host "      Dependencies installed." -ForegroundColor Green

# ── 4. Install Playwright browser ─────────────────────────────────────────────
Write-Host "[4/5] Installing Playwright Chromium (one-time, ~150MB)..." -ForegroundColor Cyan
& $python -m playwright install chromium
Write-Host "      Chromium ready." -ForegroundColor Green

# ── 5. Create startup shortcut + start now ───────────────────────────────────
Write-Host "[5/5] Creating startup shortcut..." -ForegroundColor Cyan

$StartupScript = "$AgentDir\start-aether.ps1"
@"
Set-Location "$AgentDir"
Write-Host "Starting Aether Studio agent..." -ForegroundColor Yellow
python agent.py
"@ | Set-Content $StartupScript

# Desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Aether Studio.lnk")
$Shortcut.TargetPath  = "powershell.exe"
$Shortcut.Arguments   = "-ExecutionPolicy Bypass -File `"$StartupScript`""
$Shortcut.WorkingDirectory = $AgentDir
$Shortcut.Description = "Start Aether Studio local agent"
$Shortcut.Save()

# ── 6. Register Aether Protocol (for browser launching) ───────────────────────
Write-Host "[6/6] Registering aether:// protocol..." -ForegroundColor Cyan
try {
    $ProtocolPath = "HKCU:\Software\Classes\aether"
    if (!(Test-Path $ProtocolPath)) { New-Item $ProtocolPath -Force | Out-Null }
    Set-ItemProperty $ProtocolPath "(default)" "URL:Aether Protocol"
    Set-ItemProperty $ProtocolPath "URL Protocol" ""
    
    $CommandPath = "$ProtocolPath\shell\open\command"
    if (!(Test-Path $CommandPath)) { New-Item $CommandPath -Recursive -Force | Out-Null }
    # Points to the startup script
    $CmdString = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$StartupScript`""
    Set-ItemProperty $CommandPath "(default)" $CmdString
    Write-Host "      Protocol registered: aether://" -ForegroundColor Green
} catch {
    Write-Host "      Warning: Could not register protocol (requires permissions)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor Green
Write-Host "  Agent folder : $AgentDir" -ForegroundColor White
Write-Host "  Desktop icon : Aether Studio (double-click to start)" -ForegroundColor White
Write-Host "  Web UI       : https://Santaslileper.github.io/aether-studio" -ForegroundColor White
Write-Host ""
Write-Host "  Starting agent now..." -ForegroundColor Yellow
Write-Host ""

Set-Location $AgentDir
& $python agent.py
