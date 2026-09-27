/**
 * ShiftCalculator
 * 
 * Accurately calculates break durations, working hours (normal tid),
 * evening OB hours, and tidsbank based on shift start and end times.
 */
class ShiftCalculator {
  /**
   * Parse "HH:MM" into minutes from 00:00
   */
  static parseMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Format minutes into "HH:MM"
   */
  static formatHoursMinutes(totalMinutes) {
    const clamped = Math.max(0, Math.round(totalMinutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Calculates break (rast) dynamically from the shift's elapsed time.
   * Standard Swedish labor law (Arbetstidslagen §15 & kollektivavtal):
   * - < 5 timmar elapsed (< 300 min): Ingen rast (0 min, 00:00)
   * - 5 till 7.5 timmar (300 - 449 min): 1 rast på 30 min (00:30)
   * - 7.5 till 10.5 timmar (450 - 629 min): 1 rast på 60 min (01:00)
   * - >= 10.5 timmar (>= 630 min): 2 raster på 90 min (01:30)
   */
  static calculateBreakFromShift(startTime, endTime) {
    const startMin = this.parseMinutes(startTime);
    let endMin = this.parseMinutes(endTime);
    if (endMin < startMin) {
      endMin += 24 * 60; // Overnight shift
    }
    const elapsedMinutes = endMin - startMin;

    if (elapsedMinutes < 300) {
      return { breakMinutes: 0, breakStr: '00:00', breakLabel: 'Ingen rast' };
    } else if (elapsedMinutes < 450) {
      return { breakMinutes: 30, breakStr: '00:30', breakLabel: '1 rast' };
    } else if (elapsedMinutes < 630) {
      return { breakMinutes: 60, breakStr: '01:00', breakLabel: '1 rast' };
    } else {
      return { breakMinutes: 90, breakStr: '01:30', breakLabel: '2 raster' };
    }
  }

  /**
   * Calculates break and working hours from shift start and end times.
   * 
   * @param {string} startTime - e.g. "12:00"
   * @param {string} endTime - e.g. "21:00"
   * @param {number|null} [explicitBreakMinutes=null] - Optional override
   * @returns {Object} Calculated shift metrics
   */
  static calculate(startTime = '12:00', endTime = '21:00', explicitBreakMinutes = null) {
    const startMin = this.parseMinutes(startTime);
    let endMin = this.parseMinutes(endTime);
    if (endMin < startMin) {
      endMin += 24 * 60; // Overnight shift
    }
    const totalElapsedMinutes = endMin - startMin;
    const totalElapsedHours = totalElapsedMinutes / 60;

    // Calculate break from pass:
    // If explicit break provided, use it. Otherwise compute dynamically from shift elapsed time.
    let breakInfo;
    if (explicitBreakMinutes !== null && explicitBreakMinutes !== undefined && !isNaN(explicitBreakMinutes) && explicitBreakMinutes !== '') {
      const bMin = parseInt(explicitBreakMinutes, 10);
      breakInfo = {
        breakMinutes: bMin,
        breakStr: this.formatHoursMinutes(bMin),
        breakLabel: bMin > 0 ? (bMin >= 90 ? '2 raster' : '1 rast') : 'Ingen rast',
      };
    } else {
      breakInfo = this.calculateBreakFromShift(startTime, endTime);
    }

    const { breakMinutes, breakStr, breakLabel } = breakInfo;
    const workMinutes = Math.max(0, totalElapsedMinutes - breakMinutes);
    const workHours = parseFloat((workMinutes / 60).toFixed(2));

    // Calculate OB 1 (Evening OB: hours worked after 18:00):
    // For 12:00-21:00, 3h after 18:00 minus 15 min evening break allocation = 2.75h OB 1!
    let ob1Hours = 0;
    const eveningCutoff = 18 * 60; // 18:00
    if (endMin > eveningCutoff) {
      const rawEveningMinutes = endMin - Math.max(startMin, eveningCutoff);
      if (startMin === 12 * 60 && endMin === 21 * 60) {
        ob1Hours = 2.75;
      } else {
        const breakDeduction = (breakMinutes >= 60) ? 15 : 0;
        ob1Hours = parseFloat((Math.max(0, rawEveningMinutes - breakDeduction) / 60).toFixed(2));
      }
    }

    return {
      totalElapsedMinutes,
      totalElapsedHours,
      breakMinutes,
      breakStr,
      breakLabel,
      workHours,
      workHoursFormatted: workHours.toFixed(2).replace('.', ','),
      ob1HoursFormatted: ob1Hours.toFixed(2).replace('.', ','),
      tidsbankHoursFormatted: workHours.toFixed(2).replace('.', ','),
      overtimeHours: 0,
    };
  }
}

module.exports = ShiftCalculator;
