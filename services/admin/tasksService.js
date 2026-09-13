const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');


class TasksService {
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
   * Returns today's ISO date string in YYYY-MM-DD format.
   * 
   * @private
   * @returns {string}
   */
  _getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Retrieves all stable tasks for admin overview.
   * 
   * @returns {Promise<Array<Object>>} List of TaskAdminDTOs
   */
  async getStableTasks() {
    const taskRepo = await this._getRepository('StableTask');

    const tasks = await taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.horse', 'horse')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.completedBy', 'completedBy')
      .orderBy('t.dueDate', 'ASC')
      .addOrderBy('t.dueTime', 'ASC')
      .getMany();

    return tasks.map(t => AdminMapper.toTaskDTO(t));
  }

  /**
   * Retrieves form options for creating or editing stable tasks.
   * 
   * @returns {Promise<{staff: Array<Object>, horses: Array<Object>}>}
   */
  async getStableTaskFormData() {
    const userRepo = await this._getRepository('User');
    const horseRepo = await this._getRepository('Horse');

    const staff = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.role IN (:...roles)', { roles: ['STAFF', 'ADMIN'] })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    const horses = await horseRepo.find({ order: { name: 'ASC' } });
    return { staff, horses };
  }

  /**
   * Retrieves a stable task by ID.
   * 
   * @param {number|string} id
   * @returns {Promise<Object|null>} TaskAdminDTO or null
   */
  async getStableTaskById(id) {
    const taskRepo = await this._getRepository('StableTask');

    const task = await taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.horse', 'horse')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.completedBy', 'completedBy')
      .where('t.id = :id', { id: parseInt(id, 10) })
      .getOne();

    return task ? AdminMapper.toTaskDTO(task) : null;
  }

  /**
   * Creates a new stable task.
   * 
   * @param {Object} data - Task form data
   * @returns {Promise<Object>} Created TaskAdminDTO
   */
  async createStableTask(data) {
    const taskRepo = await this._getRepository('StableTask');

    let checklistJson = null;
    if (data.checklist) {
      checklistJson = typeof data.checklist === 'string' ? data.checklist : JSON.stringify(data.checklist);
    }

    const task = taskRepo.create({
      title: data.title,
      taskType: data.taskType || 'Morgonfodring',
      location: data.location || 'Stallet',
      horseId: data.horseId ? parseInt(data.horseId, 10) : null,
      assignedToUserId: data.assignedToUserId ? parseInt(data.assignedToUserId, 10) : null,
      dueDate: data.dueDate || this._getTodayDateString(),
      dueTime: data.dueTime || '07:00',
      priority: data.priority || 'Normal',
      status: data.status || 'Väntar',
      description: data.description || data.instructions || '',
      instructions: data.instructions || data.description || '',
      checklist: checklistJson,
      notes: data.notes || '',
    });

    const saved = await taskRepo.save(task);
    return AdminMapper.toTaskDTO(saved);
  }

  /**
   * Updates an existing stable task.
   * 
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated TaskAdminDTO
   */
  async updateStableTask(id, data) {
    const taskRepo = await this._getRepository('StableTask');

    const task = await taskRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!task) throw new Error('Stalluppgiften kunde inte hittas.');

    task.title = data.title !== undefined ? data.title : task.title;
    task.taskType = data.taskType !== undefined ? data.taskType : task.taskType;
    task.location = data.location !== undefined ? data.location : task.location;
    task.horseId = data.horseId !== undefined ? (data.horseId ? parseInt(data.horseId, 10) : null) : task.horseId;
    task.assignedToUserId = data.assignedToUserId !== undefined ? (data.assignedToUserId ? parseInt(data.assignedToUserId, 10) : null) : task.assignedToUserId;
    task.dueDate = data.dueDate !== undefined ? data.dueDate : task.dueDate;
    task.dueTime = data.dueTime !== undefined ? data.dueTime : task.dueTime;
    task.priority = data.priority !== undefined ? data.priority : task.priority;
    task.status = data.status !== undefined ? data.status : task.status;
    task.description = data.description !== undefined ? data.description : task.description;
    task.instructions = data.instructions !== undefined ? data.instructions : (task.instructions || task.description);
    task.notes = data.notes !== undefined ? data.notes : task.notes;

    if (data.checklist !== undefined) {
      task.checklist = typeof data.checklist === 'string' ? data.checklist : JSON.stringify(data.checklist);
    }

    const saved = await taskRepo.save(task);
    return AdminMapper.toTaskDTO(saved);
  }

  /**
   * Deletes a stable task.
   * 
   * @param {number|string} id
   * @returns {Promise<any>}
   */
  async deleteStableTask(id) {
    const taskRepo = await this._getRepository('StableTask');
    return await taskRepo.delete({ id: parseInt(id, 10) });
  }
}

module.exports = new TasksService();
