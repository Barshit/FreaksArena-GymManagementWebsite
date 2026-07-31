require('dotenv').config();

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
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { logActivity } = require('./utils/activityLogger');

const app = express();

// Security headers with production-safe defaults
app.use(helmet());

app.set('view engine', 'ejs');
app.set('views', appConfig.viewsPath);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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
    await connectDB();

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is not set.');
    }

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
