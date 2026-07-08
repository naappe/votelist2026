(function () {
  const filterMap = {
    visible: 'all',
    all: 'all',
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
    const card = event.target.closest('.info-metric,.ai-metric,.status-metric,[data-info-filter]');
    if (!card) return;
    const raw = card.dataset.infoFilter || card.querySelector('span')?.textContent || card.textContent || '';
    const filter = filterMap[norm(raw)] || findFilter(raw);
    if (!filter) return;
    event.preventDefault();
    event.stopPropagation();
    openResult(filter);
  }

  function openResult(filter) {
    if (filter === 'assigned') {
      const btn = document.getElementById('assignedResultsBtn');
      if (btn) {
        btn.click();
        document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    const filterButton = document.querySelector(`[data-filter="${cssEscape(filter)}"]`);
    if (filterButton) {
      filterButton.click();
      document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const url = new URL(location.href);
    url.searchParams.set('filter', filter);
    location.href = url.pathname.split('/').pop() + url.search;
  }

  function mark() {
    document.querySelectorAll('.info-metric,.ai-metric,.status-metric,[data-info-filter]').forEach((card) => {
      const raw = card.dataset.infoFilter || card.querySelector('span')?.textContent || card.textContent || '';
      const ok = Boolean(filterMap[norm(raw)] || findFilter(raw));
      card.classList.toggle('clickable-info-result', ok);
      if (ok) card.setAttribute('role', 'button');
    });
  }

  function findFilter(value) {
    const text = norm(value);
    if (text.includes('need call')) return 'need-call';
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
    style.textContent = '.clickable-info-result{cursor:pointer!important;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.clickable-info-result:hover{border-color:#93c5fd!important;box-shadow:0 12px 26px rgba(15,23,42,.12)!important;transform:translateY(-1px)}.clickable-info-result:active{transform:scale(.985)}';
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