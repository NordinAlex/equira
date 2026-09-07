const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Quiz',
  tableName: 'quizzes',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    title: {
      type: 'varchar', // 'Säkerhet i stallet & hästens anatomi'
    },
    category: {
      type: 'varchar', // 'Hästens anatomi', 'Hästens beteende', 'Säkerhet', 'Stallkunskap', 'Utrustning', 'Ridning', 'Foderlära'
    },
    description: {
      type: 'text',
      nullable: true,
    },
    difficulty: {
      type: 'varchar',
      default: 'Medel', // 'Lätt', 'Medel', 'Svår'
    },
    timeLimitMinutes: {
      type: 'int',
      default: 15,
    },
    passPercentage: {
      type: 'int',
      default: 80,
    },
    equestrianBadge: {
      type: 'varchar',
      nullable: true, // 'Ryttarmärke 1 (Vit)', 'Ryttarmärke 2 (Brons)', 'Ryttarmärke 3 (Silver)'
    },
    isPublished: {
      type: 'boolean',
      default: true,
    },
    targetLevel: {
      type: 'varchar',
      default: 'Grupp 2-3',
    },
    createdAt: {
      type: 'datetime',
      createDate: true,
    },
  },
  relations: {
    questions: {
      type: 'one-to-many',
      target: 'QuizQuestion',
      inverseSide: 'quiz',
    },
    attempts: {
      type: 'one-to-many',
      target: 'QuizAttempt',
      inverseSide: 'quiz',
    },
  },
});
