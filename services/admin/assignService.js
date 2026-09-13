const { getDataSource } = require('../../config/database');
const horseAllocationService = require('./horseAllocationService');
const AdminMapper = require('./adminMapper');


class AssignService {
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
   * Retrieves horse allocation workspace data for a lesson and selected student.
   * 
   * @param {number|string|null} lessonIdQuery
   * @param {number|string|null} studentIdQuery
   * @returns {Promise<Object|null>} Allocation view data
   */
  async getHorseAssignData(lessonIdQuery, studentIdQuery) {
    const lessonRepo = await this._getRepository('Lesson');

    let lesson = null;
    if (lessonIdQuery) {
      const found = await lessonRepo
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.arena', 'arena')
        .leftJoinAndSelect('l.instructor', 'instructor')
        .leftJoinAndSelect('l.bookings', 'bookings')
        .leftJoinAndSelect('bookings.student', 'student')
        .leftJoinAndSelect('student.studentProfile', 'studentProfile')
        .leftJoinAndSelect('bookings.horse', 'horse')
        .where('l.id = :id', { id: parseInt(lessonIdQuery, 10) })
        .getOne();
      lesson = found ? AdminMapper.toLessonDTO(found) : null;
    } else {
      const lessonsRaw = await lessonRepo
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.arena', 'arena')
        .leftJoinAndSelect('l.instructor', 'instructor')
        .leftJoinAndSelect('l.bookings', 'bookings')
        .leftJoinAndSelect('bookings.student', 'student')
        .leftJoinAndSelect('student.studentProfile', 'studentProfile')
        .leftJoinAndSelect('bookings.horse', 'horse')
        .orderBy('l.date', 'ASC')
        .addOrderBy('l.startTime', 'ASC')
        .getMany();
      
      const allLessons = lessonsRaw.map(l => AdminMapper.toLessonDTO(l));
      lesson = allLessons.find(l => (l.bookings || []).length > 0) || allLessons[0];
    }

    if (!lesson) return null;

    let selectedStudentId = studentIdQuery ? parseInt(studentIdQuery, 10) : null;
    if (!selectedStudentId && (lesson.bookings || []).length > 0) {
      const unassigned = lesson.bookings.find(b => !b.horseId);
      selectedStudentId = unassigned ? unassigned.studentId : lesson.bookings[0].studentId;
    }

    const availableHorses = await horseAllocationService.getAvailableHorsesForLesson(lesson.id, selectedStudentId);

    return {
      lesson,
      availableHorses,
      selectedStudentId,
    };
  }

  /**
   * Assigns or unassigns a horse for a student booking.
   * 
   * @param {number|string} bookingId
   * @param {number|string|null} horseId
   * @param {string} [action] - 'unassign' to clear allocation
   * @returns {Promise<Object>} Updated booking result
   */
  async assignHorse(bookingId, horseId, action) {
    if (action === 'unassign') {
      return await horseAllocationService.assignHorse(bookingId, null);
    }
    const parsedHorseId = horseId && parseInt(horseId, 10) ? parseInt(horseId, 10) : null;
    return await horseAllocationService.assignHorse(bookingId, parsedHorseId);
  }
}

module.exports = new AssignService();
