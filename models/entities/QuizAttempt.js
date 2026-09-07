const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'QuizAttempt',
  tableName: 'quiz_attempts',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    quizId: {
      type: 'int',
    },
    studentId: {
      type: 'int',
    },
    score: {
      type: 'int',
      default: 0,
    },
    totalQuestions: {
      type: 'int',
      default: 0,
    },
    percentage: {
      type: 'int',
      default: 0,
    },
    passed: {
      type: 'boolean',
      default: false,
    },
    answersJson: {
      type: 'text',
      nullable: true, // stores JSON of question-answer review with correctness & explanation
    },
    completedAt: {
      type: 'datetime',
      createDate: true,
    },
  },
  relations: {
    quiz: {
      type: 'many-to-one',
      target: 'Quiz',
      joinColumn: { name: 'quizId' },
      onDelete: 'CASCADE',
    },
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'studentId' },
      onDelete: 'CASCADE',
    },
  },
});
