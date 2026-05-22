const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const config = require('../utils/config');
const { logger } = require('../utils/logger');
const apiRoutes = require('./routes/api');
const { isAuthenticated } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: config.dashboard.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Serve React build (static files)
const reactDist = path.join(__dirname, 'public');
app.use(express.static(reactDist));

// Auth routes (JSON API)
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = process.env.DASHBOARD_PASSWORD_HASH || bcrypt.hashSync(config.dashboard.password, 10);

  if (
    username === config.dashboard.username &&
    bcrypt.compareSync(password, hashedPassword)
  ) {
    req.session.authenticated = true;
    req.session.username = username;
    logger.info(`Dashboard login: ${username}`);
    return res.json({ success: true });
  }

  logger.warn(`Failed dashboard login attempt: ${username}`);
  return res.status(401).json({ error: 'Invalid username or password' });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) logger.error(`Session destroy error: ${err.message}`);
    res.json({ success: true });
  });
});

app.get('/auth/check', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.status(401).json({ authenticated: false });
});

// API routes (protected by authentication)
app.use('/api', isAuthenticated, apiRoutes);

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(reactDist, 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Dashboard client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Dashboard client disconnected: ${socket.id}`);
  });
});

function emit(event, data) {
  io.emit(event, data);
}

// Start server
const PORT = config.dashboard.port;
server.listen(PORT, () => {
  logger.info(`Dashboard running on http://localhost:${PORT}`);
});

module.exports = { app, server, io, emit };
