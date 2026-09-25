const overviewService = require('../services/admin/overviewService');
const horsesService = require('../services/admin/horsesService');
const assignService = require('../services/admin/assignService');
const lessonsService = require('../services/admin/lessonsService');
const studentsService = require('../services/admin/studentsService');
const tasksService = require('../services/admin/tasksService');
const quizzesService = require('../services/admin/quizzesService');
const staffService = require('../services/admin/staffService');
const profileService = require('../services/admin/profileService');
const AdminViewModel = require('../models/viewModels/admin/AdminViewModel');

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
        success: req.query.success || null,
        error: req.query.error || null,
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
      formData: {},
      layout: 'layouts/adminLayout',
    });
  }

  async postHorseCreate(req, res) {
    try {
      if (req.file) {
        req.body.photoUrl = '/images/uploads/horses/' + req.file.filename;
      }
      await horsesService.createHorse(req.body);
      res.redirect('/admin/horses?success=' + encodeURIComponent('Ny häst har registrerats!'));
    } catch (err) {
      console.error('Error creating horse:', err);
      res.render('admin/horseCreate', {
        title: 'Equira - Registrera Häst',
        error: 'Kunde inte spara hästen: ' + err.message,
        formData: req.body,
        layout: 'layouts/adminLayout',
      });
    }
  }

    async getHorseProfile(req, res) {
    try {
      const horse = await horsesService.getHorseById(req.params.id);

      if (!horse) {
        return res.redirect(
          '/admin/horses?error=' +
            encodeURIComponent('Hästen kunde inte hittas.')
        );
      }

      const tasks = await tasksService.getStableTasks();

      const horseTasks = tasks.filter(
        task => Number(task.horseId) === Number(horse.id)
      );

      res.render('admin/horseProfile', {
        title: `Equira - ${horse.name}`,
        horse,
        tasks: horseTasks,
        error: req.query.error || null,
        success: req.query.success || null,
        layout: 'layouts/adminLayout',
      });
    } catch (err) {
      console.error('Error loading horse profile:', err);

      res.status(500).render('error', {
        message: 'Kunde inte läsa in hästens profil',
        error: err,
      });
    }
  }

  async postHorseTask(req, res) {
    try {
      const horse = await horsesService.getHorseById(req.params.id);

      if (!horse) {
        return res.redirect(
          '/admin/horses?error=' +
            encodeURIComponent('Hästen kunde inte hittas.')
        );
      }

      await tasksService.createStableTask({
        ...req.body,
        horseId: horse.id,
      });

      res.redirect(
        `/admin/horses/${horse.id}?success=` +
          encodeURIComponent('Åtgärden har lagts till.')
      );
    } catch (err) {
      console.error('Error creating horse task:', err);

      res.redirect(
        `/admin/horses/${req.params.id}?error=` +
          encodeURIComponent('Kunde inte skapa åtgärden: ' + err.message)
      );
    }
  }

  async getHorseEdit(req, res) {
    try {
      const horse = await horsesService.getHorseById(req.params.id);
      if (!horse) {
        return res.redirect('/admin/horses?error=' + encodeURIComponent('Hästen kunde inte hittas.'));
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
      res.redirect('/admin/horses?success=' + encodeURIComponent('Hästens uppgifter har uppdaterats!'));
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
      res.redirect('/admin/horses?success=' + encodeURIComponent('Hästen har tagits bort från systemet.'));
    } catch (err) {
      console.error('Error deleting horse:', err);
      res.redirect('/admin/horses?error=' + encodeURIComponent('Kunde inte ta bort hästen: ' + err.message));
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
      res.redirect('/admin/lessons');
    } catch (err) {
      console.error('Error creating lesson:', err);
      res.redirect(
        '/admin/lessons/create?error=' + encodeURIComponent(err.message),
      );
    }
  }

  async getStudents(req, res) {
    try {
      const students = await studentsService.getAllStudents();
      const formatted = AdminViewModel.formatStudents(students);

      res.render('admin/students', {
        title: 'Equira - Elever',
        students: formatted,
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
      formData: {},
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
        formData: req.body,
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
        return res.status(404).render('error', {
          message: 'Quizet kunde inte hittas',
          error: { status: 404 },
          layout: false,
        });
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
        const avatarUrl = '/images/uploads/avatars/' + req.file.filename;
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
}

module.exports = new AdminController();
