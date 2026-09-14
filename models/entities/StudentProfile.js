const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'StudentProfile',
  tableName: 'student_profiles',
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
    personnummer: {
      type: 'varchar',
      nullable: true,
    },
    birthDate: {
      type: 'varchar',
      nullable: true,
    },
    address: {
      type: 'varchar',
      nullable: true,
    },
    postalCode: {
      type: 'varchar',
      nullable: true,
    },
    city: {
      type: 'varchar',
      nullable: true,
    },
    emergencyContactName: {
      type: 'varchar',
      nullable: true,
    },
    emergencyContactPhone: {
      type: 'varchar',
      nullable: true,
    },
    emergencyContactRelation: {
      type: 'varchar',
      nullable: true,
    },
    ridingLevel: {
      type: 'varchar',
      default: 'Nivå 2', // Nybörjare, Nivå 1, Nivå 2, Nivå 3, Nivå 4, Avancerad
    },
    experienceYears: {
      type: 'float',
      default: 2,
    },
    heightCm: {
      type: 'int',
      default: 165,
    },
    weightKg: {
      type: 'int',
      default: 60,
    },
    primaryDiscipline: {
      type: 'varchar',
      default: 'Allround', // Allround, Dressyr, Hoppning, Hobby / Skog
    },
    preferredHorses: {
      type: 'text',
      nullable: true, // e.g. "Bella, Silver"
    },
    avoidHorses: {
      type: 'text',
      nullable: true,
    },
    specialNeeds: {
      type: 'text',
      nullable: true,
    },
    membershipStatus: {
      type: 'varchar',
      default: 'Aktiv', // Aktiv, Pröv, Kö
    },
    billingPreference: {
      type: 'varchar',
      default: 'Elev',
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
