(function () {
  if (document.body.dataset.view !== 'analytics') return;

  const storagePrefix = 'villimale_campaign_manager_v1';
  let timer = 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    installStyles();
    ensureFeed();
    renderFeed();

    window.addEventListener('storage', schedule);
    window.addEventListener('online', schedule);
    window.addEventListener('offline', schedule);
    window.addEventListener('villimale:rows-updated', schedule);
    window.addEventListener('villimale-rows-updated', schedule);
    setInterval(renderFeed, 30000);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderFeed, 120);
  }

  function ensureFeed() {
    if (document.getElementById('aiLiveFeed')) return;
    const panel = document.createElement('section');
    panel.id = 'aiLiveFeed';
    panel.className = 'panel ai-live-feed';
    panel.setAttribute('aria-label', 'Live campaign feed');
    panel.innerHTML = `
      <div class="ai-feed-head">
        <div>
          <p class="eyebrow">Live Feed</p>
          <h2>Campaign Activity</h2>
          <p>RSS-style updates from the current voter rows.</p>
        </div>
        <span id="aiFeedUpdated">Loading...</span>
      </div>
      <div id="aiFeedList" class="ai-feed-list"></div>
    `;

    const aiBrain = document.getElementById('aiBrainLive');
    const insights = document.querySelector('.insight-grid');
    if (aiBrain) aiBrain.after(panel);
    else if (insights) insights.before(panel);
    else document.querySelector('.page')?.appendChild(panel);
  }

  function renderFeed() {
    ensureFeed();
    const list = document.getElementById('aiFeedList');
    const updated = document.getElementById('aiFeedUpdated');
    if (!list || !updated) return;

    const rows = readRows();
    updated.textContent = rows.length ? `Updated ${timeNow()}` : 'Waiting for data';

    if (!rows.length) {
      list.innerHTML = '<div class="ai-feed-empty">Waiting for AI Dashboard data. Refresh once if the page just opened.</div>';
      return;
    }

    const items = feedItems(rows);
    list.innerHTML = items.length
      ? items.map(feedItemMarkup).join('')
      : '<div class="ai-feed-empty">No activity found in this scope yet.</div>';
  }

  function feedItems(rows) {
    const items = [];
    latestAssignments(rows).slice(0, 8).forEach((row) => {
      items.push({
        tone: 'assignment',
        title: `${clean(row.vote_assigned_by) || 'Team'} assigned ${clean(row.name) || 'a voter'}`,
        meta: row.vote_assigned_at ? formatTime(row.vote_assigned_at) : 'Assignment',
        text: [row.house, row.phone || 'No phone'].filter(Boolean).join(' | '),
        href: scopedUrl('voters.html', { filter: 'assigned' })
      });
    });

    const needCall = rows.filter((row) => row.phone_status === 'need-call' && hasPhone(row)).length;
    const followUp = rows.filter(isFollowUp).length;
    const noPhone = rows.filter((row) => row.phone_status === 'no-phone' || !hasPhone(row)).length;
    const transport = rows.filter((row) => row.transport_status === 'need-transport').length;
    const willVote = rows.filter((row) => row.vote_status === 'will-vote').length;

    addQueue(items, 'warn', 'Call queue', `${formatNumber(needCall)} voters need phone attention.`, 'needcall', needCall);
    addQueue(items, 'bad', 'Follow-up', `${formatNumber(followUp)} voters need follow-up or D2D.`, 'followup', followUp);
    addQueue(items, 'bad', 'No phone', `${formatNumber(noPhone)} voters need phone numbers or direct visit.`, 'nophone', noPhone);
    addQueue(items, 'warn', 'Transport', `${formatNumber(transport)} voters need transport support.`, 'transport', transport);
    addQueue(items, 'good', 'Will vote', `${formatNumber(willVote)} voters are marked will vote.`, 'willvote', willVote);

    return items.slice(0, 14);
  }

  function addQueue(items, tone, title, text, filter, count) {
    if (!count) return;
    items.push({
      tone,
      title,
      meta: 'Current status',
      text,
      href: scopedUrl('voters.html', { filter })
    });
  }

  function latestAssignments(rows) {
    return rows
      .filter((row) => clean(row.vote_assigned_by))
      .sort((a, b) => dateMs(b.vote_assigned_at) - dateMs(a.vote_assigned_at));
  }

  function feedItemMarkup(item) {
    return `
      <article class="ai-feed-item ${esc(item.tone)}">
        <div>
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.text || '')}</p>
          <small>${esc(item.meta || '')}</small>
        </div>
        <a href="${esc(item.href)}">Open</a>
      </article>
    `;
  }

  function readRows() {
    if (Array.isArray(window.__villimaleRows) && window.__villimaleRows.length) return window.__villimaleRows;
    try {
      const rows = JSON.parse(localStorage.getItem(`${storagePrefix}:${partyScope()}:rows`) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function partyScope() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function scopedUrl(path, params) {
    const url = new URL(path, location.href);
    url.searchParams.set('party', partyScope());
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    return `${url.pathname.split('/').pop()}${url.search}`;
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function hasPhone(row) {
    return Boolean(clean(row.phone));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function dateMs(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    if (document.getElementById('aiLiveFeedStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiLiveFeedStyles';
    style.textContent = `
      .ai-live-feed{margin:0 0 14px!important;padding:16px!important;background:#fff!important}
      .ai-feed-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.ai-feed-head h2{margin:0 0 5px!important;font-size:22px!important}.ai-feed-head p{margin:0!important;color:#667085!important}.ai-feed-head>span{display:inline-flex;min-height:30px;align-items:center;border:1px solid #dbeafe;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:5px 10px;font-size:12px;font-weight:900;white-space:nowrap}
      .ai-feed-list{display:grid;gap:9px}.ai-feed-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e4e7ec;border-radius:13px;background:#f8fafc;padding:11px 12px}.ai-feed-item strong{display:block;color:#101828;font-size:14px;line-height:1.25}.ai-feed-item p{margin:3px 0!important;color:#475467!important;font-size:12px!important;line-height:1.35!important}.ai-feed-item small{display:block;color:#667085;font-size:11px;font-weight:800}.ai-feed-item a{display:inline-flex;align-items:center;justify-content:center;min-height:32px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#1d4ed8;padding:6px 10px;text-decoration:none;font-size:12px;font-weight:900}.ai-feed-item.assignment{border-color:#bfdbfe;background:#eff6ff}.ai-feed-item.good{border-color:#bbf7d0;background:#f0fdf4}.ai-feed-item.warn{border-color:#fde68a;background:#fffbeb}.ai-feed-item.bad{border-color:#fecaca;background:#fef2f2}.ai-feed-empty{padding:14px;border:1px dashed #d0d5dd;border-radius:12px;background:#f8fafc;color:#667085;font-size:13px;font-weight:800;text-align:center}
      @media(max-width:760px){.ai-feed-head{display:grid}.ai-feed-item{grid-template-columns:1fr}.ai-feed-item a{width:100%}}
    `;
    document.head.appendChild(style);
  }
})();