const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');
const { removeUploadedFile, horseUploadDir } = require('../../middleware/uploadMiddleware');

/**
 * HorsesService (Admin Domain)
 * 
 * Handles business logic, query filtering, and registration for horses
 * in the admin portal.
 * 
 */
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

  /**
   * Retrieves a horse by ID with tasks.
   * 
   * @param {string|number} id - Horse ID
   * @returns {Promise<Object|null>} Horse DTO or null
   */
  async getHorseById(id) {
    const horseRepo = await this._getRepository('Horse');
    const horse = await horseRepo.findOne({
      where: { id: parseInt(id, 10) },
      relations: { tasks: true },
    });
    if (!horse) return null;
    const dto = AdminMapper.toHorseDTO(horse);
    if (horse.tasks) {
      dto.tasks = horse.tasks.map(t => AdminMapper.toTaskDTO(t));
    }
    return dto;
  }

  /**
   * Updates an existing horse.
   * 
   * @param {string|number} id - Horse ID
   * @param {Object} body - Updated fields
   * @returns {Promise<Object>} Updated horse DTO
   */
  async updateHorse(id, body) {
    const horseRepo = await this._getRepository('Horse');
    const horse = await horseRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!horse) throw new Error('Hästen kunde inte hittas');

    const formatArray = (val, def) => {
      if (Array.isArray(val)) return JSON.stringify(val);
      if (val) return JSON.stringify([val]);
      return def ? JSON.stringify(def) : undefined;
    };

    if (body.name !== undefined) horse.name = body.name;
    if (body.officialName !== undefined) horse.officialName = body.officialName;
    if (body.breed !== undefined) horse.breed = body.breed;
    if (body.gender !== undefined) horse.gender = body.gender;
    if (body.birthYear !== undefined) horse.birthYear = parseInt(body.birthYear, 10);
    if (body.chipNumber !== undefined) horse.chipNumber = body.chipNumber;
    if (body.passportNumber !== undefined) horse.passportNumber = body.passportNumber;
    if (body.status !== undefined) horse.status = body.status;
    if (body.statusInfo !== undefined) horse.statusInfo = body.statusInfo;
    if (body.maxLessonsPerDay !== undefined) horse.maxLessonsPerDay = parseInt(body.maxLessonsPerDay, 10);
    if (body.maxJumpLessonsPerWeek !== undefined) horse.maxJumpLessonsPerWeek = parseInt(body.maxJumpLessonsPerWeek, 10);
    if (body.boxNumber !== undefined) horse.boxNumber = body.boxNumber;
    if (body.paddockNumber !== undefined) horse.paddockNumber = body.paddockNumber;
    if (body.category !== undefined) horse.category = body.category;
    if (body.heightCm !== undefined) horse.heightCm = parseInt(body.heightCm, 10);
    if (body.maxRiderWeightKg !== undefined) horse.maxRiderWeightKg = parseInt(body.maxRiderWeightKg, 10);
    if (body.build !== undefined) horse.build = body.build;
    if (body.mainDiscipline !== undefined) horse.mainDiscipline = body.mainDiscipline;
    if (body.dressurLevel !== undefined) horse.dressurLevel = body.dressurLevel;
    if (body.jumpingLevel !== undefined) horse.jumpingLevel = body.jumpingLevel;
    if (body.suitableLevels !== undefined) horse.suitableLevels = formatArray(body.suitableLevels);
    if (body.temperamentTraits !== undefined) horse.temperamentTraits = formatArray(body.temperamentTraits);
    if (body.temperamentDescription !== undefined) horse.temperamentDescription = body.temperamentDescription;
    if (body.ridingDescription !== undefined) horse.ridingDescription = body.ridingDescription;
    if (body.description !== undefined) horse.description = body.description;
    if (body.importantInfo !== undefined) horse.importantInfo = body.importantInfo;
    if (body.warningsInstructions !== undefined) horse.warningsInstructions = body.warningsInstructions;
    if (body.equipmentNotes !== undefined) horse.equipmentNotes = body.equipmentNotes;
    if (body.healthNotes !== undefined) horse.healthNotes = body.healthNotes;
    if (body.lastVaccination !== undefined) horse.lastVaccination = body.lastVaccination;
    if (body.lastShoeing !== undefined) horse.lastShoeing = body.lastShoeing;
    if (body.photoUrl && body.photoUrl.trim() !== '') {
      const newPhoto = body.photoUrl.trim();
      if (horse.photoUrl && horse.photoUrl !== newPhoto) {
        await removeUploadedFile(horse.photoUrl, horseUploadDir);
      }
      horse.photoUrl = newPhoto;
    }

    const saved = await horseRepo.save(horse);
    return AdminMapper.toHorseDTO(saved);
  }

  /**
   * Deletes a horse by ID, removing any uploaded photo.
   * 
   * @param {string|number} id - Horse ID
   * @returns {Promise<any>}
   */
  async deleteHorse(id) {
    const horseRepo = await this._getRepository('Horse');
    const horse = await horseRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (horse && horse.photoUrl) {
      await removeUploadedFile(horse.photoUrl, horseUploadDir);
    }
    return await horseRepo.delete({ id: parseInt(id, 10) });
  }
}

module.exports = new HorsesService();
