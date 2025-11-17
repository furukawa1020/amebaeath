<#
Simple development orchestrator (PowerShell)
Attempts to start the Java sidecar (gradlew / gradle / jar) and then the Node backend with USE_JAVA=true.

This script is a convenience for local development only. It runs processes in separate PowerShell jobs.
#>
$ErrorActionPreference = 'Stop'

function Start-JavaSidecar {
    $proj = Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..\java-sidecar"
    Set-Location $proj
    if (Test-Path "gradlew.bat") {
        Write-Host "Starting java sidecar with gradlew.bat run"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "gradlew.bat run" -NoNewWindow -PassThru
        return
    }
    if (Get-Command gradle -ErrorAction SilentlyContinue) {
        Write-Host "Starting java sidecar with system gradle run"
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "gradle run" -NoNewWindow -PassThru
        return
    }
    $jar = Get-ChildItem -Path "build\libs\ameba-sidecar*.jar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($jar) {
        Write-Host "Starting java sidecar from jar: $($jar.FullName)"
        Start-Process -FilePath "java" -ArgumentList "-jar`, `"$($jar.FullName)`" -NoNewWindow -PassThru
        return
    }
    Write-Host "No gradle wrapper, no gradle, and no built jar found in build/libs. Please run 'gradle shadowJar' or provide gradlew wrapper." -ForegroundColor Yellow
}

function Start-NodeBackend {
    $repoRoot = Resolve-Path (Join-Path (Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\..") "..")
    Set-Location $repoRoot
    Write-Host "Starting Node backend with USE_JAVA=true"
    $env:USE_JAVA = 'true'
    # spawn in separate window
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd backend && npm run dev" -NoNewWindow -PassThru
}

Write-Host "Starting Java sidecar (if available) and Node backend (USE_JAVA=true)"
Start-JavaSidecar
Start-NodeBackend
