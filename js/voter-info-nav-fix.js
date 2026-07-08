(function () {
  const labelToFilter = {
    visible: 'all',
    all: 'all',
    'need call': 'need-call',
    needcall: 'need-call',
    'call queue': 'need-call',
    callqueue: 'need-call',
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  function init() {
    installStyles();
    document.addEventListener('click', handleClick, true);
    new MutationObserver(markCards).observe(document.body, { childList: true, subtree: true });
    markCards();
  }

  function handleClick(event) {
    const card = event.target.closest('.voter-info-metric,[data-info-filter]');
    if (!card) return;

    const filter = getFilter(card);
    if (!filter) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (filter === 'assigned') {
      openAssignedResults();
      return;
    }

    runNativeFilter(filter);
  }

  function getFilter(card) {
    const explicit = card.dataset.infoFilter || card.dataset.filter;
    if (explicit) return normalizeFilter(explicit);
    const label = card.querySelector('span')?.textContent || card.textContent || '';
    return labelToFilter[norm(label)] || findFilter(label);
  }

  function runNativeFilter(filter) {
    const bridge = document.createElement('button');
    bridge.type = 'button';
    bridge.dataset.filter = filter;
    bridge.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(bridge);
    bridge.click();
    bridge.remove();
    updateUrl(filter);
    scrollToResults();
  }

  function openAssignedResults() {
    updateUrl('assigned');
    const tryOpen = (count) => {
      const btn = document.getElementById('assignedResultsBtn') || findButtonByText('Assigned Results');
      if (btn) {
        btn.click();
        scrollToResults();
        return;
      }
      if (count < 12) setTimeout(() => tryOpen(count + 1), 250);
      else runDomAssignedFallback();
    };
    tryOpen(0);
  }

  function runDomAssignedFallback() {
    const rows = readRows().filter((row) => clean(row.vote_assigned_by));
    const list = document.getElementById('voterList');
    if (!list) return;
    document.getElementById('sectionTitle').textContent = 'Assigned Results';
    document.getElementById('sectionFilter').textContent = 'Showing voters with assignment names.';
    document.getElementById('sectionTotal').textContent = `${rows.length.toLocaleString()} voters`;
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No assigned voters found.</div>';
      scrollToResults();
      return;
    }
    list.innerHTML = rows.map((row) => `
      <article class="voter-card" data-open-voter="${esc(row.id)}" tabindex="0">
        <div class="voter-photo">${row.photo_url ? `<img src="${esc(row.photo_url)}" alt="${esc(row.name || 'Voter photo')}" loading="lazy">` : `<div class="photo-placeholder">${esc(initials(row.name))}</div>`}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${esc(row.name || 'Unknown voter')}</h3><span class="party-tag">${esc(row.party || 'Not party')}</span></div>
          <p>${esc(row.house || '-')} · Box ${esc(row.election_box || '-')} · ${esc(row.phone || 'No phone')}</p>
          <div class="chips"><span class="chip green">Assigned</span><span class="chip blue">${esc(row.vote_assigned_by || '-')}</span></div>
          <div class="section-label blue">Assigned: ${esc(row.vote_assigned_by || '-')}</div>
        </div>
      </article>
    `).join('');
    scrollToResults();
  }

  function markCards() {
    document.querySelectorAll('.voter-info-metric,[data-info-filter]').forEach((card) => {
      const filter = getFilter(card);
      if (!filter) return;
      card.classList.add('clickable-info-result');
      card.setAttribute('role', 'button');
      if (!card.dataset.infoFilter) card.dataset.infoFilter = filter;
    });
  }

  function readRows() {
    const params = new URLSearchParams(location.search);
    const party = (params.get('party') || 'ALL').toUpperCase();
    const keys = party === 'ALL'
      ? ['villimale_campaign_manager_v1:ALL:rows', 'villimale_campaign_manager_v1:PNC:rows', 'villimale_campaign_manager_v1:MDP:rows']
      : [`villimale_campaign_manager_v1:${party}:rows`];
    const rows = [];
    keys.forEach((key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed)) rows.push(...parsed);
      } catch {}
    });
    return rows.filter((row, index, arr) => arr.findIndex((other) => String(other.id) === String(row.id)) === index);
  }

  function findButtonByText(text) {
    const wanted = norm(text);
    return Array.from(document.querySelectorAll('button,a')).find((el) => norm(el.textContent).includes(wanted));
  }

  function updateUrl(filter) {
    const url = new URL(location.href);
    url.searchParams.set('filter', filter);
    history.replaceState(null, '', `${url.pathname.split('/').pop()}${url.search}${url.hash}`);
  }

  function scrollToResults() {
    setTimeout(() => document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function findFilter(value) {
    const text = norm(value);
    if (text.includes('need call') || text.includes('call queue')) return 'need-call';
    if (text.includes('will vote')) return 'will-vote';
    if (text.includes('assigned')) return 'assigned';
    if (text.includes('visible') || text.includes('all')) return 'all';
    if (text.includes('pending')) return 'pending';
    if (text.includes('no phone')) return 'no-phone';
    if (text.includes('transport')) return 'need-transport';
    if (text.includes('follow')) return 'follow-up';
    return '';
  }

  function normalizeFilter(value) {
    const cleanValue = String(value || '').toLowerCase().replace(/_/g, '-').trim();
    return labelToFilter[norm(cleanValue)] || cleanValue;
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
  }

  function clean(value) { return String(value || '').trim(); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function norm(value) { return String(value || '').toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim(); }

  function installStyles() {
    if (document.getElementById('safeVoterNavFix')) return;
    const style = document.createElement('style');
    style.id = 'safeVoterNavFix';
    style.textContent = '@media(max-width:900px){.topbar,.campaign-header{height:auto!important;min-height:0!important;overflow:visible!important}.toolbar,.nav,.campaign-nav{display:flex!important;gap:8px!important;overflow-x:auto!important;overflow-y:visible!important}.toolbar .btn,.nav .btn,.campaign-nav .btn{flex:0 0 auto!important;min-height:44px!important}}.clickable-info-result{cursor:pointer!important}.clickable-info-result:hover{border-color:#93c5fd!important;box-shadow:0 12px 26px rgba(15,23,42,.12)!important}';
    document.head.appendChild(style);
  }
})();