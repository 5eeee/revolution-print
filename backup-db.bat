@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Revolution Print — Бэкап базы данных
echo ============================================
echo.

:: Читаем настройки из .env
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=revolution_print

:: Папка для бэкапов
if not exist "backups" mkdir backups

:: Имя файла с датой и временем
for /f "tokens=1-3 delims=." %%a in ("%date%") do set DDATE=%%c-%%b-%%a
for /f "tokens=1-2 delims=:" %%a in ("%time: =0%") do set TTIME=%%a-%%b
set FILENAME=backups\revolution_print_%DDATE%_%TTIME%.sql

echo [1/3] Создание дампа базы данных...
echo       Хост: %DB_HOST%:%DB_PORT%
echo       База: %DB_NAME%
echo       Файл: %FILENAME%
echo.

:: pg_dump с полным дампом (схема + данные)
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --no-owner --no-privileges --clean --if-exists -F p -f "%FILENAME%"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ОШИБКА] Не удалось создать дамп базы данных!
    echo.
    echo Проверьте:
    echo   1. PostgreSQL запущен
    echo   2. pg_dump доступен в PATH
    echo   3. Пароль правильный (введите при запросе)
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Копирование загруженных файлов...
if exist "backend\uploads" (
    if not exist "backups\uploads" mkdir "backups\uploads"
    xcopy /E /Y /Q "backend\uploads\*" "backups\uploads\" >nul 2>&1
    echo       Файлы скопированы в backups\uploads\
) else (
    echo       Папка uploads пуста или не существует
)

echo.
echo [3/3] Создание архива...
:: Проверяем размер дампа
for %%A in ("%FILENAME%") do set SIZE=%%~zA
echo       Размер дампа: %SIZE% байт

echo.
echo ============================================
echo   Бэкап успешно создан!
echo ============================================
echo.
echo   Дамп БД:    %FILENAME%
echo   Файлы:      backups\uploads\
echo.
echo   Для переноса на другой ПК скопируйте:
echo     1. Всю папку "revolution print"
echo     2. Или только: backups\ + backend\ + frontend\
echo.
echo   На новом ПК запустите: install.bat
echo ============================================
echo.
pause