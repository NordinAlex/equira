const { getDataSource } = require('../../config/database');

class HorseAllocationService {
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
   * Validates allocation of a horse to a student in a lesson.
   * Checks:
   * 1. Health status (Aktiv & Tjänstbar vs Konvalescens / Vila)
   * 2. Simultaneous assignment in the same lesson (blocking)
   * 3. Max rider weight (SvRF warning)
   * 4. Max lessons per day (warning)
   * 5. Time conflict / overlapping lessons on the same day (blocking)
   * 6. Consecutive lessons / rest time (< 30 min warning)
   * 7. Jump lesson weekly limit (warning)
   * 8. Level & temperament compatibility (warning)
   * 
   * @param {number|string} studentId
   * @param {number|string} horseId
   * @param {number|string} lessonId
   * @param {number|string|null} [currentBookingId=null]
   * @returns {Promise<{valid: boolean, errors: Array<string>, warnings: Array<string>, horse: Object, student: Object, lesson: Object}>}
   */
  async validateAllocation(studentId, horseId, lessonId, currentBookingId = null) {
    const horseRepo = await this._getRepository('Horse');
    const userRepo = await this._getRepository('User');
    const lessonRepo = await this._getRepository('Lesson');
    const bookingRepo = await this._getRepository('LessonBooking');

    const horse = await horseRepo.findOne({ where: { id: parseInt(horseId, 10) } });
    const student = await userRepo.findOne({
      where: { id: parseInt(studentId, 10) },
      relations: { studentProfile: true },
    });
    const lesson = await lessonRepo.findOne({
      where: { id: parseInt(lessonId, 10) },
      relations: { arena: true, instructor: true },
    });

    if (!horse || !student || !lesson) {
      return {
        valid: false,
        errors: ['Häst, elev eller lektion kunde inte hittas.'],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];

    // 1. Health status check (Blocking Error)
    if (horse.status !== 'Aktiv & Tjänstbar') {
      errors.push(`Hästen ${horse.name} är ej tjänstbar (${horse.status}${horse.statusInfo ? ': ' + horse.statusInfo : ''}).`);
    }

    // 2. Same lesson duplicate assignment check (Blocking Error)
    const sameLessonBookings = await bookingRepo
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.student', 's')
      .where('b.lessonId = :lessonId', { lessonId: lesson.id })
      .andWhere('b.horseId = :horseId', { horseId: horse.id })
      .getMany();

    const conflictingBooking = sameLessonBookings.find(b => {
      if (currentBookingId && b.id === parseInt(currentBookingId, 10)) return false;
      return b.studentId !== parseInt(studentId, 10);
    });

    if (conflictingBooking) {
      const otherName = conflictingBooking.student?.fullName || conflictingBooking.student?.username || 'en annan elev';
      errors.push(`Hästen ${horse.name} är redan tilldelad till ${otherName} i denna lektion.`);
    }

    // 3. Rider weight check (SvRF Warning)
    const riderWeight = student.studentProfile ? student.studentProfile.weightKg : null;
    if (riderWeight && horse.maxRiderWeightKg) {
      if (riderWeight > horse.maxRiderWeightKg) {
        warnings.push(
          `Viktvarning (SvRF): Elevens vikt (${riderWeight} kg) överskrider ${horse.name}s max ryttarvikt (${horse.maxRiderWeightKg} kg).`
        );
      } else if (riderWeight > horse.maxRiderWeightKg - 5) {
        warnings.push(
          `Nära maxvikt: Elevens vikt (${riderWeight} kg) är nära ${horse.name}s maxgräns (${horse.maxRiderWeightKg} kg).`
        );
      }
    }

    // 4. Max lessons per day & overlap checks on same date
    const dayBookings = await bookingRepo
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.lesson', 'l')
      .where('b.horseId = :horseId', { horseId: horse.id })
      .andWhere('l.date = :date', { date: lesson.date })
      .andWhere('b.lessonId != :currentLessonId', { currentLessonId: lesson.id })
      .getMany();

    const maxDayLessons = horse.maxLessonsPerDay || 2;
    if (dayBookings.length >= maxDayLessons) {
      warnings.push(
        `Maxpass uppnått: ${horse.name} har redan ${dayBookings.length} pass inbokade den ${lesson.date} (max ${maxDayLessons} pass/dag).`
      );
    }

    // 5. Time conflict (overlapping lessons) & rest interval checks
    for (const b of dayBookings) {
      const otherLesson = b.lesson;
      if (otherLesson && otherLesson.id !== lesson.id) {
        const currentStart = this._parseTimeToMinutes(lesson.startTime);
        const currentEnd = this._parseTimeToMinutes(lesson.endTime);
        const otherStart = this._parseTimeToMinutes(otherLesson.startTime);
        const otherEnd = this._parseTimeToMinutes(otherLesson.endTime);

        // Overlap formula: currentStart < otherEnd && currentEnd > otherStart (Blocking Error)
        if (currentStart < otherEnd && currentEnd > otherStart) {
          errors.push(
            `Tidskonflikt: Hästen ${horse.name} är redan tilldelad till lektionen "${otherLesson.title}" vid samma tid (${otherLesson.startTime}-${otherLesson.endTime}).`
          );
        } else {
          // Check rest interval (< 30 mins) if adjacent (Warning)
          if (currentStart >= otherEnd) {
            const restBefore = currentStart - otherEnd;
            if (restBefore < 30) {
              warnings.push(
                `Kort vila: Endast ${restBefore} minuters vila mellan "${otherLesson.title}" och denna lektion (rekommenderat min 30 min).`
              );
            }
          } else if (otherStart >= currentEnd) {
            const restAfter = otherStart - currentEnd;
            if (restAfter < 30) {
              warnings.push(
                `Kort vila: Endast ${restAfter} minuters vila efter denna lektion innan "${otherLesson.title}" (rekommenderat min 30 min).`
              );
            }
          }
        }
      }
    }

    // 6. Jump lesson weekly quota check (Warning)
    if (lesson.lessonType && lesson.lessonType.toLowerCase().includes('hopp')) {
      const maxJump = horse.maxJumpLessonsPerWeek || 2;
      const weekBookings = await bookingRepo
        .createQueryBuilder('b')
        .innerJoinAndSelect('b.lesson', 'l')
        .where('b.horseId = :horseId', { horseId: horse.id })
        .andWhere('l.lessonType LIKE :jumpType', { jumpType: '%Hopp%' })
        .andWhere('b.lessonId != :currentLessonId', { currentLessonId: lesson.id })
        .getMany();

      if (weekBookings.length >= maxJump) {
        warnings.push(
          `Hoppkvot: ${horse.name} har redan ${weekBookings.length} hoppass denna vecka (rekommenderat max ${maxJump}/vecka).`
        );
      }
    }

    // 7. Temperament & rider experience matching (Warning)
    if (student.studentProfile && horse.temperamentTraits) {
      const studentLevel = student.studentProfile.ridingLevel || 'Nybörjare';
      const isBeginner = studentLevel.toLowerCase().includes('nybörjare') || studentLevel.toLowerCase().includes('nivå 1');
      const traits = horse.temperamentTraits.toLowerCase();
      if (isBeginner && (traits.includes('pigg') || traits.includes('känslig') || traits.includes('erfaren'))) {
        warnings.push(`Nivåmatchning: ${horse.name} beskrivs som pigg/känslig och kan kräva en mer rutinerad ryttare än ${studentLevel}.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      horse,
      student,
      lesson,
    };
  }

  /**
   * Assigns or unassigns a horse to a booking after SvRF validation.
   * 
   * @param {number|string} bookingId
   * @param {number|string|null} horseId
   * @returns {Promise<Object>}
   */
  async assignHorse(bookingId, horseId) {
    const bookingRepo = await this._getRepository('LessonBooking');
    const parsedBookingId = parseInt(bookingId, 10);
    const parsedHorseId = horseId ? parseInt(horseId, 10) : null;

    const booking = await bookingRepo.findOne({
      where: { id: parsedBookingId },
      relations: { lesson: true, student: true },
    });

    if (!booking) {
      throw new Error('Bokningen hittades inte.');
    }

    if (!parsedHorseId) {
      // Unassign
      booking.horseId = null;
      booking.assignmentWarning = null;
      booking.assignedAt = null;
      return await bookingRepo.save(booking);
    }

    const validation = await this.validateAllocation(booking.studentId, parsedHorseId, booking.lessonId, booking.id);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }

    booking.horseId = parsedHorseId;
    booking.assignmentWarning = validation.warnings.length > 0 ? validation.warnings.join(' | ') : null;
    booking.assignedAt = new Date();

    return await bookingRepo.save(booking);
  }

  /**
   * Retrieves available horses for a lesson with validation warnings/errors.
   * 
   * @param {number|string} lessonId
   * @param {number|string|null} [studentId=null]
   * @returns {Promise<Array<Object>>}
   */
  async getAvailableHorsesForLesson(lessonId, studentId = null) {
    const horseRepo = await this._getRepository('Horse');
    const bookingRepo = await this._getRepository('LessonBooking');
    const parsedLessonId = parseInt(lessonId, 10);
    const parsedStudentId = studentId ? parseInt(studentId, 10) : null;

    const horses = await horseRepo.find({ order: { name: 'ASC' } });

    const currentLessonBookings = await bookingRepo.find({
      where: { lessonId: parsedLessonId },
      relations: { student: true, horse: true },
    });

    const result = [];
    for (const h of horses) {
      let validation = { valid: true, warnings: [], errors: [] };
      const currentAssignment = currentLessonBookings.find(b => b.horseId === h.id);

      if (parsedStudentId) {
        const studentBooking = currentLessonBookings.find(b => b.studentId === parsedStudentId);
        validation = await this.validateAllocation(
          parsedStudentId,
          h.id,
          parsedLessonId,
          studentBooking ? studentBooking.id : null
        );
      } else {
        if (h.status !== 'Aktiv & Tjänstbar') {
          validation.valid = false;
          validation.errors.push(`Hästen ${h.name} är ej tjänstbar (${h.status}${h.statusInfo ? ': ' + h.statusInfo : ''}).`);
        }
        if (currentAssignment) {
          validation.valid = false;
          const sName = currentAssignment.student?.fullName || 'en annan elev';
          validation.errors.push(`Hästen ${h.name} är redan tilldelad till ${sName} i denna lektion.`);
        }
      }

      result.push({
        ...h,
        validation,
        isBookedInCurrentLesson: !!currentAssignment,
        assignedToStudentName: currentAssignment ? (currentAssignment.student?.fullName || 'Elev') : null,
      });
    }
    return result;
  }

  /**
   * Internal helper to convert HH:MM string to minutes.
   * 
   * @private
   * @param {string} timeStr
   * @returns {number}
   */
  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  }
}

module.exports = new HorseAllocationService();
