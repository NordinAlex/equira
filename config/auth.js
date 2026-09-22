const crypto = require('crypto');

const sessionConfig = {
  secret:'equira-riding-school-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in HTTPS production
    maxAge: null, // Session cookie unless the user chooses "Kom ihåg mig"
  },
};

function hashPassword(password) {
  const salt = 'equira_salt_fixed';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

module.exports = {
  sessionConfig,
  hashPassword,
  verifyPassword,
};
