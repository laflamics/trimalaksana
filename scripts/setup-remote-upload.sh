#!/bin/bash

# Script helper untuk setup remote upload ke PC utama
# Usage: source scripts/setup-remote-upload.sh

echo "🔧 Setup Remote Upload ke PC Utama"
echo "===================================="
echo ""

# Default values
DEFAULT_HOST="server-tljp.tail75a421.ts.net"
DEFAULT_USER="sepuloh"
DEFAULT_PATH="D:/trimalaksana/apps/PT.Trima Laksana Jaya Pratama/docker/data/update"

# Prompt untuk input
read -p "Server hostname (default: $DEFAULT_HOST): " SERVER_HOST
SERVER_HOST=${SERVER_HOST:-$DEFAULT_HOST}

read -p "Username di PC utama (default: $DEFAULT_USER): " SERVER_USER
SERVER_USER=${SERVER_USER:-$DEFAULT_USER}

read -p "Path ke docker/data di PC utama (default: $DEFAULT_PATH): " SERVER_PATH
SERVER_PATH=${SERVER_PATH:-$DEFAULT_PATH}

# Set environment variables
export UPDATE_SERVER_METHOD=scp
export UPDATE_SERVER_HOST="$SERVER_HOST"
export UPDATE_SERVER_USER="$SERVER_USER"
export UPDATE_SERVER_PATH="$SERVER_PATH"

echo ""
echo "✅ Environment variables sudah di-set:"
echo "   UPDATE_SERVER_METHOD=$UPDATE_SERVER_METHOD"
echo "   UPDATE_SERVER_HOST=$UPDATE_SERVER_HOST"
echo "   UPDATE_SERVER_USER=$UPDATE_SERVER_USER"
echo "   UPDATE_SERVER_PATH=$UPDATE_SERVER_PATH"
echo ""
echo "💡 Untuk permanent, tambahkan ke ~/.bashrc:"
echo "   export UPDATE_SERVER_METHOD=scp"
echo "   export UPDATE_SERVER_HOST=$SERVER_HOST"
echo "   export UPDATE_SERVER_USER=$SERVER_USER"
echo "   export UPDATE_SERVER_PATH=$SERVER_PATH"
echo ""
echo "🚀 Sekarang bisa run: npm run build:app"
echo ""
