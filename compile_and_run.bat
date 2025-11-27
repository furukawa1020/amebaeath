@echo off
if not exist "bin" mkdir bin
dir /s /B src\*.java > sources.txt
javac -d bin @sources.txt
if %errorlevel% neq 0 (
    echo Compilation failed.
    exit /b %errorlevel%
)
del sources.txt
java -cp bin Main
