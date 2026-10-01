const { getDataSource } = require('../../config/database');
const AdminMapper = require('./adminMapper');

/**
 * QuizzesService (Admin Domain)
 * 
 * Handles administration, metrics aggregation, and creation of
 * equestrian knowledge quizzes.
 *
 */
class QuizzesService {
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
   * Retrieves all quizzes with questions and student attempts for admin overview.
   *
   * @returns {Promise<Array<Object>>} List of QuizAdminDTOs
   */
  async getAllQuizzes() {
    const quizRepo = await this._getRepository('Quiz');

    const quizzes = await quizRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.questions', 'questions')
      .leftJoinAndSelect('q.attempts', 'attempts')
      .orderBy('q.id', 'ASC')
      .getMany();

    return quizzes.map((q) => AdminMapper.toQuizDTO(q));
  }

  /**
   * Retrieves a single quiz by ID with its questions and options.
   *
   * @param {number|string} id - Quiz ID
   * @returns {Promise<Object|null>}
   */
  async getQuizById(id) {
    const quizRepo = await this._getRepository('Quiz');
    const quiz = await quizRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
      .leftJoinAndSelect('q.attempts', 'attempts')
      .where('q.id = :id', { id: parseInt(id, 10) })
      .orderBy('questions.questionOrder', 'ASC')
      .addOrderBy('options.optionOrder', 'ASC')
      .getOne();

    return quiz;
  }

  /**
   * Creates a new quiz with associated questions and multiple-choice options.
   *
   * @param {Object} data - Quiz creation payload
   * @returns {Promise<Object>} Created Quiz entity
   */
  async createQuiz(data) {
    const quizRepo = await this._getRepository('Quiz');
    const questionRepo = await this._getRepository('QuizQuestion');
    const optionRepo = await this._getRepository('QuizOption');

    const quiz = quizRepo.create({
      title: data.title,
      category: data.category || 'Hästkunskap',
      description: data.description || '',
      difficulty: data.difficulty || 'Medel',
      timeLimitMinutes: data.timeLimitMinutes
        ? parseInt(data.timeLimitMinutes, 10)
        : 10,
      passPercentage: data.passPercentage
        ? parseInt(data.passPercentage, 10)
        : 70,
      equestrianBadge: data.equestrianBadge || 'Märke 1',
      targetLevel: data.targetLevel || 'Nivå 1',
      isPublished: true,
    });

    const savedQuiz = await quizRepo.save(quiz);

    if (data.questions && Array.isArray(data.questions)) {
      for (let i = 0; i < data.questions.length; i++) {
        const qData = data.questions[i];
        if (!qData.questionText || !qData.questionText.trim()) continue;

        const question = questionRepo.create({
          quizId: savedQuiz.id,
          questionText: qData.questionText.trim(),
          topicTitle: qData.topicTitle || `Fråga ${i + 1}`,
          explanationText: qData.explanationText || '',
          questionOrder: i + 1,
        });

        const savedQuestion = await questionRepo.save(question);

        if (qData.options && Array.isArray(qData.options)) {
          for (let j = 0; j < qData.options.length; j++) {
            const optData = qData.options[j];
            const optText =
              typeof optData === 'string'
                ? optData
                : optData.text || optData.optionText || `Alternativ ${j + 1}`;
            const isCorrect =
              typeof optData === 'object' ? Boolean(optData.isCorrect) : false;

            const option = optionRepo.create({
              questionId: savedQuestion.id,
              optionText: optText,
              text: optText,
              isCorrect,
              optionOrder: j + 1,
            });
            await optionRepo.save(option);
          }
        }
      }
    }

    return savedQuiz;
  }

