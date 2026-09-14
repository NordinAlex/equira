const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    username: {
      type: 'varchar',
      unique: true,
    },
    email: {
      type: 'varchar',
      unique: true,
    },
    passwordHash: {
      type: 'varchar',
    },
    role: {
      type: 'varchar',
      default: 'STUDENT', // 'ADMIN', 'STAFF', 'STUDENT'
    },
    fullName: {
      type: 'varchar',
    },
    phone: {
      type: 'varchar',
      nullable: true,
    },
    avatarUrl: {
      type: 'varchar',
      nullable: true,
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
    studentProfile: {
      type: 'one-to-one',
      target: 'StudentProfile',
      inverseSide: 'user',
      cascade: true,
    },
    staffProfile: {
      type: 'one-to-one',
      target: 'StaffProfile',
      inverseSide: 'user',
      cascade: true,
    },
  },
});
