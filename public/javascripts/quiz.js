const startButton = document.getElementById("start-quiz");
const startScreen = document.getElementById("quiz-start");
const questions = document.getElementById("quiz-questions");
const quizQuestions = document.querySelectorAll(".quiz-question");
const totalQuestions = quizQuestions.length;
const progressBar = document.querySelectorAll(".quiz-progress");
const quizQuestionsContainer = document.getElementById("quiz-questions");
const quizId = quizQuestionsContainer.dataset.quizId;

startButton.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    questions.classList.remove("hidden");
    quizQuestions[0].classList.remove("hidden");

    const progress = (( 0 + 1) / totalQuestions) * 100;
    progressBar[0].style.width = `${progress}%`;
});

const nextButton = document.querySelectorAll(".next-question");

nextButton.forEach((button, index) => {
    button.addEventListener("click", () => {

        const currentQuestion = quizQuestions[index];
        const selectedAnswer = currentQuestion.querySelector('input[type="radio"]:checked');
        const warning = currentQuestion.querySelector(".answer-warning");

        if (!selectedAnswer) {
            warning.classList.remove("opacity-0", "scale-90");
            warning.classList.add("opacity-100", "scale-100");
            return;
        }

        if (index < quizQuestions.length -1) {
            quizQuestions[index].classList.add("hidden");
            quizQuestions[index + 1].classList.remove("hidden");

            const progress = ((index + 2) / totalQuestions) * 100;
            progressBar[index + 1].style.width = `${progress}%`;
        } else {
            const answers = {};

            quizQuestions.forEach((question) => {
                const selectedAnswer = currentQuestion.querySelector('input[type="radio"]:checked');

                if (selectedAnswer) {
                    answers[selectedAnswer.name] = selectedAnswer.value;
                }
            });
            fetch(`/student/quiz/${quizId}/results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ answers })
            })

            .then(() => {
                window.location.href = `/student/quiz/${quizId}/result`;
            });
        }
    });
});

quizQuestions.forEach((question) => {
    const answers = question.querySelectorAll('input[type="radio"]');
    const warning = question.querySelector(".answer-warning");

    answers.forEach((answer) => {
        answer.addEventListener("change", () => {
            warning.classList.remove("opacity-100", "scale-100");
            warning.classList.add("opacity-0", "scale-90");
        });
    });
});