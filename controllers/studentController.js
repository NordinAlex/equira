const { getDataSource } = require('../config/database');

// OVERVIEW
async function overview(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const bookingRepository = dataSource.getRepository("LessonBooking");
        const bookings = await bookingRepository.find({
            where: {
                studentId: req.session.user.id
            },
            relations: {
                lesson: {
                    arena: true,
                    instructor: true,
                    ridingGroup: true
                },
                horse: true
            }
        });

        // OVERVIEW BOOKINGS
        const now = new Date();
        const upcomingBookings = bookings
            .filter(booking => booking.lesson)
            .filter(booking => {
                const lessonDateTime = new Date(
                    `${booking.lesson.date}T${booking.lesson.startTime}`
                );

                return lessonDateTime >= now;
            })
            .sort((a, b) => {
                const dateA = new Date(
                    `${a.lesson.date}T${a.lesson.startTime}`
                );
                const dateB = new Date(
                    `${b.lesson.date}T${b.lesson.startTime}`
                );
                return dateA - dateB;
            });
        const nextBooking = upcomingBookings[0] || null;
        const upcomingLessons = upcomingBookings
            .slice(1, 3)
            .map(booking => ({
                ...booking,
                dayLabel: new Date(`${booking.lesson.date}T00:00:00`)
                    .toLocaleDateString("sv-SE", {
                        weekday: "short"
                    })
                    .replace(".", "")
            }));

        let nextLesson = null;
        if (nextBooking) {
            const lesson = nextBooking.lesson

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const lessonDate = new Date(
                `${lesson.date}T00:00:00`
            );

            let dayLabel;
            if (lessonDate.getTime() === today.getTime()) {
                dayLabel = "Idag";
            } else if (lessonDate.getTime() === tomorrow.getTime()) {
                dayLabel = "Imorgon"
            } else {
                dayLabel = lessonDate.toLocaleDateString("sv-SE", {
                    weekday: "long"
                });
            }

            nextLesson = {
                ...lesson,
                dayLabel
            };
        }

        // RENDER OVERVIEW
        res.render("student/overview", {
            user: req.session.user,
            nextLesson,
            nextBooking,
            upcomingLessons,
            showBackButton: false
        });
    } catch (error) {
        next(error);
    }
}

// LESSON DETAILS
async function lessonDetails(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const bookingRepository = dataSource.getRepository("LessonBooking");
        const booking = await bookingRepository.findOne({
            where: {
                lesson: {
                    id: Number(req.params.id)
                },
                studentId: req.session.user.id
            },
            relations: {
                lesson: {
                    arena: true,
                    instructor: true,
                    ridingGroup: true
                },
                horse: true
            }
        });

        if (!booking || !booking.lesson) {
            return res.status(404).render("error", {
                error: {
                    status: 404
                },
                message: "Lektionen kunde inte hittas."
            });
        }

        res.render("student/lesson-details", {
            lesson: booking.lesson,
            booking,
            horse: booking.horse,
            showBackButton: true
        });

    } catch (error) {
        next(error);
    }
}

// HORSES LIST
async function horses(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const horseRepository = dataSource.getRepository("Horse");
        const horses = await horseRepository.find();

        res.render("student/horses", {
            horses,
            showBackButton: true
        });
    } catch (error) {
        next(error);
    }
}

// HORSE DETAILS
async function horseProfile(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const horseRepository = dataSource.getRepository("Horse");
        const horse = await horseRepository.findOneBy({
            id: Number(req.params.id)
        });

        if (!horse) {
            return res.status(404).render("error");
        }

        res.render("student/horse-profile", {
            horse,
            showBackButton: true
        });

    } catch (error) {
        next(error);
    }
}

// SCHEDULE

async function schedule(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const lessonBookingRepository = dataSource.getRepository("LessonBooking");
        const bookings = await lessonBookingRepository.find({
            where: {
                studentId: req.session.user.id
            },
            relations: {
                lesson: {
                    arena: true,
                    instructor: true,
                    ridingGroup: true
                },
                horse: true
            },

            order: {
                lesson: {
                    date: "ASC",
                    startTime: "ASC"
                }
            }
        });

        res.render("student/schedule", {
            bookings,
            showBackButton: true
        });
    } catch (error) {
        next(error);
    }
}

// QUIZ

async function quizzes(req, res, next) {
    try {
        const dataSource = await getDataSource();
        const quizRepository = dataSource.getRepository("Quiz");
        const quizzes = await quizRepository.find({
            where: {
                isPublished: true
            },
            relations: {
                questions: true,
                attempts: true
                },
            order: {
                title: "ASC"
            }
        });

        const studentId = req.session.user.id;
        const quizzesWithHighScore = quizzes.map(quiz => {
            const studentAttempts = quiz.attempts.filter(
                attempt => attempt.studentId === studentId
            );

            const highScore = studentAttempts.lentgh > 0
            ? Math.max(...studentAttempts.map(attempt => attempt.percentage))
            : null;

            return {
                ...quiz,
                highScore
            };
        });

        res.render("student/quiz", {
            quizzes: quizzesWithHighScore,
            showBackButton: true
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { overview, lessonDetails, horses, horseProfile, schedule, quizzes };
