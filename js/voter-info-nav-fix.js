(function () {
  const filterMap = {
    visible: 'all',
    all: 'all',
    'call queue': 'need-call',
    callqueue: 'need-call',
    'need call': 'need-call',
    needcall: 'need-call',
    'will vote': 'will-vote',
    willvote: 'will-vote',
    assigned: 'assigned',
    pending: 'pending',
    'no phone': 'no-phone',
    nophone: 'no-phone',
    transport: 'need-transport',
    'need transport': 'need-transport',
    'follow up': 'follow-up',
    'follow-up': 'follow-up'
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
    const card = event.target.closest('.ai-metric,.info-metric,.status-metric,[data-info-filter]');
    if (!card) return;
    const raw = card.dataset.infoFilter || card.querySelector('span')?.textContent || card.textContent || '';
    const filter = filterMap[norm(raw)] || findFilter(raw);
    if (!filter) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openResult(filter);
  }

  function openResult(filter) {
    setUrlFilter(filter);

    if (filter === 'assigned') {
      const btn = document.getElementById('assignedResultsBtn');
      if (btn) {
        btn.click();
        scrollToResults();
        return;
      }
    }

    const filterButton = document.querySelector(`[data-filter="${cssEscape(filter)}"]`);
    if (filterButton) {
      filterButton.click();
      scrollToResults();
      return;
    }

    applyDomFilter(filter);
    scrollToResults();
  }

  function applyDomFilter(filter) {
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    if (!cards.length) {
      setTimeout(() => applyDomFilter(filter), 350);
      return;
    }

    let visible = 0;
    cards.forEach((card) => {
      const text = norm(card.textContent);
      const show = matchesFilter(text, filter);
      card.classList.toggle('url-filter-hidden', !show);
      if (show) visible += 1;
    });

    const title = document.getElementById('sectionTitle');
    const filterText = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    if (title) title.textContent = titleFor(filter);
    if (filterText) filterText.textContent = descriptionFor(filter);
    if (total) total.textContent = `${new Intl.NumberFormat('en-US').format(visible)} voters`;
  }

  function matchesFilter(text, filter) {
    if (filter === 'all') return true;
    if (filter === 'need-call') return text.includes('need call') || text.includes('call queue');
    if (filter === 'will-vote') return text.includes('will vote');
    if (filter === 'pending') return text.includes('pending');
    if (filter === 'no-phone') return text.includes('no phone');
    if (filter === 'need-transport') return text.includes('transport');
    if (filter === 'follow-up') return text.includes('follow up') || text.includes('follow-up') || text.includes('wrong number') || text.includes('busy') || text.includes('out of range') || text.includes('switched off');
    if (filter === 'assigned') return text.includes('assigned') || text.includes('assign');
    return true;
  }

  function titleFor(filter) {
    return ({
      all: 'All',
      'need-call': 'Need Call',
      'will-vote': 'Will Vote',
      pending: 'Pending',
      'no-phone': 'No Phone',
      'need-transport': 'Transport',
      'follow-up': 'Follow-up',
      assigned: 'Assigned Results'
    })[filter] || 'Results';
  }

  function descriptionFor(filter) {
    return ({
      all: 'Showing all voters in the current scope.',
      'need-call': 'Showing voters who need call attention.',
      'will-vote': 'Committed supporters. Track support strength and transport needs.',
      pending: 'Showing voters still pending.',
      'no-phone': 'Showing voters with no phone number.',
      'need-transport': 'Showing voters needing transport support.',
      'follow-up': 'Showing voters needing follow-up or D2D.',
      assigned: 'Showing voters with assignment information.'
    })[filter] || 'Showing matching voters.';
  }

  function setUrlFilter(filter) {
    const url = new URL(location.href);
    url.searchParams.set('filter', filter);
    history.replaceState(null, '', `${url.pathname.split('/').pop()}${url.search}`);
  }

  function scrollToResults() {
    setTimeout(() => document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function mark() {
    document.querySelectorAll('.ai-metric,.info-metric,.status-metric,[data-info-filter]').forEach((card) => {
      const raw = card.dataset.infoFilter || card.querySelector('span')?.textContent || card.textContent || '';
      const ok = Boolean(filterMap[norm(raw)] || findFilter(raw));
      card.classList.toggle('clickable-info-result', ok);
      if (ok) card.setAttribute('role', 'button');
    });
  }

  function findFilter(value) {
    const text = norm(value);
    if (text.includes('call queue') || text.includes('need call')) return 'need-call';
    if (text.includes('will vote')) return 'will-vote';
    if (text.includes('assigned')) return 'assigned';
    if (text.includes('visible') || text.includes('all')) return 'all';
    if (text.includes('pending')) return 'pending';
    if (text.includes('no phone')) return 'no-phone';
    if (text.includes('transport')) return 'need-transport';
    if (text.includes('follow')) return 'follow-up';
    return '';
  }

  function installStyles() {
    if (document.getElementById('voterInfoNavFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'voterInfoNavFixStyles';
    style.textContent = '.clickable-info-result{cursor:pointer!important;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.clickable-info-result:hover{border-color:#93c5fd!important;box-shadow:0 12px 26px rgba(15,23,42,.12)!important;transform:translateY(-1px)}.clickable-info-result:active{transform:scale(.985)}.url-filter-hidden{display:none!important}';
    document.head.appendChild(style);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function norm(value) {
    return String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
})();