  /**
   * Updates an existing quiz and its associated questions & options.
   *
   * @param {number|string} id - Quiz ID
   * @param {Object} data - Update payload
   * @returns {Promise<Object>} Updated quiz entity
   */
  async updateQuiz(id, data) {
    const quizRepo = await this._getRepository('Quiz');
    const questionRepo = await this._getRepository('QuizQuestion');
    const optionRepo = await this._getRepository('QuizOption');

    const parsedId = parseInt(id, 10);
    const quiz = await quizRepo.findOne({ where: { id: parsedId } });
    if (!quiz) {
      throw new Error(`Quiz med id ${id} hittades inte.`);
    }

    quiz.title = data.title !== undefined ? data.title : quiz.title;
    quiz.category = data.category !== undefined ? data.category : quiz.category;
    quiz.description =
      data.description !== undefined ? data.description : quiz.description;
    quiz.difficulty =
      data.difficulty !== undefined ? data.difficulty : quiz.difficulty;
    quiz.timeLimitMinutes =
      data.timeLimitMinutes !== undefined
        ? parseInt(data.timeLimitMinutes, 10)
        : quiz.timeLimitMinutes;
    quiz.passPercentage =
      data.passPercentage !== undefined
        ? parseInt(data.passPercentage, 10)
        : quiz.passPercentage;
    quiz.equestrianBadge =
      data.equestrianBadge !== undefined
        ? data.equestrianBadge
        : quiz.equestrianBadge;
    quiz.targetLevel =
      data.targetLevel !== undefined ? data.targetLevel : quiz.targetLevel;

    await quizRepo.save(quiz);

    // If questions are provided, replace them cleanly
    if (data.questions && Array.isArray(data.questions)) {
      const existingQuestions = await questionRepo.find({
        where: { quizId: parsedId },
      });
      for (const eq of existingQuestions) {
        await optionRepo.delete({ questionId: eq.id });
        await questionRepo.delete({ id: eq.id });
      }

      for (let i = 0; i < data.questions.length; i++) {
        const qData = data.questions[i];
        if (!qData.questionText || !qData.questionText.trim()) continue;

        const question = questionRepo.create({
          quizId: parsedId,
          questionText: qData.questionText.trim(),
          topicTitle: qData.topicTitle || `Fråga ${i + 1}`,
          explanationText: qData.explanationText || '',
          questionOrder: i + 1,
        });

        const savedQuestion = await questionRepo.save(question);

        if (qData.options && Array.isArray(qData.options)) {
          for (let j = 0; j < qData.options.length; j++) {
            const optData = qData.options[j];
            const optText =
              typeof optData === 'string'
                ? optData
                : optData.text || optData.optionText || `Alternativ ${j + 1}`;
            const isCorrect =
              typeof optData === 'object' ? Boolean(optData.isCorrect) : false;

            const option = optionRepo.create({
              questionId: savedQuestion.id,
              optionText: optText,
              text: optText,
              isCorrect,
              optionOrder: j + 1,
            });
            await optionRepo.save(option);
          }
        }
      }
    }

    return quiz;
  }

  /**
   * Deletes a quiz and all associated attempts, questions, and options.
   *
   * @param {number|string} id - Quiz ID
   * @returns {Promise<boolean>}
   */
  async deleteQuiz(id) {
    const quizRepo = await this._getRepository('Quiz');
    const questionRepo = await this._getRepository('QuizQuestion');
    const optionRepo = await this._getRepository('QuizOption');
    const attemptRepo = await this._getRepository('QuizAttempt');

    const parsedId = parseInt(id, 10);
    const quiz = await quizRepo.findOne({ where: { id: parsedId } });
    if (!quiz) {
      return false;
    }

    // 1. Delete associated attempts
    await attemptRepo.delete({ quizId: parsedId });

    // 2. Delete options for all questions in this quiz
    const questions = await questionRepo.find({ where: { quizId: parsedId } });
    for (const q of questions) {
      await optionRepo.delete({ questionId: q.id });
    }

    // 3. Delete questions
    await questionRepo.delete({ quizId: parsedId });

    // 4. Delete quiz
    await quizRepo.delete({ id: parsedId });

    return true;
  }
}

module.exports = new QuizzesService();
