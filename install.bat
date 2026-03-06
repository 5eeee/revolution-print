@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================
echo   Revolution Print — Установка на сервер
echo ============================================
echo.
echo   Этот скрипт установит всё необходимое
echo   для запуска проекта на новом компьютере.
echo.
echo ============================================
echo.

:: Проверка Node.js
echo [1/6] Проверка Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ОШИБКА] Node.js не установлен!
    echo.
    echo Скачайте и установите Node.js LTS:
    echo   https://nodejs.org/
    echo.
    echo После установки запустите этот скрипт заново.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo       Node.js %%v — OK

:: Проверка PostgreSQL
echo.
echo [2/6] Проверка PostgreSQL...
psql --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ОШИБКА] PostgreSQL не установлен или psql не в PATH!
    echo.
    echo Скачайте и установите PostgreSQL 15+:
    echo   https://www.postgresql.org/download/
    echo.
    echo Убедитесь что папка bin PostgreSQL добавлена в PATH:
    echo   Обычно: C:\Program Files\PostgreSQL\15\bin
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('psql --version') do echo       %%v — OK

:: Создание .env если нет
echo.
echo [3/6] Настройка конфигурации...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo       Создание .env из шаблона...
        (
            echo # База данных
            echo DB_HOST=localhost
            echo DB_PORT=5432
            echo DB_USER=postgres
            echo DB_PASSWORD=06071967
            echo DB_NAME=revolution_print
            echo.
            echo # JWT
            echo JWT_SECRET=CHANGE_THIS_TO_RANDOM_SECRET_KEY
            echo JWT_EXPIRES_IN=7d
            echo.
            echo # Сервер
            echo PORT=3100
            echo NODE_ENV=production
            echo.
            echo # CORS
            echo CORS_ORIGIN=http://localhost:8080
            echo.
            echo # Файлы
            echo UPLOAD_DIR=./uploads
            echo MAX_FILE_SIZE=75000000
        ) > "backend\.env"
    )
    echo       .env создан — ОТРЕДАКТИРУЙТЕ пароль БД в backend\.env!
) else (
    echo       .env уже существует — OK
)

:: Установка зависимостей
echo.
echo [4/6] Установка зависимостей backend...
cd backend
call npm install --production
cd ..
echo       Зависимости установлены

:: Создание базы данных
echo.
echo [5/6] Создание базы данных...

:: Читаем пароль из .env
set DB_PASSWORD=postgres
for /f "tokens=1,* delims==" %%a in ('findstr "DB_PASSWORD" "backend\.env"') do set DB_PASSWORD=%%b

set DB_USER=postgres
for /f "tokens=1,* delims==" %%a in ('findstr "DB_USER" "backend\.env"') do set DB_USER=%%b

set DB_NAME=revolution_print
for /f "tokens=1,* delims==" %%a in ('findstr "DB_NAME" "backend\.env"') do set DB_NAME=%%b

set DB_HOST=localhost
for /f "tokens=1,* delims==" %%a in ('findstr "DB_HOST" "backend\.env"') do set DB_HOST=%%b

set DB_PORT=5432
for /f "tokens=1,* delims==" %%a in ('findstr "DB_PORT" "backend\.env"') do set DB_PORT=%%b

set PGPASSWORD=%DB_PASSWORD%

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -tc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" 2>nul | findstr /C:"1" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% 2>nul
    if %ERRORLEVEL% neq 0 (
        echo       [ПРЕДУПРЕЖДЕНИЕ] Не удалось создать БД автоматически.
        echo       Создайте вручную: createdb -U postgres revolution_print
    ) else (
        echo       База %DB_NAME% создана
    )
) else (
    echo       База %DB_NAME% уже существует — OK
)

:: Проверяем есть ли бэкап для восстановления
echo.
echo [6/6] Инициализация данных...
set HAS_BACKUP=0
for /f "delims=" %%f in ('dir /b /o-d "backups\revolution_print_*.sql" 2^>nul') do (
    if not defined DUMP_FILE (
        set DUMP_FILE=backups\%%f
        set HAS_BACKUP=1
    )
)

if %HAS_BACKUP%==1 (
    echo       Найден бэкап: %DUMP_FILE%
    echo.
    set /p RESTORE_CHOICE="       Восстановить данные из бэкапа? (y/n): "
    if /i "!RESTORE_CHOICE!"=="y" (
        echo       Восстановление данных...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%DUMP_FILE%" >nul 2>&1
        echo       Данные восстановлены из бэкапа
        
        :: Восстановить файлы
        if exist "backups\uploads" (
            if not exist "backend\uploads" mkdir "backend\uploads"
            xcopy /E /Y /Q "backups\uploads\*" "backend\uploads\" >nul 2>&1
            echo       Загруженные файлы восстановлены
        )
    ) else (
        echo       Бэкап пропущен. Админ будет создан автоматически при первом запуске.
    )
) else (
    echo       Бэкап не найден. Админ будет создан автоматически при первом запуске.
    echo       Для тестовых данных выполните: cd backend ^&^& node seed.js
)

:: Создание папки uploads
if not exist "backend\uploads" mkdir "backend\uploads"

set PGPASSWORD=

echo.
echo ============================================
echo   Установка завершена!
echo ============================================
echo.
echo   Запуск:
echo     start-dev.bat     — запустить backend + frontend
echo.
echo   Или вручную:
echo     cd backend ^& node server.js
echo     cd frontend ^& npx http-server -p 8080 -c-1
echo.
echo   Откройте: http://localhost:8080
echo.
echo   Логин:    admin@revolution.print
echo   Пароль:   admin123
echo.
echo ============================================
echo.
pause