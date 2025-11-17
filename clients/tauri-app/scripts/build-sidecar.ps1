# Build the Java sidecar (shadow/fat JAR) and copy it into src-tauri so Tauri can run it.
# Designed for Windows PowerShell (user's environment).
$ErrorActionPreference = 'Stop'

# Resolve repo root relative to this script (scripts is at clients/tauri-app/scripts)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$tauriRoot = Resolve-Path (Join-Path $scriptDir "..")
$repoRoot = Resolve-Path (Join-Path $tauriRoot "..\..")

Write-Host "Repo root: $repoRoot"

$javaSidecarDir = Join-Path $repoRoot "backend\java-sidecar"
if (-not (Test-Path $javaSidecarDir)) {
    Write-Error "Java sidecar directory not found: $javaSidecarDir"
    exit 1
}

Set-Location $javaSidecarDir

# Prefer wrapper on Windows
if (Test-Path "gradlew.bat") {
    Write-Host "Running gradlew.bat shadowJar"
    & .\gradlew.bat shadowJar
} else {
    Write-Host "Running gradle shadowJar"
    & gradle shadowJar
}

# Find produced jar
$jar = Get-ChildItem -Path "build\libs\ameba-sidecar*.jar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $jar) {
    Write-Error "Could not find built JAR in build/libs. Ensure Gradle built successfully."
    exit 1
}

# Destination inside the tauri src-tauri folder so tauri can reference it using the simple filename
$destJar = Join-Path $tauriRoot "src-tauri\ameba-sidecar.jar"
Write-Host "Copying $($jar.FullName) -> $destJar"
Copy-Item -Path $jar.FullName -Destination $destJar -Force

Write-Host "Sidecar build+copy complete."
