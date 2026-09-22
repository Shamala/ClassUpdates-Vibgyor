#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting VIBGYOR Class Updates Portal"
echo "=========================================================="

# Check virtual environment
if [ -d "venv" ]; then
    PYTHON_BIN="venv/bin/python"
else
    PYTHON_BIN="python3"
fi

# Load port from .env if present
PORT=8000
if [ -f ".env" ]; then
    PORT_VAL=$(grep -E '^PORT=' .env | cut -d '=' -f2 | tr -d ' ' | tr -d '\r')
    if [ -n "$PORT_VAL" ]; then
        PORT="$PORT_VAL"
    fi
fi

echo "Initializing database and seeding latest updates..."
$PYTHON_BIN -m backend.database

echo ""
echo "🚀 Class Updates Portal is running at:"
echo "   http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to terminate."

$PYTHON_BIN -m backend.main "$PORT"
