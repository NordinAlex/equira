const { getDataSource } = require('../config/database');
const { verifyPassword, hashPassword } = require('../config/auth');

/**
 * Service for Authentication & Quick-Login
 * Contains Data Mapper logic to transform User entities into safe session DTOs.
 */
class AuthService {
  /**
   * Data Mapper: Map User entity to session DTO (strip sensitive hashes)
   */
  mapUserToSessionDTO(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * Authenticate user with username/email and password
   */
  async authenticate(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) return null;

    const ds = await getDataSource();
    const userRepo = ds.getRepository('User');

    const user = await userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.studentProfile', 'studentProfile')
      .leftJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.username = :input OR u.email = :input', { input: usernameOrEmail.trim() })
      .getOne();

    if (!user) return null;

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    return this.mapUserToSessionDTO(user);
  }

  /**
   * Quick-login helper for demonstration purposes
   */
  async getQuickLoginUser(roleParam) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository('User');

    const normalized = (roleParam || '').toUpperCase();
    if (!['ADMIN', 'STAFF', 'STUDENT'].includes(normalized)) {
      return null;
    }

    const user = await userRepo.findOne({
      where: { role: normalized },
      relations: { studentProfile: true, staffProfile: true },
      order: { id: 'ASC' },
    });

    return this.mapUserToSessionDTO(user);
  }

  /**
   * Check whether the system has already been installed (at least 1 user in database).
   * @returns {Promise<boolean>}
   */
  async isInstalled() {
    try {
      const ds = await getDataSource();
      const userRepo = ds.getRepository('User');
      const count = await userRepo.count();
      return count > 0;
    } catch (err) {
      console.error('Error checking isInstalled:', err);
      return false;
    }
  }

  /**
   * Registers the initial master administrator (ADMIN) when database is empty.
   *
   * @param {Object} data
   * @param {string} data.fullName
   * @param {string} data.username
   * @param {string} data.email
   * @param {string} [data.phone]
   * @param {string} data.password
   * @param {string} [data.title]
   * @param {string} [data.specializations]
   * @param {string} [data.avatarUrl]
   * @returns {Promise<Object>} Safe session DTO
   */
  async registerFirstAdmin({ fullName, username, email, phone, password, title, specializations, avatarUrl }) {
    const ds = await getDataSource();
    const userRepo = ds.getRepository('User');
    const staffProfileRepo = ds.getRepository('StaffProfile');

    const count = await userRepo.count();
    if (count > 0) {
      throw new Error('Systemet är redan installerat. En administratör finns redan i databasen.');
    }

    if (!fullName || !fullName.trim()) {
      throw new Error('Fullständigt namn måste anges.');
    }
    if (!username || !username.trim()) {
      throw new Error('Användarnamn måste anges.');
    }
    if (!email || !email.trim()) {
      throw new Error('E-postadress måste anges.');
    }
    if (!password || password.length < 6) {
      throw new Error('Lösenordet måste innehålla minst 6 tecken.');
    }

    // Check if username or email is already taken
    const existing = await userRepo
      .createQueryBuilder('u')
      .where('u.username = :username OR u.email = :email', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
      })
      .getOne();

    if (existing) {
      throw new Error('Användarnamnet eller e-postadressen är redan registrerad.');
    }

    // Create Admin User (no default values)
    const newUser = userRepo.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role: 'ADMIN',
      fullName: fullName.trim(),
      phone: phone && phone.trim() ? phone.trim() : null,
      avatarUrl: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : null,
    });

    const savedUser = await userRepo.save(newUser);

    // Create Staff Profile for this admin (no default values)
    const staffProfile = staffProfileRepo.create({
      userId: savedUser.id,
      title: title && title.trim() ? title.trim() : null,
      phone: phone && phone.trim() ? phone.trim() : null,
      specializations: specializations && specializations.trim() ? specializations.trim() : null,
    });

    await staffProfileRepo.save(staffProfile);

    return this.mapUserToSessionDTO(savedUser);
  }
}

module.exports = new AuthService();
