const horseAllocationService = require('../services/admin/horseAllocationService');


/**
 * ApiController
 * 
 * Thin API controller for AJAX requests:
 * Delegates horse allocations to horseAllocationService (Admin)
 * and task status/checklist updates to staffTasksService (Staff).
 */
class ApiController {
  async assignHorse(req, res) {
    try {
      const { bookingId, horseId } = req.body;
      const updated = await horseAllocationService.assignHorse(
        parseInt(bookingId, 10),
        horseId ? parseInt(horseId, 10) : null
      );
      res.json({ success: true, booking: updated });
    } catch (err) {
      console.error('API assign error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async validateAllocation(req, res) {
    try {
      const { studentId, horseId, lessonId } = req.query;
      const validation = await horseAllocationService.validateAllocation(
        parseInt(studentId, 10),
        parseInt(horseId, 10),
        parseInt(lessonId, 10)
      );
      res.json({ success: true, validation });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

 

  async toggleChecklistItem(req, res) {
    try {
      const taskId = req.params.id;
      const { itemIndex, completed } = req.body;
      const updated = await staffTasksService.toggleChecklistItem(taskId, parseInt(itemIndex, 10), !!completed);
      res.json({ success: true, task: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ApiController();
