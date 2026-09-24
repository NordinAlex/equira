const startButton = document.getElementById("start-quiz");
const startScreen = document.getElementById("quiz-start");
const questions = document.getElementById("quiz-questions");
const quizQuestions = document.querySelectorAll(".quiz-question");
const totalQuestions = quizQuestions.length;
const progressBar = document.querySelectorAll(".quiz-progress");

startButton.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    questions.classList.remove("hidden");
    quizQuestions[0].classList.remove("hidden");
    const progress = (( 0 + 1) / totalQuestions) * 100;
    progressBar[0].style.width = `${progress}%`;
});