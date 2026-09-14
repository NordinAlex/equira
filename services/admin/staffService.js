const { getDataSource } = require('../../config/database');
const { hashPassword } = require('../../config/auth');
const AdminMapper = require('./adminMapper');


class StaffService {
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
   * Retrieves all staff members with profiles, optionally filtered by search term and role.
   * 
   * @param {string} [searchQuery=''] - Optional search term
   * @param {string} [roleFilter=''] - Optional role or title filter
   * @returns {Promise<Array<Object>>} List of StaffAdminDTOs
   */
  async getAllStaff(searchQuery = '', roleFilter = '') {
    const userRepo = await this._getRepository('User');

    let query = userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.role IN (:...roles)', { roles: ['STAFF', 'ADMIN'] })
      .orderBy('u.fullName', 'ASC');

    const staffMembers = await query.getMany();

    let dtos = staffMembers.map(u => AdminMapper.toStaffDTO(u));

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      dtos = dtos.filter(s => {
        const name = (s.fullName || '').toLowerCase();
        const username = (s.username || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const title = (s.staffProfile?.title || '').toLowerCase();
        const specs = (s.staffProfile?.specializations || []).join(' ').toLowerCase();

        return name.includes(q) ||
          username.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          title.includes(q) ||
          specs.includes(q);
      });
    }

    const filter = (roleFilter || '').trim().toLowerCase();
    if (filter && filter !== 'all') {
      dtos = dtos.filter(s => {
        const title = (s.staffProfile?.title || '').toLowerCase();
        const role = (s.role || '').toLowerCase();
        if (filter === 'instructor' || filter === 'instruktor') {
          return title.includes('instruktör') || title.includes('ridlärare');
        }
        if (filter === 'manager' || filter === 'ansvarig') {
          return title.includes('ansvarig') || role === 'admin';
        }
        if (filter === 'care' || filter === 'skotare') {
          return title.includes('hästskötare') || title.includes('personal');
        }
        return role === filter || title.includes(filter);
      });
    }

    return dtos;
  }

  /**
   * Retrieves single staff member by user ID.
   * 
   * @param {number|string} id
   * @returns {Promise<Object|null>} StaffAdminDTO or null
   */
  async getStaffById(id) {
    const userRepo = await this._getRepository('User');

    const user = await userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.id = :id', { id: parseInt(id, 10) })
      .andWhere('u.role IN (:...roles)', { roles: ['STAFF', 'ADMIN'] })
      .getOne();

    return user ? AdminMapper.toStaffDTO(user) : null;
  }

  /**
   * Creates a new staff member and linked staff profile.
   * 
   * @param {Object} data - Staff registration data
   * @returns {Promise<Object>} Created StaffAdminDTO
   */
  async createStaff(data) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StaffProfile');

    const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Personal';

    const defaultUsername = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);

    const username = (data.username || defaultUsername).trim().toLowerCase();

    // Check unique username
    const existingUser = await userRepo.findOne({ where: { username } });
    if (existingUser) {
      throw new Error(`Användarnamnet "${username}" är redan upptaget.`);
    }

    // Check unique email if provided
    if (data.email) {
      const existingEmail = await userRepo.findOne({ where: { email: data.email.trim() } });
      if (existingEmail) {
        throw new Error(`E-postadressen "${data.email}" används redan av en annan användare.`);
      }
    }

    const role = (data.role === 'ADMIN') ? 'ADMIN' : 'STAFF';

    const user = userRepo.create({
      username,
      email: (data.email || `${username}@equira.se`).trim(),
      passwordHash: hashPassword(data.password || 'staff123'),
      role,
      fullName,
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || '/images/default-staff.jpg',
    });

    const savedUser = await userRepo.save(user);

    const profile = profileRepo.create({
      userId: savedUser.id,
      title: data.title || 'Stallpersonal',
      phone: data.phone || null,
      specializations: data.specializations || '',
    });

    await profileRepo.save(profile);

    return this.getStaffById(savedUser.id);
  }

  /**
   * Updates an existing staff member and profile.
   * 
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated StaffAdminDTO
   */
  async updateStaff(id, data) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StaffProfile');

    const parsedId = parseInt(id, 10);
    const user = await userRepo.findOne({ where: { id: parsedId } });
    if (!user) throw new Error('Personalen kunde inte hittas.');

    // Update user entity
    if (data.fullName !== undefined) user.fullName = data.fullName.trim();
    if (data.email !== undefined) user.email = data.email.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl.trim();
    if (data.role && ['STAFF', 'ADMIN'].includes(data.role)) {
      user.role = data.role;
    }

    // Optional password update
    if (data.password && data.password.trim().length > 0) {
      user.passwordHash = hashPassword(data.password.trim());
    }

    await userRepo.save(user);

    // Update profile entity
    let profile = await profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = profileRepo.create({ userId: user.id });
    }

    if (data.title !== undefined) profile.title = data.title.trim();
    if (data.phone !== undefined) profile.phone = data.phone.trim();
    if (data.specializations !== undefined) profile.specializations = data.specializations.trim();

    await profileRepo.save(profile);

    return this.getStaffById(user.id);
  }

  /**
   * Deletes a staff member safely:
   * - Protects current logged in admin from deleting themselves
   * - Nullifies references in Lesson (instructorId) and StableTask (assignedToUserId, completedByUserId)
   * - Deletes StaffProfile
   * - Deletes User
   * 
   * @param {number|string} id - User ID of staff member
   * @param {number|string} [currentUserId=null] - Currently authenticated user ID
   * @returns {Promise<any>}
   */
  async deleteStaff(id, currentUserId = null) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StaffProfile');
    const lessonRepo = await this._getRepository('Lesson');
    const taskRepo = await this._getRepository('StableTask');

    const parsedId = parseInt(id, 10);

    if (currentUserId && parseInt(currentUserId, 10) === parsedId) {
      throw new Error('Du kan inte ta bort ditt eget inloggade administratörskonto.');
    }

    const user = await userRepo.findOne({ where: { id: parsedId } });
    if (!user) {
      throw new Error('Personalen kunde inte hittas.');
    }

    // Detach from lessons
    await lessonRepo.update({ instructorId: parsedId }, { instructorId: null });

    // Detach from tasks
    await taskRepo.update({ assignedToUserId: parsedId }, { assignedToUserId: null });
    await taskRepo.update({ completedByUserId: parsedId }, { completedByUserId: null });

    // Delete staff profile
    await profileRepo.delete({ userId: parsedId });

    // Delete user
    return await userRepo.delete({ id: parsedId });
  }
}

module.exports = new StaffService();
