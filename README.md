# Stock Discord Bot

A professional, secure, and scalable Discord stock management bot with a modern animated web admin dashboard. Built with Node.js, Discord.js v14, SQLite, Express.js, React, TailwindCSS, and Framer Motion.

## Features

### Discord Bot Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/stop` | Safely shuts down the bot | Owner/Admin |
| `/s [service]` | Request stock from predefined services | All users |
| `/s-u [service]` | Request stock from any/custom service | All users |
| `/stock add [name]` | Create a new stock section | Admin |
| `/stock delete [name]` | Delete a stock section | Admin |
| `/stock list` | List all stock sections | Admin |
| `/stock count [service]` | Show stock count for a service | Admin |
| `/upload-stock [service]` | Upload stock from a .txt file | Admin |
| `/set-s [channel]` | Set stock command channel | Admin |
| `/set-s-logs [channel]` | Set stock logs channel | Admin |
| `/ban [@user]` | Ban a user from the bot | Admin |
| `/unban [@user]` | Unban a user | Admin |
| `/blacklist [@user]` | Blacklist from stock commands | Admin |
| `/unblacklist [@user]` | Remove from blacklist | Admin |
| `/mute [@user] [duration]` | Temporarily mute a user | Admin |
| `/unmute [@user]` | Remove mute from a user | Admin |

### Security Features

- Bot owner and admin permission checks
- User blacklist system
- Ban/unban system
- Temporary mute system (1m, 5m, 30m, 1h, 5h, 10h, 24h, 7d)
- Command cooldown system
- Duplicate stock prevention
- DM failure handling
- Anti-crash protection

### Admin Dashboard

- **React SPA** with Vite build system
- **TailwindCSS** for modern responsive styling
- **Framer Motion** for smooth animations and transitions
- **Recharts** for animated data visualizations
- **Socket.IO** for real-time live updates
- **Dark/Light mode** with smooth CSS transitions
- **Animated components** - cards, modals, toasts, skeletons, charts
- **Login authentication** with bcrypt password hashing
- **Dashboard statistics** - total stock, services, users, deliveries
- **Stock management** - view, add, delete stock entries
- **User management** - ban, unban, blacklist, mute users
- **Stock logs** - view all delivery logs with status
- **Command logs** - view command usage analytics
- **Settings** - view bot configuration and system info
- **Modern responsive UI** - works on desktop and mobile

## Project Structure

```
stock-bot/
├── commands/
│   ├── admin/          # Admin commands (set-s, set-s-logs)
│   ├── moderation/     # Moderation commands (ban, mute, etc.)
│   ├── stock/          # Stock commands (s, s-u, upload-stock, stock)
│   └── utility/        # Utility commands (stop)
├── events/             # Discord event handlers
├── handlers/           # Command and event loaders
├── stocks/             # Stock data storage (auto-created)
├── database/           # SQLite database and queries
├── logs/               # Log files (auto-created)
├── utils/              # Utilities (config, logger, embeds, helpers)
├── dashboard/
│   ├── server.js       # Express server (API + serves React build)
│   ├── routes/         # Express API routes
│   ├── middleware/     # Auth middleware
│   └── web/            # React SPA (Vite + TailwindCSS + Framer Motion)
│       ├── src/
│       │   ├── components/  # Animated UI components
│       │   ├── pages/       # Dashboard pages
│       │   ├── context/     # React contexts (theme, auth, toast)
│       │   ├── hooks/       # Custom React hooks
│       │   └── lib/         # API client
│       └── public/     # Built React output
├── index.js            # Bot entry point
├── ecosystem.config.js # PM2 configuration
├── package.json
├── .env.example
└── README.md
```

---

## Quick Install (One Command)

