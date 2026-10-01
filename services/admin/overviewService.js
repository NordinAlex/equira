const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');

/**
 * OverviewService (Admin Domain)
 *
 * Handles aggregation of data for the Admin Dashboard overview:
 * lessons for today, active horses, and registered students.
 *
 */
class OverviewService {
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
   * Retrieves complete admin dashboard overview data.
   *
   * @param {string} [dateStr] - Optional date string YYYY-MM-DD
   * @returns {Promise<{lessons: Array<Object>, horses: Array<Object>, students: Array<Object>}>}
   */
  async getOverviewData(dateStr) {
    const todayStr = dateStr || this._getTodayDateString();
    const lessonRepo = await this._getRepository('Lesson');
    const horseRepo = await this._getRepository('Horse');
    const userRepo = await this._getRepository('User');

    const lessonsRaw = await lessonRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.arena', 'arena')
      .leftJoinAndSelect('l.instructor', 'instructor')
      .leftJoinAndSelect('l.bookings', 'bookings')
      .leftJoinAndSelect('bookings.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'studentProfile')
      .leftJoinAndSelect('bookings.horse', 'horse')
      .where('l.date = :date', { date: todayStr })
      .orderBy('l.startTime', 'ASC')
      .getMany();

    const horsesRaw = await horseRepo.find({ order: { name: 'ASC' } });

    const studentsRaw = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.studentProfile', 'studentProfile')
      .where('u.role = :role', { role: 'STUDENT' })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    return {
      lessons: lessonsRaw.map((l) => AdminMapper.toLessonDTO(l)),
      horses: horsesRaw.map((h) => AdminMapper.toHorseDTO(h)),
      students: studentsRaw.map((s) => AdminMapper.toStudentDTO(s)),
    };
  }
}

module.exports = new OverviewService();
