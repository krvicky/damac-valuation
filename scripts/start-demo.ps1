param(
  [int]$Port = 3000,
  [switch]$NoNgrok
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverLog = Join-Path $root "demo-server.log"
$serverErrLog = Join-Path $root "demo-server.err.log"
$ngrokLog = Join-Path $root "demo-ngrok.log"
$ngrokErrLog = Join-Path $root "demo-ngrok.err.log"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Stop-IfRunning($process) {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}

if (-not $env:OPENAI_API_KEY) {
  Write-Host "OPENAI_API_KEY is not set. The dashboard will work, but Realtime voice will not." -ForegroundColor Yellow
  Write-Host 'Set it first: $env:OPENAI_API_KEY="your_api_key"' -ForegroundColor Yellow
}

Write-Step "Starting DAMAC CFO Finance Co-Pilot on port $Port"
$env:PORT = "$Port"
$server = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $root -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrLog -PassThru

try {
  $healthy = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 2
      $healthy = $true
      break
    } catch {}
  }

  if (-not $healthy) {
    throw "Local server did not respond on http://localhost:$Port. See $serverLog"
  }

  Write-Host "Local URL:  http://localhost:$Port" -ForegroundColor Green
  $voiceStatus = "not configured"
  if ($health.realtimeConfigured) {
    $voiceStatus = "configured"
  }
  Write-Host "Voice API:  $voiceStatus" -ForegroundColor Green

  if ($NoNgrok) {
    Write-Host "ngrok skipped. Press Ctrl+C to stop the local server." -ForegroundColor Yellow
    while ($true) { Start-Sleep -Seconds 2 }
  }

  $ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
  if (-not $ngrokCommand) {
    Write-Host ""
    Write-Host "ngrok is not installed or not on PATH." -ForegroundColor Yellow
    Write-Host "Install it from https://ngrok.com/download, then run:" -ForegroundColor Yellow
    Write-Host "  ngrok http $Port" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the local server." -ForegroundColor Yellow
    while ($true) { Start-Sleep -Seconds 2 }
  }

  Write-Step "Starting ngrok HTTPS tunnel"
  $ngrok = Start-Process -FilePath $ngrokCommand.Source -ArgumentList "http $Port" -WorkingDirectory $root -RedirectStandardOutput $ngrokLog -RedirectStandardError $ngrokErrLog -PassThru

  $publicUrl = $null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 700
    try {
      $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
      $publicUrl = ($tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1).public_url
      if ($publicUrl) { break }
    } catch {}
  }

  if ($publicUrl) {
    Write-Host ""
    Write-Host "Boss demo URL:" -ForegroundColor Green
    Write-Host $publicUrl -ForegroundColor Green
    Write-Host ""
    Write-Host "Keep this terminal open during the demo. Press Ctrl+C to stop." -ForegroundColor Yellow
  } else {
    Write-Host "ngrok started, but no HTTPS URL was detected yet. See $ngrokLog or open http://127.0.0.1:4040" -ForegroundColor Yellow
  }

  while ($true) { Start-Sleep -Seconds 2 }
}
finally {
  Write-Step "Stopping demo processes"
  Stop-IfRunning $ngrok
  Stop-IfRunning $server
}
