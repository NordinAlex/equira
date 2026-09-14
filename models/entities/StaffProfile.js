const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'StaffProfile',
  tableName: 'staff_profiles',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    userId: {
      type: 'int',
      unique: true,
    },
    title: {
      type: 'varchar',
      default: 'Stallpersonal', // 'Stallansvarig', 'Huvudinstruktör', 'Stallpersonal', 'Hästskötare'
    },
    phone: {
      type: 'varchar',
      nullable: true,
    },
    specializations: {
      type: 'varchar',
      nullable: true,
    },
  },
  relations: {
    user: {
      type: 'one-to-one',
      target: 'User',
      joinColumn: { name: 'userId' },
      onDelete: 'CASCADE',
    },
  },
});
