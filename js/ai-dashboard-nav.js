(function () {
  if (window.__aiDashboardNavLoaded) return;
  window.__aiDashboardNavLoaded = true;

  const metricFilters = {
    all: 'all',
    total: 'all',
    voters: 'all',
    'need call': 'needcall',
    'call queue': 'needcall',
    'will vote': 'willvote',
    committed: 'willvote',
    guaranteed: 'willvote',
    'support pool': 'willvote',
    'follow-up': 'followup',
    'follow up': 'followup',
    pending: 'pending',
    'no phone': 'nophone',
    transport: 'transport',
    assigned: 'assigned',
    'latest assignment': 'assigned',
    reached: 'reached'
  };

  const insightFilters = {
    'latest assignment': 'assigned',
    'call queue': 'needcall',
    'follow-up': 'followup',
    'follow up': 'followup',
    'no phone': 'nophone',
    transport: 'transport',
    'support pool': 'willvote',
    'house breaks active': 'all',
    'stable view': 'all'
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init() {
    if (!/ai-dashboard\.html$/i.test(location.pathname)) return;
    installStyles();
    document.removeEventListener('click', routeClick, true);
    document.addEventListener('click', routeClick, true);
    document.addEventListener('keydown', routeKeydown, true);
    new MutationObserver(markClickable).observe(document.body, { childList: true, subtree: true });
    markClickable();
  }

  function routeKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest?.('.clickable-stat,.house-link');
    if (!target) return;
    event.preventDefault();
    target.click();
  }

  function routeClick(event) {
    const metric = event.target.closest?.('.ai-metric,.metric');
    if (metric) {
      const label = normalizeLabel(metric.querySelector('span,small')?.textContent || metric.textContent);
      const filter = findFilter(label, metricFilters);
      if (filter) return navigate(event, { filter });
    }

    const detail = event.target.closest?.('.ai-detail-row');
    if (detail) {
      const label = normalizeLabel(detail.querySelector('span')?.textContent);
      const value = cleanDetailValue(detail.querySelector('strong')?.textContent);
      if (label === 'top house' && value) return navigate(event, { house: value });
      if (label === 'latest assignment' || label === 'assigned people') return navigate(event, { filter: 'assigned' });
    }

    const insight = event.target.closest?.('.ai-insight');
    if (insight) {
      const title = normalizeLabel(insight.querySelector('strong')?.textContent);
      const filter = findFilter(title, insightFilters);
      if (filter) return navigate(event, { filter });
    }

    const house = event.target.closest?.('.house-row[data-house-label],.house-row[data-house-filter],.house-link[data-house-label],.house-link[data-house-filter]');
    if (house) {
      const houseName = cleanDetailValue(house.dataset.houseLabel || house.querySelector('.house-main span')?.textContent?.replace(/^\d+\.\s*/, '') || house.dataset.houseFilter);
      if (houseName) return navigate(event, { house: houseName });
    }
  }

  function navigate(event, options) {
    event.preventDefault();
    event.stopPropagation();
    const url = new URL('voters.html', location.href);
    const party = new URLSearchParams(location.search).get('party') || 'ALL';
    url.searchParams.set('party', party);
    if (options.filter) url.searchParams.set('filter', options.filter);
    if (options.house) url.searchParams.set('house', options.house);
    location.href = `${url.pathname.split('/').pop()}${url.search}`;
  }

  function markClickable() {
    document.querySelectorAll('.ai-metric,.metric').forEach((item) => {
      const label = normalizeLabel(item.querySelector('span,small')?.textContent || item.textContent);
      const active = Boolean(findFilter(label, metricFilters));
      item.classList.toggle('clickable-stat', active);
      if (active) {
        item.setAttribute('role', 'link');
        item.setAttribute('tabindex', '0');
        item.title = 'Open matching voter results';
      }
    });

    document.querySelectorAll('.ai-insight').forEach((item) => {
      const title = normalizeLabel(item.querySelector('strong')?.textContent);
      const active = Boolean(findFilter(title, insightFilters));
      item.classList.toggle('clickable-stat', active);
      if (active) {
        item.setAttribute('role', 'link');
        item.setAttribute('tabindex', '0');
        item.title = 'Open matching voter results';
      }
    });

    document.querySelectorAll('.ai-detail-row').forEach((item) => {
      const label = normalizeLabel(item.querySelector('span')?.textContent);
      const active = ['top house', 'latest assignment', 'assigned people'].includes(label);
      item.classList.toggle('clickable-stat', active);
      if (active) {
        item.setAttribute('role', 'link');
        item.setAttribute('tabindex', '0');
        item.title = 'Open matching voter results';
      }
    });

    document.querySelectorAll('.house-row[data-house-label],.house-row[data-house-filter]').forEach((item) => {
      item.classList.add('house-link');
      item.setAttribute('role', 'link');
      item.setAttribute('tabindex', '0');
      item.title = 'Open this house voter results';
    });
  }

  function findFilter(label, dictionary) {
    if (dictionary[label]) return dictionary[label];
    const hit = Object.keys(dictionary).find((key) => label.includes(key));
    return hit ? dictionary[hit] : '';
  }

  function cleanDetailValue(value) {
    return String(value || '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*\(\d+\)\s*$/, '')
      .replace(/\s*\|.*$/, '')
      .trim();
  }

  function installStyles() {
    if (document.getElementById('aiDashboardNavStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiDashboardNavStyles';
    style.textContent = `
      .clickable-stat,.house-link{cursor:pointer!important;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease!important}
      .clickable-stat:hover,.house-link:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(15,23,42,.12)!important;border-color:#93c5fd!important;background:#eff6ff!important}
      .clickable-stat:active,.house-link:active{transform:scale(.985)}
      .house-link .house-main span{color:#1d4ed8}
    `;
    document.head.appendChild(style);
  }

  function normalizeLabel(value) {
    return String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  }
})();