const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Arena',
  tableName: 'arenas',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // 'Stora Ridhuset', 'Lilla Ridhuset', 'Utebanan', 'Skogen', 'Teorirummet'
    },
    dimensions: {
      type: 'varchar',
      nullable: true, // '20×60m'
    },
    surfaceType: {
      type: 'varchar',
      nullable: true, // 'Fibersand', 'Flis/Sand'
    },
    isIndoor: {
      type: 'boolean',
      default: true,
    },
    notes: {
      type: 'text',
      nullable: true,
    },
  },
  relations: {
    lessons: {
      type: 'one-to-many',
      target: 'Lesson',
      inverseSide: 'arena',
    },
  },
});
