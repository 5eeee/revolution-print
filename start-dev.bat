@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Revolution Print — Запуск
echo ============================================
echo.

:: Убиваем старые процессы на портах
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3100.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo [1/2] Запуск backend (порт 3100)...
start "Revolution Print Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Запуск frontend (порт 8080)...
start "Revolution Print Frontend" cmd /k "cd /d "%~dp0frontend" && npx http-server -p 8080 -c-1"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Серверы запущены!
echo ============================================
echo.
echo   Frontend:  http://localhost:8080
echo   Backend:   http://localhost:3100
echo.
echo   Логин:     admin@revolution.print
echo   Пароль:    admin123
echo.
echo   Закройте окна терминалов чтобы остановить.
echo ============================================
echo.

:: Открываем браузер
start http://localhost:8080