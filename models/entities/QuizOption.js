const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'QuizOption',
  tableName: 'quiz_options',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    questionId: {
      type: 'int',
    },
    optionText: {
      type: 'text',
    },
    isCorrect: {
      type: 'boolean',
      default: false,
    },
    optionOrder: {
      type: 'int',
      default: 1,
    },
  },
  relations: {
    question: {
      type: 'many-to-one',
      target: 'QuizQuestion',
      joinColumn: { name: 'questionId' },
      onDelete: 'CASCADE',
    },
  },
});
