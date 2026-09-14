const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'LessonBooking',
  tableName: 'lesson_bookings',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    lessonId: {
      type: 'int',
    },
    studentId: {
      type: 'int',
    },
    horseId: {
      type: 'int',
      nullable: true,
    },
    status: {
      type: 'varchar',
      default: 'Bokad', // 'Bokad', 'Närvarande', 'Avbokad'
    },
    assignedAt: {
      type: 'datetime',
      nullable: true,
    },
    assignmentWarning: {
      type: 'text',
      nullable: true,
    },
    createdAt: {
      type: 'datetime',
      createDate: true,
    },
  },
  relations: {
    lesson: {
      type: 'many-to-one',
      target: 'Lesson',
      joinColumn: { name: 'lessonId' },
      onDelete: 'CASCADE',
    },
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'studentId' },
      onDelete: 'CASCADE',
    },
    horse: {
      type: 'many-to-one',
      target: 'Horse',
      joinColumn: { name: 'horseId' },
      nullable: true,
      onDelete: 'SET NULL',
    },
  },
});
