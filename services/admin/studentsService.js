const { getDataSource } = require('../../config/database');
const { hashPassword } = require('../../config/auth');
const AdminMapper = require('./adminMapper');


class StudentsService {
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
   * Retrieves all students with profiles.
   * 
   * @returns {Promise<Array<Object>>} List of StudentAdminDTOs
   */
  async getAllStudents() {
    const userRepo = await this._getRepository('User');

    const students = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.studentProfile', 'studentProfile')
      .where('u.role = :role', { role: 'STUDENT' })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    return students.map(s => AdminMapper.toStudentDTO(s));
  }

  /**
   * Retrieves single student by user ID.
   * 
   * @param {number|string} id
   * @returns {Promise<Object|null>} StudentAdminDTO or null
   */
  async getStudentById(id) {
    const userRepo = await this._getRepository('User');

    const student = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.studentProfile', 'studentProfile')
      .where('u.id = :id', { id: parseInt(id, 10) })
      .getOne();

    return student ? AdminMapper.toStudentDTO(student) : null;
  }

  /**
   * Creates a new student user and linked student profile.
   * 
   * @param {Object} data - Student registration data
   * @returns {Promise<Object>} Created StudentAdminDTO
   */
  async createStudent(data) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StudentProfile');

    const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Elev';

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
    if (data.email && data.email.trim()) {
      const email = data.email.trim().toLowerCase();
      const existingEmail = await userRepo.findOne({ where: { email } });
      if (existingEmail) {
        throw new Error(`E-postadressen "${data.email}" används redan av en annan användare.`);
      }
    }

    // Validate password (min 6 chars if custom, fallback to student123)
    let password = 'student123';
    if (data.password !== undefined && data.password !== null && data.password.trim().length > 0) {
      const trimmedPassword = data.password.trim();
      if (trimmedPassword.length < 6) {
        throw new Error('Lösenordet måste innehålla minst 6 tecken.');
      }
      password = trimmedPassword;
    }

    const user = userRepo.create({
      username,
      email: data.email ? data.email.trim().toLowerCase() : `${username}@equira.se`,
      passwordHash: hashPassword(password),
      role: 'STUDENT',
      fullName,
      phone: data.phone ? data.phone.trim() : null,
      avatarUrl: data.avatarUrl || '/images/default-avatar.jpg',
    });

    const savedUser = await userRepo.save(user);

    const profile = profileRepo.create({
      userId: savedUser.id,
      personnummer: data.personnummer,
      birthDate: data.birthDate,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation,
      ridingLevel: data.ridingLevel || 'Nivå 1',
      experienceYears: data.experienceYears ? parseInt(data.experienceYears, 10) : 0,
      heightCm: data.heightCm ? parseInt(data.heightCm, 10) : 165,
      weightKg: data.weightKg ? parseInt(data.weightKg, 10) : 60,
      primaryDiscipline: data.primaryDiscipline || 'Allround',
      preferredHorses: data.preferredHorses,
      specialNeeds: data.specialNeeds,
      membershipStatus: data.membershipStatus || 'Aktiv',
    });

    await profileRepo.save(profile);

    return this.getStudentById(savedUser.id);
  }

  /**
   * Updates an existing student and profile.
   * 
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated StudentAdminDTO
   */
  async updateStudent(id, data) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StudentProfile');

    const user = await userRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!user) throw new Error('Eleven kunde inte hittas.');

    user.fullName = data.fullName !== undefined ? data.fullName : user.fullName;
    user.email = data.email !== undefined ? data.email : user.email;
    user.phone = data.phone !== undefined ? data.phone : user.phone;
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;

    if (data.password !== undefined && data.password !== null && data.password.trim().length > 0) {
      const trimmedPassword = data.password.trim();
      if (trimmedPassword.length < 6) {
        throw new Error('Lösenordet måste innehålla minst 6 tecken.');
      }
      user.passwordHash = hashPassword(trimmedPassword);
    }

    await userRepo.save(user);

    let profile = await profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = profileRepo.create({ userId: user.id });
    }

    profile.personnummer = data.personnummer !== undefined ? data.personnummer : profile.personnummer;
    profile.birthDate = data.birthDate !== undefined ? data.birthDate : profile.birthDate;
    profile.address = data.address !== undefined ? data.address : profile.address;
    profile.postalCode = data.postalCode !== undefined ? data.postalCode : profile.postalCode;
    profile.city = data.city !== undefined ? data.city : profile.city;
    profile.emergencyContactName = data.emergencyContactName !== undefined ? data.emergencyContactName : profile.emergencyContactName;
    profile.emergencyContactPhone = data.emergencyContactPhone !== undefined ? data.emergencyContactPhone : profile.emergencyContactPhone;
    profile.emergencyContactRelation = data.emergencyContactRelation !== undefined ? data.emergencyContactRelation : profile.emergencyContactRelation;
    profile.ridingLevel = data.ridingLevel !== undefined ? data.ridingLevel : profile.ridingLevel;
    profile.experienceYears = data.experienceYears ? parseInt(data.experienceYears, 10) : profile.experienceYears;
    profile.heightCm = data.heightCm ? parseInt(data.heightCm, 10) : profile.heightCm;
    profile.weightKg = data.weightKg ? parseInt(data.weightKg, 10) : profile.weightKg;
    profile.primaryDiscipline = data.primaryDiscipline !== undefined ? data.primaryDiscipline : profile.primaryDiscipline;
    profile.preferredHorses = data.preferredHorses !== undefined ? data.preferredHorses : profile.preferredHorses;
    profile.specialNeeds = data.specialNeeds !== undefined ? data.specialNeeds : profile.specialNeeds;
    profile.membershipStatus = data.membershipStatus !== undefined ? data.membershipStatus : profile.membershipStatus;

    await profileRepo.save(profile);
    return this.getStudentById(user.id);
  }

  /**
   * Deletes a student and their bookings/profile.
   * 
   * @param {number|string} id
   * @returns {Promise<any>}
   */
  async deleteStudent(id) {
    const userRepo = await this._getRepository('User');
    const profileRepo = await this._getRepository('StudentProfile');
    const bookingRepo = await this._getRepository('LessonBooking');

    const parsedId = parseInt(id, 10);
    await bookingRepo.delete({ studentId: parsedId });
    await profileRepo.delete({ userId: parsedId });
    return await userRepo.delete({ id: parsedId });
  }
}

module.exports = new StudentsService();
