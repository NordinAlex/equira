const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'equira.sqlite');

const entities = [
  require('../models/entities/User'),
  require('../models/entities/StudentProfile'),
  require('../models/entities/StaffProfile'),
  require('../models/entities/Horse'),
  require('../models/entities/Arena'),
  require('../models/entities/RidingGroup'),
  require('../models/entities/Lesson'),
  require('../models/entities/LessonBooking'),
  require('../models/entities/StableTask'),
  require('../models/entities/Quiz'),
  require('../models/entities/QuizQuestion'),
  require('../models/entities/QuizOption'),
  require('../models/entities/QuizAttempt'),
];

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: dbPath,
  synchronize: true,
  logging: false,
  entities: entities,
});

let isInitialized = false;

async function getDataSource() {
  if (!isInitialized) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    isInitialized = true;
  }
  return AppDataSource;
}

module.exports = {
  AppDataSource,
  getDataSource,
  dbPath,
};
