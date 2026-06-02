@echo off
chcp 65001 >nul 2>nul
setlocal enabledelayedexpansion

echo.
echo ══════════════════════════════════════════════════════════
echo        Revolution Print Platform — Запуск
echo ══════════════════════════════════════════════════════════
echo.

REM ── Проверка Node.js ──
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js не установлен!
    echo     Скачайте с https://nodejs.org/
    goto :fail
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] Node.js %%v

REM ── Проверка зависимостей backend ──
if not exist "%~dp0backend\node_modules" (
    echo.
    echo [..] Установка npm зависимостей...
    cd /d "%~dp0backend"
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Ошибка установки зависимостей
        goto :fail
    )
    echo [OK] Зависимости установлены
    cd /d "%~dp0"
) else (
    echo [OK] Backend зависимости найдены
)

REM ── Проверка PostgreSQL ──
set "PSQL_PATH="
where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PSQL_PATH=psql"
) else (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
)

if defined PSQL_PATH (
    echo [OK] PostgreSQL найден
    REM Читаем параметры из .env
    set "DB_HOST=localhost"
    set "DB_PORT=5432"
    set "DB_USER=postgres"
    set "DB_PASSWORD=12345"
    set "DB_NAME=revolution_print"

    if exist "%~dp0backend\.env" (
        for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0backend\.env") do (
            set "line=%%a"
            if not "!line:~0,1!"=="#" (
                if "%%a"=="DB_HOST" set "DB_HOST=%%b"
                if "%%a"=="DB_PORT" set "DB_PORT=%%b"
                if "%%a"=="DB_USER" set "DB_USER=%%b"
                if "%%a"=="DB_PASSWORD" set "DB_PASSWORD=%%b"
                if "%%a"=="DB_NAME" set "DB_NAME=%%b"
            )
        )
    )

    REM Проверка/создание базы данных
    set "PGPASSWORD=!DB_PASSWORD!"
    "!PSQL_PATH!" -U !DB_USER! -h !DB_HOST! -p !DB_PORT! -tc "SELECT 1 FROM pg_database WHERE datname='!DB_NAME!'" 2>nul | findstr "1" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [..] Создание базы данных !DB_NAME!...
        "!PSQL_PATH!" -U !DB_USER! -h !DB_HOST! -p !DB_PORT! -c "CREATE DATABASE !DB_NAME!;" >nul 2>nul
        if %ERRORLEVEL% EQU 0 (
            echo [OK] База данных создана
        ) else (
            echo [!] Не удалось создать базу данных — проверьте PostgreSQL
        )
    ) else (
        echo [OK] База данных !DB_NAME! существует
    )
) else (
    echo [!] PostgreSQL не найден — убедитесь что сервис запущен
)

echo.
echo ══════════════════════════════════════════════════════════
echo  Запуск (API и веб-интерфейс на одном порту)...
echo ══════════════════════════════════════════════════════════
echo.

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3100.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)

REM ── Backend: в режиме NODE_ENV=development отдаёт и API, и статику frontend ──
echo [>>] Запуск http://localhost:3100 ...
start "Revolution Print" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul
echo.
echo [>>] Открываю браузер...
start "" "http://localhost:3100"

echo.
echo ══════════════════════════════════════════════════════════
echo  Revolution Print запущен!
echo ══════════════════════════════════════════════════════════
echo.
echo  Откройте в браузере:  http://localhost:3100
echo  (проверка API:        http://localhost:3100/health )
echo.
echo  Данные для входа:
echo    Admin:      admin@revolution.print / admin123
echo    Manager:    ivan@revolution.print / password123
echo    Production: production@revolution.print / password123
echo.
echo  Чтобы остановить — закройте окно сервера
echo ══════════════════════════════════════════════════════════
echo.
echo Нажмите любую клавишу чтобы закрыть это окно...
pause >nul
exit /b 0

:fail
echo.
echo Нажмите любую клавишу для выхода...
pause >nul
exit /b 1