For **Ubuntu/Debian** or **Termux** — this does everything automatically:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/KeyElevate/stock-bot/main/install.sh)
```

Or if you prefer to clone first:

```bash
git clone https://github.com/KeyElevate/stock-bot && cd stock-bot && bash install.sh
```

The script will:
- Install Node.js 20 via nvm (if needed)
- Clone the repository
- Install all dependencies (bot + dashboard)
- Build the React dashboard
- Create `.env` from `.env.example`
- Print next steps

---

## Manual Installation

### Step 1: Prerequisites

Requires **Node.js >= 18.0.0** and **npm**:

```bash
node -v ; npm -v
```

If Node.js is missing:

```bash
# Option A: nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 20 && nvm use 20

# Option B: Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
```

Also install **git** and **curl** if missing:

```bash
# Ubuntu/Debian
sudo apt-get install -y git curl

# Termux
pkg install git curl
```

### Step 2: Clone

```bash
git clone https://github.com/KeyElevate/stock-bot
cd stock-bot
```

### Step 3: Install Bot Dependencies

```bash
npm install
```

### Step 4: Install & Build Dashboard

```bash
cd dashboard/web && npm install && npm run build && cd ../..
```

### Step 5: Configure .env

```bash
cp .env.example .env
nano .env
```

Fill in your values (see [Configuration](#configuration) below):

```env
# ===========================================
# Discord Bot Configuration
# ===========================================
DISCORD_TOKEN=your-bot-token-here
CLIENT_ID=your-client-id-here
OWNER_ID=your-discord-user-id-here,your-alt-id-here

# ===========================================
# Dashboard Configuration
# ===========================================
DASHBOARD_PORT=3000
DASHBOARD_SECRET=change-this-to-a-random-secure-string
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=change-me-secure-password

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
```

### Step 6: Create the Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Go to the **Bot** section in the left sidebar
4. Click **Reset Token** and copy the token → paste it as `DISCORD_TOKEN` in your `.env`
5. Copy the **Application ID** from the top of the page → paste it as `CLIENT_ID` in your `.env`
6. Under **Privileged Gateway Intents**, enable:
   - **Message Content Intent**
   - **Server Members Intent**
7. Go to **OAuth2 > URL Generator**:
   - Check scopes: `bot`, `applications.commands`
   - Check bot permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Manage Messages`, `Administrator`
   - Copy the generated URL at the bottom and open it in your browser to invite the bot
8. Enable **Developer Mode** in Discord (User Settings > Advanced > Developer Mode)
9. Right-click your own username in Discord and click **Copy User ID** → paste it as `OWNER_ID` in your `.env`
   - To add multiple owners, separate IDs with commas: `OWNER_ID=id1,id2,id3`

### Step 7: Run the Bot and Dashboard

```bash
# Run both bot and dashboard together
npm run start:all
```

Or run them separately:

```bash
# Terminal 1 - Bot
npm start

# Terminal 2 - Dashboard
npm run dashboard
```

### Step 8: Access the Dashboard

Open your browser to:

```
http://localhost:3000
```

(Or whatever port you set for `DASHBOARD_PORT`)

Login with the credentials from your `.env`:
- **Username:** `admin`
- **Password:** `change-me-secure-password`

> **Important:** Change the default password before deploying to production!

---

## Stock File Format

Stock files use the following format (one entry per line):

```
url:email:password
```

Example:
```
https://account.microsoft.com:user@example.com:SecurePass123
https://xbox.com:gamer@example.com:XboxPass456
https://minecraft.net:player@example.com:Minecraft789
```

Lines starting with `#` are treated as comments and ignored. Invalid lines are skipped during upload.

---

## VPS Deployment Guide

### Option 1: PM2 (Recommended)

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Install all dependencies:**
```bash
npm install
cd dashboard/web && npm install && npm run build && cd ../..
```

3. **Start both processes:**
```bash
pm2 start ecosystem.config.js
```

4. **Save PM2 process list:**
```bash
pm2 save
```

5. **Setup PM2 to start on boot:**
```bash
pm2 startup
# Run the command it outputs
```

