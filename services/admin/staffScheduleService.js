const { getDataSource } = require('../../config/database');
const ShiftCalculator = require('../shiftCalculator');

/**
 * StaffScheduleService (Admin Domain)
 * 
 * Manages administrative workforce scheduling:
 * planning shifts, week templates, shift modifications, and monthly workforce overviews.
 * All calculations for breaks and working hours are computed via ShiftCalculator.
 */
class AdminStaffScheduleService {
  async _getRepository(entityName) {
    const ds = await getDataSource();
    return ds.getRepository(entityName);
  }

  _getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  _formatTime(dateObj) {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  _formatDateKey(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ensure standard shifts exist in DB for default staff demo (Johan) if not yet seeded
   */
  async _ensureInitialShiftsForJohan(timeRepo) {
    const userRepo = await this._getRepository('User');
    const johan = await userRepo.findOne({ where: { username: 'johan' } });
    if (!johan) return;

    const existing = await timeRepo.findOne({
      where: { userId: johan.id, date: '2026-09-07' },
    });
    if (!existing) {
      const defaultDates = [
        '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
        '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
        '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
        '2026-09-28', '2026-09-29', '2026-09-30',
      ];
      for (const d of defaultDates) {
        const shift = timeRepo.create({
          userId: johan.id,
          date: d,
          plannedStartTime: '12:00',
          plannedEndTime: '21:00',
          plannedHours: 8.0,
          breakMinutes: 60,
          shiftName: 'Stallpersonal (6851)',
          status: 'BOKAD',
          subtextNote: 'Planerat arbetspass',
          location: 'Huvudstallet',
        });
        await timeRepo.save(shift);
      }
    }
  }

  /**
   * Retrieves all staff users available for scheduling
   */
  async getStaffUsers() {
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
      title: u.staffProfile ? u.staffProfile.title : (u.role === 'ADMIN' ? 'Administratör' : 'Stallpersonal'),
      avatarUrl: u.avatarUrl || '/images/default-staff.jpg',
    }));
  }

  /**
   * Retrieves monthly workforce schedule overview for admin directly from database
   * 
   * @param {string} [monthKey='2026-09'] - 'YYYY-MM'
   * @param {number|string|null} [selectedUserId=null]
   */
  async getMonthlyScheduleOverview(monthKey = '2026-09', selectedUserId = null) {
    let [yearStr, monthStr] = (monthKey || '2026-09').split('-');
    let year = parseInt(yearStr, 10);
    let monthIndex = parseInt(monthStr, 10) - 1;
    if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      year = 2026;
      monthIndex = 8;
    }

    const swedishMonths = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    const monthLabel = `${swedishMonths[monthIndex]} ${year}`;

    const prevDate = new Date(year, monthIndex - 1, 1);
    const nextDate = new Date(year, monthIndex + 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const startMonday = new Date(year, monthIndex, 1 - firstDayWeekday);

    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    const lastDayWeekday = (lastDayOfMonth.getDay() + 6) % 7;
    const endSunday = new Date(year, monthIndex, lastDayOfMonth.getDate() + (6 - lastDayWeekday));

    const staffUsers = await this.getStaffUsers();

    // Query TimeEntry for the period
    const timeRepo = await this._getRepository('TimeEntry');

    // Ensure Johan has shifts in Sep 2026
    if (year === 2026 && monthIndex === 8) {
      await this._ensureInitialShiftsForJohan(timeRepo);
    }

    const startStr = this._formatDateKey(startMonday);
    const endStr = this._formatDateKey(endSunday);

    let query = timeRepo
      .createQueryBuilder('te')
      .leftJoinAndSelect('te.user', 'user')
      .where('te.date >= :start AND te.date <= :end', { start: startStr, end: endStr });

    if (selectedUserId) {
      query = query.andWhere('te.userId = :uid', { uid: parseInt(selectedUserId, 10) });
    }

    const dbEntries = await query.orderBy('te.date', 'ASC').addOrderBy('te.plannedStartTime', 'ASC').getMany();

    // Map entries by user and date
    const entriesByUserDate = {};
    let totalPlannedHours = 0;
    let totalShiftsCount = dbEntries.length;

    dbEntries.forEach(e => {
      const uKey = e.userId;
      if (!entriesByUserDate[uKey]) entriesByUserDate[uKey] = {};
      if (!entriesByUserDate[uKey][e.date]) entriesByUserDate[uKey][e.date] = [];

      const startTime = e.plannedStartTime || '12:00';
      const endTime = e.plannedEndTime || '21:00';
      const calc = ShiftCalculator.calculate(startTime, endTime, e.breakMinutes);

      const hours = e.plannedHours ? parseFloat(e.plannedHours) : calc.workHours;
      totalPlannedHours += hours;

      const checkInTimeStr = this._formatTime(e.checkInTime);
      const checkOutTimeStr = this._formatTime(e.checkOutTime);
      const origCheckInStr = this._formatTime(e.originalCheckInTime || e.checkInTime);
      const origCheckOutStr = this._formatTime(e.originalCheckOutTime || e.checkOutTime);

      let overtimeMinutes = e.overtimeMinutes || 0;
      if (!overtimeMinutes && e.checkInTime && e.checkOutTime) {
        const grossMin = Math.floor((new Date(e.checkOutTime).getTime() - new Date(e.checkInTime).getTime()) / 60000);
        const netMin = Math.max(0, grossMin - (e.breakMinutes || 60));
        const planMin = Math.round(hours * 60);
        if (netMin > planMin) {
          overtimeMinutes = netMin - planMin;
        }
      }
      const overtimeStr = overtimeMinutes > 0 ? (overtimeMinutes >= 60 ? `+${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : `+${overtimeMinutes}m`) : null;

      entriesByUserDate[uKey][e.date].push({
        id: e.id,
        userId: e.userId,
        staffName: e.user ? e.user.fullName : 'Personal',
        date: e.date,
        startTime,
        endTime,
        hours,
        breakMinutes: calc.breakMinutes,
        breakStr: calc.breakStr,
        breakLabel: calc.breakLabel,
        shiftName: e.shiftName || 'Stallpersonal (6851)',
        location: e.location || 'Huvudstallet',
        status: e.status || 'BOKAD',
        note: e.subtextNote || e.adminNote || '',
        adminNote: e.adminNote || '',
        checkInTimeStr,
        checkOutTimeStr,
        originalPlannedStartTime: e.originalPlannedStartTime || startTime,
        originalPlannedEndTime: e.originalPlannedEndTime || endTime,
        originalCheckInTimeStr: origCheckInStr,
        originalCheckOutTimeStr: origCheckOutStr,
        isClockedIn: e.status === 'INSTAMPLAD',
        isCompleted: e.status === 'AVSLUTAD',
        isAdjusted: Boolean(e.isAdjusted || e.status === 'JUSTERAD'),
        adjustedAtStr: this._formatTime(e.adjustedAt),
        adjustedBy: e.adjustedBy || null,
        overtimeMinutes,
        overtimeStr,
        hasOvertime: overtimeMinutes > 0,
      });
    });

    // Build weekly calendars
    const weeks = [];
    const dayNames = ['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'];
    const todayStr = '2026-09-27';

    let curr = new Date(startMonday);
    while (curr <= endSunday) {
      const weekNumber = this._getISOWeek(curr);
      const days = [];
      const mondayDateStr = this._formatDateKey(curr);

      for (let i = 0; i < 7; i++) {
        const dateKey = this._formatDateKey(curr);
        const dayOfMonth = curr.getDate();
        const monthNum = curr.getMonth() + 1;
        const dateStr = `${dayOfMonth}/${monthNum}`;
        const isSunday = i === 6;
        const isToday = dateKey === todayStr;

        days.push({
          dayIndex: i,
          dayName: dayNames[i],
          dateStr,
          fullDate: dateKey,
          isSunday,
          isToday,
        });

        curr.setDate(curr.getDate() + 1);
      }

      // Populate shifts strictly from database for each staff user in this week
      const staffRows = staffUsers
        .filter(u => !selectedUserId || u.id === parseInt(selectedUserId, 10))
        .map(u => {
          let userWeekHours = 0;
          const userDays = days.map(d => {
            const shifts = (entriesByUserDate[u.id] && entriesByUserDate[u.id][d.fullDate]) || [];
            shifts.forEach(s => userWeekHours += s.hours);
            return {
              ...d,
              shifts,
            };
          });

          return {
            user: u,
            weekHours: Math.round(userWeekHours),
            days: userDays,
          };
        });

      weeks.push({
        weekNumber,
        isCurrentWeek: weekNumber === 39 && year === 2026,
        mondayDateStr,
        days,
        staffRows,
      });
    }

    return {
      monthLabel,
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      prevMonthKey,
      nextMonthKey,
      selectedUserId: selectedUserId ? parseInt(selectedUserId, 10) : null,
      staffUsers,
      totalPlannedHours: Math.round(totalPlannedHours),
      totalShiftsCount,
      weeks,
    };
  }

  /**
   * Create a new scheduled shift in the database
   */
  async createShift(data) {
    const timeRepo = await this._getRepository('TimeEntry');
    const { userId, date, startTime, endTime, hours, shiftName, location, note, breakMinutes: inputBreak } = data;

    const sTime = startTime || '12:00';
    const eTime = endTime || '21:00';
    const calc = ShiftCalculator.calculate(sTime, eTime, inputBreak);
    const plannedHours = hours ? parseFloat(hours) : calc.workHours;
    const breakMinutes = calc.breakMinutes;

    const shift = timeRepo.create({
      userId: parseInt(userId, 10),
      date,
      plannedStartTime: sTime,
      plannedEndTime: eTime,
      plannedHours,
      breakMinutes,
      shiftName: shiftName || 'Stallpersonal (6851)',
      location: location || 'Huvudstallet',
      subtextNote: note || 'Planerat arbetspass',
      status: 'BOKAD',
    });

    return await timeRepo.save(shift);
  }

  /**
   * Quick-plan a standard week (Monday through Friday) in the database
   */
  async createStandardWeek(data) {
    const timeRepo = await this._getRepository('TimeEntry');
    const { userId, mondayDate, startTime, endTime, hours, shiftName, location, breakMinutes: inputBreak } = data;

    const [y, m, d] = mondayDate.split('-').map(Number);
    const mondayObj = new Date(y, m - 1, d);

    const sTime = startTime || '12:00';
    const eTime = endTime || '21:00';
    const calc = ShiftCalculator.calculate(sTime, eTime, inputBreak);
    const plannedHours = hours ? parseFloat(hours) : calc.workHours;
    const breakMinutes = calc.breakMinutes;
    const createdShifts = [];

    for (let i = 0; i < 5; i++) {
      const shiftDate = new Date(mondayObj);
      shiftDate.setDate(shiftDate.getDate() + i);
      const dateStr = this._formatDateKey(shiftDate);

      let entry = await timeRepo.findOne({
        where: { userId: parseInt(userId, 10), date: dateStr },
      });

      if (!entry) {
        entry = timeRepo.create({
          userId: parseInt(userId, 10),
          date: dateStr,
          plannedStartTime: sTime,
          plannedEndTime: eTime,
          plannedHours,
          breakMinutes,
          shiftName: shiftName || 'Stallpersonal (6851)',
          location: location || 'Huvudstallet',
          status: 'BOKAD',
          subtextNote: 'Standardpass',
        });
      } else {
        entry.plannedStartTime = sTime;
        entry.plannedEndTime = eTime;
        entry.plannedHours = plannedHours;
        entry.breakMinutes = breakMinutes;
        entry.shiftName = shiftName || 'Stallpersonal (6851)';
        entry.status = 'BOKAD';
      }

      const saved = await timeRepo.save(entry);
      createdShifts.push(saved);
    }

    return createdShifts;
  }

  /**
   * Update an existing shift in the database
   */
  async updateShift(id, data) {
    const timeRepo = await this._getRepository('TimeEntry');
    const shift = await timeRepo.findOne({ where: { id: parseInt(id, 10) } });
    if (!shift) throw new Error('Arbetspasset kunde inte hittas');

    // Freeze original planned times if not already set
    if (!shift.originalPlannedStartTime) {
      shift.originalPlannedStartTime = shift.plannedStartTime;
    }
    if (!shift.originalPlannedEndTime) {
      shift.originalPlannedEndTime = shift.plannedEndTime;
    }

    const sTime = data.startTime || shift.plannedStartTime;
    const eTime = data.endTime || shift.plannedEndTime;
    const calc = ShiftCalculator.calculate(sTime, eTime, data.breakMinutes);

    shift.plannedStartTime = sTime;
    shift.plannedEndTime = eTime;
    shift.breakMinutes = calc.breakMinutes;
    shift.plannedHours = data.hours ? parseFloat(data.hours) : calc.workHours;
    if (data.shiftName) shift.shiftName = data.shiftName;
    if (data.location) shift.location = data.location;
    if (data.note !== undefined) shift.subtextNote = data.note;
    if (data.adminNote !== undefined) shift.adminNote = data.adminNote;
    if (data.status) shift.status = data.status;

    shift.isAdjusted = true;
    shift.adjustedAt = new Date();
    if (data.adjustedBy) {
      shift.adjustedBy = data.adjustedBy;
    }

    return await timeRepo.save(shift);
  }

  /**
   * Delete a shift from the database
   */
  async deleteShift(id) {
    const timeRepo = await this._getRepository('TimeEntry');
    return await timeRepo.delete(parseInt(id, 10));
  }
}

module.exports = new AdminStaffScheduleService();
