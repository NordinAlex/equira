const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');

/**
 * Service for handling administrative tasks.
 * 
 * Handles full administrative CRUD operations for stable tasks,
 * checklists, and staff task assignments.
 * 
 */
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
    const taskId = parseInt(id, 10);

    const task = await taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new Error('Stalluppgiften kunde inte hittas.');

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.taskType !== undefined) updateData.taskType = data.taskType;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.horseId !== undefined) updateData.horseId = data.horseId ? parseInt(data.horseId, 10) : null;
    if (data.assignedToUserId !== undefined) updateData.assignedToUserId = data.assignedToUserId ? parseInt(data.assignedToUserId, 10) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.checklist !== undefined) {
      updateData.checklist = typeof data.checklist === 'string' ? data.checklist : JSON.stringify(data.checklist);
    }

    await taskRepo.update(taskId, updateData);
    return await this.getStableTaskById(taskId);
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
