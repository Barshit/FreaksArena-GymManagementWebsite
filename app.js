require('dotenv').config();

const { csrfSync } = require('csrf-sync');
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
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

const app = express();
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
        ]
      }
    }
  })
);
app.set('view engine', 'ejs');
app.set('views', appConfig.viewsPath);



app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const healthStatus = dbConnected ? 'healthy' : 'unhealthy';

  const payload = {
    status: healthStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'connected' : 'unavailable',
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

    app.use(
      session({
        secret: sessionSecret,
        store: MongoStore.create({
          mongoUrl: process.env.MONGO_URI,
          collectionName: 'sessions',
          ttl: 7 * 24 * 60 * 60,
        }),
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7*24 * 60 * 60 * 1000,
        },
      })
    );
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req);
  next();
});
    app.use(csrfSynchronisedProtection);
    
    await ensureAdminAccount();

    app.use(logActivity);

    app.use('/', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/members', membersApiRouter);
    app.use('/api/payments', paymentsApiRouter);
    app.use('/api/announcements', announcementsApiRouter);
    app.use('/api/dashboard', dashboardApiRouter);
    app.use('/api/reports', reportsApiRouter);
    app.use('/api/settings', settingsApiRouter);
    app.use('/api/activity-logs', activityLogsRouter);
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
