const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');

class HorsesService {
  /**
   * Helper to retrieve a TypeORM repository instance safely.
   * 
   * @private
   * @param {string} entityName - Name of the registered TypeORM entity
   * @returns {Promise<import('typeorm').Repository<any>>}
   */
  async _getRepository(entityName) {
    const ds = await getDataSource();
    return ds.getRepository(entityName);
  }

  /**
   * Retrieves horses with optional filter criteria.
   * 
   * @param {string} [filter='all'] - 'all' | 'ledig' | 'vila' | 'nyborjare' | 'erfarna'
   * @returns {Promise<Array<Object>>} List of normalized HorseAdminDTOs
   */
  async getHorses(filter = 'all') {
    const horseRepo = await this._getRepository('Horse');
    let horses = await horseRepo.find({ order: { name: 'ASC' } });

    if (filter === 'ledig') {
      horses = horses.filter(h => h.status === 'Aktiv & Tjänstbar');
    } else if (filter === 'vila') {
      horses = horses.filter(h => h.status !== 'Aktiv & Tjänstbar');
    } else if (filter === 'nyborjare') {
      horses = horses.filter(h => (h.suitableLevels || '').includes('Nybörjare') || (h.temperamentTraits || '').includes('Trygg'));
    } else if (filter === 'erfarna') {
      horses = horses.filter(h => (h.mainDiscipline === 'Hoppning' || (h.temperamentTraits || '').includes('Pigg')));
    }

    return horses.map(h => AdminMapper.toHorseDTO(h));
  }

  /**
   * Registers a new horse in the system.
   * 
   * @param {Object} body - Horse form fields
   * @returns {Promise<Object>} Created horse DTO
   */
  async createHorse(body) {
    const horseRepo = await this._getRepository('Horse');

    const formatArray = (val, def) => {
      if (Array.isArray(val)) return JSON.stringify(val);
      if (val) return JSON.stringify([val]);
      return JSON.stringify(def);
    };

    const horse = horseRepo.create({
      name: body.name,
      officialName: body.officialName,
      breed: body.breed || 'Svenskt Varmblod',
      gender: body.gender || 'Sto',
      birthYear: body.birthYear ? parseInt(body.birthYear, 10) : 2015,
      chipNumber: body.chipNumber,
      passportNumber: body.passportNumber,
      status: body.status || 'Aktiv & Tjänstbar',
      statusInfo: body.statusInfo,
      maxLessonsPerDay: body.maxLessonsPerDay ? parseInt(body.maxLessonsPerDay, 10) : 2,
      maxJumpLessonsPerWeek: body.maxJumpLessonsPerWeek ? parseInt(body.maxJumpLessonsPerWeek, 10) : 2,
      boxNumber: body.boxNumber || 'Box 1',
      paddockNumber: body.paddockNumber || 'Hage 1',
      category: body.category || 'Storhäst',
      heightCm: body.heightCm ? parseInt(body.heightCm, 10) : 165,
      maxRiderWeightKg: body.maxRiderWeightKg ? parseInt(body.maxRiderWeightKg, 10) : 75,
      build: body.build || 'Normal',
      mainDiscipline: body.mainDiscipline || 'Allround',
      dressurLevel: body.dressurLevel || 'Lätt A',
      jumpingLevel: body.jumpingLevel || '90 cm',
      suitableLevels: formatArray(body.suitableLevels, ['Nivå 1', 'Nivå 2']),
      temperamentTraits: formatArray(body.temperamentTraits, ['Snäll', 'Lugn']),
      temperamentDescription: body.temperamentDescription,
      ridingDescription: body.ridingDescription,
      description: body.description,
      importantInfo: body.importantInfo,
      warningsInstructions: body.warningsInstructions,
      equipmentNotes: body.equipmentNotes,
      healthNotes: body.healthNotes,
      lastVaccination: body.lastVaccination,
      lastShoeing: body.lastShoeing,
      photoUrl: body.photoUrl || '/images/default-horse.jpg',
    });

    const saved = await horseRepo.save(horse);
    return AdminMapper.toHorseDTO(saved);
  }
}

module.exports = new HorsesService();
