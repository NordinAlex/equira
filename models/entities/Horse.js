const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Horse',
  tableName: 'horses',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar',
    },
    officialName: {
      type: 'varchar',
      nullable: true,
    },
    breed: {
      type: 'varchar',
      default: 'Svenskt Varmblod',
    },
    gender: {
      type: 'varchar',
      default: 'Sto', // Sto, Valack, Hingst
    },
    birthYear: {
      type: 'int',
      default: 2012,
    },
    chipNumber: {
      type: 'varchar',
      nullable: true,
    },
    passportNumber: {
      type: 'varchar',
      nullable: true,
    },
    status: {
      type: 'varchar',
      default: 'Aktiv & Tjänstbar', // 'Aktiv & Tjänstbar', 'Konvalescens / Skadad', 'Vila / Bete'
    },
    statusInfo: {
      type: 'varchar',
      nullable: true,
    },
    maxLessonsPerDay: {
      type: 'int',
      default: 2,
    },
    maxJumpLessonsPerWeek: {
      type: 'int',
      default: 2,
    },
    boxNumber: {
      type: 'varchar',
      nullable: true,
    },
    paddockNumber: {
      type: 'varchar',
      nullable: true,
    },
    category: {
      type: 'varchar',
      default: 'Storhäst', // 'A-ponny', 'B-ponny', 'C-ponny', 'D-ponny', 'Storhäst'
    },
    heightCm: {
      type: 'int',
      default: 167,
    },
    maxRiderWeightKg: {
      type: 'int',
      default: 78,
    },
    build: {
      type: 'varchar',
      default: 'Kraftig / Viktbärande', // 'Kraftig / Viktbärande', 'Normal', 'Ädel'
    },
    mainDiscipline: {
      type: 'varchar',
      default: 'Allround',
    },
    dressurLevel: {
      type: 'varchar',
      default: 'Lätt A',
    },
    jumpingLevel: {
      type: 'varchar',
      default: '90-100 cm',
    },
    suitableLevels: {
      type: 'text',
      nullable: true, // JSON array string
    },
    temperamentTraits: {
      type: 'text',
      nullable: true, // JSON array string e.g. ["Lugn", "Lättklass", "Trygg läromästare"]
    },
    temperamentDescription: {
      type: 'text',
      nullable: true,
    },
    ridingDescription: {
      type: 'text',
      nullable: true,
    },
    description: {
      type: 'text',
      nullable: true,
    },
    bestSuitedFor: {
      type: 'text',
      nullable: true, // JSON array string
    },
    importantInfo: {
      type: 'text',
      nullable: true,
    },
    warningsInstructions: {
      type: 'text',
      nullable: true,
    },
    photoUrl: {
      type: 'varchar',
      nullable: true,
    },
    equipmentNotes: {
      type: 'text',
      nullable: true,
    },
    healthNotes: {
      type: 'text',
      nullable: true,
    },
    lastVaccination: {
      type: 'varchar',
      nullable: true,
    },
    lastShoeing: {
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
    bookings: {
      type: 'one-to-many',
      target: 'LessonBooking',
      inverseSide: 'horse',
    },
    tasks: {
      type: 'one-to-many',
      target: 'StableTask',
      inverseSide: 'horse',
    },
  },
});
