(function () {
  const metricFilters = {
    all: 'all',
    'need call': 'needcall',
    'will vote': 'willvote',
    'follow-up': 'followup',
    pending: 'pending',
    'no phone': 'nophone',
    transport: 'transport',
    assigned: 'assigned'
  };

  const insightFilters = {
    'latest assignment': 'assigned',
    'call queue': 'needcall',
    'follow-up': 'followup',
    'no phone': 'nophone',
    transport: 'transport',
    'support pool': 'willvote'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (!/ai-dashboard\.html$/i.test(location.pathname)) return;
    installStyles();
    document.addEventListener('click', routeClick, true);
    new MutationObserver(markClickable).observe(document.body, { childList: true, subtree: true });
    markClickable();
  }

  function routeClick(event) {
    const metric = event.target.closest('.ai-metric');
    if (metric) {
      const label = normalizeLabel(metric.querySelector('span')?.textContent);
      const filter = metricFilters[label];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        goToVoters({ filter });
      }
      return;
    }

    const insight = event.target.closest('.ai-insight');
    if (insight) {
      const title = normalizeLabel(insight.querySelector('strong')?.textContent);
      const filter = insightFilters[title];
      if (filter) {
        event.preventDefault();
        event.stopPropagation();
        goToVoters({ filter });
      }
      return;
    }

    const house = event.target.closest('.house-row[data-house-label], .house-row[data-house-filter]');
    if (house) {
      const houseName = house.dataset.houseLabel || house.querySelector('.house-main span')?.textContent?.replace(/^\d+\.\s*/, '') || house.dataset.houseFilter;
      if (houseName) {
        event.preventDefault();
        event.stopPropagation();
        goToVoters({ house: houseName.trim() });
      }
    }
  }

  function goToVoters(options) {
    const url = new URL('voters.html', location.href);
    const party = new URLSearchParams(location.search).get('party') || 'ALL';
    url.searchParams.set('party', party);
    if (options.filter) url.searchParams.set('filter', options.filter);
    if (options.house) url.searchParams.set('house', options.house);
    location.href = `${url.pathname.split('/').pop()}${url.search}`;
  }

  function markClickable() {
    document.querySelectorAll('.ai-metric').forEach((item) => {
      const label = normalizeLabel(item.querySelector('span')?.textContent);
      item.classList.toggle('clickable-stat', Boolean(metricFilters[label]));
      if (metricFilters[label]) item.setAttribute('role', 'link');
    });
    document.querySelectorAll('.ai-insight').forEach((item) => {
      const title = normalizeLabel(item.querySelector('strong')?.textContent);
      item.classList.toggle('clickable-stat', Boolean(insightFilters[title]));
      if (insightFilters[title]) item.setAttribute('role', 'link');
    });
    document.querySelectorAll('.house-row[data-house-label], .house-row[data-house-filter]').forEach((item) => {
      item.classList.add('house-link');
      item.setAttribute('role', 'link');
    });
  }

  function installStyles() {
    if (document.getElementById('aiDashboardNavStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiDashboardNavStyles';
    style.textContent = `
      .clickable-stat,.house-link{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
      .clickable-stat:hover,.house-link:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(15,23,42,.12)!important;border-color:#93c5fd!important}
      .clickable-stat:active,.house-link:active{transform:scale(.985)}
      .house-link .house-main span{color:#1d4ed8}
    `;
    document.head.appendChild(style);
  }

  function normalizeLabel(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
})();