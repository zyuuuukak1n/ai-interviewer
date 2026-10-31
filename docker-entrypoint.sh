#!/bin/sh
set -e

echo "=== Initializing AI Interviewer Database ==="

# 旧パス (/app/prisma/prod.db) の指定がある場合、永続化用の /app/data/prod.db に自動補正
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "file:/app/prisma/prod.db" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

echo "Using DATABASE_URL: $DATABASE_URL"

# schema.prisma を明示指定してテーブル自動作成・同期
npx prisma db push --schema=/app/prisma/schema.prisma --skip-generate

echo "=== Starting AI Interviewer Server ==="
exec npx tsx server.ts
