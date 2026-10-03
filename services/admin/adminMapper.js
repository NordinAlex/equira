/**
 * AdminMapper (Admin Domain)
 * 
 * Maps raw TypeORM entities into normalized Admin DTOs for horses, lessons,
 * students, staff, quizzes, and tasks, ensuring consistent data structures
 * for the admin portal.
 * 
 */
class AdminMapper {
  /**
   * Safely parses JSON strings with a fallback default.
   * Internal helper ensuring zero external shared dependencies (KISS & SoC).
   * 
   * @private
   * @param {string|Array|Object} field - Raw data from database entity
   * @param {*} fallback - Default fallback value if parsing fails
   * @returns {*} Parsed value or fallback
   */
  static _safeJsonParse(field, fallback = []) {
    if (!field) return fallback;
    if (Array.isArray(field)) return field;
    if (typeof field === 'object') return field;
    try {
      return typeof field === 'string' ? JSON.parse(field) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Maps a Horse entity into a clean Admin Horse DTO.
   * 
   * @param {Object} horse - Raw TypeORM Horse entity
   * @returns {Object|null} Normalized Horse DTO
   */
  static toHorseDTO(horse) {
    if (!horse) return null;

    return {
      id: horse.id,
      name: horse.name,
      officialName: horse.officialName || horse.name,
      breed: horse.breed || 'Svenskt Varmblod',
      gender: horse.gender || 'Valack',
      birthYear: horse.birthYear || 2015,
      chipNumber: horse.chipNumber || '',
      passportNumber: horse.passportNumber || '',
      status: horse.status || 'Aktiv & Tjänstbar',
      statusInfo: horse.statusInfo || '',
      maxLessonsPerDay: horse.maxLessonsPerDay || 2,
      maxJumpLessonsPerWeek: horse.maxJumpLessonsPerWeek || 2,
      boxNumber: horse.boxNumber || 'Box 1',
      paddockNumber: horse.paddockNumber || 'Hage 1',
      category: horse.category || 'Storhäst',
      heightCm: horse.heightCm || 165,
      maxRiderWeightKg: horse.maxRiderWeightKg || 75,
      build: horse.build || 'Normal',
      mainDiscipline: horse.mainDiscipline || 'Allround',
      dressurLevel: horse.dressurLevel || 'Lätt A',
      jumpingLevel: horse.jumpingLevel || '80 cm',
      suitableLevels: this._safeJsonParse(horse.suitableLevels, ['Nivå 1', 'Nivå 2']),
      temperamentTraits: this._safeJsonParse(horse.temperamentTraits, ['Snäll']),
      temperamentDescription: horse.temperamentDescription || '',
      ridingDescription: horse.ridingDescription || '',
      description: horse.description || '',
      importantInfo: horse.importantInfo || '',
      warningsInstructions: horse.warningsInstructions || '',
      equipmentNotes: horse.equipmentNotes || '',
      healthNotes: horse.healthNotes || '',
      lastVaccination: horse.lastVaccination || '',
      lastShoeing: horse.lastShoeing || '',
      photoUrl: horse.photoUrl || '/images/default-horse.jpg',
    };
  }

  /**
   * Maps a Lesson entity with arena, instructor, and bookings into an Admin Lesson DTO.
   * 
   * @param {Object} lesson - Raw TypeORM Lesson entity
   * @returns {Object|null} Normalized Lesson DTO
   */
  static toLessonDTO(lesson) {
    if (!lesson) return null;

    return {
      id: lesson.id,
      title: lesson.title,
      lessonType: lesson.lessonType || 'Allround',
      level: lesson.level || 'Medel',
      targetGroup: lesson.targetGroup || 'Alla',
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      arenaId: lesson.arenaId,
      arena: lesson.arena ? {
        id: lesson.arena.id,
        name: lesson.arena.name,
        dimensions: lesson.arena.dimensions,
        isIndoor: lesson.arena.isIndoor,
      } : null,
      instructorId: lesson.instructorId,
      instructor: lesson.instructor ? {
        id: lesson.instructor.id,
        fullName: lesson.instructor.fullName,
      } : null,
      ridingGroupId: lesson.ridingGroupId,
      ridingGroup: lesson.ridingGroup ? {
        id: lesson.ridingGroup.id,
        name: lesson.ridingGroup.name,
      } : null,
      maxParticipants: lesson.maxParticipants || 8,
      minParticipants: lesson.minParticipants || 4,
      status: lesson.status || 'Schemalagd',
      description: lesson.description || '',
      staffInstructions: lesson.staffInstructions || '',
      equipmentRequirements: lesson.equipmentRequirements || '',
      bookings: (lesson.bookings || []).map(b => ({
        id: b.id,
        lessonId: b.lessonId,
        studentId: b.studentId,
        studentName: b.student?.fullName || b.student?.username || 'Elev',
        studentWeight: b.student?.studentProfile?.weightKg || null,
        horseId: b.horseId,
        horseName: b.horse?.name || null,
        horseCategory: b.horse?.category || null,
        horseMaxWeight: b.horse?.maxRiderWeightKg || null,
        horseStatus: b.horse?.status || null,
        status: b.status || 'Bokad',
        student: b.student || null,
        horse: b.horse || null,
      })),
    };
  }

  /**
   * Maps a User entity with StudentProfile into an Admin Student DTO.
   * 
   * @param {Object} user - Raw TypeORM User entity
   * @returns {Object|null} Normalized Student DTO
   */
  static toStudentDTO(user) {
    if (!user) return null;
    const profile = user.studentProfile || {};

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '–',
      avatarUrl: user.avatarUrl || '/images/default-avatar.jpg',
      role: user.role,
      membershipStatus: profile.membershipStatus || 'Aktiv',
      studentProfile: {
        id: profile.id,
        personnummer: profile.personnummer || '',
        birthDate: profile.birthDate || '',
        address: profile.address || '',
        postalCode: profile.postalCode || '',
        city: profile.city || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
        ridingLevel: profile.ridingLevel || 'Nivå 1',
        experienceYears: profile.experienceYears || 0,
        heightCm: profile.heightCm || 165,
        weightKg: profile.weightKg || 60,
        primaryDiscipline: profile.primaryDiscipline || 'Allround',
        preferredHorses: profile.preferredHorses || '',
        specialNeeds: profile.specialNeeds || '',
        membershipStatus: profile.membershipStatus || 'Aktiv',
      },
    };
  }

  /**
   * Maps a StableTask entity into an Admin Task DTO.
   * 
   * @param {Object} task - Raw TypeORM StableTask entity
   * @returns {Object|null} Normalized Task DTO
   */
  static toTaskDTO(task) {
    if (!task) return null;

    return {
      id: task.id,
      title: task.title,
      taskType: task.taskType || 'Stalluppgift',
      location: task.location || 'Stallet',
      horseId: task.horseId,
      horseName: task.horse ? task.horse.name : null,
      horse: task.horse ? { id: task.horse.id, name: task.horse.name } : null,
      assignedToUserId: task.assignedToUserId,
      assignedTo: task.assignedTo ? { id: task.assignedTo.id, fullName: task.assignedTo.fullName } : null,
      assignedToName: task.assignedTo ? task.assignedTo.fullName : 'Otilldelad',
      completedByUserId: task.completedByUserId,
      completedByName: task.completedBy ? task.completedBy.fullName : null,
      dueDate: task.dueDate,
      dueTime: task.dueTime || '12:00',
      priority: task.priority || 'Normal',
      status: task.status || 'Väntar',
      description: task.description || '',
      instructions: task.instructions || task.description || '',
      checklist: this._safeJsonParse(task.checklist, []),
      notes: task.notes || '',
      completedAt: task.completedAt,
    };
  }

  /**
   * Maps a Quiz entity with aggregated stats into an Admin Quiz DTO.
   * 
   * @param {Object} quiz - Raw TypeORM Quiz entity with questions and attempts
   * @returns {Object|null} Normalized Quiz DTO
   */
  static toQuizDTO(quiz) {
    if (!quiz) return null;
    const attempts = quiz.attempts || [];
    const completedCount = attempts.length;
    const passCount = attempts.filter(a => a.passed).length;
    const averageScore = completedCount > 0
      ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / completedCount)
      : 0;

    return {
      id: quiz.id,
      title: quiz.title,
      category: quiz.category,
      description: quiz.description,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passPercentage: quiz.passPercentage,
      equestrianBadge: quiz.equestrianBadge,
      targetLevel: quiz.targetLevel,
      isPublished: quiz.isPublished,
      questionCount: (quiz.questions || []).length,
      completedCount,
      passCount,
      averageScore,
    };
  }

  /**
   * Maps a User entity with StaffProfile into an Admin Staff DTO.
   * 
   * @param {Object} user - Raw TypeORM User entity
   * @returns {Object|null} Normalized Staff DTO
   */
  static toStaffDTO(user) {
    if (!user) return null;
    const profile = user.staffProfile || {};

    let specializations = [];
    if (profile.specializations) {
      if (Array.isArray(profile.specializations)) {
        specializations = profile.specializations;
      } else if (typeof profile.specializations === 'string') {
        specializations = profile.specializations
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || profile.phone || '–',
      avatarUrl: user.avatarUrl || '/images/default-avatar.jpg',
      role: user.role,
      staffProfile: {
        id: profile.id,
        title: profile.title || 'Stallpersonal',
        phone: profile.phone || user.phone || '',
        specializations,
        specializationsRaw: profile.specializations || '',
      },
    };
  }
}

module.exports = AdminMapper;