6. **Useful PM2 commands:**
```bash
pm2 status              # View all processes
pm2 logs                # View all logs
pm2 logs stock-bot      # View bot logs only
pm2 restart all         # Restart all processes
pm2 stop all            # Stop all processes
pm2 monit               # Monitor resources
```

### Option 2: systemd

Create a service file at `/etc/systemd/system/stock-bot.service`:

```ini
[Unit]
Description=Stock Discord Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/stock-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable stock-bot
sudo systemctl start stock-bot
sudo systemctl status stock-bot
```

### Option 3: Nginx Reverse Proxy (for Dashboard)

If you want to serve the dashboard on a domain:

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.yourdomain.com
```

---

## API Endpoints

The dashboard provides a REST API (requires session authentication):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login to dashboard |
| GET | `/auth/logout` | Logout |
| GET | `/auth/check` | Check auth status |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/services` | List all stock services |
| POST | `/api/services` | Create a new service |
| GET | `/api/stock/:service` | Get stock entries for a service |
| POST | `/api/stock/:service/add` | Add stock entries |
| DELETE | `/api/stock/:service/:email` | Delete a stock entry |
| DELETE | `/api/services/:name` | Delete a service |
| GET | `/api/users` | List all users |
| POST | `/api/users/:id/ban` | Ban a user |
| POST | `/api/users/:id/unban` | Unban a user |
| POST | `/api/users/:id/blacklist` | Blacklist a user |
| POST | `/api/users/:id/unblacklist` | Unblacklist a user |
| POST | `/api/users/:id/mute` | Mute a user |
| POST | `/api/users/:id/unmute` | Unmute a user |
| GET | `/api/logs/stock` | Stock delivery logs |
| GET | `/api/logs/commands` | Command usage logs |
| GET | `/api/status` | Bot status |

---

## Security Best Practices

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Change the default dashboard password** before deploying
3. **Use a strong `DASHBOARD_SECRET`** - generate one with `openssl rand -hex 32`
4. **Use HTTPS** for the dashboard in production
5. **Keep Node.js and dependencies updated** - run `npm audit` regularly
6. **Restrict dashboard access** with firewall rules or IP whitelisting
7. **Regular backups** of the `database/` and `stocks/` directories
8. **Run as non-root user** on your VPS

---

## Backup

To backup your data:

```bash
tar -czf stock-bot-backup-$(date +%Y%m%d).tar.gz database/ stocks/ logs/ .env
```

To restore:

```bash
tar -xzf stock-bot-backup-YYYYMMDD.tar.gz
```

---

## Troubleshooting

### Bot doesn't respond to commands
- Ensure the bot has proper permissions in the server
- Check that **Message Content Intent** and **Server Members Intent** are enabled in the Developer Portal
- Verify your `DISCORD_TOKEN` is correct and not expired
- Check logs: `tail -f logs/bot.log`

### `sqlite3` fails to install
- Install build tools: `sudo apt-get install build-essential python3`
- On Termux: `pkg install binutils` (sqlite3 provides prebuilt binaries for most platforms)
- This project uses `sqlite3` (not `better-sqlite3`) specifically for compatibility with Termux, Android, and systems without native build tools

### Dashboard won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Verify `DASHBOARD_SECRET` is set in `.env`
- Make sure you built the dashboard: `cd dashboard/web && npm run build`
- Check logs: `tail -f logs/bot.log`

### Dashboard shows blank page
- Make sure the React build was completed: `ls dashboard/public/index.html`
- Rebuild: `cd dashboard/web && npm run build`
- Check browser console for errors (F12)

### Stock not delivering
- Ensure stock files are in the correct format: `url:email:password`
- Check that the user has DMs enabled from server members
- Verify the stock directory exists and has files: `ls stocks/`
- Check stock logs: `tail -f logs/stock-delivery.log`

### Commands not showing up in Discord
- Slash commands can take up to 1 hour to register globally
- Test in a server where the bot is already present
- Re-register by restarting the bot

---

## License

This project is for educational purposes. Use responsibly and in compliance with Discord's Terms of Service.
