(function () {
  if (document.body.dataset.view !== 'management') return;

  function hideKpiBanner() {
    const summary = document.getElementById('summary');
    if (!summary) return;

    if (!summary.hidden) summary.hidden = true;
    if (summary.getAttribute('aria-hidden') !== 'true') summary.setAttribute('aria-hidden', 'true');
    if (summary.style.getPropertyValue('display') !== 'none') {
      summary.style.setProperty('display', 'none', 'important');
    }
  }

  function hideAssignmentControls() {
    const shareButton = document.getElementById('shareViewBtn');
    const assignedButton = document.getElementById('assignedResultsBtn');

    [shareButton, assignedButton].forEach((button) => {
      if (!button) return;
      button.setAttribute('aria-hidden', 'true');
      button.style.setProperty('display', 'none', 'important');
    });

    const grid = document.querySelector('[aria-label="Search voters"] .form.search-grid');
    if (grid) {
      grid.classList.remove('assigned-results-ready');
      grid.style.setProperty('grid-template-columns', 'minmax(280px,1fr) minmax(180px,.45fr) 132px', 'important');
    }
  }

  function run() {
    hideKpiBanner();
    hideAssignmentControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  window.addEventListener('load', run, { once: true });
  [100, 300, 800, 1600, 3000, 6000].forEach((delay) => setTimeout(run, delay));

  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();
