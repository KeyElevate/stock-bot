#!/usr/bin/env bash
set -e

# ============================================================
# Stock Bot - One-Command Auto Installer
# Supports: Ubuntu/Debian, Termux
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

p() {
  printf "$1\n"
}

p "${CYAN}${BOLD}========================================"
p "${CYAN}${BOLD}  Stock Bot - Auto Installer"
p "${CYAN}${BOLD}========================================"
p ""

p "${BOLD}Step 1: Checking prerequisites...${NC}"

detect_os() {
  if command -v termux-setup-storage &>/dev/null; then
    p "termux"
  elif [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian) p "debian" ;;
      *) p "$ID" ;;
    esac
  else
    p "unknown"
  fi
}

OS=$(detect_os)

DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"

MISSING=""

check_cmd() {
  if command -v "$1" &>/dev/null; then
    p "  ${GREEN}✓${NC} $1 already installed"
  else
    p "  ${RED}✗${NC} $1 not found"
    MISSING="$MISSING $1"
  fi
}

check_cmd git
check_cmd curl

FORCE_NODE20=false
if command -v node &>/dev/null; then
  NODE_FULL=$(node -v)
  NODE_MAJOR=$(echo "$NODE_FULL" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" = "20" ]; then
    p "  ${GREEN}✓${NC} Node.js $NODE_FULL detected"
  else
    p "  ${YELLOW}⚠ Node.js $NODE_FULL detected — forcing Node.js 20${NC}"
    FORCE_NODE20=true
  fi
else
  FORCE_NODE20=true
fi

if command -v npm &>/dev/null; then
  p "  ${GREEN}✓${NC} npm $(npm -v) already installed"
fi

if [ "$FORCE_NODE20" = true ]; then
  p ""
  p "  ${CYAN}→${NC} Installing Node.js 20 via nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
  p "  ${GREEN}✓${NC} Node.js $(node -v) active"
fi

if [ -n "$MISSING" ]; then
  p ""
  p "  ${CYAN}→${NC} Installing missing packages..."
  case "$OS" in
    debian)
      sudo apt-get update && sudo apt-get install -y $MISSING
      ;;
    termux)
      pkg update && pkg install -y $MISSING
      ;;
    *)
      p "  ${YELLOW}⚠ Please install missing packages manually: $MISSING${NC}"
      ;;
  esac
  p "  ${GREEN}✓${NC} Missing packages installed"
fi

p "  ${GREEN}✓${NC} Prerequisites ready"
p ""

# --------------------------------------------------
# STEP 2 — Clone Bot Files
# --------------------------------------------------
p "${BOLD}Step 2: Checking bot files...${NC}"

REPO_URL="https://github.com/KeyElevate/stock-bot"

if [ -f "package.json" ] && [ -f "index.js" ]; then
  p "  ${GREEN}✓${NC} Bot files already exist"
elif [ -d "stock-bot" ]; then
  cd stock-bot
  if [ -f "package.json" ] && [ -f "index.js" ]; then
    p "  ${GREEN}✓${NC} Bot files already exist"
  else
    p "  ${RED}✗${NC} Directory 'stock-bot' exists but is incomplete. Please remove it and re-run."
    exit 1
  fi
else
  p "  ${CYAN}→${NC} Cloning repository..."
  git clone "$REPO_URL" stock-bot
  cd stock-bot
  p "  ${GREEN}✓${NC} Bot files downloaded"
fi
p ""

# --------------------------------------------------
# STEP 3 — Install Main Dependencies
# --------------------------------------------------
p "${BOLD}Step 3: Installing bot dependencies...${NC}"

if [ -d "node_modules" ] || [ -f "package-lock.json" ]; then
  p "  ${CYAN}→${NC} Cleaning previous install..."
  rm -rf node_modules package-lock.json
  p "  ${GREEN}✓${NC} Cleaned"
fi

npm install --omit=dev
p "  ${GREEN}✓${NC} Bot dependencies installed"
p ""

# --------------------------------------------------
# STEP 4 — Install Dashboard Dependencies & Build
# --------------------------------------------------
p "${BOLD}Step 4: Setting up dashboard...${NC}"

cd dashboard/web
if [ -d "node_modules" ] || [ -f "package-lock.json" ]; then
  p "  ${CYAN}→${NC} Cleaning previous dashboard install..."
  rm -rf node_modules package-lock.json
