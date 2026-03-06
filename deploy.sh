#!/usr/bin/env bash
# ==============================================================
# deploy.sh — Автоматическое развёртывание Revolution Print
# ==============================================================
# Запуск:
#   chmod +x deploy.sh
#   ./deploy.sh            — полная установка (первый раз)
#   ./deploy.sh update     — обновление кода + перезапуск
#   ./deploy.sh backup     — резервная копия БД
#   ./deploy.sh logs       — вывод логов
#   ./deploy.sh status     — состояние контейнеров
#   ./deploy.sh stop       — остановка
#   ./deploy.sh seed       — заполнение тестовыми данными
#   ./deploy.sh ssl        — получить SSL через Let's Encrypt
# ==============================================================

set -euo pipefail

# ---- Цвета ----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ---- Пути ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.production"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file $ENV_FILE"
BACKUP_DIR="./backups"

# ==============================================================
# Проверки
# ==============================================================
check_deps() {
    command -v docker   >/dev/null 2>&1 || error "Docker не установлен. Установите: https://docs.docker.com/engine/install/"
    docker compose version >/dev/null 2>&1 || error "Docker Compose v2 не найден."
    info "Docker $(docker --version | awk '{print $3}')"
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        warn "Файл $ENV_FILE не найден. Создаю из шаблона..."
        cp .env.production.example "$ENV_FILE"
        warn "Отредактируйте $ENV_FILE и запустите скрипт заново."
        exit 0
    fi

    # Проверяем обязательные переменные
    source "$ENV_FILE"
    [ -z "${DB_PASSWORD:-}" ]  && error "DB_PASSWORD не задан в $ENV_FILE"
    [ -z "${JWT_SECRET:-}" ]   && error "JWT_SECRET не задан в $ENV_FILE"
    [ -z "${DOMAIN:-}" ]       && warn  "DOMAIN не задан — будет использован localhost"
}

# ==============================================================
# Команды
# ==============================================================

cmd_install() {
    info "===== Полная установка Revolution Print ====="
    check_deps
    check_env

    # Убедимся, что директории существуют
    mkdir -p nginx/ssl "$BACKUP_DIR" backend/uploads

    # Если SSL-сертификатов нет, создадим самоподписанный для старта
    if [ ! -f nginx/ssl/fullchain.pem ]; then
        warn "SSL-сертификат не найден. Создаю самоподписанный..."
        openssl req -x509 -nodes -days 365 \
            -newkey rsa:2048 \
            -keyout nginx/ssl/privkey.pem \
            -out    nginx/ssl/fullchain.pem \
            -subj "/CN=${DOMAIN:-localhost}" \
            2>/dev/null
        info "Самоподписанный сертификат создан. Для prod используйте ./deploy.sh ssl"
    fi

    # Подставляем домен в nginx.conf
    if [ -n "${DOMAIN:-}" ] && [ "$DOMAIN" != "print.example.com" ]; then
        sed -i "s/print\.example\.com/${DOMAIN}/g" nginx/nginx.conf
        info "Домен $DOMAIN подставлен в nginx.conf"
    fi

    info "Сборка и запуск контейнеров..."
    $COMPOSE build --no-cache
    $COMPOSE up -d

    info "Ожидаю готовности backend..."
    for i in $(seq 1 30); do
        if $COMPOSE exec -T backend node -e "require('http').get('http://localhost:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)})" 2>/dev/null; then
            break
        fi
        sleep 2
    done

    info "===== Развёртывание завершено! ====="
    echo ""
    echo "  Сайт:   https://${DOMAIN:-localhost}"
    echo "  API:    https://${DOMAIN:-localhost}/api"
    echo ""
    echo "  Логи:   ./deploy.sh logs"
    echo "  Статус: ./deploy.sh status"
    echo "  Бэкап:  ./deploy.sh backup"
    echo ""
    warn "Не забудьте запустить seed при первом развёртывании: ./deploy.sh seed"
}

cmd_update() {
    info "===== Обновление Revolution Print ====="
    check_deps
    check_env

    # Обновляем код (если git)
    if [ -d .git ]; then
        info "Получаю обновления из git..."
        git pull --ff-only
    fi

    info "Пересборка backend..."
    $COMPOSE build backend

    info "Перезапуск..."
    $COMPOSE up -d --force-recreate backend nginx

    info "===== Обновление завершено ====="
}

cmd_backup() {
    info "===== Резервная копия БД ====="
    check_deps
    mkdir -p "$BACKUP_DIR"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/revolution_print_${TIMESTAMP}.sql.gz"

    source "$ENV_FILE"
    $COMPOSE exec -T postgres pg_dump \
        -U "${DB_USER:-rev_prod}" \
        "${DB_NAME:-revolution_print}" \
        | gzip > "$BACKUP_FILE"

    SIZE=$(du -sh "$BACKUP_FILE" | awk '{print $1}')
    info "Бэкап сохранён: $BACKUP_FILE ($SIZE)"

    # Удаляем старые бэкапы (>14 дней)
    KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
    info "Старые бэкапы (>$KEEP_DAYS дней) удалены."
}

cmd_logs() {
    check_deps
    $COMPOSE logs -f --tail=100
}

cmd_status() {
    check_deps
    $COMPOSE ps
    echo ""
    info "Использование ресурсов:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        rp_db rp_api rp_web 2>/dev/null || true
}

cmd_stop() {
    info "Остановка контейнеров..."
    check_deps
    $COMPOSE down
    info "Контейнеры остановлены."
}

cmd_seed() {
    info "Заполнение БД тестовыми данными..."
    check_deps
    $COMPOSE exec backend node seed.js
    info "Seed завершён."
}

cmd_ssl() {
    info "===== Получение SSL-сертификата (Let's Encrypt) ====="
    check_deps
    source "$ENV_FILE"
    [ -z "${DOMAIN:-}" ] && error "DOMAIN не задан в $ENV_FILE"

    # Временно отключаем SSL в nginx и каждый раз перезапускаем
    info "Получаю сертификат для $DOMAIN..."
    docker run --rm \
        -v "$SCRIPT_DIR/nginx/ssl:/etc/letsencrypt/live/$DOMAIN" \
        -v "$SCRIPT_DIR/frontend:/usr/share/nginx/html" \
        -p 80:80 \
        certbot/certbot certonly \
            --standalone \
            --agree-tos \
            --no-eff-email \
            --email "admin@$DOMAIN" \
            -d "$DOMAIN"

    info "Сертификат получен. Перезапускаю nginx..."
    $COMPOSE restart nginx
    info "SSL настроен для $DOMAIN"
}

# ==============================================================
# Точка входа
# ==============================================================
ACTION="${1:-install}"

case "$ACTION" in
    install) cmd_install ;;
    update)  cmd_update  ;;
    backup)  cmd_backup  ;;
    logs)    cmd_logs    ;;
    status)  cmd_status  ;;
    stop)    cmd_stop    ;;
    seed)    cmd_seed    ;;
    ssl)     cmd_ssl     ;;
    *)
        echo "Использование: $0 {install|update|backup|logs|status|stop|seed|ssl}"
        exit 1
        ;;
esac
