const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const indexRouter = require('./routes/index');
const { sessionConfig } = require('./config/auth');
const { getDataSource } = require('./config/database');
const installMiddleware = require('./middleware/installMiddleware');

// Import routers
const tasksRouter = require('./routes/Staff/tasks');
const authRouter = require('./routes/auth');
const studentRouter = require('./routes/studentRoutes');
const overviewStaffRouter = require('./routes/Staff/overview');
const horsesRouter = require('./routes/Staff/horses');
const searchRouter = require('./routes/search');
const adminRouter = require('./routes/adminRoutes');
const apiRouter = require('./routes/apiRoutes');
const profileRouter = require('./routes/Staff/profile');

const app = express();

// Initialize Database
getDataSource()
  .then(() => {
    console.log('TypeORM SQLite Database initialized successfully.');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });
  
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', false);
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session(sessionConfig));
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  res.locals.currentPath = req.path;
  next();
});
// Static files
app.use(
  express.static(path.join(__dirname, 'public'), {
    dotfiles: 'allow' /* Express 5: preserve v4 behavior */,
  }),
);
app.use(installMiddleware);

// Route handlers
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/tasks', tasksRouter);
app.use('/student', studentRouter);
app.use('/overview', overviewStaffRouter);
app.use('/horses', horsesRouter);
app.use('/search', searchRouter);
app.use('/api', apiRouter);
app.use('/profile', profileRouter);

app.use('/admin', (req, res, next) => {
  res.locals.layout = 'layouts/adminLayout';
  next();
}, adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { layout: false });
});

module.exports = app;
