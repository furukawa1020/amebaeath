# Run the Java sidecar for development. Attempts to use gradle wrapper if present, else gradle, else instructs to build jar.
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $projectRoot

if (Test-Path "gradlew.bat") {
    Write-Host "Using gradlew.bat run"
    & .\gradlew.bat run
    exit $LASTEXITCODE
}

if (Get-Command gradle -ErrorAction SilentlyContinue) {
    Write-Host "Using system gradle run"
    gradle run
    exit $LASTEXITCODE
}

Write-Host "gradlew not found and gradle not installed. To run the sidecar either:
- install Gradle or
- run the built fat JAR: java -jar build/libs/ameba-sidecar.jar
Or generate wrapper by running: gradle wrapper"
exit 1
