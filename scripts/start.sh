#!/bin/sh

# Ibnexp Self-Contained System Startup Script

echo "🚀 Starting Ibnexp Self-Contained System..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down Ibnexp system..."
    kill 0
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Start backend server in background
echo "🔧 Starting backend API server..."
cd /app/backend
node dist/index.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Serve frontend using a simple HTTP server
echo "🌐 Starting frontend server..."
cd /app/frontend
python3 -m http.server 4200 &
FRONTEND_PID=$!

echo "✅ Ibnexp system started successfully!"
echo "📡 Backend API: http://localhost:3000"
echo "🌍 Frontend: http://localhost:4200"
echo "💾 Database: SQLite file in /app/data/"
echo ""
echo "Press Ctrl+C to stop the system"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID