const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');

/**
 * LessonsService (Admin Domain)
 * 
 * Handles lesson scheduling, timetable queries, lesson creation,
 * and associated student booking initialization.
 * 
 */
class LessonsService {
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
   * Retrieves lessons with optional date filter or date range and arena filter.
   * 
   * @param {Object} [filter={}] - { date?: string, startDate?: string, endDate?: string, arenaId?: number|string }
   * @returns {Promise<Array<Object>>} List of LessonAdminDTOs
   */
  async getLessons(filter = {}) {
    const lessonRepo = await this._getRepository('Lesson');

    const query = lessonRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.arena', 'arena')
      .leftJoinAndSelect('l.instructor', 'instructor')
      .leftJoinAndSelect('l.bookings', 'bookings')
      .leftJoinAndSelect('bookings.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'studentProfile')
      .leftJoinAndSelect('bookings.horse', 'horse')
      .orderBy('l.date', 'ASC')
      .addOrderBy('l.startTime', 'ASC');

    if (filter.startDate && filter.endDate) {
      query.andWhere('l.date BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    } else if (filter.date) {
      query.andWhere('l.date = :date', { date: filter.date });
    }

    if (filter.arenaId) {
      query.andWhere('l.arenaId = :arenaId', { arenaId: parseInt(filter.arenaId, 10) });
    }

    const lessons = await query.getMany();
    return lessons.map(l => AdminMapper.toLessonDTO(l));
  }

  /**
   * Helper to compute ISO week date range and navigation details.
   * 
   * @private
   * @param {string} [dateInput] - YYYY-MM-DD
   * @returns {Object}
   */
  _calculateWeekDetails(dateInput) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Parse target date safely
    let targetDate;
    if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      targetDate = new Date(dateInput + 'T12:00:00');
    } else {
      targetDate = new Date(todayStr + 'T12:00:00');
    }

    // Swedish/ISO-8601: Week starts on Monday (1), Sunday is 7 / 0
    const dayOfWeek = targetDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + diffToMonday);

