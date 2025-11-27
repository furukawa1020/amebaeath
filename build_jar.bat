@echo off
if not exist "bin" mkdir bin
echo Compiling...
javac -d bin src/*.java
if %errorlevel% neq 0 (
    echo Compilation failed.
    pause
    exit /b %errorlevel%
)

echo Creating JAR...
jar cfm AmebaEarth.jar manifest.txt -C bin .

echo Done! AmebaEarth.jar created.
pause
