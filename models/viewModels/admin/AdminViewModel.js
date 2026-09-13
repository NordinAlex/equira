class AdminViewModel {
  /**
   * Formats complete admin dashboard overview data.
   * 
   * @param {Object} data
   * @returns {Object}
   */
  static formatOverview(data) {
    const { lessons = [], horses = [], students = [], warnings = [], staff = [], user } = data;

    const totalHorses = horses.length;
    const availableHorses = horses.filter(h => h.status === 'Aktiv & Tjänstbar').length;
    const restingHorses = horses.filter(h => h.status !== 'Aktiv & Tjänstbar').length;

    const formattedLessons = lessons.map(lesson => {
      const bookings = lesson.bookings || [];
      const totalBooked = bookings.length;
      const maxParticipants = lesson.maxParticipants || 8;
      const unassignedCount = bookings.filter(b => !b.horseId).length;

      let allocationStatus = 'Klar';
      let allocationBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (totalBooked === 0) {
        allocationStatus = 'Ej bokad';
        allocationBadgeClass = 'bg-gray-50 text-gray-600 border-gray-200';
      } else if (unassignedCount > 0) {
        allocationStatus = `${unassignedCount} saknas`;
        allocationBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      }

      return {
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.lessonType,
        level: lesson.level,
        timeRange: `${lesson.startTime} - ${lesson.endTime}`,
        instructorName: lesson.instructor ? lesson.instructor.fullName : 'Ej tilldelad',
        arenaName: lesson.arena ? lesson.arena.name : 'Ej vald',
        occupancyText: `${totalBooked}/${maxParticipants}`,
        isFull: totalBooked >= maxParticipants,
        allocationStatus,
        allocationBadgeClass,
        unassignedCount,
        status: lesson.status,
      };
    });

    const urgentWarnings = [];
    lessons.forEach(l => {
      const unassigned = (l.bookings || []).filter(b => !b.horseId);
      if (unassigned.length > 0) {
        urgentWarnings.push({
          lessonId: l.id,
          lessonTitle: l.title,
          time: `${l.date} ${l.startTime}`,
          message: `${unassigned.length} elev${unassigned.length > 1 ? 'er' : ''} saknar tilldelad häst`,
        });
      }
    });

    return {
      adminUser: user,
      kpis: {
        totalLessonsToday: lessons.length,
        activeStudents: students.length,
        totalHorsesInOperation: totalHorses,
        availableNow: availableHorses,
        needsRest: restingHorses,
        unassignedLessonsCount: urgentWarnings.length,
      },
      lessons: formattedLessons,
      urgentWarnings,
    };
  }

  /**
   * Formats horse registry for admin table and filter views.
   * 
   * @param {Array<Object>} horses
   * @param {string} [filter='all']
   * @returns {Object}
   */
  static formatHorses(horses, filter = 'all') {
    const currentYear = new Date().getFullYear();

    const formatted = horses.map(h => {
      const age = h.birthYear ? currentYear - h.birthYear : null;

      let statusBadgeClass = 'bg-emerald-100 text-emerald-800';
      if (h.status === 'Konvalescens / Skadad') {
        statusBadgeClass = 'bg-amber-100 text-amber-800';
      } else if (h.status === 'Vila / Bete') {
        statusBadgeClass = 'bg-rose-100 text-rose-800';
      }

      const traits = Array.isArray(h.temperamentTraits) ? h.temperamentTraits : [];

      return {
        id: h.id,
        name: h.name,
        officialName: h.officialName,
        breed: h.breed,
        age: age ? `${age} år` : 'Okänd ålder',
        gender: h.gender,
        heightCm: h.heightCm,
        maxRiderWeightKg: h.maxRiderWeightKg,
        build: h.build,
        mainDiscipline: h.mainDiscipline,
        levelText: `${h.mainDiscipline} | ${h.dressurLevel || 'Medel'}`,
        status: h.status,
        statusInfo: h.statusInfo,
        statusLabel: h.statusInfo ? `${h.status} (${h.statusInfo})` : h.status,
        statusBadgeClass,
        traits,
        photoUrl: h.photoUrl || '/images/default-horse.jpg',
        boxNumber: h.boxNumber,
        paddockNumber: h.paddockNumber,
      };
    });

    const total = formatted.length;
    const available = formatted.filter(h => h.status === 'Aktiv & Tjänstbar').length;
    const resting = formatted.filter(h => h.status !== 'Aktiv & Tjänstbar').length;

    return {
      horses: formatted,
      kpis: {
        total,
        available,
        resting,
      },
      currentFilter: filter,
    };
  }

  /**
   * Formats horse allocation workspace view.
   * 
   * @param {Object} lesson
   * @param {Array<Object>} availableHorses
   * @param {number|string|null} [selectedStudentId=null]
   * @returns {Object}
   */
  static formatAllocationView(lesson, availableHorses, selectedStudentId = null) {
    const bookings = (lesson.bookings || []).map(b => {
      const student = b.student || {};
      const profile = student.studentProfile || {};
      const isSelected = selectedStudentId ? b.studentId === parseInt(selectedStudentId, 10) : false;

      return {
        bookingId: b.id,
        studentId: b.studentId,
        name: student.fullName || student.username,
        initial: (student.fullName || 'E').charAt(0).toUpperCase(),
        level: profile.ridingLevel || 'Nybörjare',
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        assignedHorse: b.horse ? {
          id: b.horse.id,
          name: b.horse.name,
          photoUrl: b.horse.photoUrl,
        } : null,
        warning: b.assignmentWarning,
        isSelected,
      };
    });

    let activeStudent = null;
    if (selectedStudentId) {
      activeStudent = bookings.find(b => b.studentId === parseInt(selectedStudentId, 10)) || null;
    }
    if (!activeStudent && bookings.length > 0) {
      activeStudent = bookings.find(b => !b.assignedHorse) || bookings[0];
    }
    if (activeStudent) {
      activeStudent.isSelected = true;
      const bMatch = bookings.find(b => b.bookingId === activeStudent.bookingId);
      if (bMatch) bMatch.isSelected = true;
    }

    const formattedHorses = availableHorses.map(h => {
      const val = h.validation || { valid: true, warnings: [], errors: [] };
      const hasErrors = val.errors && val.errors.length > 0;
      const hasWarnings = val.warnings && val.warnings.length > 0;

      let badgeText = 'Lämplig';
      let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      let statusCategory = 'success';
      let primaryMessage = 'Matchar nivå och maxvikt';

      if (hasErrors) {
        statusCategory = 'error';
        badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
        primaryMessage = val.errors[0];

        if (primaryMessage.includes('denna lektion') || primaryMessage.includes('redan tilldelad')) {
          badgeText = 'Upptagen (i lektionen)';
        } else if (primaryMessage.includes('Tidskonflikt')) {
          badgeText = 'Upptagen (samma tid)';
        } else if (primaryMessage.includes('ej tjänstbar')) {
          badgeText = 'Ej tjänstbar';
        } else {
          badgeText = 'Ej valbar';
        }
      } else if (hasWarnings) {
        statusCategory = 'warning';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
        badgeText = 'Varning (SvRF)';
        primaryMessage = val.warnings[0];
      }

      return {
        id: h.id,
        name: h.name,
        breed: h.breed,
        photoUrl: h.photoUrl || '/images/default-horse.jpg',
        maxRiderWeightKg: h.maxRiderWeightKg,
        status: h.status,
        isValid: val.valid,
        warnings: val.warnings || [],
        errors: val.errors || [],
        badgeText,
        badgeClass,
        statusCategory,
        primaryMessage,
        isBookedInCurrentLesson: !!h.isBookedInCurrentLesson,
        assignedToStudentName: h.assignedToStudentName || null,
      };
    });

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.lessonType,
        level: lesson.level,
        date: lesson.date,
        time: `${lesson.startTime} - ${lesson.endTime}`,
        arenaName: lesson.arena ? lesson.arena.name : 'Ridhus',
        instructorName: lesson.instructor ? lesson.instructor.fullName : 'Instruktör',
      },
      bookings,
      activeStudent,
      availableHorses: formattedHorses,
    };
  }

  /**
   * Formats student roster table.
   * 
   * @param {Array<Object>} students
   * @returns {Array<Object>}
   */
  static formatStudents(students) {
    return students.map(s => {
      const p = s.studentProfile || {};
      return {
        id: s.id,
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        initials: (s.fullName || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        ridingLevel: p.ridingLevel || 'Nivå 2',
        groupName: p.primaryDiscipline || 'Allround',
        weightKg: p.weightKg,
        heightCm: p.heightCm,
        membershipStatus: p.membershipStatus || 'Aktiv',
        membershipClass: p.membershipStatus === 'Aktiv' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200',
        emergencyContact: p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactPhone || ''})` : 'Saknas',
      };
    });
  }

  /**
   * Formats staff roster table and KPI metrics.
   * 
   * @param {Array<Object>} [staffMembers=[]]
   * @param {string} [searchQuery='']
   * @param {string} [roleFilter='']
   * @returns {Object}
   */
  static formatStaffList(staffMembers = [], searchQuery = '', roleFilter = '') {
    const totalCount = staffMembers.length;
    let instructorCount = 0;
    let managerCount = 0;
    let stableStaffCount = 0;

    const formatted = staffMembers.map(s => {
      const p = s.staffProfile || {};
      const titleLower = (p.title || '').toLowerCase();
      const roleLower = (s.role || '').toLowerCase();

      let roleBadge = {
        label: p.title || 'Personal',
        class: 'bg-stone-100 text-stone-700 border-stone-200',
      };

      if (titleLower.includes('instruktör') || titleLower.includes('ridlärare')) {
        instructorCount++;
        roleBadge = {
          label: p.title || 'Instruktör',
          class: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      } else if (titleLower.includes('ansvarig') || roleLower === 'admin') {
        managerCount++;
        roleBadge = {
          label: p.title || 'Stallansvarig',
          class: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      } else {
        stableStaffCount++;
        roleBadge = {
          label: p.title || 'Stallpersonal',
          class: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      }

      const initials = (s.fullName || 'P')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        id: s.id,
        fullName: s.fullName,
        username: s.username,
        email: s.email,
        phone: s.phone || '–',
        avatarUrl: s.avatarUrl || '/images/default-staff.jpg',
        initials,
        role: s.role,
        title: p.title || 'Stallpersonal',
        roleBadge,
        specializations: p.specializations || [],
        specializationsRaw: p.specializationsRaw || '',
      };
    });

    return {
      staff: formatted,
      kpis: {
        total: totalCount,
        instructors: instructorCount,
        managers: managerCount,
        stableStaff: stableStaffCount,
      },
      searchQuery,
      roleFilter,
    };
  }

  /**
   * Formats lessons list and occupancy metrics.
   * 
   * @param {Array<Object>} lessons
   * @returns {Object}
   */
  static formatLessons(lessons) {
    const total = lessons.length;
    let totalBookings = 0;
    let totalCapacity = 0;
    let unassignedCount = 0;

    const formatted = lessons.map(l => {
      const bookings = l.bookings || [];
      const capacity = l.maxParticipants || 8;
      totalBookings += bookings.length;
      totalCapacity += capacity;

      const unassigned = bookings.filter(b => !b.horseId).length;
      if (unassigned > 0) unassignedCount++;

      let allocationBadge = {
        label: `Klar (${bookings.length}/${bookings.length})`,
        class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };

      if (bookings.length === 0) {
        allocationBadge = {
          label: 'Ej påbörjad',
          class: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      } else if (unassigned > 0) {
        allocationBadge = {
          label: `${unassigned} saknas`,
          class: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      }

      return {
        id: l.id,
        title: l.title,
        lessonType: l.lessonType,
        level: l.level,
        date: l.date,
        time: `${l.startTime} - ${l.endTime}`,
        arenaName: l.arena ? l.arena.name : 'Ej tilldelad',
        instructorName: l.instructor ? l.instructor.fullName : 'Ej instruktör',
        occupancyText: `${bookings.length}/${capacity} elever`,
        isFull: bookings.length >= capacity,
        allocationBadge,
        status: l.status,
      };
    });

    return {
      lessons: formatted,
      kpis: {
        totalLessons: total,
        totalBookings,
        totalCapacity,
        fillPercentage: totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0,
        unassignedCount,
      },
    };
  }

  /**
   * Formats stable tasks list separated by current vs completed.
   * 
   * @param {Array<Object>} tasks
   * @returns {Object}
   */
  static formatTasks(tasks) {
    const current = tasks.filter(t => t.status !== 'Klar');
    const completed = tasks.filter(t => t.status === 'Klar');

    return {
      currentTasks: current.map(t => this._formatTaskItem(t)),
      completedTasks: completed.map(t => this._formatTaskItem(t)),
      totalCount: tasks.length,
      currentCount: current.length,
      completedCount: completed.length,
    };
  }

  /**
   * Internal helper to format single task item.
   * 
   * @private
   * @param {Object} t
   * @returns {Object}
   */
  static _formatTaskItem(t) {
    let priorityClass = 'bg-gray-100 text-gray-700 border-gray-200';
    if (t.priority === 'Akut') {
      priorityClass = 'bg-rose-600 text-white font-semibold';
    } else if (t.priority === 'Viktig') {
      priorityClass = 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
    }

    return {
      id: t.id,
      title: t.title,
      taskType: t.taskType,
      location: t.location,
      time: t.dueTime,
      dueDate: t.dueDate,
      priority: t.priority,
      priorityClass,
      status: t.status,
      instructions: t.instructions,
      assignedStaffName: t.assignedTo ? t.assignedTo.fullName : 'Ej tilldelad',
      horseName: t.horse ? t.horse.name : null,
      checklist: t.checklist || [],
      completedAt: t.completedAt,
      completedByName: t.completedByName || (t.completedBy ? t.completedBy.fullName : null),
    };
  }

  /**
   * Formats quiz list with badges.
   * 
   * @param {Array<Object>} quizzes
   * @returns {Array<Object>}
   */
  static formatQuizzes(quizzes) {
    return quizzes.map(q => {
      let badgeClass = 'bg-emerald-100 text-emerald-800';
      if (q.category === 'Utrustning') badgeClass = 'bg-amber-100 text-amber-800';
      if (q.category === 'Ridning') badgeClass = 'bg-blue-100 text-blue-800';
      if (q.category === 'Stallkunskap') badgeClass = 'bg-stone-100 text-stone-800';

      return {
        id: q.id,
        title: q.title,
        category: q.category,
        badgeClass,
        description: q.description,
        difficulty: q.difficulty,
        questionCount: q.questionCount || 0,
        timeLimitMinutes: q.timeLimitMinutes,
        equestrianBadge: q.equestrianBadge,
        isPublished: q.isPublished,
        completedCount: q.completedCount || 0,
        averageScore: q.averageScore || 0,
      };
    });
  }

  /**
   * Formats weekly & daily schedule view model for admin/schedule.ejs.
   * 
   * @param {Object} data - Output of lessonsService.getScheduleData
   * @returns {Object} Formatted schedule view model
   */
  static formatSchedule(data) {
    const {
      lessons = [],
      arenas = [],
      weekDetails,
      selectedDate,
      currentView = 'week',
      selectedArenaId = null,
    } = data;

    const arenaQuery = selectedArenaId ? `&arenaId=${selectedArenaId}` : '';

    // Date range label: e.g. "14 sep – 20 sep"
    const mondayDate = new Date(weekDetails.mondayStr + 'T12:00:00');
    const sundayDate = new Date(weekDetails.sundayStr + 'T12:00:00');
    const startMonth = new Intl.DateTimeFormat('sv-SE', { month: 'short' }).format(mondayDate);
    const endMonth = new Intl.DateTimeFormat('sv-SE', { month: 'short' }).format(sundayDate);
    const dateRangeLabel = startMonth === endMonth
      ? `${mondayDate.getDate()} – ${sundayDate.getDate()} ${startMonth}`
      : `${mondayDate.getDate()} ${startMonth} – ${sundayDate.getDate()} ${endMonth}`;

    // KPI Metrics calculation
    let totalBookings = 0;
    let totalCapacity = 0;
    let unassignedLessonsCount = 0;
    const arenasUsedSet = new Set();

    lessons.forEach(l => {
      const bookings = l.bookings || [];
      totalBookings += bookings.length;
      totalCapacity += (l.maxParticipants || 8);
      const unassigned = bookings.filter(b => !b.horseId);
      if (unassigned.length > 0) {
        unassignedLessonsCount++;
      }
      if (l.arenaId) {
        arenasUsedSet.add(l.arenaId);
      }
    });

    const kpis = {
      totalLessons: lessons.length,
      totalBookings,
      totalCapacity,
      fillPercentage: totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0,
      unassignedLessonsCount,
      activeArenasCount: arenasUsedSet.size,
    };

    // Days representation
    const days = weekDetails.days.map(d => {
      const dayLessons = lessons.filter(l => l.date === d.dateStr);
      return {
        ...d,
        lessonCount: dayLessons.length,
        dayViewUrl: `/admin/schedule?date=${d.dateStr}&view=day${arenaQuery}`,
      };
    });

    // Helper to format a single lesson item for cards
    const formatLessonItem = (l) => {
      const bookings = l.bookings || [];
      const unassigned = bookings.filter(b => !b.horseId);
      const unassignedCount = unassigned.length;
      const totalBooked = bookings.length;
      const maxParticipants = l.maxParticipants || 8;

      let disciplineColor = 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100/80';
      if (l.lessonType === 'Hoppning') {
        disciplineColor = 'bg-rose-50 border-rose-500 text-rose-950 hover:bg-rose-100/80';
      } else if (l.lessonType === 'Dressyr') {
        disciplineColor = 'bg-purple-50 border-purple-600 text-purple-950 hover:bg-purple-100/80';
      } else if (l.lessonType === 'Teori' || l.lessonType === 'Uteritt') {
        disciplineColor = 'bg-amber-50 border-amber-500 text-amber-950 hover:bg-amber-100/80';
      }

      let allocationStatus = 'Klar';
      let allocationBadgeClass = 'bg-emerald-100 text-emerald-800';
      if (totalBooked === 0) {
        allocationStatus = '0 bokade';
        allocationBadgeClass = 'bg-stone-100 text-stone-600';
      } else if (unassignedCount > 0) {
        allocationStatus = `${unassignedCount} saknas`;
        allocationBadgeClass = 'bg-amber-100 text-amber-800 font-bold';
      }

      const instructorName = l.instructor ? l.instructor.fullName : 'Ej instruktör';
      const parts = instructorName.split(' ');
      const instructorShort = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

      return {
        id: l.id,
        title: l.title,
        lessonType: l.lessonType,
        level: l.level,
        targetGroup: l.targetGroup,
        date: l.date,
        startTime: l.startTime,
        endTime: l.endTime,
        timeRange: `${l.startTime} - ${l.endTime}`,
        arenaName: l.arena ? l.arena.name : 'Ridhus',
        arenaDimensions: l.arena ? l.arena.dimensions : '',
        arenaIsIndoor: l.arena ? l.arena.isIndoor : true,
        instructorName,
        instructorShort,
        totalBooked,
        maxParticipants,
        occupancyText: `${totalBooked}/${maxParticipants}`,
        isFull: totalBooked >= maxParticipants,
        unassignedCount,
        allocationStatus,
        allocationBadgeClass,
        disciplineColor,
        description: l.description,
        staffInstructions: l.staffInstructions,
        equipmentRequirements: l.equipmentRequirements,
        bookings: bookings.map(b => ({
          studentName: b.studentName || 'Elev',
          studentWeight: b.studentWeight,
          horseName: b.horseName || 'Saknar häst',
          horseCategory: b.horseCategory,
          hasHorse: !!b.horseId,
          weightWarning: b.horseMaxWeight && b.studentWeight && b.studentWeight > b.horseMaxWeight,
        })),
        assignUrl: `/admin/assign/${l.id}`,
      };
    };

    // Baseline hourly rows: 08:00 to 20:00
    const baselineSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00'
    ];

    const slotSet = new Set(baselineSlots);
    lessons.forEach(l => {
      if (l.startTime) {
        const hour = l.startTime.split(':')[0].padStart(2, '0') + ':00';
        slotSet.add(hour);
      }
    });
    const sortedSlots = Array.from(slotSet).sort();

    // Map: slot -> dateStr -> [lessons]
    const timetableGrid = [];
    sortedSlots.forEach(slot => {
      const slotHour = parseInt(slot.split(':')[0], 10);
      const row = {
        time: slot,
        dayCells: {},
      };

      days.forEach(d => {
        const slotLessons = lessons
          .filter(l => {
            if (l.date !== d.dateStr || !l.startTime) return false;
            const lHour = parseInt(l.startTime.split(':')[0], 10);
            return lHour === slotHour;
          })
          .map(formatLessonItem);

        row.dayCells[d.dateStr] = slotLessons;
      });

      timetableGrid.push(row);
    });

    // Day view data
    const activeDay = days.find(d => d.dateStr === selectedDate) || days.find(d => d.isToday) || days[0];
    const selectedDayLessons = lessons
      .filter(l => l.date === activeDay.dateStr)
      .map(formatLessonItem);

    return {
      currentView,
      selectedDate: activeDay.dateStr,
      selectedDayName: `${activeDay.dayNameLong} ${activeDay.dayNumber} ${startMonth}`,
      selectedArenaId,
      weekInfo: {
        weekNumber: weekDetails.weekNumber,
        label: `Vecka ${weekDetails.weekNumber}`,
        dateRangeLabel,
        isCurrentWeek: weekDetails.todayStr >= weekDetails.mondayStr && weekDetails.todayStr <= weekDetails.sundayStr,
        prevWeekUrl: `/admin/schedule?date=${weekDetails.prevWeekDate}&view=${currentView}${arenaQuery}`,
        nextWeekUrl: `/admin/schedule?date=${weekDetails.nextWeekDate}&view=${currentView}${arenaQuery}`,
        todayUrl: `/admin/schedule?view=${currentView}${arenaQuery}`,
        weekViewUrl: `/admin/schedule?date=${activeDay.dateStr}&view=week${arenaQuery}`,
        dayViewUrl: `/admin/schedule?date=${activeDay.dateStr}&view=day${arenaQuery}`,
      },
      kpis,
      days,
      timetableGrid,
      selectedDayLessons,
      arenas: arenas.map(a => ({
        id: a.id,
        name: a.name,
        isSelected: selectedArenaId === a.id,
        filterUrl: `/admin/schedule?date=${activeDay.dateStr}&view=${currentView}&arenaId=${a.id}`,
      })),
      allArenasUrl: `/admin/schedule?date=${activeDay.dateStr}&view=${currentView}`,
    };
  }

  /**
   * Formats admin profile data and riding school stats for presentation.
   * 
   * @param {Object} user
   * @param {Object} [stats={}]
   * @returns {Object}
   */
  static formatProfile(user, stats = {}) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '/images/default-staff.jpg',
      role: user.role,
      roleBadge: 'Huvudadministratör (ADMIN)',
      createdAtFormatted: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Aktiv sedan start',
      title: user.staffProfile?.title || 'Ridskolechef & Huvudinstruktör',
      specializations: user.staffProfile?.specializations || 'Administration, Verksamhetsansvarig, Säkerhet',
      stats: {
        totalHorses: stats.totalHorses || 0,
        totalStudents: stats.totalStudents || 0,
        totalStaff: stats.totalStaff || 0,
        totalLessons: stats.totalLessons || 0,
      },
    };
  }
}

module.exports = AdminViewModel;
