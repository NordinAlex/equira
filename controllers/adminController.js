const overviewService = require('../services/admin/overviewService');
const horsesService = require('../services/admin/horsesService');
const assignService = require('../services/admin/assignService');
const lessonsService = require('../services/admin/lessonsService');
const studentsService = require('../services/admin/studentsService');
const tasksService = require('../services/admin/tasksService');
const quizzesService = require('../services/admin/quizzesService');
const staffService = require('../services/admin/staffService');
const profileService = require('../services/admin/profileService');
const timeTrackingService = require('../services/admin/timeTrackingService');
const staffScheduleService = require('../services/admin/staffScheduleService');
const arenasService = require('../services/admin/arenasService');
const AdminViewModel = require('../models/viewModels/admin/AdminViewModel');

/**
 * AdminController (Admin Domain)
 *
 * Handles HTTP requests for the admin portal, orchestrating services
 * to retrieve, process, and render data for the admin dashboard, horse management,
 * lesson scheduling, student and staff management, stable tasks, quizzes, and profile administration.
 * 
 */
class AdminController {
  async getOverview(req, res) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { lessons, horses, students } =
        await overviewService.getOverviewData(todayStr);

      const viewModel = AdminViewModel.formatOverview({
        lessons,
        horses,
        students,
        user: req.session.user,
      });

