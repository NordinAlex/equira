const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Lesson',
  tableName: 'lessons',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    title: {
      type: 'varchar',
    },
    lessonType: {
      type: 'varchar',
      default: 'Allround', // 'Hoppning', 'Dressyr', 'Allround', 'Teori', 'Markarbete', 'Uteritt'
    },
    level: {
      type: 'varchar',
      default: 'Nivå 2', // 'Nybörjare', 'Nivå 1', 'Nivå 2', 'Nivå 3', 'Nivå 4', 'Avancerad', 'Alla nivåer'
    },
    targetGroup: {
      type: 'varchar',
      nullable: true, // 'Ungdom & Junior (10-18 år)', 'Vuxengrupp'
    },
    date: {
      type: 'varchar', // 'YYYY-MM-DD'
    },
    startTime: {
      type: 'varchar', // 'HH:mm'
    },
    endTime: {
      type: 'varchar', // 'HH:mm'
    },
    arenaId: {
      type: 'int',
      nullable: true,
    },
    instructorId: {
      type: 'int',
      nullable: true,
    },
    ridingGroupId: {
      type: 'int',
      nullable: true,
    },
    maxParticipants: {
      type: 'int',
      default: 8,
    },
    minParticipants: {
      type: 'int',
      default: 4,
    },
    status: {
      type: 'varchar',
      default: 'Schemalagd', // 'Schemalagd', 'Pågår', 'Genomförd', 'Inställd'
    },
    description: {
      type: 'text',
      nullable: true,
    },
    staffInstructions: {
      type: 'text',
      nullable: true,
    },
    equipmentRequirements: {
      type: 'text',
      nullable: true,
    },
    priceDropIn: {
      type: 'int',
      default: 420,
    },
    createdAt: {
      type: 'datetime',
      createDate: true,
    },
    updatedAt: {
      type: 'datetime',
      updateDate: true,
    },
  },
  relations: {
    arena: {
      type: 'many-to-one',
      target: 'Arena',
      joinColumn: { name: 'arenaId' },
      nullable: true,
    },
    instructor: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'instructorId' },
      nullable: true,
    },
    ridingGroup: {
      type: 'many-to-one',
      target: 'RidingGroup',
      joinColumn: { name: 'ridingGroupId' },
      nullable: true,
    },
    bookings: {
      type: 'one-to-many',
      target: 'LessonBooking',
      inverseSide: 'lesson',
    },
  },
});