    const dayNamesShort = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR', 'SÖN'];
    const dayNamesLong = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        dayNameShort: dayNamesShort[i],
        dayNameLong: dayNamesLong[i],
        isToday: dateStr === todayStr,
        isSelected: dateStr === (dateInput || todayStr),
      });
    }

    // ISO week number calculation
    const thurs = new Date(monday);
    thurs.setDate(monday.getDate() + 3);
    const firstJan = new Date(thurs.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((thurs - firstJan) / 86400000 - 3 + ((firstJan.getDay() + 6) % 7)) / 7);

    // Prev week and next week Mondays
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    return {
      todayStr,
      mondayStr: days[0].dateStr,
      sundayStr: days[6].dateStr,
      weekNumber,
      days,
      prevWeekDate: prevMonday.toISOString().split('T')[0],
      nextWeekDate: nextMonday.toISOString().split('T')[0],
      currentWeekMonday: monday.toISOString().split('T')[0],
    };
  }

  /**
   * Retrieves aggregated schedule data for the admin schedule timetable.
   * 
   * @param {Object} [options={}]
   * @param {string} [options.date] - Targeted date string (YYYY-MM-DD)
   * @param {string} [options.view='week'] - View mode ('week' | 'day')
   * @param {string|number} [options.arenaId] - Optional arena filter ID
   * @returns {Promise<Object>}
   */
  async getScheduleData({ date, view = 'week', arenaId } = {}) {
    const arenaRepo = await this._getRepository('Arena');
    const arenas = await arenaRepo.find({ order: { name: 'ASC' } });

    const weekDetails = this._calculateWeekDetails(date);

    // Fetch lessons for the week (or day if day view)
    const filter = {
      startDate: weekDetails.mondayStr,
      endDate: weekDetails.sundayStr,
    };
    if (arenaId) {
      filter.arenaId = arenaId;
    }

    const lessons = await this.getLessons(filter);

    return {
      lessons,
      arenas,
      weekDetails,
      selectedDate: date || weekDetails.todayStr,
      currentView: view || 'week',
      selectedArenaId: arenaId ? parseInt(arenaId, 10) : null,
    };
  }

  /**
   * Retrieves form options for creating a new lesson (arenas, instructors, students).
   * 
   * @returns {Promise<{arenas: Array<Object>, instructors: Array<Object>, students: Array<Object>}>}
   */
  async getLessonCreateFormData() {
    const arenaRepo = await this._getRepository('Arena');
    const userRepo = await this._getRepository('User');

    const rawArenas = await arenaRepo.find();
    const arenas = rawArenas.map(a => ({
      ...a,
      imageUrl: a.imageUrl || (a.isIndoor ? '/images/arena-preview.jpg' : '/images/arena-outdoor.jpg'),
    }));
    const instructors = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.staffProfile', 'staffProfile')
      .where('u.role IN (:...roles)', { roles: ['STAFF', 'ADMIN'] })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    const students = await userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.studentProfile', 'studentProfile')
      .where('u.role = :role', { role: 'STUDENT' })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    return {
      arenas,
      instructors,
      students: students.map(s => AdminMapper.toStudentDTO(s)),
    };
  }

  /**
   * Creates a new lesson and initial student bookings.
   * 
   * @param {Object} body - Lesson form fields and studentIds
   * @returns {Promise<Object>} Created LessonAdminDTO
   */
  async createLesson(body) {
    const lessonRepo = await this._getRepository('Lesson');
    const bookingRepo = await this._getRepository('LessonBooking');

    const lesson = lessonRepo.create({
      title: body.title,
      lessonType: body.lessonType || 'Allround',
      level: body.level || 'Nivå 1',
      targetGroup: body.targetGroup || 'Alla',
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      arenaId: body.arenaId ? parseInt(body.arenaId, 10) : null,
      instructorId: body.instructorId ? parseInt(body.instructorId, 10) : null,
      maxParticipants: body.maxParticipants ? parseInt(body.maxParticipants, 10) : 8,
      minParticipants: body.minParticipants ? parseInt(body.minParticipants, 10) : 4,
      status: body.status || 'Schemalagd',
      description: body.description || '',
      staffInstructions: body.staffInstructions || '',
      equipmentRequirements: body.equipmentRequirements || '',
    });

    const savedLesson = await lessonRepo.save(lesson);

    const studentIds = body.studentIds
      ? (Array.isArray(body.studentIds) ? body.studentIds : [body.studentIds])
      : [];

    for (const sid of studentIds) {
      if (!sid) continue;
      const booking = bookingRepo.create({
        lessonId: savedLesson.id,
        studentId: parseInt(sid, 10),
        horseId: null,
        status: 'Bokad',
        assignedAt: new Date(),
      });
      await bookingRepo.save(booking);
    }

    return AdminMapper.toLessonDTO(savedLesson);
  }

  /**
   * Retrieves a single lesson by ID with arena, instructor, and bookings.
   * 
   * @param {string|number} id - Lesson ID
   * @returns {Promise<Object|null>} LessonAdminDTO or null
   */
  async getLessonById(id) {
    const lessonRepo = await this._getRepository('Lesson');

    const lesson = await lessonRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.arena', 'arena')
      .leftJoinAndSelect('l.instructor', 'instructor')
      .leftJoinAndSelect('l.ridingGroup', 'ridingGroup')
      .leftJoinAndSelect('l.bookings', 'bookings')
      .leftJoinAndSelect('bookings.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'studentProfile')
      .leftJoinAndSelect('bookings.horse', 'horse')
      .where('l.id = :id', { id: parseInt(id, 10) })
      .getOne();

    return lesson ? AdminMapper.toLessonDTO(lesson) : null;
  }

  /**
   * Updates an existing lesson and synchronizes student bookings.
   * 
   * @param {string|number} id - Lesson ID
   * @param {Object} body - Lesson form fields
   * @returns {Promise<Object>} Updated LessonAdminDTO
   */
  async updateLesson(id, body) {
    const lessonRepo = await this._getRepository('Lesson');
    const bookingRepo = await this._getRepository('LessonBooking');
    const lesson = await lessonRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!lesson) throw new Error('Lektionen kunde inte hittas');

    if (body.title !== undefined) lesson.title = body.title;
    if (body.lessonType !== undefined) lesson.lessonType = body.lessonType;
    if (body.level !== undefined) lesson.level = body.level;
    if (body.targetGroup !== undefined) lesson.targetGroup = body.targetGroup;
    if (body.date !== undefined) lesson.date = body.date;
    if (body.startTime !== undefined) lesson.startTime = body.startTime;
    if (body.endTime !== undefined) lesson.endTime = body.endTime;
    if (body.arenaId !== undefined) lesson.arenaId = body.arenaId ? parseInt(body.arenaId, 10) : null;
    if (body.instructorId !== undefined) lesson.instructorId = body.instructorId ? parseInt(body.instructorId, 10) : null;
    if (body.maxParticipants !== undefined) lesson.maxParticipants = parseInt(body.maxParticipants, 10);
    if (body.minParticipants !== undefined) lesson.minParticipants = parseInt(body.minParticipants, 10);
    if (body.status !== undefined) lesson.status = body.status;
    if (body.description !== undefined) lesson.description = body.description;
    if (body.staffInstructions !== undefined) lesson.staffInstructions = body.staffInstructions;
    if (body.equipmentRequirements !== undefined) lesson.equipmentRequirements = body.equipmentRequirements;

    const savedLesson = await lessonRepo.save(lesson);

    // Synchronize student bookings if hasStudentSelection was posted
    if (body.hasStudentSelection !== undefined) {
      const rawStudentIds = body.studentIds || [];
      const selectedStudentIds = (
        Array.isArray(rawStudentIds) ? rawStudentIds : [rawStudentIds]
      ).map(sid => parseInt(sid, 10)).filter(Boolean);

      const existingBookings = await bookingRepo.find({ where: { lessonId: savedLesson.id } });
      const existingStudentIds = existingBookings.map(b => b.studentId);

      // Remove unselected bookings
      for (const booking of existingBookings) {
        if (!selectedStudentIds.includes(booking.studentId)) {
          await bookingRepo.delete({ id: booking.id });
        }
      }

      // Add newly selected bookings
      for (const sid of selectedStudentIds) {
        if (!existingStudentIds.includes(sid)) {
          const newBooking = bookingRepo.create({
            lessonId: savedLesson.id,
            studentId: sid,
            horseId: null,
            status: 'Bokad',
            assignedAt: new Date(),
          });
          await bookingRepo.save(newBooking);
        }
      }
    }

    return await this.getLessonById(savedLesson.id);
  }

  /**
   * Deletes a lesson and all associated bookings.
   * 
   * @param {string|number} id - Lesson ID
   * @returns {Promise<any>}
   */
  async deleteLesson(id) {
    const lessonId = parseInt(id, 10);
    const bookingRepo = await this._getRepository('LessonBooking');
    const lessonRepo = await this._getRepository('Lesson');

    await bookingRepo.delete({ lessonId });
    return await lessonRepo.delete({ id: lessonId });
  }
}

module.exports = new LessonsService();