fi
npm install
npm run build
cd ../..

p "  ${GREEN}✓${NC} Dashboard built"
p ""

# --------------------------------------------------
# STEP 5 — Environment Configuration
# --------------------------------------------------
p "${BOLD}Step 5: Configure .env file${NC}"

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ -f "$ENV_FILE" ]; then
  p "  ${YELLOW}⚠ .env already exists — skipping${NC}"
else
  p "  ${CYAN}→${NC} Creating .env from .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  RANDOM_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "")

  p ""
  p "  ${CYAN}→${NC} Let's set up your configuration."
  p ""

  read -p "    Discord Bot Token (required): " DISCORD_TOKEN
  while [ -z "$DISCORD_TOKEN" ]; do
    p "  ${RED}✗${NC} Token cannot be empty."
    read -p "    Discord Bot Token (required): " DISCORD_TOKEN
  done

  read -p "    Discord Client ID (required): " CLIENT_ID
  while [ -z "$CLIENT_ID" ]; do
    p "  ${RED}✗${NC} Client ID cannot be empty."
    read -p "    Discord Client ID (required): " CLIENT_ID
  done

  read -p "    Owner ID(s) — comma-separated for multiple (required): " OWNER_ID
  while [ -z "$OWNER_ID" ]; do
    p "  ${RED}✗${NC} Owner ID cannot be empty."
    read -p "    Owner ID(s) (required): " OWNER_ID
  done

  read -p "    Dashboard port [3000]: " DASHBOARD_PORT
  DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"

  read -p "    Dashboard username [admin]: " DASHBOARD_USERNAME
  DASHBOARD_USERNAME=${DASHBOARD_USERNAME:-admin}

  read -p "    Dashboard password (required): " DASHBOARD_PASSWORD
  while [ -z "$DASHBOARD_PASSWORD" ]; do
    p "  ${RED}✗${NC} Password cannot be empty."
    read -p "    Dashboard password (required): " DASHBOARD_PASSWORD
  done

  read -p "    Dashboard secret (leave empty to auto-generate): " DASHBOARD_SECRET

  p "  ${CYAN}→${NC} Writing configuration..."

  cat > "$ENV_FILE" << EOF
# ===========================================
# Discord Bot Configuration
# ===========================================
DISCORD_TOKEN=$DISCORD_TOKEN
CLIENT_ID=$CLIENT_ID
OWNER_ID=$OWNER_ID

# ===========================================
# Dashboard Configuration
# ===========================================
DASHBOARD_PORT=$DASHBOARD_PORT
DASHBOARD_SECRET=${DASHBOARD_SECRET:-$RANDOM_SECRET}
DASHBOARD_USERNAME=$DASHBOARD_USERNAME
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD

# ===========================================
# Bot Settings
# ===========================================
DEFAULT_COOLDOWN=5
STOCK_DELIVERY_DELAY=3500
MAX_STOCK_PER_UPLOAD=500

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=info
EOF

  p "  ${GREEN}✓${NC} Environment configured"
  p ""
  p "  ${YELLOW}⚠ This is your only chance to see the generated secret.${NC}"
  p "  ${YELLOW}   DASHBOARD_SECRET=${DASHBOARD_SECRET:-$RANDOM_SECRET}${NC}"
  p ""
fi

# --------------------------------------------------
# FINAL SUCCESS MESSAGE
# --------------------------------------------------
p ""
p "${GREEN}${BOLD}============================================"
p "${GREEN}${BOLD}         STOCK BOT INSTALLED"
p "${GREEN}${BOLD}============================================"
p ""
p "  ${GREEN}✓${NC} Installation completed successfully"
p ""
p "  ${BOLD}Run everything:${NC}"
p "    ${CYAN}npm run start:all${NC}"
p ""
p "  ${BOLD}Bot only:${NC}"
p "    ${CYAN}npm start${NC}"
p ""
p "  ${BOLD}Dashboard only:${NC}"
p "    ${CYAN}npm run dashboard${NC}"
p ""
p "  ${CYAN}→${NC} Dashboard will be available at: ${BOLD}http://localhost:$DASHBOARD_PORT${NC}"
p ""
p "  ${YELLOW}⚠ Make sure you invited the bot to your server using the OAuth2 URL${NC}"
p "  ${YELLOW}   from the Discord Developer Portal.${NC}"
p ""
