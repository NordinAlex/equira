const { getDataSource } = require('../../config/database');

/**
 * Service for administrative management of Arenas / Ridbanor.
 * 
 * Provides complete CRUD operations for riding halls, outdoor paddocks,
 * school arenas, and theory facilities.
 */
class ArenasService {
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
   * Retrieves all arenas with optional filtering and relation counts.
   * 
   * @param {string} [filter='all'] - 'all', 'indoor', 'outdoor'
   * @returns {Promise<Array<Object>>}
   */
  async getArenas(filter = 'all') {
    const arenaRepo = await this._getRepository('Arena');

    const arenas = await arenaRepo
      .createQueryBuilder('arena')
      .leftJoinAndSelect('arena.lessons', 'lesson')
      .orderBy('arena.isIndoor', 'DESC')
      .addOrderBy('arena.name', 'ASC')
      .getMany();

    const formatted = arenas.map(a => {
      const lessons = a.lessons || [];
      const isIndoor = Boolean(a.isIndoor);

      return {
        id: a.id,
        name: a.name,
        dimensions: a.dimensions || 'Standard',
        surfaceType: a.surfaceType || 'Fibersand',
        isIndoor,
        notes: a.notes || '',
        imageUrl: a.imageUrl || (isIndoor ? '/images/arena-preview.jpg' : '/images/arena-outdoor.jpg'),
        lessonCount: lessons.length,
        typeBadge: {
          label: isIndoor ? 'Inomhus' : 'Utomhus',
          class: isIndoor 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-sky-50 text-sky-800 border-sky-200',
          icon: isIndoor ? 'fa-warehouse' : 'fa-sun',
        },
      };
    });

    if (filter === 'indoor') {
      return formatted.filter(a => a.isIndoor);
    } else if (filter === 'outdoor') {
      return formatted.filter(a => !a.isIndoor);
    }

    return formatted;
  }

  /**
   * Calculates KPI metrics for arenas.
   * 
   * @param {Array<Object>} arenas
   * @returns {Object}
   */
  getArenaKPIs(arenas = []) {
    const total = arenas.length;
    const indoor = arenas.filter(a => a.isIndoor).length;
    const outdoor = arenas.filter(a => !a.isIndoor).length;
    const totalLessons = arenas.reduce((sum, a) => sum + (a.lessonCount || 0), 0);

    return {
      total,
      indoor,
      outdoor,
      totalLessons,
    };
  }

  /**
   * Retrieves an arena by ID.
   * 
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async getArenaById(id) {
    const arenaRepo = await this._getRepository('Arena');
    const arena = await arenaRepo.findOne({
      where: { id: Number(id) },
      relations: { lessons: true },
    });

    if (!arena) return null;

    return {
      id: arena.id,
      name: arena.name,
      dimensions: arena.dimensions || '',
      surfaceType: arena.surfaceType || '',
      isIndoor: Boolean(arena.isIndoor),
      notes: arena.notes || '',
      imageUrl: arena.imageUrl || (Boolean(arena.isIndoor) ? '/images/arena-preview.jpg' : '/images/arena-outdoor.jpg'),
      lessons: arena.lessons || [],
    };
  }

  /**
   * Creates a new arena.
   * 
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createArena(data) {
    const arenaRepo = await this._getRepository('Arena');

    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('Ridbanans namn är obligatoriskt.');
    }

    const isIndoor = data.isIndoor === 'true' || data.isIndoor === true || data.isIndoor === '1' || data.isIndoor === 'on';

    const newArena = arenaRepo.create({
      name,
      dimensions: (data.dimensions || '').trim() || '20×60m',
      surfaceType: (data.surfaceType || '').trim() || 'Fibersand',
      isIndoor,
      notes: (data.notes || '').trim() || null,
      imageUrl: (data.imageUrl || '').trim() || (isIndoor ? '/images/arena-preview.jpg' : '/images/arena-outdoor.jpg'),
    });

    return await arenaRepo.save(newArena);
  }

  /**
   * Updates an existing arena.
   * 
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateArena(id, data) {
    const arenaRepo = await this._getRepository('Arena');
    const arena = await arenaRepo.findOne({ where: { id: Number(id) } });

    if (!arena) {
      throw new Error('Ridbanan kunde inte hittas.');
    }

    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('Ridbanans namn kan inte vara tomt.');
    }

    const isIndoor = data.isIndoor === 'true' || data.isIndoor === true || data.isIndoor === '1' || data.isIndoor === 'on';

    arena.name = name;
    arena.dimensions = (data.dimensions || '').trim() || '20×60m';
    arena.surfaceType = (data.surfaceType || '').trim() || 'Fibersand';
    arena.isIndoor = isIndoor;
    arena.notes = (data.notes || '').trim() || null;
    if (data.imageUrl) {
      arena.imageUrl = data.imageUrl.trim();
    }

    return await arenaRepo.save(arena);
  }

  /**
   * Deletes an arena by ID.
   * Unlinks any associated lessons first so they remain intact with arenaId = null.
   * 
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async deleteArena(id) {
    const arenaRepo = await this._getRepository('Arena');
    const lessonRepo = await this._getRepository('Lesson');

    const arena = await arenaRepo.findOne({ where: { id: Number(id) } });
    if (!arena) {
      throw new Error('Ridbanan kunde inte hittas.');
    }

    // Unlink lessons using this arena to prevent foreign key errors
    await lessonRepo
      .createQueryBuilder()
      .update('Lesson')
      .set({ arenaId: null })
      .where('arenaId = :id', { id: Number(id) })
      .execute();

    await arenaRepo.remove(arena);
    return true;
  }
}

module.exports = new ArenasService();
