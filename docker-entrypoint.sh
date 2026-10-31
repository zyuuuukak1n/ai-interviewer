#!/bin/sh
set -e

echo "=== Initializing AI Interviewer Database ==="
npx prisma db push --skip-generate

echo "=== Starting AI Interviewer Server ==="
exec npx tsx server.ts

