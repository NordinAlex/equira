// Equira Client Interactions

document.addEventListener('DOMContentLoaded', () => {
  initDragAndDrop();
  initTaskChecklists();
  initQuizRunner();
  initAdminMobileDrawer();
});

/**
 * Drag and drop horse assignment logic
 */
function initDragAndDrop() {
  const draggables = document.querySelectorAll('[data-draggable-horse]');
  const dropzone = document.querySelector('[data-dropzone-allocation]');

  if (!dropzone || draggables.length === 0) return;

  draggables.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.horseId);
      item.classList.add('opacity-50');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('opacity-50');
    });

    // Also support direct click to assign
    item.addEventListener('click', () => {
      const horseId = item.dataset.horseId;
      assignHorseToActiveStudent(horseId);
    });
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const horseId = e.dataTransfer.getData('text/plain');
    if (horseId) {
      assignHorseToActiveStudent(horseId);
    }
  });
}

function assignHorseToActiveStudent(horseId) {
  const form = document.getElementById('assignmentForm');
  const horseInput = document.getElementById('assignFormHorseId');
  if (!form || !horseInput) return;

  horseInput.value = horseId;

  // Submit assignment
  form.submit();
}

/**
 * Task checklist toggles in Staff portal
 */
function initTaskChecklists() {
  const checkBoxes = document.querySelectorAll('[data-task-checklist-item]');
  checkBoxes.forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const taskId = cb.dataset.taskId;
      const itemIndex = cb.dataset.itemIndex;
      const completed = cb.checked;

      try {
        await fetch('/api/tasks/' + taskId + '/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIndex, completed }),
        });
        const label = cb.closest('label')?.querySelector('.checklist-text');
        if (label) {
          if (completed) {
            label.classList.add('line-through', 'text-gray-400');
          } else {
            label.classList.remove('line-through', 'text-gray-400');
          }
        }
      } catch (err) {
        console.error('Checklist update error:', err);
      }
    });
  });
}

/**
 * Interactive Quiz Runner
 */
function initQuizRunner() {
  const optionButtons = document.querySelectorAll('.quiz-option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const questionId = btn.dataset.questionId;
      const optionId = btn.dataset.optionId;

      // Deselect other options in same question
      document.querySelectorAll(`[data-question-id="${questionId}"]`).forEach(b => {
        b.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-950', 'ring-1', 'ring-blue-500/20', 'bg-emerald-100', 'border-emerald-500', 'text-emerald-900', 'bg-emerald-50/80', 'text-emerald-950', 'font-medium');
        b.classList.add('border-stone-200', 'bg-white', 'text-stone-800');
        const checkIcon = b.querySelector('.option-check-icon');
        const emptyIcon = b.querySelector('.option-empty-icon');
        if (checkIcon) checkIcon.classList.add('hidden');
        if (emptyIcon) emptyIcon.classList.remove('hidden');
      });

      // Select clicked option (Blue active theme)
      btn.classList.remove('border-stone-200', 'bg-white', 'text-stone-800');
      btn.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-950', 'font-medium', 'ring-1', 'ring-blue-500/20');
      const checkIcon = btn.querySelector('.option-check-icon');
      const emptyIcon = btn.querySelector('.option-empty-icon');
      if (checkIcon) {
        checkIcon.classList.remove('hidden', 'bg-emerald-700', 'bg-emerald-600');
        checkIcon.classList.add('bg-blue-600');
      }
      if (emptyIcon) emptyIcon.classList.add('hidden');

      // Update hidden inputs
      const hiddenInput = document.getElementById(`input_q_${questionId}`);
      if (hiddenInput) {
        hiddenInput.value = optionId;
      }
      const step = btn.closest('.question-step');
      if (step && step.dataset.step !== undefined) {
        const fallback = document.getElementById(`input_fallback_${step.dataset.step}`);
        if (fallback) fallback.value = optionId;
      }
    });
  });
}

/**
 * Quiz question stepper
 */
window.nextQuestion = function(currentIdx) {
  const currentCard = document.getElementById('question_card_' + currentIdx);
  const nextCard = document.getElementById('question_card_' + (currentIdx + 1));
  if (currentCard && nextCard) {
    currentCard.classList.add('hidden');
    nextCard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/**
 * Responsive Admin Off-Canvas Mobile Drawer Toggle
 */
function initAdminMobileDrawer() {
  const openBtn = document.getElementById('admin-mobile-menu-btn');
  const bottomMenuBtn = document.getElementById('admin-bottom-menu-btn');
  const closeBtn = document.getElementById('admin-mobile-menu-close');
  const drawer = document.getElementById('admin-mobile-drawer');
  const backdrop = document.getElementById('admin-mobile-drawer-backdrop');

  if (!drawer || !backdrop) return;

  function openDrawer() {
    backdrop.classList.remove('hidden');
    // Force layout reflow before triggering CSS opacity transition
    void backdrop.offsetWidth;
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    drawer.classList.remove('-translate-x-full');
    drawer.classList.add('translate-x-0');
    document.body.classList.add('overflow-hidden');
  }

  function closeDrawer() {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    drawer.classList.remove('translate-x-0');
    drawer.classList.add('-translate-x-full');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
      if (drawer.classList.contains('-translate-x-full')) {
        backdrop.classList.add('hidden');
      }
    }, 300);
  }

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (bottomMenuBtn) bottomMenuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('-translate-x-full')) {
      closeDrawer();
    }
  });
}

