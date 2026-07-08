(function () {
  const filterMap = {
    all: 'all',
    visible: 'all',
    'need call': 'need-call',
    needcall: 'need-call',
    'will vote': 'will-vote',
    willvote: 'will-vote',
    pending: 'pending',
    assigned: 'assigned',
    'follow-up': 'follow-up',
    followup: 'follow-up',
    'no phone': 'no-phone',
    nophone: 'no-phone',
    transport: 'need-transport',
    'need transport': 'need-transport'
  };

  const insightMap = {
    'latest assignment': 'assigned',
    'call queue': 'need-call',
    'follow-up': 'follow-up',
    'no phone': 'no-phone',
    transport: 'need-transport',
    'support pool': 'will-vote',
    'house breaks active': 'all'
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init() {
    installStyles();
    document.addEventListener('click', onClick, true);
    new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
    mark();
  }

  function onClick(event) {
    const metric = event.target.closest('.ai-metric');
    if (metric) {
      const filter = filterMap[norm(metric.querySelector('span')?.textContent)];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        go({ filter });
      }
      return;
    }

    const insight = event.target.closest('.ai-insight');
    if (insight) {
      const filter = insightMap[norm(insight.querySelector('strong')?.textContent)];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        go({ filter });
      }
      return;
    }

    const house = event.target.closest('.house-row[data-house-label], .house-row[data-house-filter]');
    if (house) {
      const houseName = house.dataset.houseLabel || house.querySelector('.house-main span')?.textContent?.replace(/^\d+\.\s*/, '') || house.dataset.houseFilter;
      if (houseName) {
        event.preventDefault();
        event.stopPropagation();
        go({ house: houseName.trim() });
      }
    }
  }

  function go(options) {
    const url = new URL('voters.html', location.href);
    url.searchParams.set('party', new URLSearchParams(location.search).get('party') || 'ALL');
    if (options.filter) url.searchParams.set('filter', options.filter);
    if (options.house) url.searchParams.set('house', options.house);
    location.href = url.pathname.split('/').pop() + url.search;
  }

  function mark() {
    document.querySelectorAll('.ai-metric').forEach((item) => {
      const ok = Boolean(filterMap[norm(item.querySelector('span')?.textContent)]);
      item.classList.toggle('clickable-result', ok);
      if (ok) item.setAttribute('role', 'link');
    });
    document.querySelectorAll('.ai-insight').forEach((item) => {
      const ok = Boolean(insightMap[norm(item.querySelector('strong')?.textContent)]);
      item.classList.toggle('clickable-result', ok);
      if (ok) item.setAttribute('role', 'link');
    });
    document.querySelectorAll('.house-row[data-house-label], .house-row[data-house-filter]').forEach((item) => {
      item.classList.add('clickable-result');
      item.setAttribute('role', 'link');
    });
  }

  function installStyles() {
    if (document.getElementById('dashboardResultNavFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'dashboardResultNavFixStyles';
    style.textContent = '.clickable-result{cursor:pointer!important}.clickable-result:hover{border-color:#93c5fd!important;box-shadow:0 10px 24px rgba(15,23,42,.12)!important;transform:translateY(-1px)}.clickable-result:active{transform:scale(.985)}';
    document.head.appendChild(style);
  }

  function norm(value) {
    return String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
})();