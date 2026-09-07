const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'RidingGroup',
  tableName: 'riding_groups',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // 'Tisdagsgruppen Nivå 3', 'Måndagsgruppen Nivå 1'
    },
    level: {
      type: 'varchar',
      default: 'Nivå 2',
    },
    weekday: {
      type: 'varchar',
      default: 'Tisdag',
    },
    defaultTime: {
      type: 'varchar',
      default: '17:30',
    },
    maxMembers: {
      type: 'int',
      default: 8,
    },
  },
  relations: {
    lessons: {
      type: 'one-to-many',
      target: 'Lesson',
      inverseSide: 'ridingGroup',
    },
  },
});
