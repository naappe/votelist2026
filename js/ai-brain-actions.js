(function () {
  if (document.body.dataset.view !== 'management') return;

  const metricFilters = {
    all: 'all',
    'call queue': 'need-call',
    'need call': 'need-call',
    'will vote': 'will-vote',
    'follow-up': 'follow-up',
    pending: 'pending',
    'no phone': 'no-phone',
    transport: 'need-transport',
    assigned: 'assigned'
  };

  const insightFilters = {
    'latest assignment': 'assigned',
    'call queue': 'need-call',
    'follow-up': 'follow-up',
    'no phone': 'no-phone',
    transport: 'need-transport',
    'support pool': 'will-vote',
    'house breaks active': 'all'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    document.addEventListener('click', routeClick, true);
    const panel = document.getElementById('aiBrainLive');
    if (panel) new MutationObserver(markClickable).observe(panel, { childList: true, subtree: true });
    markClickable();
  }

  function routeClick(event) {
    if (event.target.closest('a,button,[data-ai-brain-details]')) return;

    const assignment = event.target.closest('#aiAssignmentStatus, .ai-assignment-card');
    if (assignment) {
      event.preventDefault();
      event.stopPropagation();
      applyFilter('assigned');
      return;
    }

    const metric = event.target.closest('.ai-metric');
    if (metric) {
      const filter = metricFilters[normalize(metric.querySelector('span')?.textContent)];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        applyFilter(filter);
      }
      return;
    }

    const insight = event.target.closest('.ai-insight');
    if (insight) {
      const filter = insightFilters[normalize(insight.querySelector('strong')?.textContent)];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        applyFilter(filter);
      }
    }
  }

  function applyFilter(filter) {
    if (filter === 'assigned') {
      const button = document.getElementById('assignedResultsBtn');
      if (button && !button.disabled) button.click();
      scrollToList();
      return;
    }

    const button = document.querySelector(`#summary [data-filter="${cssEscape(filter)}"], #sections [data-filter="${cssEscape(filter)}"], [data-filter="${cssEscape(filter)}"]`);
    if (button) {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    scrollToList();
  }

  function scrollToList() {
    setTimeout(() => {
      document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function markClickable() {
    document.querySelectorAll('#aiBrainLive .ai-metric').forEach((item) => {
      const filter = metricFilters[normalize(item.querySelector('span')?.textContent)];
      item.classList.toggle('ai-action-clickable', Boolean(filter));
      if (filter) item.setAttribute('role', 'button');
    });
    document.querySelectorAll('#aiBrainLive .ai-insight').forEach((item) => {
      const filter = insightFilters[normalize(item.querySelector('strong')?.textContent)];
      item.classList.toggle('ai-action-clickable', Boolean(filter));
      if (filter) item.setAttribute('role', 'button');
    });
    document.querySelector('#aiAssignmentStatus')?.classList.add('ai-action-clickable');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function installStyles() {
    if (document.getElementById('aiBrainActionStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiBrainActionStyles';
    style.textContent = `
      #aiBrainLive .ai-action-clickable{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      #aiBrainLive .ai-action-clickable:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.10)!important;border-color:#93c5fd!important}
      #aiBrainLive .ai-action-clickable:active{transform:scale(.985)}
    `;
    document.head.appendChild(style);
  }
})();