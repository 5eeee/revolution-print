@echo off
REM Быстрый старт без установки зависимостей (используйте если уже установили npm install)

setlocal enabledelayedexpansion

echo 🚀 Запуск Revolution Print Platform...
echo.

REM Проверка Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js не установлен!
    echo.
    echo Скачайте и установите Node.js с https://nodejs.org/
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

REM Проверка наличия node_modules в backend
if not exist backend\node_modules (
    echo ❌ npm зависимости не установлены!
    echo.
    echo Запустите сначала: start-dev.bat
    echo.
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════════
echo ✨ Запуск (API + веб на порту 3100)...
echo ════════════════════════════════════════════════════════════
echo.
echo Откройте в браузере: http://localhost:3100
echo.
echo 📋 Данные для входа:
echo    Admin:  admin@revolution.print / admin123
echo.
echo Нажмите Ctrl+C в этом окне чтобы остановить сервер
echo ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0backend"
npm start

echo.
echo Приложение остановлено. Закройте это окно.
pause >nul
