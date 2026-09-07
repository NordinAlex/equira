const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'StableTask',
  tableName: 'stable_tasks',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    title: {
      type: 'varchar',
    },
    taskType: {
      type: 'varchar',
      default: 'Morgonfodring', // 'Morgonfodring', 'Lunchgiva', 'Kvällsfodring', 'Mockning', 'Utsläpp', 'Intag', 'Medicinering', 'Täckesbyte', 'Särskild tillsyn'
    },
    location: {
      type: 'varchar',
      default: 'Stallet',
    },
    horseId: {
      type: 'int',
      nullable: true,
    },
    dueDate: {
      type: 'varchar', // 'YYYY-MM-DD'
    },
    dueTime: {
      type: 'varchar', // 'HH:mm'
    },
    priority: {
      type: 'varchar',
      default: 'Normal', // 'Normal', 'Viktig', 'Akut'
    },
    status: {
      type: 'varchar',
      default: 'Kommande', // 'Kommande', 'Pågår', 'Klar'
    },
    instructions: {
      type: 'text',
      nullable: true,
    },
    checklistJson: {
      type: 'text',
      nullable: true, // JSON string e.g. [{"id": 1, "text": "Fodra stall 1", "completed": true}]
    },
    assignedToUserId: {
      type: 'int',
      nullable: true,
    },
    completedAt: {
      type: 'datetime',
      nullable: true,
    },
    completedByUserId: {
      type: 'int',
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
    horse: {
      type: 'many-to-one',
      target: 'Horse',
      joinColumn: { name: 'horseId' },
      nullable: true,
      onDelete: 'SET NULL',
    },
    assignedTo: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'assignedToUserId' },
      nullable: true,
      onDelete: 'SET NULL',
    },
    completedBy: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'completedByUserId' },
      nullable: true,
      onDelete: 'SET NULL',
    },
  },
});
