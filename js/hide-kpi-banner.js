(function () {
  if (document.body.dataset.view !== 'management') return;

  function assignedUrl() {
    const params = new URLSearchParams(location.search);
    const party = params.get('party') || 'PNC';
    return 'assign.html?party=' + encodeURIComponent(party);
  }

  function redirectAssignedFilter() {
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'assigned') {
      location.replace(assignedUrl());
    }
  }

  function hideKpiBanner() {
    const summary = document.getElementById('summary');
    if (!summary) return;

    if (!summary.hidden) summary.hidden = true;
    if (summary.getAttribute('aria-hidden') !== 'true') summary.setAttribute('aria-hidden', 'true');
    if (summary.style.getPropertyValue('display') !== 'none') {
      summary.style.setProperty('display', 'none', 'important');
    }
  }

  function moveAssignedClicks() {
    document.querySelectorAll('a[href*="filter=assigned"]').forEach((link) => {
      link.href = assignedUrl();
    });

    document.querySelectorAll('[data-section="assigned"],[data-filter="assigned"],[data-open-assigned],#assignedResultsBtn').forEach((el) => {
      el.onclick = function (event) {
        event.preventDefault();
        location.href = assignedUrl();
      };
    });
  }

  function hideAssignmentControls() {
    const shareButton = document.getElementById('shareViewBtn');
    const assignedButton = document.getElementById('assignedResultsBtn');

    if (shareButton) {
      shareButton.setAttribute('aria-hidden', 'true');
      shareButton.style.setProperty('display', 'none', 'important');
    }

    if (assignedButton) {
      assignedButton.setAttribute('aria-hidden', 'false');
      assignedButton.style.removeProperty('display');
      assignedButton.textContent = 'Open Assign Page';
      assignedButton.onclick = function (event) {
        event.preventDefault();
        location.href = assignedUrl();
      };
    }

    const grid = document.querySelector('[aria-label="Search voters"] .form.search-grid');
    if (grid) {
      grid.classList.remove('assigned-results-ready');
      grid.style.setProperty('grid-template-columns', 'minmax(280px,1fr) minmax(180px,.45fr) 132px', 'important');
    }
  }

  function run() {
    redirectAssignedFilter();
    hideKpiBanner();
    moveAssignedClicks();
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
