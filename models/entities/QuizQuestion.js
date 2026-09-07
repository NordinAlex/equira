const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'QuizQuestion',
  tableName: 'quiz_questions',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    quizId: {
      type: 'int',
    },
    questionText: {
      type: 'text', // "Vad ska du göra innan du leder en häst ut ur dess box?"
    },
    topicTitle: {
      type: 'varchar',
      nullable: true, // "Hovens struktur", "Matsmältningssystemet", etc.
    },
    explanationText: {
      type: 'text',
      nullable: true, // "Boxdörren måste alltid öppnas helt och spärras..."
    },
    illustrationUrl: {
      type: 'varchar',
      nullable: true,
    },
    questionOrder: {
      type: 'int',
      default: 1,
    },
  },
  relations: {
    quiz: {
      type: 'many-to-one',
      target: 'Quiz',
      joinColumn: { name: 'quizId' },
      onDelete: 'CASCADE',
    },
    options: {
      type: 'one-to-many',
      target: 'QuizOption',
      inverseSide: 'question',
      cascade: true,
    },
  },
});
