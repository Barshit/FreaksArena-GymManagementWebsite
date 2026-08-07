require('dotenv').config();

const noCacheMiddleware = require('./middleware/noCache');
const { csrfSync } = require('csrf-sync');
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const membersApiRouter = require('./routes/members');
const paymentsApiRouter = require('./routes/payments');
const dashboardApiRouter = require('./routes/dashboard');
const reportsApiRouter = require('./routes/reports');
const announcementsApiRouter = require('./routes/announcements');
const settingsApiRouter = require('./routes/settings');
const activityLogsRouter = require('./routes/activityLogs');
const appConfig = require('./config/appConfig');
const connectDB = require('./config/db');
const ensureAdminAccount = require('./config/seedAdmin');
const validateEnv = require('./config/validateEnv');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { logActivity } = require('./utils/activityLogger');
const mongoose = require('mongoose');
const enquiriesRouter = require('./routes/enquiries');
const sessionValidator = require('./middleware/sessionValidator');
const { apiRateLimiter } = require('./middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1);
const {
  csrfSynchronisedProtection,
  generateToken,
} = csrfSync({
  getTokenFromRequest: (req) => {
    if (req.is("application/x-www-form-urlencoded")) {
      return req.body._csrf;
    }

    return req.headers["x-csrf-token"];
  },
});
// Security headers with production-safe defaults
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        frameSrc: [
          "'self'",
          "https://www.google.com"
        ],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || 'http://localhost:3000'
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http:"
        ],
        scriptSrc: [
          "'self'"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'" // Required for inline styles in EJS templates
        ]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false
    },
    referrerPolicy: {
      policy: ['strict-origin-when-cross-origin']
    },
    noSniff: true,
    xssFilter: true,
    frameguard: {
      action: 'deny'
    }
  })
);

// Global rate limiting to prevent abuse
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

app.use(globalRateLimiter);

// CORS configuration for frontend with dynamic origin handling
const allowedOrigins = [
  
  'https://freaks-arena-gym-management-website.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://freaksarena-gymmanagementwebsite-1.onrender.com',
  'https://freaksarena-gymmanagementwebsite.onrender.com',
  
];
console.log("FRONTEND_URL from ENV:", process.env.FRONTEND_URL);
console.log("Allowed Origins:", allowedOrigins);
app.use(cors({
  origin: function (origin, callback) {
    console.log("Incoming Origin:", origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
        return callback(null, true);
    }

    console.log("Blocked Origin:", origin);
    return callback(new Error("CORS policy: Origin not allowed"));
},
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const healthStatus = dbConnected ? 'healthy' : 'unhealthy';

  const payload = {
    status: healthStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'connected' : 'unavailable',
    session: {
      active: req.session ? true : false,
      cookie: req.session?.cookie ? 'present' : 'absent',
    },
  };

  res.status(dbConnected ? 200 : 503).json(payload);
});

// Debug middleware to trace all requests
app.use((req, res, next) => {
  console.log(`APP LEVEL: ${req.method} ${req.path}`);
  next();
});

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));

const PORT = appConfig.port;

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();

    const sessionSecret = process.env.SESSION_SECRET;
    const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE || '604800000', 10); // 7 days default
    const sessionTouchAfter = parseInt(process.env.SESSION_TOUCH_AFTER || '86400000', 10); // 1 day default

    // Enhanced MongoDB session store configuration for production
    const sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
      ttl: sessionMaxAge / 1000, // Convert to seconds for MongoDB TTL
      touchAfter: sessionTouchAfter / 1000, // Convert to seconds
      autoRemove: 'native', // Use MongoDB TTL index for cleanup
     
    });

    // Handle session store errors
    sessionStore.on('error', (error) => {
      console.error('Session store error:', error);
    });

    app.use(
      session({
        secret: sessionSecret,
        store: sessionStore,
        name: 'gym.sid', // Custom session name for better identification
        resave: false,
        saveUninitialized: false,
        rolling: false, // Don't rotate session on every request
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: sessionMaxAge,
          domain: process.env.NODE_ENV === 'production' ? undefined : undefined, // Use current domain
          path: '/',
        },
      })
    );
    app.use(noCacheMiddleware);
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    
    await ensureAdminAccount();

    app.use(logActivity);

    // Public API routes (no CSRF protection)
    app.use('/api/enquiries', enquiriesRouter);
    
    // CSRF protection for protected routes
    app.use((req, res, next) => {
  try {
    res.locals.csrfToken = generateToken(req);
    next();
  } catch (err) {
    console.error("CSRF TOKEN ERROR");
    console.error(err);
    next(err);
  }
});
    app.use(csrfSynchronisedProtection);
    
    // Session validation for protected API routes (POST/PUT/DELETE/PATCH only)
    app.use('/api', (req, res, next) => {
      // Skip validation for public endpoints
      if (req.path === '/api/enquiries' || req.path === '/api/announcements/active') {
        return next();
      }
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return sessionValidator(req, res, next);
      }
      next();
    });
    
    // Protected API routes
    app.use('/api/admin', adminRouter);
    app.use('/api/members', membersApiRouter);
    app.use('/api/payments', paymentsApiRouter);
    app.use('/api/announcements', announcementsApiRouter);
    app.use('/api/dashboard', dashboardApiRouter);
    app.use('/api/reports', reportsApiRouter);
    app.use('/api/settings', settingsApiRouter);
    app.use('/api/activity-logs', activityLogsRouter);
    
    // Admin panel routes
    app.use('/', authRouter);
    app.use('/', pagesRouter);
    
    app.use(notFoundHandler);
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Application failed to start because the database connection could not be established.');
    console.error(error);
    process.exit(1);
  }
};

startServer();
