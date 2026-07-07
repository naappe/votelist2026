(function () {
  if (document.body.dataset.view !== 'management') return;

  const storagePrefix = 'villimale_campaign_manager_v1';
  let timer = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    installStyles();
    ensurePanel();
    keepSearchAboveVoters();
    render();

    window.addEventListener('storage', schedule);
    window.addEventListener('online', schedule);
    window.addEventListener('offline', schedule);
    window.addEventListener('villimale:rows-updated', schedule);
    window.addEventListener('villimale-rows-updated', schedule);
    document.addEventListener('input', schedule, true);
    document.addEventListener('change', schedule, true);
    document.addEventListener('modal-assignment-saved', schedule);

    const target = document.getElementById('voterList') || document.body;
    new MutationObserver(schedule).observe(target, { childList: true, subtree: true });
    setInterval(render, 30000);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      keepSearchAboveVoters();
      render();
    }, 120);
  }

  function ensurePanel() {
    if (document.getElementById('voterInfoStatus')) return;
    const panel = document.createElement('section');
    panel.id = 'voterInfoStatus';
    panel.className = 'panel voter-info-status';
    panel.setAttribute('aria-label', 'Information status');

    const searchPanel = document.querySelector('.panel[aria-label="Search voters"]');
    if (searchPanel) searchPanel.before(panel);
    else document.querySelector('.page')?.prepend(panel);
  }

  function keepSearchAboveVoters() {
    const searchPanel = document.querySelector('.panel[aria-label="Search voters"]');
    const voterPanel = document.querySelector('.voter-panel');
    if (searchPanel && voterPanel && searchPanel.nextElementSibling !== voterPanel) {
      const syncNotice = document.getElementById('syncNotice');
      if (syncNotice && searchPanel.nextElementSibling === syncNotice) return;
      voterPanel.before(searchPanel);
    }
  }

  function render() {
    const panel = document.getElementById('voterInfoStatus');
    if (!panel || document.body.classList.contains('clean-read-view')) return;

    const m = metrics();
    const updated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    panel.innerHTML = `
      <div class="voter-info-head">
        <div>
          <p class="eyebrow">Information Status</p>
          <h2>${esc(statusTitle(m))}</h2>
          <p>${esc(statusText(m))}</p>
        </div>
        <a class="btn light compact" href="${esc(scopedUrl('ai-dashboard.html'))}">AI Dashboard</a>
      </div>
      <div class="voter-info-metrics">
        ${metric('Visible', m.visible)}
        ${metric('Need Call', m.needCall)}
        ${metric('Will Vote', m.willVote)}
        ${metric('Assigned', m.assigned)}
      </div>
      <div class="voter-info-foot">
        <span>${esc(m.scope)} scope</span>
        <span>${esc(m.houses)} houses</span>
        <span>${navigator.onLine ? 'Connected' : 'Offline'}</span>
        <span>Updated ${esc(updated)}</span>
      </div>
    `;
  }

  function metrics() {
    const rows = readRows();
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    const sectionTotal = readSectionTotal(cards.length);
    const sourceRows = rows.length ? rows : visibleRows(cards);
    const houses = new Set(sourceRows.map((row) => clean(row.house).toLowerCase()).filter(Boolean));
    return {
      scope: partyScope(),
      total: sourceRows.length || sectionTotal || cards.length,
      visible: sectionTotal || cards.length || sourceRows.length,
      needCall: sourceRows.filter((row) => row.phone_status === 'need-call' && hasPhone(row)).length,
      willVote: sourceRows.filter((row) => row.vote_status === 'will-vote').length,
      assigned: sourceRows.filter((row) => clean(row.vote_assigned_by)).length,
      pending: sourceRows.filter((row) => row.vote_status === 'pending').length,
      houses: houses.size,
      filter: clean(document.getElementById('sectionTitle')?.textContent) || 'All',
      search: clean(document.getElementById('searchInput')?.value),
      house: clean(document.getElementById('houseSelect')?.selectedOptions?.[0]?.textContent)
    };
  }

  function statusTitle(m) {
    if (m.search) return `${m.visible} matching voters`;
    if (m.house && m.house !== 'All houses') return `${m.visible} voters in ${m.house}`;
    if (m.filter && m.filter !== 'All') return `${m.visible} ${m.filter} voters`;
    return `${m.visible} voters visible`;
  }

  function statusText(m) {
    const parts = [];
    if (m.needCall) parts.push(`${m.needCall} need calls`);
    if (m.willVote) parts.push(`${m.willVote} will vote`);
    if (m.assigned) parts.push(`${m.assigned} assigned`);
    if (!parts.length) parts.push('Use search and house filters below to focus the list');
    return parts.join(' | ');
  }

  function metric(label, value) {
    return `<div class="voter-info-metric"><strong>${esc(formatNumber(value))}</strong><span>${esc(label)}</span></div>`;
  }

  function readRows() {
    const scope = partyScope();
    if (Array.isArray(window.__villimaleRows) && window.__villimaleRows.length) {
      return filterRowsForScope(window.__villimaleRows, scope);
    }

    const keys = scope === 'ALL'
      ? [`${storagePrefix}:ALL:rows`, `${storagePrefix}:PNC:rows`, `${storagePrefix}:MDP:rows`]
      : [`${storagePrefix}:${scope}:rows`];
    const rows = [];
    keys.forEach((key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) rows.push(...parsed);
      } catch {}
    });
    return filterRowsForScope(rows, scope);
  }

  function visibleRows(cards) {
    return cards.map((card) => {
      const meta = (card.querySelector('.voter-info p')?.textContent || '').split('·').map(clean);
      const text = card.textContent || '';
      return {
        house: meta[0] || '',
        phone: meta[meta.length - 1] || '',
        party: card.querySelector('.party-tag')?.textContent || '',
        phone_status: text.includes('Need Call') ? 'need-call' : text.includes('No Phone') ? 'no-phone' : '',
        vote_status: text.includes('Will Vote') ? 'will-vote' : text.includes('Pending') ? 'pending' : '',
        vote_assigned_by: card.querySelector('.assigned-result-box strong')?.textContent || ''
      };
    });
  }

  function filterRowsForScope(rows, scope) {
    if (scope === 'ALL') return rows;
    return rows.filter((row) => clean(row.party).toUpperCase() === scope);
  }

  function readSectionTotal(fallback) {
    const totalText = document.getElementById('sectionTotal')?.textContent || '';
    return Number((totalText.match(/\d+/) || [fallback])[0]) || fallback;
  }

  function hasPhone(row) {
    const phone = clean(row.phone).toLowerCase();
    return Boolean(phone) && phone !== 'no phone';
  }

  function partyScope() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function scopedUrl(path) {
    const url = new URL(path, location.href);
    url.searchParams.set('party', partyScope());
    return `${url.pathname.split('/').pop()}${url.search}`;
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value || 0));
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function installStyles() {
    if (document.getElementById('voterInfoStatusStyles')) return;
    const style = document.createElement('style');
    style.id = 'voterInfoStatusStyles';
    style.textContent = `
      .voter-info-status{margin:0 0 12px!important;padding:14px!important;background:#fff!important;border:1px solid #e4e7ec!important;box-shadow:0 14px 34px rgba(16,24,40,.05)!important}
      .voter-info-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.voter-info-head h2{margin:0 0 4px!important;font-size:22px!important;line-height:1.12!important}.voter-info-head p{margin:0!important;color:#667085!important;font-size:13px!important}.voter-info-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.voter-info-metric{border:1px solid #e4e7ec;border-radius:12px;background:#f8fafc;padding:10px 11px;display:grid;gap:2px}.voter-info-metric strong{font-size:19px;line-height:1;font-weight:900;color:#101828}.voter-info-metric span{font-size:10px;font-weight:900;color:#475467;text-transform:uppercase;letter-spacing:.02em}.voter-info-foot{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.voter-info-foot span{display:inline-flex;align-items:center;min-height:24px;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:4px 8px;font-size:11px;font-weight:850}
      @media(max-width:760px){.voter-info-status{padding:12px!important;margin-bottom:10px!important}.voter-info-head{display:grid}.voter-info-head .btn{width:100%}.voter-info-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.voter-info-metric{padding:9px}.voter-info-metric strong{font-size:18px}.voter-info-foot{gap:6px}.voter-info-foot span{font-size:10px}}
    `;
    document.head.appendChild(style);
  }
})();