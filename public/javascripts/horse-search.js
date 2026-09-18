const searchInput = document.getElementById("horseSearch");
const horseContainer = document.querySelector(".space-y-8");
const horseCards = Array.from(document.querySelectorAll(".horse-card"));

function filterHorses() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  horseCards.forEach(card => {
    const horseName = card.dataset.name;

    if (horseName.includes(searchTerm)) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

searchInput.addEventListener("input", filterHorses);

searchInput.closest("form").addEventListener("submit", (event) => {
  event.preventDefault();

  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!searchTerm) {
    return;
  }

  const exactMatch = horseCards.find(card =>
    card.dataset.name === searchTerm
  );

  if (exactMatch) {
    horseContainer.prepend(exactMatch);
  }
});