      res.render('admin/overview', {
        title: 'Equira - Adminöversikt',
        data: viewModel,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading admin overview:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in översikten',
          error: err,
        });
    }
  }

  async getHorses(req, res) {
    try {
      const filter = req.query.filter || 'all';
      const horses = await horsesService.getHorses(filter);
      const data = AdminViewModel.formatHorses(horses, filter);

      res.render('admin/horses', {
        title: 'Equira - Hästar',
        data,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading horses:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in hästregistret',
          error: err,
        });
    }
  }

  async getHorseCreate(req, res) {
    res.render('admin/horseCreate', {
      title: 'Equira - Registrera Häst',
      error: null,
      layout: 'layouts/adminLayout',
    });
  }

  async postHorseCreate(req, res) {
    try {
      if (req.file) {
        req.body.photoUrl = '/images/uploads/horses/' + req.file.filename;
      }
      await horsesService.createHorse(req.body);
      res.redirect('/admin/horses');
    } catch (err) {
      console.error('Error creating horse:', err);
      res.render('admin/horseCreate', {
        title: 'Equira - Registrera Häst',
        error: 'Kunde inte spara hästen: ' + err.message,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async getHorseProfile(req, res) {
    try {
      const horse = await horsesService.getHorseById(req.params.id);
      if (!horse) {
        return res.redirect(
          '/admin/horses?error=' + encodeURIComponent('Hästen kunde inte hittas.'),
        );
      }

      res.render('admin/horseProfile', {
        title: `Equira - ${horse.name}`,
        horse,
        tasks: horse.tasks || [],
        success: req.query.success || null,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading horse profile:', err);
      res.redirect('/admin/horses?error=' + encodeURIComponent(err.message));
    }
  }

  async getHorseEdit(req, res) {
    try {
      const horse = await horsesService.getHorseById(req.params.id);
      if (!horse) {
        return res.redirect(
          '/admin/horses?error=' + encodeURIComponent('Hästen kunde inte hittas.'),
        );
      }

      res.render('admin/horseEdit', {
        title: `Equira - Redigera ${horse.name}`,
        horse,
        error: null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading horse for edit:', err);
      res.redirect('/admin/horses?error=' + encodeURIComponent(err.message));
    }
  }

  async postHorseEdit(req, res) {
    try {
      if (req.file) {
        req.body.photoUrl = '/images/uploads/horses/' + req.file.filename;
      }
      await horsesService.updateHorse(req.params.id, req.body);
      res.redirect(
        `/admin/horses/${req.params.id}?success=` +
          encodeURIComponent('Hästens uppgifter har uppdaterats!'),
      );
    } catch (err) {
      console.error('Error updating horse:', err);
      const horse = await horsesService.getHorseById(req.params.id);
      res.render('admin/horseEdit', {
        title: 'Equira - Redigera häst',
        horse: horse || { id: req.params.id, ...req.body },
        error: 'Kunde inte uppdatera hästen: ' + err.message,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async postHorseDelete(req, res) {
    try {
      await horsesService.deleteHorse(req.params.id);
      res.redirect(
        '/admin/horses?success=' + encodeURIComponent('Hästen har tagits bort.'),
      );
    } catch (err) {
      console.error('Error deleting horse:', err);
      res.redirect('/admin/horses?error=' + encodeURIComponent(err.message));
    }
  }

  async postHorseTask(req, res) {
    try {
      req.body.horseId = req.params.id;
      await tasksService.createStableTask(req.body);
      res.redirect(
        `/admin/horses/${req.params.id}?success=` +
          encodeURIComponent('Åtgärd har skapats!'),
      );
    } catch (err) {
      console.error('Error creating horse task:', err);
      res.redirect(
        `/admin/horses/${req.params.id}?error=` +
          encodeURIComponent('Kunde inte skapa åtgärd: ' + err.message),
      );
    }
  }

  async getHorseAssign(req, res) {
    try {
      const lessonId = req.params.lessonId || req.query.lessonId;
      const studentId = req.query.studentId;

      const assignData = await assignService.getHorseAssignData(
        lessonId,
        studentId,
      );
      if (!assignData || !assignData.lesson) {
        return res.redirect('/admin/lessons');
      }

      const { lesson, availableHorses, selectedStudentId } = assignData;
      const data = AdminViewModel.formatAllocationView(
        lesson,
        availableHorses,
        selectedStudentId,
      );

      res.render('admin/horseAssign', {
        title: `Equira - Tilldela häst: ${lesson.title}`,
        data,
        error: req.query.error || null,
        success: req.query.success || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error in horse assign view:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in hästtilldelning',
          error: err,
        });
    }
  }

  async postAssignHorse(req, res) {
    const { bookingId, horseId, lessonId, studentId, action } = req.body;
    try {
      await assignService.assignHorse(bookingId, horseId, action);

      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.json({
          success: true,
          message: 'Häst tilldelad framgångsrikt!',
        });
      }

      const msg =
        action === 'unassign'
          ? 'Hästtilldelning borttagen'
          : 'Hästtilldelning sparad!';
      const studentParam = studentId
        ? `?studentId=${studentId}&success=${encodeURIComponent(msg)}`
        : `?success=${encodeURIComponent(msg)}`;
      res.redirect(`/admin/assign/${lessonId}${studentParam}`);
    } catch (err) {
      console.error('Error assigning horse:', err);
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(400).json({ success: false, error: err.message });
      }
      const studentParam = studentId ? `&studentId=${studentId}` : '';
      res.redirect(
        `/admin/assign/${lessonId || req.body.lessonId}?error=${encodeURIComponent(err.message)}${studentParam}`,
      );
    }
  }

  async getLessons(req, res) {
    try {
      const lessons = await lessonsService.getLessons(req.query);
      const data = AdminViewModel.formatLessons(lessons);

      res.render('admin/lessons', {
        title: 'Equira - Lektioner',
        data,
        success: req.query.success || null,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading lessons:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in lektioner',
          error: err,
        });
    }
  }

  async getLessonCreate(req, res) {
    try {
      const { arenas, instructors, students } =
        await lessonsService.getLessonCreateFormData();

      res.render('admin/lessonCreate', {
        title: 'Equira - Skapa Lektion',
        arenas,
        instructors,
        students,
        error: null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading lesson form:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in formuläret',
          error: err,
        });
    }
  }

  async postLessonCreate(req, res) {
    try {
      await lessonsService.createLesson(req.body);
      res.redirect('/admin/lessons?success=' + encodeURIComponent('Ny lektion har skapats!'));
    } catch (err) {
      console.error('Error creating lesson:', err);
      res.redirect(
        '/admin/lessons/create?error=' + encodeURIComponent(err.message),
      );
    }
  }

  async getLessonEdit(req, res) {
    try {
      const lesson = await lessonsService.getLessonById(req.params.id);
      if (!lesson) {
        return res.redirect(
          '/admin/lessons?error=' + encodeURIComponent('Lektionen kunde inte hittas.'),
        );
      }

      const { arenas, instructors, students } =
        await lessonsService.getLessonCreateFormData();

      const bookedStudentIds = (lesson.bookings || []).map(b => b.studentId);

      res.render('admin/lessonEdit', {
        title: `Equira - Redigera ${lesson.title}`,
        lesson,
        arenas,
        instructors,
        students,
        bookedStudentIds,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading lesson edit form:', err);
      res.redirect('/admin/lessons?error=' + encodeURIComponent(err.message));
    }
  }

  async postLessonEdit(req, res) {
    try {
      await lessonsService.updateLesson(req.params.id, req.body);
      res.redirect(
        '/admin/lessons?success=' + encodeURIComponent('Lektionen har uppdaterats!'),
      );
    } catch (err) {
      console.error('Error updating lesson:', err);
      try {
        const lesson = await lessonsService.getLessonById(req.params.id);
        const { arenas, instructors, students } =
          await lessonsService.getLessonCreateFormData();
        const bookedStudentIds = (lesson?.bookings || []).map(b => b.studentId);

        res.render('admin/lessonEdit', {
          title: 'Equira - Redigera lektion',
          lesson: lesson || { id: req.params.id, ...req.body },
          arenas,
          instructors,
          students,
          bookedStudentIds,
          error: 'Kunde inte uppdatera lektionen: ' + err.message,
          layout: 'layouts/adminLayout',
        });
      } catch (innerErr) {
        res.redirect(
          `/admin/lessons/${req.params.id}/edit?error=` + encodeURIComponent(err.message),
        );
      }
    }
  }

  async postLessonDelete(req, res) {
    try {
      await lessonsService.deleteLesson(req.params.id);
      res.redirect(
        '/admin/lessons?success=' + encodeURIComponent('Lektionen har tagits bort.'),
      );
    } catch (err) {
      console.error('Error deleting lesson:', err);
      res.redirect('/admin/lessons?error=' + encodeURIComponent(err.message));
    }
  }

  async getStudents(req, res) {
    try {
      const searchQuery = (req.query.q || '').trim();
      const students = await studentsService.getAllStudents(searchQuery);
      const formatted = AdminViewModel.formatStudents(students);

      res.render('admin/students', {
        title: 'Equira - Elever',
        students: formatted,
        searchQuery,
        success: req.query.success || null,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading students:', err);
      res
        .status(500)
        .render('error', { message: 'Kunde inte läsa in elever', error: err });
    }
  }

  async getStudentCreate(req, res) {
    res.render('admin/studentCreate', {
      title: 'Equira - Registrera Elev',
      error: null,
      layout: 'layouts/adminLayout',
    });
  }

  async postStudentCreate(req, res) {
    try {
      if (req.file) {
        req.body.avatarUrl = '/images/uploads/avatars/' + req.file.filename;
      }
      await studentsService.createStudent(req.body);
      res.redirect(
        '/admin/students?success=' +
          encodeURIComponent('Ny elev har registrerats!'),
      );
    } catch (err) {
      console.error('Error creating student:', err);
      res.render('admin/studentCreate', {
        title: 'Equira - Registrera Elev',
        error: err.message,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async getStudentEdit(req, res) {
    try {
      const student = await studentsService.getStudentById(req.params.id);
      if (!student || student.role !== 'STUDENT') {
        return res.redirect(
          '/admin/students?error=' +
            encodeURIComponent('Eleven kunde inte hittas.'),
        );
      }

      res.render('admin/studentEdit', {
        title: `Equira - Redigera ${student.fullName}`,
        student,
        profile: student.studentProfile || {},
        error: null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading student for edit:', err);
      res.redirect('/admin/students?error=' + encodeURIComponent(err.message));
    }
  }

  async postStudentEdit(req, res) {
    try {
      if (req.file) {
        req.body.avatarUrl = '/images/uploads/avatars/' + req.file.filename;
      }
      await studentsService.updateStudent(req.params.id, req.body);
      res.redirect(
        '/admin/students?success=' +
          encodeURIComponent('Elevens uppgifter har uppdaterats!'),
      );
    } catch (err) {
      console.error('Error updating student:', err);
      const student = await studentsService.getStudentById(req.params.id);
      res.render('admin/studentEdit', {
        title: `Equira - Redigera elev`,
        student: student || { id: req.params.id, ...req.body },
        profile: student?.studentProfile || req.body,
        error: err.message,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async postStudentDelete(req, res) {
    try {
      await studentsService.deleteStudent(req.params.id);
      res.redirect(
        '/admin/students?success=' +
          encodeURIComponent('Eleven har tagits bort från systemet.'),
      );
    } catch (err) {
      console.error('Error deleting student:', err);
      res.redirect(
        '/admin/students?error=' +
          encodeURIComponent('Kunde inte ta bort eleven: ' + err.message),
      );
    }
  }

  async getStaff(req, res) {
    try {
      const searchQuery = (req.query.q || '').trim();
      const roleFilter = (req.query.role || '').trim();
      const staffMembers = await staffService.getAllStaff(
        searchQuery,
        roleFilter,
      );
      const data = AdminViewModel.formatStaffList(
        staffMembers,
        searchQuery,
        roleFilter,
      );

      res.render('admin/staff', {
        title: 'Equira - Personal',
        data,
        success: req.query.success || null,
        error: req.query.error || null,
        currentUserId: req.session.user?.id,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading staff list:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in personalen',
          error: err,
        });
    }
  }

  async getStaffCreate(req, res) {
    res.render('admin/staffCreate', {
      title: 'Equira - Lägg till Personal',
      error: null,
      formData: {},
      layout: 'layouts/adminLayout',
    });
  }

  async postStaffCreate(req, res) {
    try {
      if (req.file) {
        req.body.avatarUrl = '/images/uploads/avatars/' + req.file.filename;
      }
      await staffService.createStaff(req.body);
      res.redirect(
        '/admin/staff?success=' +
          encodeURIComponent('Ny personalmedlem har lagts till!'),
      );
    } catch (err) {
      console.error('Error creating staff:', err);
      res.render('admin/staffCreate', {
        title: 'Equira - Lägg till Personal',
        error: err.message,
        formData: req.body,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async getStaffEdit(req, res) {
    try {
      const staffMember = await staffService.getStaffById(req.params.id);
      if (!staffMember) {
        return res.redirect(
          '/admin/staff?error=' +
            encodeURIComponent('Personalen kunde inte hittas.'),
        );
      }

      res.render('admin/staffEdit', {
        title: `Equira - Redigera ${staffMember.fullName}`,
        staff: staffMember,
        error: null,
        currentUserId: req.session.user?.id,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading staff for edit:', err);
      res.redirect('/admin/staff?error=' + encodeURIComponent(err.message));
    }
  }

  async postStaffEdit(req, res) {
    try {
      if (req.file) {
        req.body.avatarUrl = '/images/uploads/avatars/' + req.file.filename;
      }
      await staffService.updateStaff(req.params.id, req.body);
      res.redirect(
        '/admin/staff?success=' +
          encodeURIComponent('Personalens uppgifter har uppdaterats!'),
      );
    } catch (err) {
      console.error('Error updating staff:', err);
      const staffMember = await staffService.getStaffById(req.params.id);
      res.render('admin/staffEdit', {
        title: 'Equira - Redigera personal',
        staff: staffMember || {
          id: req.params.id,
          ...req.body,
          staffProfile: req.body,
        },
        error: err.message,
        currentUserId: req.session.user?.id,
        layout: 'layouts/adminLayout',
      });
    }
  }

  async postStaffDelete(req, res) {
    try {
      await staffService.deleteStaff(req.params.id, req.session.user?.id);
      res.redirect(
        '/admin/staff?success=' +
          encodeURIComponent('Personalen har tagits bort från systemet.'),
      );
    } catch (err) {
      console.error('Error deleting staff:', err);
      res.redirect('/admin/staff?error=' + encodeURIComponent(err.message));
    }
  }

  async getStableTasks(req, res) {
    try {
      const tasks = await tasksService.getStableTasks();
      const data = AdminViewModel.formatTasks(tasks);

      res.render('admin/stableTasks', {
        title: 'Equira - Stalluppgifter & Skötsel',
        data,
        success: req.query.success || null,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading tasks:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in uppgifter',
          error: err,
        });
    }
  }

  async getStableTaskCreate(req, res) {
    try {
      const { staff, horses } = await tasksService.getStableTaskFormData();

      res.render('admin/stableTaskCreate', {
        title: 'Equira - Ny Stalluppgift',
        staff,
        horses,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading task create form:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in formulär',
          error: err,
        });
    }
  }

  async postStableTaskCreate(req, res) {
    try {
      await tasksService.createStableTask(req.body);
      res.redirect(
        '/admin/tasks?success=' +
          encodeURIComponent('Ny stalluppgift har skapats!'),
      );
    } catch (err) {
      console.error('Error creating task:', err);
      res.redirect(
        '/admin/tasks/create?error=' + encodeURIComponent(err.message),
      );
    }
  }

  async getStableTaskEdit(req, res) {
    try {
      const task = await tasksService.getStableTaskById(req.params.id);
      if (!task) {
        return res.redirect(
          '/admin/tasks?error=' +
            encodeURIComponent('Stalluppgiften kunde inte hittas.'),
        );
      }

      const { staff, horses } = await tasksService.getStableTaskFormData();

      res.render('admin/stableTaskEdit', {
        title: `Equira - Redigera ${task.title}`,
        task,
        staff,
        horses,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading task edit form:', err);
      res.redirect('/admin/tasks?error=' + encodeURIComponent(err.message));
    }
  }

  async postStableTaskEdit(req, res) {
    try {
      await tasksService.updateStableTask(req.params.id, req.body);
      res.redirect(
        '/admin/tasks?success=' +
          encodeURIComponent('Stalluppgiften har uppdaterats!'),
      );
    } catch (err) {
      console.error('Error updating task:', err);
      res.redirect(
        `/admin/tasks/${req.params.id}/edit?error=` +
          encodeURIComponent(err.message),
      );
    }
  }

  async postStableTaskDelete(req, res) {
    try {
      await tasksService.deleteStableTask(req.params.id);
      res.redirect(
        '/admin/tasks?success=' +
          encodeURIComponent('Stalluppgiften har tagits bort.'),
      );
    } catch (err) {
      console.error('Error deleting task:', err);
      res.redirect(
        '/admin/tasks?error=' +
          encodeURIComponent('Kunde inte ta bort uppgiften: ' + err.message),
      );
    }
  }

  async getQuizzes(req, res) {
    try {
      const quizzes = await quizzesService.getAllQuizzes();
      const formatted = AdminViewModel.formatQuizzes(quizzes);

      res.render('admin/quizzes', {
        title: 'Equira - Quiz & Kunskapsprov',
        quizzes: formatted,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading quizzes:', err);
      res
        .status(500)
        .render('error', { message: 'Kunde inte läsa in quiz', error: err });
    }
  }

  _parseQuestionsFromBody(body) {
    const questions = [];

    // Format 1: body.questions as array or object
    if (body.questions) {
      const qList = Array.isArray(body.questions)
        ? body.questions
        : Object.values(body.questions);

      for (let i = 0; i < qList.length; i++) {
        const item = qList[i];
        if (!item || !item.questionText || !item.questionText.trim()) continue;

        const correctIndex = parseInt(
          item.correctIndex !== undefined
            ? item.correctIndex
            : item.correct !== undefined
              ? item.correct
              : '0',
          10,
        );
        const rawOptions = item.options
          ? Array.isArray(item.options)
            ? item.options
            : Object.values(item.options)
          : ['Alternativ 1', 'Alternativ 2', 'Alternativ 3', 'Alternativ 4'];

        const options = rawOptions.map((opt, oIdx) => {
          const optText =
            typeof opt === 'string'
              ? opt.trim()
              : (opt.text || opt.optionText || `Alternativ ${oIdx + 1}`).trim();
          return {
            text: optText,
            optionText: optText,
            isCorrect: oIdx === correctIndex,
          };
        });

        questions.push({
          questionText: item.questionText.trim(),
          topicTitle: item.topicTitle
            ? item.topicTitle.trim()
            : `Fråga ${i + 1}`,
          explanationText: item.explanationText
            ? item.explanationText.trim()
            : '',
          options,
        });
      }

      if (questions.length > 0) {
        return questions;
      }
    }

    // Format 2: legacy flat body fields
    if (body.questionText) {
      const texts = Array.isArray(body.questionText)
        ? body.questionText
        : [body.questionText];
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text || !text.trim()) continue;

        const optTexts = body[`options_${i}`] ||
          body.options || [
            'Alternativ 1',
            'Alternativ 2',
            'Alternativ 3',
            'Alternativ 4',
          ];
        const correctIndex = parseInt(
          body[`correct_${i}`] !== undefined
            ? body[`correct_${i}`]
            : body.correctIndex || '0',
          10,
        );
        const rawOpts = Array.isArray(optTexts) ? optTexts : [optTexts];

        const options = rawOpts.map((t, idx) => ({
          text: (typeof t === 'string' ? t : t.text || '').trim(),
          optionText: (typeof t === 'string' ? t : t.text || '').trim(),
          isCorrect: idx === correctIndex,
        }));

        questions.push({
          questionText: text.trim(),
          topicTitle: body.topicTitle
            ? Array.isArray(body.topicTitle)
              ? body.topicTitle[i]
              : body.topicTitle
            : `Fråga ${i + 1}`,
          explanationText: body.explanationText
            ? Array.isArray(body.explanationText)
              ? body.explanationText[i]
              : body.explanationText
            : '',
          options,
        });
      }
    }

    return questions;
  }

  async getQuizCreate(req, res) {
    res.render('admin/quizCreate', {
      title: 'Equira - Skapa Nytt Kunskapsquiz',
      error: req.query.error || null,
      layout: 'layouts/adminLayout',
    });
  }

  async postQuizCreate(req, res) {
    try {
      const body = req.body;
      const questions = this._parseQuestionsFromBody(body);

      await quizzesService.createQuiz({
        title: body.title,
        category: body.category,
        description: body.description,
        difficulty: body.difficulty,
        timeLimitMinutes: body.timeLimitMinutes,
        passPercentage: body.passPercentage,
        equestrianBadge: body.equestrianBadge,
        targetLevel: body.targetLevel,
        questions,
      });

      res.redirect('/admin/quizzes');
    } catch (err) {
      console.error('Error creating quiz:', err);
      res.redirect(
        '/admin/quizzes/create?error=' + encodeURIComponent(err.message),
      );
    }
  }

  async getQuizEdit(req, res) {
    try {
      const quiz = await quizzesService.getQuizById(req.params.id);
      if (!quiz) {
        return res
          .status(404)
          .render('error', { message: 'Quizet kunde inte hittas' });
      }

      res.render('admin/quizEdit', {
        title: `Equira - Redigera ${quiz.title}`,
        quiz,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading quiz edit:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in quiz för redigering',
          error: err,
        });
    }
  }

  async postQuizEdit(req, res) {
    try {
      const body = req.body;
      const questions = this._parseQuestionsFromBody(body);

      await quizzesService.updateQuiz(req.params.id, {
        title: body.title,
        category: body.category,
        description: body.description,
        difficulty: body.difficulty,
        timeLimitMinutes: body.timeLimitMinutes,
        passPercentage: body.passPercentage,
        equestrianBadge: body.equestrianBadge,
        targetLevel: body.targetLevel,
        questions,
      });

      res.redirect('/admin/quizzes');
    } catch (err) {
      console.error('Error updating quiz:', err);
      res.redirect(
        `/admin/quizzes/${req.params.id}/edit?error=` +
          encodeURIComponent(err.message),
      );
    }
  }

  async postQuizDelete(req, res) {
    try {
      await quizzesService.deleteQuiz(req.params.id);
      res.redirect('/admin/quizzes');
    } catch (err) {
      console.error('Error deleting quiz:', err);
      res.redirect('/admin/quizzes?error=' + encodeURIComponent(err.message));
    }
  }

  async getSchedule(req, res) {
    try {
      const { date, view = 'week', arenaId } = req.query;
      const scheduleData = await lessonsService.getScheduleData({
        date,
        view,
        arenaId,
      });
      const data = AdminViewModel.formatSchedule(scheduleData);

      res.render('admin/schedule', {
        title: 'Equira - Veckoschema',
        data,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading schedule:', err);
      res
        .status(500)
        .render('error', { message: 'Kunde inte läsa in schemat', error: err });
    }
  }

  /**
   * GET /admin/profile
   * Displays the admin profile and settings page.
   */
  async getProfile(req, res) {
    try {
      const adminUserId = req.session.user.id;
      const profileResult = await profileService.getAdminProfile(adminUserId);
      if (!profileResult || !profileResult.user) {
        return res.redirect('/admin/overview');
      }

      const data = AdminViewModel.formatProfile(
        profileResult.user,
        profileResult.stats,
      );

      res.render('admin/profile', {
        title: 'Equira - Min Profil (Admin)',
        data,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading admin profile:', err);
      res
        .status(500)
        .render('error', {
          message: 'Kunde inte läsa in administratörsprofilen',
          error: err,
        });
    }
  }

  /**
   * POST /admin/profile
   * Updates personal contact information and stall title/specializations.
   */
  async postProfile(req, res) {
    try {
      const adminUserId = req.session.user.id;
      const { fullName, email, phone, title, specializations } = req.body;

      const updatedUserDTO = await profileService.updateAdminProfile(
        adminUserId,
        {
          fullName,
          email,
          phone,
          title,
          specializations,
        },
      );

      // Synchronize active session user
      req.session.user.fullName = updatedUserDTO.fullName;
      req.session.user.email = updatedUserDTO.email;

      if (req.setFlash) {
        req.setFlash('success', 'Profiluppgifterna har sparats.');
      }
      res.redirect('/admin/profile');
    } catch (err) {
      console.error('Error updating admin profile:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte uppdatera profilen.');
      }
      res.redirect('/admin/profile');
    }
  }

  /**
   * POST /admin/profile/avatar
   * Updates admin profile picture via multer upload.
   */
  async postProfileAvatar(req, res) {
    try {
      if (req.file && req.session.user) {
        const avatarUrl = '/uploads/avatars/' + req.file.filename;
        await profileService.updateAvatar(req.session.user.id, avatarUrl);
        req.session.user.avatarUrl = avatarUrl;
        if (req.setFlash) {
          req.setFlash('success', 'Profilbilden har uppdaterats!');
        }
      }
      res.redirect('/admin/profile');
    } catch (err) {
      console.error('Error uploading admin avatar:', err);
      if (req.setFlash) {
        req.setFlash('error', 'Kunde inte ladda upp bilden: ' + err.message);
      }
      res.redirect('/admin/profile');
    }
  }

  /**
   * POST /admin/profile/password
   * Changes admin password after verifying current password.
   */
  async postChangePassword(req, res) {
    try {
      const adminUserId = req.session.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!newPassword || newPassword !== confirmPassword) {
        if (req.setFlash) {
          req.setFlash('error', 'De nya lösenorden matchar inte.');
        }
        return res.redirect('/admin/profile');
      }

      await profileService.updatePassword(
        adminUserId,
        currentPassword,
        newPassword,
      );

      if (req.setFlash) {
        req.setFlash('success', 'Ditt lösenord har uppdaterats framgångsrikt.');
      }
      res.redirect('/admin/profile');
    } catch (err) {
      console.error('Error updating admin password:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte ändra lösenordet.');
      }
      res.redirect('/admin/profile');
    }
  }

  /**
   * GET /admin/stampling
   * Overview of active staff on site, time punches, filterable logs, and manual punch controls.
   */
  async getStampling(req, res) {
    try {
      const stats = await timeTrackingService.getOverviewStats();
      const activeStaff = await timeTrackingService.getActiveStaff();
      const entries = await timeTrackingService.getAllTimeEntries(req.query);
      const staffMembers = await timeTrackingService.getAllStaffUsers();

      res.render('admin/stampling', {
        title: 'Equira Admin - Stämpling & Tidsredovisning',
        layout: 'layouts/adminLayout',
        currentPath: '/admin/stampling',
        stats,
        activeStaff,
        entries,
        staffMembers,
        query: req.query,
      });
    } catch (err) {
      console.error('Error loading admin stampling:', err);
      res.status(500).render('error', {
        message: 'Kunde inte ladda stämplingsöversikten',
        error: err,
      });
    }
  }

  /**
   * POST /admin/stampling/in
   * Admin manually clocks in or creates a time entry for any staff member.
   */
  async postAdminCheckIn(req, res) {
    try {
      await timeTrackingService.manualClockIn(req.body);
      if (req.setFlash) {
        req.setFlash(
          'success',
          'Personal har stämplats in / ny tidsregistrering skapad!',
        );
      }
      res.redirect('/admin/stampling');
    } catch (err) {
      console.error('Error admin clocking in:', err);
      if (req.setFlash) {
        req.setFlash(
          'error',
          err.message || 'Kunde inte stämpla in personalen.',
        );
      }
      res.redirect('/admin/stampling');
    }
  }

  /**
   * POST /admin/stampling/out/:id
   * Admin manually clocks out an active staff member.
   */
  async postAdminCheckOut(req, res) {
    try {
      const { id } = req.params;
      const { checkOutTime, adminNote } = req.body;
      await timeTrackingService.manualClockOut(id, checkOutTime, adminNote);

      if (req.setFlash) {
        req.setFlash('success', 'Personal har stämplats ut!');
      }
      res.redirect('/admin/stampling');
    } catch (err) {
      console.error('Error admin clocking out:', err);
      if (req.setFlash) {
        req.setFlash(
          'error',
          err.message || 'Kunde inte stämpla ut personalen.',
        );
      }
      res.redirect('/admin/stampling');
    }
  }

  /**
   * POST /admin/stampling/edit/:id
   * Admin adjusts or corrects an existing time entry.
   */
  async postAdminEditTimeEntry(req, res) {
    try {
      const { id } = req.params;
      const adminName =
        req.session.user?.fullName ||
        req.session.user?.username ||
        'Administratör';
      await timeTrackingService.updateTimeEntry(id, {
        ...req.body,
        adjustedBy: adminName,
      });

      if (req.setFlash) {
        req.setFlash(
          'success',
          'Tidsstämpeln har uppdaterats (personalens originalstämpling har bevarats)!',
        );
      }
      res.redirect('/admin/stampling');
    } catch (err) {
      console.error('Error editing time entry:', err);
      if (req.setFlash) {
        req.setFlash(
          'error',
          err.message || 'Kunde inte uppdatera tidsstämpeln.',
        );
      }
      res.redirect('/admin/stampling');
    }
  }

  /**
   * POST /admin/stampling/delete/:id
   * Admin deletes a time entry.
   */
  async postAdminDeleteTimeEntry(req, res) {
    try {
      const { id } = req.params;
      await timeTrackingService.deleteTimeEntry(id);

      if (req.setFlash) {
        req.setFlash('success', 'Tidsstämpeln har raderats.');
      }
      res.redirect('/admin/stampling?success=' + encodeURIComponent('Tidsstämplingen har tagits bort.'));
    } catch (err) {
      console.error('Error deleting time entry:', err);
      if (req.setFlash) {
        req.setFlash(
          'error',
          err.message || 'Kunde inte ta bort tidsstämpeln.',
        );
      }
      res.redirect('/admin/stampling?error=' + encodeURIComponent(err.message || 'Kunde inte ta bort tidsstämpeln.'));
    }
  }

  /**
   * GET /admin/staff-schedule
   * Displays the staff workforce scheduling management dashboard.
   */
  async getStaffSchedule(req, res) {
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = req.query.month || currentMonthKey;
      const staffId = req.query.staffId || null;

      const scheduleData =
        await staffScheduleService.getMonthlyScheduleOverview(month, staffId);

      res.render('admin/staffSchedule', {
        title: 'Equira - Personalschema & Schemaläggning',
        data: scheduleData,
        currentPath: '/admin/staff-schedule',
        success: req.query.success || null,
        error: req.query.error || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading admin staff schedule:', err);
      res.status(500).render('error', {
        message: 'Kunde inte läsa in personalschemat',
        error: err,
      });
    }
  }

  /**
   * POST /admin/staff-schedule/create
   * Admin schedules a new shift for a staff member.
   */
  async postCreateStaffShift(req, res) {
    try {
      await staffScheduleService.createShift(req.body);
      if (req.setFlash) {
        req.setFlash('success', 'Arbetspasset har schemalagts!');
      }
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = req.body.date
        ? req.body.date.substring(0, 7)
        : currentMonthKey;
      res.redirect(`/admin/staff-schedule?month=${month}`);
    } catch (err) {
      console.error('Error creating staff shift:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte schemalägga passet.');
      }
      res.redirect('/admin/staff-schedule');
    }
  }

  /**
   * POST /admin/staff-schedule/quick-week
   * Admin schedules a full standard week (Mon-Fri) for a staff member.
   */
  async postQuickWeekStaffShift(req, res) {
    try {
      await staffScheduleService.createStandardWeek(req.body);
      if (req.setFlash) {
        req.setFlash('success', 'Standardvecka (Mån–Fre) har schemalagts!');
      }
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = req.body.mondayDate
        ? req.body.mondayDate.substring(0, 7)
        : currentMonthKey;
      res.redirect(`/admin/staff-schedule?month=${month}`);
    } catch (err) {
      console.error('Error quick scheduling week:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte schemalägga veckan.');
      }
      res.redirect('/admin/staff-schedule');
    }
  }

  /**
   * POST /admin/staff-schedule/edit/:id
   * Admin modifies a scheduled shift.
   */
  async postEditStaffShift(req, res) {
    try {
      const { id } = req.params;
      const adminName =
        req.session.user?.fullName ||
        req.session.user?.username ||
        'Administratör';
      await staffScheduleService.updateShift(id, {
        ...req.body,
        adjustedBy: adminName,
      });
      if (req.setFlash) {
        req.setFlash(
          'success',
          'Arbetspasset har uppdaterats (original planerad tid bevarad)!',
        );
      }
      res.redirect(req.headers.referer || '/admin/staff-schedule');
    } catch (err) {
      console.error('Error editing shift:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte uppdatera passet.');
      }
      res.redirect('/admin/staff-schedule');
    }
  }

  /**
   * POST /admin/staff-schedule/delete/:id
   * Admin removes a scheduled shift.
   */
  async postDeleteStaffShift(req, res) {
    try {
      const { id } = req.params;
      const deletedShift = await staffScheduleService.deleteShift(id);
      if (req.setFlash) {
        req.setFlash('success', 'Arbetspasset har tagits bort från schemat.');
      }
      const monthKey = deletedShift?.date ? deletedShift.date.substring(0, 7) : (req.query.month || '');
      const redirectUrl = monthKey 
        ? `/admin/staff-schedule?month=${monthKey}&success=` + encodeURIComponent('Arbetspasset har tagits bort från schemat.')
        : '/admin/staff-schedule?success=' + encodeURIComponent('Arbetspasset har tagits bort från schemat.');

      res.redirect(redirectUrl);
    } catch (err) {
      console.error('Error deleting shift:', err);
      if (req.setFlash) {
        req.setFlash('error', err.message || 'Kunde inte ta bort passet.');
      }
      res.redirect('/admin/staff-schedule?error=' + encodeURIComponent(err.message || 'Kunde inte ta bort passet.'));
    }
  }

  // ==========================================
  // ARENA / RIDBANA MANAGEMENT (CRUD)
  // ==========================================

  /**
   * GET /admin/arenas
   * Displays the arena registry overview with KPI cards, indoor/outdoor filters, and search.
   */
  async getArenas(req, res) {
    try {
      const filter = req.query.filter || 'all';
      const arenas = await arenasService.getArenas(filter);
      const kpis = arenasService.getArenaKPIs(arenas);

      res.render('admin/arenas', {
        title: 'Equira - Ridbanor & Arenor',
        arenas,
        kpis,
        filter,
        success: req.query.success,
        error: req.query.error,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading arenas:', err);
      res.status(500).render('error', {
        message: 'Kunde inte läsa in ridbanorna',
        error: err,
      });
    }
  }

  /**
   * GET /admin/arenas/create
   * Displays the creation form for a new riding arena.
   */
  async getArenaCreate(req, res) {
    res.render('admin/arenaCreate', {
      title: 'Equira - Skapa Ridbana',
      arena: {
        name: '',
        dimensions: '20×60m',
        surfaceType: 'Fibersand',
        isIndoor: true,
        notes: '',
      },
      error: null,
      layout: 'layouts/adminLayout',
    });
  }

  /**
   * POST /admin/arenas/create
   * Handles creation submission for a new riding arena.
   */
  async postArenaCreate(req, res) {
    try {
      if (req.file) {
        req.body.imageUrl = '/images/uploads/arenas/' + req.file.filename;
      }
      const newArena = await arenasService.createArena(req.body);
      const successMsg = `Ridbanan "${newArena.name}" har skapats!`;
      if (req.setFlash) {
        req.setFlash('success', successMsg);
      }
      res.redirect('/admin/arenas?success=' + encodeURIComponent(successMsg));
    } catch (err) {
      console.error('Error creating arena:', err);
      res.render('admin/arenaCreate', {
        title: 'Equira - Skapa Ridbana',
        arena: {
          name: req.body.name || '',
          dimensions: req.body.dimensions || '',
          surfaceType: req.body.surfaceType || '',
          isIndoor: req.body.isIndoor === 'true' || req.body.isIndoor === true || req.body.isIndoor === '1' || req.body.isIndoor === 'on',
          notes: req.body.notes || '',
          imageUrl: req.body.imageUrl || '',
        },
        error: 'Kunde inte skapa ridbanan: ' + (err.message || 'Okänt fel inträffade.'),
        layout: 'layouts/adminLayout',
      });
    }
  }

  /**
   * GET /admin/arenas/:id/edit
   * Displays the edit form for an existing arena.
   */
  async getArenaEdit(req, res) {
    try {
      const arena = await arenasService.getArenaById(req.params.id);
      if (!arena) {
        return res.redirect(
          '/admin/arenas?error=' + encodeURIComponent('Ridbanan kunde inte hittas.'),
        );
      }

      res.render('admin/arenaEdit', {
        title: `Equira - Redigera ${arena.name}`,
        arena,
        error: null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading arena for edit:', err);
      res.redirect('/admin/arenas?error=' + encodeURIComponent(err.message));
    }
  }

  /**
   * POST /admin/arenas/:id/edit
   * Updates an existing arena.
   */
  async postArenaEdit(req, res) {
    try {
      if (req.file) {
        req.body.imageUrl = '/images/uploads/arenas/' + req.file.filename;
      }
      const updatedArena = await arenasService.updateArena(req.params.id, req.body);
      const successMsg = `Ridbanan "${updatedArena.name}" har uppdaterats!`;
      if (req.setFlash) {
        req.setFlash('success', successMsg);
      }
      res.redirect('/admin/arenas?success=' + encodeURIComponent(successMsg));
    } catch (err) {
      console.error('Error updating arena:', err);
      const arena = await arenasService.getArenaById(req.params.id);
      res.render('admin/arenaEdit', {
        title: 'Equira - Redigera ridbana',
        arena: arena || { id: req.params.id, ...req.body },
        error: 'Kunde inte uppdatera ridbanan: ' + (err.message || 'Okänt fel inträffade.'),
        layout: 'layouts/adminLayout',
      });
    }
  }

  /**
   * POST /admin/arenas/:id/delete
   * Removes an arena and unlinks any associated lessons.
   */
  async postArenaDelete(req, res) {
    try {
      await arenasService.deleteArena(req.params.id);
      const successMsg = 'Ridbanan har tagits bort.';
      if (req.setFlash) {
        req.setFlash('success', successMsg);
      }
      res.redirect('/admin/arenas?success=' + encodeURIComponent(successMsg));
    } catch (err) {
      console.error('Error deleting arena:', err);
      res.redirect('/admin/arenas?error=' + encodeURIComponent(err.message || 'Kunde inte ta bort ridbanan.'));
    }
  }
}

module.exports = new AdminController();
