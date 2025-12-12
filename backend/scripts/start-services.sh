#!/bin/bash
# Start all NEURO-FORCE services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   NEURO-FORCE Services Startup${NC}"
echo -e "${BLUE}========================================${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Port configuration
BACKEND_PORT=${PORT:-3000}
FACIAL_API_PORT=${FACIAL_API_PORT:-8000}

echo -e "\n${YELLOW}Port Configuration:${NC}"
echo -e "  Node.js Backend:        ${GREEN}$BACKEND_PORT${NC}"
echo -e "  Python Facial API:      ${GREEN}$FACIAL_API_PORT${NC}"

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}Error: Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

echo -e "\n${YELLOW}Checking port availability...${NC}"

if ! check_port $BACKEND_PORT; then
    echo -e "${RED}Please stop the service on port $BACKEND_PORT first${NC}"
    exit 1
fi

if ! check_port $FACIAL_API_PORT; then
    echo -e "${RED}Please stop the service on port $FACIAL_API_PORT first${NC}"
    exit 1
fi

echo -e "${GREEN}All ports available!${NC}"

# Start Python Facial Recognition API
echo -e "\n${YELLOW}Starting Python Facial Recognition API...${NC}"
cd facial-attendance
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
uvicorn app:app --host 0.0.0.0 --port $FACIAL_API_PORT &
FACIAL_PID=$!
cd ..

# Wait for facial API to start
sleep 3

# Check if facial API is running
if curl -s http://localhost:$FACIAL_API_PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Facial Recognition API started on port $FACIAL_API_PORT${NC}"
else
    echo -e "${YELLOW}⚠ Facial Recognition API may still be starting...${NC}"
fi

# Start Node.js Backend
echo -e "\n${YELLOW}Starting Node.js Backend...${NC}"
node index.js &
NODE_PID=$!

# Wait for backend to start
sleep 2

# Check if backend is running
if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js Backend started on port $BACKEND_PORT${NC}"
else
    echo -e "${YELLOW}⚠ Node.js Backend may still be starting...${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Services Started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${YELLOW}Endpoints:${NC}"
echo -e "  Health Check:    http://localhost:$BACKEND_PORT/health"
echo -e "  API Base:        http://localhost:$BACKEND_PORT/api/"
echo -e "  Facial API:      http://localhost:$BACKEND_PORT/api/facial/ (proxied)"
echo -e "  Direct Facial:   http://localhost:$FACIAL_API_PORT/"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Trap Ctrl+C to cleanup
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $FACIAL_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait

