param(
    [string]$GradleVersion = "8.4.1"
)

$cwd = Split-Path -Parent $MyInvocation.MyCommand.Definition
$candidateVersions = @($GradleVersion, "8.6", "8.5.1", "8.4.2", "8.3.3", "7.6")
$tmp = Join-Path $env:TEMP ("gradle-wrapper-$GradleVersion")
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp "gradle.zip"

$downloaded = $false
foreach ($v in $candidateVersions) {
    $dist = "https://services.gradle.org/distributions/gradle-$v-bin.zip"
    Write-Host "Trying download: $dist"
    try {
        Invoke-WebRequest -Uri $dist -OutFile $zip -UseBasicParsing -ErrorAction Stop
        Write-Host "Downloaded Gradle $v"
        $downloaded = $true
        break
    } catch {
        Write-Host ("Failed to download Gradle " + $v + ": " + $_.ToString())
        Start-Sleep -Seconds 1
    }
}
if (-not $downloaded) {
    Write-Error "Could not download any Gradle distribution from candidates: $candidateVersions"
    exit 1
}

Write-Host "Extracting archive..."
Expand-Archive -Path $zip -DestinationPath $tmp -Force

$extracted = Join-Path $tmp ("gradle-$GradleVersion")
$wrapperJar = Join-Path $extracted "lib\gradle-wrapper.jar"
if (-Not (Test-Path $wrapperJar)) {
    Write-Error "Could not find gradle-wrapper.jar at $wrapperJar. Extraction layout may differ for this Gradle version."
    exit 1
}

$gwDir = Join-Path $cwd "gradle\wrapper"
New-Item -ItemType Directory -Path $gwDir -Force | Out-Null
Copy-Item $wrapperJar -Destination (Join-Path $gwDir "gradle-wrapper.jar") -Force

$props = @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip
"@
Set-Content -Path (Join-Path $gwDir "gradle-wrapper.properties") -Value $props -Encoding UTF8

# Create simple gradlew and gradlew.bat that run the wrapper jar
$gradlew = @'
#!/usr/bin/env sh
DIR="$(cd "$(dirname "$0")" && pwd)"
java -jar "$DIR/gradle/wrapper/gradle-wrapper.jar" "$@"
'@
Set-Content -Path (Join-Path $cwd "gradlew") -Value $gradlew -Encoding UTF8
# Make it executable (best-effort on Windows)
try { icacls (Join-Path $cwd "gradlew") /grant "Users:(RX)" | Out-Null } catch { }

$gradlewBat = @'
@echo off
setlocal
set DIRNAME=%~dp0
java -jar "%DIRNAME%gradle\wrapper\gradle-wrapper.jar" %*
endlocal
'@
Set-Content -Path (Join-Path $cwd "gradlew.bat") -Value $gradlewBat -Encoding UTF8

# Run build
Push-Location $cwd
Write-Host "Running gradlew shadowJar (this may take a while)..."
$proc = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "shadowJar" -NoNewWindow -Wait -PassThru
$exit = $proc.ExitCode
Pop-Location
if ($exit -ne 0) { Write-Error "Build failed with exit code $exit"; exit $exit }

Write-Host "Build succeeded. JARs in build\libs:\n"
Get-ChildItem -Path (Join-Path $cwd "build\libs") -Filter *.jar | ForEach-Object { Write-Host $_.FullName }

# Optional: copy into clients/tauri-app/src-tauri if that path exists
$tauriDestDir = Join-Path $cwd "..\..\clients\tauri-app\src-tauri"
if (Test-Path $tauriDestDir) {
    Write-Host "Copying JAR to Tauri src-tauri..."
    Copy-Item -Path (Join-Path $cwd "build\libs\*.jar") -Destination (Join-Path $tauriDestDir "ameba-sidecar.jar") -Force
    Write-Host "Copied to: " (Join-Path $tauriDestDir "ameba-sidecar.jar")
}
