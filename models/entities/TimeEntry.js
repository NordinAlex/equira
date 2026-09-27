const { EntitySchema } = require('typeorm');

/**
 * TimeEntry Entity
 * Represents daily staff time tracking, clock-in, clock-out, and shift duration.
 */
module.exports = new EntitySchema({
  name: 'TimeEntry',
  tableName: 'time_entries',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    userId: {
      type: 'int',
    },
    date: {
      type: 'varchar', // 'YYYY-MM-DD'
    },
    plannedStartTime: {
      type: 'varchar',
      default: '07:00',
    },
    plannedEndTime: {
      type: 'varchar',
      default: '16:00',
    },
    plannedHours: {
      type: 'float',
      default: 8.0,
    },
    breakMinutes: {
      type: 'int',
      default: 60,
    },
    shiftName: {
      type: 'varchar',
      default: 'Morgonpass',
    },
    checkInTime: {
      type: 'datetime',
      nullable: true,
    },
    checkOutTime: {
      type: 'datetime',
      nullable: true,
    },
    originalPlannedStartTime: {
      type: 'varchar',
      nullable: true,
    },
    originalPlannedEndTime: {
      type: 'varchar',
      nullable: true,
    },
    originalCheckInTime: {
      type: 'datetime',
      nullable: true,
    },
    originalCheckOutTime: {
      type: 'datetime',
      nullable: true,
    },
    isAdjusted: {
      type: 'boolean',
      default: false,
    },
    adjustedAt: {
      type: 'datetime',
      nullable: true,
    },
    adjustedBy: {
      type: 'varchar',
      nullable: true,
    },
    durationMinutes: {
      type: 'int',
      nullable: true,
      default: 0,
    },
    overtimeMinutes: {
      type: 'int',
      nullable: true,
      default: 0,
    },
    status: {
      type: 'varchar',
      default: 'EJ_INSTAMPLAD', // 'EJ_INSTAMPLAD', 'INSTAMPLAD', 'AVSLUTAD', 'JUSTERAD'
    },
    subtextNote: {
      type: 'varchar',
      nullable: true, // e.g. "🌅 Morgonpass börjar 07:00" or "Kvällsfodring avslutad"
    },
    adminNote: {
      type: 'text',
      nullable: true,
    },
    location: {
      type: 'varchar',
      default: 'Huvudstallet',
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
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'userId' },
      onDelete: 'CASCADE',
    },
  },
});
