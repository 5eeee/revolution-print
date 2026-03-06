@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Revolution Print — Восстановление БД
echo ============================================
echo.

set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=revolution_print

:: Читаем пароль из .env
set DB_PASSWORD=postgres
for /f "tokens=1,* delims==" %%a in ('findstr "DB_PASSWORD" "backend\.env"') do set DB_PASSWORD=%%b
set PGPASSWORD=%DB_PASSWORD%

:: Поиск последнего бэкапа
set DUMP_FILE=
for /f "delims=" %%f in ('dir /b /o-d "backups\revolution_print_*.sql" 2^>nul') do (
    if not defined DUMP_FILE set DUMP_FILE=backups\%%f
)

if not defined DUMP_FILE (
    echo [ОШИБКА] Файл дампа не найден в папке backups\
    echo Поместите .sql файл в папку backups\ и попробуйте снова
    echo.
    pause
    exit /b 1
)

echo   Файл дампа: %DUMP_FILE%
echo   Хост:       %DB_HOST%:%DB_PORT%
echo   База:       %DB_NAME%
echo.

:: Создание базы если не существует
echo [1/4] Создание базы данных (если не существует)...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -tc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" | findstr /C:"1" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
    echo       База %DB_NAME% создана
) else (
    echo       База %DB_NAME% уже существует
)

echo.
echo [2/4] Восстановление данных из дампа...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%DUMP_FILE%" >nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Были ошибки при восстановлении (возможно, часть таблиц уже существует)
) else (
    echo       Данные восстановлены
)

echo.
echo [3/4] Восстановление загруженных файлов...
if exist "backups\uploads" (
    if not exist "backend\uploads" mkdir "backend\uploads"
    xcopy /E /Y /Q "backups\uploads\*" "backend\uploads\" >nul 2>&1
    echo       Файлы восстановлены в backend\uploads\
) else (
    echo       Папка backups\uploads\ не найдена, пропуск
)

echo.
echo [4/4] Синхронизация схемы через Sequelize...
cd backend
node -e "const seq = require('./models').sequelize; seq.sync({alter:true}).then(()=>{console.log('       Схема синхронизирована'); process.exit(0)}).catch(e=>{console.error('       Ошибка:', e.message); process.exit(1)})"
cd ..

echo.
echo ============================================
echo   Восстановление завершено!
echo ============================================
echo.
echo   Запустите сервер: start-dev.bat
echo ============================================
echo.
set PGPASSWORD=06071967
pause