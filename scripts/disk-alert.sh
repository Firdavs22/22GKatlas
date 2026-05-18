#!/bin/bash
# Send Telegram alert when root disk usage exceeds threshold.
# Cron example: */15 * * * * /home/deploy/apps/globoatlas/scripts/disk-alert.sh
#
# Env required (put in ~/.disk-alert.env or directly in this file):
#   TG_BOT_TOKEN — Telegram bot token from @BotFather
#   TG_CHAT_ID   — chat ID to send alerts to
#   THRESHOLD    — disk-percent threshold (default 80)
set -euo pipefail

ENV_FILE="${ENV_FILE:-$HOME/.disk-alert.env}"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

THRESHOLD=${THRESHOLD:-80}
TG_BOT_TOKEN=${TG_BOT_TOKEN:-}
TG_CHAT_ID=${TG_CHAT_ID:-}

USAGE=$(df / | awk 'NR==2 {gsub("%","",$5); print $5}')

if [ "$USAGE" -le "$THRESHOLD" ]; then
  exit 0
fi

MSG=$(printf '⚠️ GloboAtlas\nДиск занят на %s%% (порог %s%%).\nHost: %s' "$USAGE" "$THRESHOLD" "$(hostname)")

if [ -n "$TG_BOT_TOKEN" ] && [ -n "$TG_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=${MSG}" >/dev/null
else
  # No Telegram configured — write to syslog so someone notices.
  logger -t globoatlas-disk-alert "$MSG"
fi
