@echo off
if not exist "bin" mkdir bin
javac -d bin src/*.java
if %errorlevel% neq 0 (
    echo Compilation failed.
    exit /b %errorlevel%
)
java -cp bin Main
