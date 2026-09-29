const { getDataSource } = require('../../config/database');

/**
 * TimeTrackingService (Admin Domain)
 * Handles administrative time tracking management, manual clocking, audits, and reporting.
 */
class AdminTimeTrackingService {
  async _getRepository(entityName) {
    const ds = await getDataSource();
    return ds.getRepository(entityName);
  }

  getTodayDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getYesterdayDateString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.getTodayDateString(d);
  }

  formatDuration(minutes) {
    if (!minutes || minutes < 0) return '0h 00m';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }

  formatTime(dateObj) {
    if (!dateObj) return '–';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '–';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Calculates gross elapsed time, break deduction, net worked hours,
   * planned working time, and automatic overtime/undertime for an entry.
   */
  calculateOvertime(entry, now = new Date()) {
    // 1. Calculate gross duration in minutes between check-in and check-out (or now if active)
    let grossMinutes = entry.durationMinutes || 0;
    if (entry.status === 'INSTAMPLAD' && entry.checkInTime) {
      const diffMs = Math.max(0, now.getTime() - new Date(entry.checkInTime).getTime());
      grossMinutes = Math.floor(diffMs / 60000);
    } else if (entry.checkInTime && entry.checkOutTime) {
      const diffMs = Math.max(0, new Date(entry.checkOutTime).getTime() - new Date(entry.checkInTime).getTime());
      grossMinutes = Math.floor(diffMs / 60000);
    }

    // 2. Break deduction calculation
    let breakMinutes = (entry.breakMinutes !== undefined && entry.breakMinutes !== null) ? entry.breakMinutes : 60;
    if (grossMinutes < 300) { // < 5 hours
      breakMinutes = 0;
    } else if (grossMinutes < 450) { // 5 to 7.5 hours
      breakMinutes = Math.min(breakMinutes, 30);
    }

    // 3. Actual net worked minutes
    const netWorkedMinutes = Math.max(0, grossMinutes - breakMinutes);

    // 4. Planned net working minutes
    let plannedNetMinutes = 480; // default 8 hours (8.0 * 60)
    if (entry.plannedHours && entry.plannedHours > 0) {
      plannedNetMinutes = Math.round(parseFloat(entry.plannedHours) * 60);
    } else if (entry.plannedStartTime && entry.plannedEndTime) {
      const [sh, sm] = entry.plannedStartTime.split(':').map(Number);
      let [eh, em] = entry.plannedEndTime.split(':').map(Number);
      let sMin = (sh || 0) * 60 + (sm || 0);
      let eMin = (eh || 0) * 60 + (em || 0);
      if (eMin < sMin) eMin += 24 * 60;
      const plannedElapsed = eMin - sMin;
      const pBreak = plannedElapsed >= 630 ? 90 : (plannedElapsed >= 450 ? 60 : (plannedElapsed >= 300 ? 30 : 0));
      plannedNetMinutes = Math.max(0, plannedElapsed - pBreak);
    }

    // 5. Diff & Overtime
    let diffMinutes = 0;
    if (entry.status === 'AVSLUTAD' || entry.status === 'JUSTERAD' || (entry.status === 'INSTAMPLAD' && grossMinutes > 0)) {
      diffMinutes = netWorkedMinutes - plannedNetMinutes;
    }

    const overtimeMinutes = diffMinutes > 0 ? diffMinutes : 0;

    const undertimeMinutes = diffMinutes < 0 ? Math.abs(diffMinutes) : 0;

    let diffFormatted = '0 min';
    let diffType = 'neutral';
    if (diffMinutes > 0) {
      diffFormatted = `+${this.formatDuration(diffMinutes)}`;
      diffType = 'positive';
    } else if (diffMinutes < 0) {
      diffFormatted = `-${this.formatDuration(undertimeMinutes)}`;
      diffType = 'negative';
    }

    return {
      grossMinutes,
      grossHours: (grossMinutes / 60).toFixed(1),
      breakMinutes,
      breakFormatted: this.formatDuration(breakMinutes),
      netWorkedMinutes,
      netWorkedHours: (netWorkedMinutes / 60).toFixed(2),
      plannedNetMinutes,
      plannedNetHours: (plannedNetMinutes / 60).toFixed(1),
      diffMinutes,
      diffFormatted,
      diffType,
      overtimeMinutes,
      overtimeHours: (overtimeMinutes / 60).toFixed(2),
      overtimeFormatted: this.formatDuration(overtimeMinutes),
      undertimeMinutes,
      undertimeFormatted: this.formatDuration(undertimeMinutes),
    };
  }

  /**
   * Retrieves high-level overview statistics for admin dashboard
   */
  async getOverviewStats() {
    const repo = await this._getRepository('TimeEntry');
    const todayStr = this.getTodayDateString();

    const todayEntries = await repo.find({
      where: { date: todayStr },
      relations: { user: true },
    });

    const activeEntries = todayEntries.filter(e => e.status === 'INSTAMPLAD');
    const completedEntries = todayEntries.filter(e => e.status === 'AVSLUTAD' || e.status === 'JUSTERAD');

    let totalWorkedMinutes = 0;
    let totalOvertimeMinutes = 0;
    const now = new Date();

    todayEntries.forEach(e => {
      const calc = this.calculateOvertime(e, now);
      totalWorkedMinutes += calc.netWorkedMinutes;
      totalOvertimeMinutes += calc.overtimeMinutes;
    });

    const overtimeCount = completedEntries.filter(e => {
      const calc = this.calculateOvertime(e, now);
      return calc.overtimeMinutes > 0;
    }).length;

    return {
      activeCount: activeEntries.length,
      totalHoursTodayStr: this.formatDuration(totalWorkedMinutes),
      totalHoursDecimal: (totalWorkedMinutes / 60).toFixed(1),
      plannedShiftsCount: todayEntries.length,
      completedShiftsCount: completedEntries.length,
      overtimeCount,
      totalOvertimeMinutes,
      totalOvertimeStr: this.formatDuration(totalOvertimeMinutes),
    };
  }

  /**
   * Returns list of staff currently clocked in (active on site)
   */
  async getActiveStaff() {
    const repo = await this._getRepository('TimeEntry');
    const now = new Date();

    const activeEntries = await repo.find({
      where: { status: 'INSTAMPLAD' },
      relations: { user: { staffProfile: true } },
      order: { checkInTime: 'ASC' },
    });

    return activeEntries.map(e => {
      let elapsedMinutes = 0;
      if (e.checkInTime) {
        const diffMs = Math.max(0, now.getTime() - new Date(e.checkInTime).getTime());
        elapsedMinutes = Math.floor(diffMs / 60000);
      }

      return {
        id: e.id,
        userId: e.userId,
        fullName: e.user ? e.user.fullName : 'Okänd personal',
        avatarUrl: (e.user && e.user.avatarUrl) ? e.user.avatarUrl : '/images/default-staff.jpg',
        title: (e.user && e.user.staffProfile) ? e.user.staffProfile.title : 'Stallpersonal',
        checkInTimeStr: this.formatTime(e.checkInTime),
        elapsedStr: this.formatDuration(elapsedMinutes),
        plannedPassStr: `${e.plannedStartTime} – ${e.plannedEndTime}`,
        subtextNote: e.subtextNote || 'Arbetar på anläggningen',
        date: e.date,
      };
    });
  }

  /**
   * Returns all staff and admin users for dropdown selection
   */
  async getAllStaffUsers() {
    const userRepo = await this._getRepository('User');
    const users = await userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.staffProfile', 'sp')
      .where('u.role IN (:...roles)', { roles: ['STAFF', 'ADMIN'] })
      .orWhere('sp.id IS NOT NULL')
      .orderBy('u.fullName', 'ASC')
      .getMany();

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      title: u.staffProfile ? u.staffProfile.title : (u.role === 'ADMIN' ? 'Administratör' : 'Personal'),
      avatarUrl: u.avatarUrl || '/images/default-staff.jpg',
    }));
  }

  /**
   * Retrieves and formats all time entries with optional filters
   */
  async getAllTimeEntries(filters = {}) {
    const repo = await this._getRepository('TimeEntry');
    const qb = repo
      .createQueryBuilder('te')
      .leftJoinAndSelect('te.user', 'u')
      .leftJoinAndSelect('u.staffProfile', 'sp')
      .orderBy('te.date', 'DESC')
      .addOrderBy('te.checkInTime', 'DESC')
      .addOrderBy('te.id', 'DESC');

    const todayStr = this.getTodayDateString();
    const yesterdayStr = this.getYesterdayDateString();

    if (filters.date) {
      if (filters.date === 'today') {
        qb.andWhere('te.date = :date', { date: todayStr });
      } else if (filters.date === 'yesterday') {
        qb.andWhere('te.date = :date', { date: yesterdayStr });
      } else if (filters.date !== 'all') {
        qb.andWhere('te.date = :date', { date: filters.date });
      }
    }

    if (filters.userId && filters.userId !== 'all') {
      qb.andWhere('te.userId = :userId', { userId: parseInt(filters.userId, 10) });
    }

    if (filters.status && filters.status !== 'all') {
      qb.andWhere('te.status = :status', { status: filters.status });
    }

    const entries = await qb.getMany();
    const now = new Date();

    return entries.map(e => {
      const calc = this.calculateOvertime(e, now);
      let durationMinutes = calc.grossMinutes;
      let diffMinutes = calc.diffMinutes;
      let diffFormatted = calc.diffFormatted;
      let diffType = calc.diffType;

      let statusBadgeClass = 'bg-stone-100 text-stone-700 border-stone-200';
      let statusLabel = 'Ej påbörjad';

      if (e.status === 'INSTAMPLAD') {
        statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        statusLabel = 'Instämplad';
      } else if (e.status === 'AVSLUTAD') {
        statusBadgeClass = 'bg-stone-100 text-stone-700 border-stone-200';
        statusLabel = 'Avslutad';
      } else if (e.status === 'JUSTERAD' || e.isAdjusted) {
        statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
        statusLabel = 'Justerad';
      }

      const origInStr = this.formatTime(e.originalCheckInTime || e.checkInTime);
      const currInStr = this.formatTime(e.checkInTime);
      const origOutStr = this.formatTime(e.originalCheckOutTime || e.checkOutTime);
      const currOutStr = e.status === 'INSTAMPLAD' ? 'Pågående...' : this.formatTime(e.checkOutTime);
      const hasInAdjusted = Boolean(e.isAdjusted && e.originalCheckInTime && origInStr !== currInStr && origInStr !== '–');
      const hasOutAdjusted = Boolean(e.isAdjusted && e.originalCheckOutTime && origOutStr !== currOutStr && currOutStr !== 'Pågående...' && origOutStr !== '–');
      const hasPlannedAdjusted = Boolean(
        e.isAdjusted && 
        ((e.originalPlannedStartTime && e.originalPlannedStartTime !== e.plannedStartTime) ||
         (e.originalPlannedEndTime && e.originalPlannedEndTime !== e.plannedEndTime))
      );

      return {
        id: e.id,
        userId: e.userId,
        fullName: e.user ? e.user.fullName : 'Okänd personal',
        avatarUrl: (e.user && e.user.avatarUrl) ? e.user.avatarUrl : '/images/default-staff.jpg',
        title: (e.user && e.user.staffProfile) ? e.user.staffProfile.title : 'Stallpersonal',
        date: e.date,
        shiftName: e.shiftName || 'Morgonpass',
        plannedPassStr: `${e.plannedStartTime} – ${e.plannedEndTime} (${e.plannedHours || 9}h)`,
        plannedStartTime: e.plannedStartTime,
        plannedEndTime: e.plannedEndTime,
        plannedHours: e.plannedHours,
        originalPlannedStartTime: e.originalPlannedStartTime || e.plannedStartTime,
        originalPlannedEndTime: e.originalPlannedEndTime || e.plannedEndTime,
        originalPlannedPassStr: `${e.originalPlannedStartTime || e.plannedStartTime} – ${e.originalPlannedEndTime || e.plannedEndTime}`,
        checkInTimeRaw: e.checkInTime,
        checkInTimeStr: currInStr,
        checkOutTimeRaw: e.checkOutTime,
        checkOutTimeStr: currOutStr,
        originalCheckInTimeRaw: e.originalCheckInTime,
        originalCheckInTimeStr: origInStr,
        originalCheckOutTimeRaw: e.originalCheckOutTime,
        originalCheckOutTimeStr: origOutStr,
        isAdjusted: Boolean(e.isAdjusted || e.status === 'JUSTERAD'),
        adjustedAtStr: e.adjustedAt ? this.formatTime(e.adjustedAt) : null,
        adjustedBy: e.adjustedBy || null,
        hasInAdjusted,
        hasOutAdjusted,
        hasPlannedAdjusted,
        durationMinutes,
        durationStr: this.formatDuration(durationMinutes),
        netWorkedMinutes: calc.netWorkedMinutes,
        netWorkedHours: calc.netWorkedHours,
        netWorkedStr: this.formatDuration(calc.netWorkedMinutes),
        breakMinutes: calc.breakMinutes,
        breakStr: calc.breakFormatted,
        overtimeMinutes: calc.overtimeMinutes,
        overtimeHours: calc.overtimeHours,
        overtimeStr: calc.overtimeFormatted,
        undertimeMinutes: calc.undertimeMinutes,
        undertimeStr: calc.undertimeFormatted,
        isOvertime: calc.overtimeMinutes > 0,
        diffFormatted,
        diffType,
        status: e.status,
        statusLabel: (e.isAdjusted || e.status === 'JUSTERAD') ? 'Justerad' : statusLabel,
        statusBadgeClass: (e.isAdjusted || e.status === 'JUSTERAD') ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : statusBadgeClass,
        subtextNote: e.subtextNote || '',
        adminNote: e.adminNote || '',
        location: e.location || 'Huvudstallet',
      };
    });
  }

  /**
   * Admin creates a manual time entry or clocks in a staff member
   */
  async manualClockIn(data) {
    const repo = await this._getRepository('TimeEntry');
    const dateStr = data.date || this.getTodayDateString();

    let checkInDate = null;
    if (data.checkInTime) {
      if (data.checkInTime.includes('T')) {
        checkInDate = new Date(data.checkInTime);
      } else {
        checkInDate = new Date(`${dateStr}T${data.checkInTime}:00`);
      }
    } else {
      checkInDate = new Date();
    }

    let checkOutDate = null;
    let status = 'INSTAMPLAD';
    let durationMinutes = 0;

    if (data.checkOutTime) {
      if (data.checkOutTime.includes('T')) {
        checkOutDate = new Date(data.checkOutTime);
      } else {
        checkOutDate = new Date(`${dateStr}T${data.checkOutTime}:00`);
      }
      status = 'AVSLUTAD';
      const diffMs = Math.max(0, checkOutDate.getTime() - checkInDate.getTime());
      durationMinutes = Math.floor(diffMs / 60000);
    }

    const sTime = data.plannedStartTime || '07:00';
    const eTime = data.plannedEndTime || '16:00';

    const entry = repo.create({
      userId: parseInt(data.userId, 10),
      date: dateStr,
      plannedStartTime: sTime,
      plannedEndTime: eTime,
      originalPlannedStartTime: sTime,
      originalPlannedEndTime: eTime,
      plannedHours: parseFloat(data.plannedHours || 9.0),
      shiftName: data.shiftName || 'Morgonpass',
      checkInTime: checkInDate,
      checkOutTime: checkOutDate,
      originalCheckInTime: checkInDate,
      originalCheckOutTime: checkOutDate,
      durationMinutes,
      status: data.status || status,
      subtextNote: data.subtextNote || (status === 'INSTAMPLAD' ? 'Arbetspass pågår' : 'Manuell stämpling'),
      adminNote: data.adminNote || 'Registrerad manuellt av administratör',
      location: data.location || 'Huvudstallet',
    });

    return await repo.save(entry);
  }

  /**
   * Admin clocks out an active staff time entry
   */
  async manualClockOut(entryId, checkOutTimeString = null, adminNote = null) {
    const repo = await this._getRepository('TimeEntry');
    const entry = await repo.findOne({ where: { id: parseInt(entryId, 10) } });
    if (!entry) throw new Error('Tidsstämplingen hittades inte.');

    const now = new Date();
    let checkOutDate = now;

    if (checkOutTimeString) {
      if (checkOutTimeString.includes('T')) {
        checkOutDate = new Date(checkOutTimeString);
      } else {
        checkOutDate = new Date(`${entry.date}T${checkOutTimeString}:00`);
      }
    }

    entry.checkOutTime = checkOutDate;
    if (!entry.originalCheckOutTime) {
      entry.originalCheckOutTime = checkOutDate;
    }
    entry.status = 'AVSLUTAD';

    if (entry.checkInTime) {
      const diffMs = Math.max(0, checkOutDate.getTime() - new Date(entry.checkInTime).getTime());
      entry.durationMinutes = Math.floor(diffMs / 60000);
      const calc = this.calculateOvertime(entry);
      entry.overtimeMinutes = calc.overtimeMinutes;
    }

    if (adminNote) {
      entry.adminNote = (entry.adminNote ? entry.adminNote + ' | ' : '') + adminNote;
    }

    return await repo.save(entry);
  }

  /**
   * Admin updates an existing time entry (adjust checkIn, checkOut, note, status)
   * Preserves original check-in and check-out timestamps so admin can always view original values.
   */
  async updateTimeEntry(entryId, data) {
    const repo = await this._getRepository('TimeEntry');
    const entry = await repo.findOne({ where: { id: parseInt(entryId, 10) } });
    if (!entry) throw new Error('Tidsstämplingen hittades inte.');

    // PRESERVE ORIGINAL TIMES BEFORE OVERWRITING
    if (!entry.originalPlannedStartTime) {
      entry.originalPlannedStartTime = entry.plannedStartTime;
    }
    if (!entry.originalPlannedEndTime) {
      entry.originalPlannedEndTime = entry.plannedEndTime;
    }
    if (!entry.originalCheckInTime && entry.checkInTime) {
      entry.originalCheckInTime = entry.checkInTime;
    }
    if (!entry.originalCheckOutTime && entry.checkOutTime) {
      entry.originalCheckOutTime = entry.checkOutTime;
    }

    if (data.date) entry.date = data.date;
    if (data.plannedStartTime) entry.plannedStartTime = data.plannedStartTime;
    if (data.plannedEndTime) entry.plannedEndTime = data.plannedEndTime;
    if (data.plannedHours) entry.plannedHours = parseFloat(data.plannedHours);

    if (data.checkInTime !== undefined) {
      if (!data.checkInTime) {
        entry.checkInTime = null;
      } else if (data.checkInTime.includes('T')) {
        entry.checkInTime = new Date(data.checkInTime);
      } else {
        entry.checkInTime = new Date(`${entry.date}T${data.checkInTime}:00`);
      }
    }

    if (data.checkOutTime !== undefined) {
      if (!data.checkOutTime) {
        entry.checkOutTime = null;
      } else if (data.checkOutTime.includes('T')) {
        entry.checkOutTime = new Date(data.checkOutTime);
      } else {
        entry.checkOutTime = new Date(`${entry.date}T${data.checkOutTime}:00`);
      }
    }

    if (entry.checkInTime && entry.checkOutTime) {
      const diffMs = Math.max(0, new Date(entry.checkOutTime).getTime() - new Date(entry.checkInTime).getTime());
      entry.durationMinutes = Math.floor(diffMs / 60000);
    } else if (data.durationMinutes !== undefined) {
      entry.durationMinutes = parseInt(data.durationMinutes, 10) || 0;
    }

    // Auto-calculate overtime or use explicit admin input
    const calc = this.calculateOvertime(entry);
    if (data.overtimeMinutes !== undefined && data.overtimeMinutes !== '') {
      entry.overtimeMinutes = parseInt(data.overtimeMinutes, 10) || 0;
    } else {
      entry.overtimeMinutes = calc.overtimeMinutes;
    }

    entry.isAdjusted = true;
    entry.adjustedAt = new Date();
    if (data.adjustedBy) {
      entry.adjustedBy = data.adjustedBy;
    }

    if (data.status) {
      entry.status = data.status;
    } else if (entry.checkInTime && !entry.checkOutTime) {
      entry.status = 'INSTAMPLAD';
    } else if (entry.checkInTime && entry.checkOutTime) {
      entry.status = 'JUSTERAD';
    }

    if (data.subtextNote !== undefined) entry.subtextNote = data.subtextNote;
    if (data.adminNote !== undefined) entry.adminNote = data.adminNote;

    return await repo.save(entry);
  }

  /**
   * Admin deletes a time entry
   */
  async deleteTimeEntry(entryId) {
    const repo = await this._getRepository('TimeEntry');
    const entry = await repo.findOne({ where: { id: parseInt(entryId, 10) } });
    if (!entry) throw new Error('Tidsstämplingen kunde inte hittas.');
    await repo.remove(entry);
    return true;
  }
}

module.exports = new AdminTimeTrackingService();
