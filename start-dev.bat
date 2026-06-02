@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Revolution Print — Запуск
echo ============================================
echo.

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3100.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo [1/1] API и веб-интерфейс на http://localhost:3100 ...
echo       Убедитесь, что в backend\.env задано NODE_ENV=development
start "Revolution Print" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Запущено
echo ============================================
echo.
echo   Откройте:  http://localhost:3100
echo   Health:    http://localhost:3100/health
echo.
echo   Логин:     admin@revolution.print
echo   Пароль:    admin123
echo.
echo   Закройте окно сервера, чтобы остановить.
echo ============================================
echo.

start http://localhost:3100
