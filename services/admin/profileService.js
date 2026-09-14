const { getDataSource } = require('../../config/database');
const { verifyPassword, hashPassword } = require('../../config/auth');


class ProfileService {
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
   * Retrieves admin profile with associated staffProfile and stable KPIs.
   * 
   * @param {number|string} userId
   * @returns {Promise<{ user: Object, stats: Object }|null>}
   */
  async getAdminProfile(userId) {
    const userRepo = await this._getRepository('User');
    const horseRepo = await this._getRepository('Horse');
    const lessonRepo = await this._getRepository('Lesson');
    const parsedUserId = parseInt(userId, 10);

    const user = await userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.id = :id', { id: parsedUserId })
      .getOne();

    if (!user) return null;

    // Fetch system KPIs for overview on admin profile
    const [totalHorses, totalStudents, totalStaff, totalLessons] = await Promise.all([
      horseRepo.count(),
      userRepo.count({ where: { role: 'STUDENT' } }),
      userRepo.count({ where: { role: 'STAFF' } }),
      lessonRepo.count(),
    ]);

    return {
      user,
      stats: {
        totalHorses,
        totalStudents,
        totalStaff: totalStaff + 1, // include admin
        totalLessons,
      },
    };
  }

  /**
   * Updates admin profile personal details and staffProfile.
   * 
   * @param {number|string} userId
   * @param {Object} data
   * @param {string} data.fullName
   * @param {string} data.email
   * @param {string} [data.phone]
   * @param {string} [data.title]
   * @param {string} [data.specializations]
   * @returns {Promise<Object>} Updated user session DTO
   */
  async updateAdminProfile(userId, { fullName, email, phone, title, specializations }) {
    const userRepo = await this._getRepository('User');
    const staffProfileRepo = await this._getRepository('StaffProfile');
    const parsedUserId = parseInt(userId, 10);

    if (!fullName || !fullName.trim()) {
      throw new Error('Fullständigt namn måste anges.');
    }
    if (!email || !email.trim()) {
      throw new Error('E-postadress måste anges.');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const emailConflict = await userRepo
      .createQueryBuilder('u')
      .where('u.email = :email AND u.id != :id', { email: trimmedEmail, id: parsedUserId })
      .getOne();

    if (emailConflict) {
      throw new Error('E-postadressen är redan registrerad av en annan användare.');
    }

    // Update user
    await userRepo.update(
      { id: parsedUserId },
      {
        fullName: fullName.trim(),
        email: trimmedEmail,
        phone: phone ? phone.trim() : null,
      }
    );

    // Upsert StaffProfile
    let staffProfile = await staffProfileRepo.findOne({ where: { userId: parsedUserId } });
    if (staffProfile) {
      await staffProfileRepo.update(
        { id: staffProfile.id },
        {
          title: title ? title.trim() : 'Ridskolechef & Huvudadministratör',
          phone: phone ? phone.trim() : null,
          specializations: specializations ? specializations.trim() : 'Administration, Ridskoleledning',
        }
      );
    } else {
      staffProfile = staffProfileRepo.create({
        userId: parsedUserId,
        title: title ? title.trim() : 'Ridskolechef & Huvudadministratör',
        phone: phone ? phone.trim() : null,
        specializations: specializations ? specializations.trim() : 'Administration, Ridskoleledning',
      });
      await staffProfileRepo.save(staffProfile);
    }

    // Return fresh user for session update
    const updatedUser = await userRepo.findOne({
      where: { id: parsedUserId },
      relations: { staffProfile: true },
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
    };
  }

  /**
   * Updates password for admin user.
   * 
   * @param {number|string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const userRepo = await this._getRepository('User');
    const parsedUserId = parseInt(userId, 10);

    const user = await userRepo.findOne({ where: { id: parsedUserId } });
    if (!user) {
      throw new Error('Användaren hittades inte.');
    }

    if (!currentPassword) {
      throw new Error('Nuvarande lösenord måste anges.');
    }

    const isMatch = verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Nuvarande lösenord är felaktigt.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Nytt lösenord måste innehålla minst 6 tecken.');
    }

    const newHash = hashPassword(newPassword);
    await userRepo.update({ id: parsedUserId }, { passwordHash: newHash });
  }

  /**
   * Updates avatar URL for admin user.
   * 
   * @param {number|string} userId
   * @param {string} avatarUrl
   * @returns {Promise<void>}
   */
  async updateAvatar(userId, avatarUrl) {
    const userRepo = await this._getRepository('User');
    await userRepo.update({ id: parseInt(userId, 10) }, { avatarUrl });
  }
}

module.exports = new ProfileService();
