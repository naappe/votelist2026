(function () {
  if (document.body.dataset.view !== 'analytics') return;

  const storagePrefix = 'villimale_campaign_manager_v1';
  const feedPrefix = 'villimale_ai_news_feed_v1';
  const snapshotPrefix = 'villimale_ai_news_snapshot_v1';
  const maxHistory = 12;
  const maxItems = 18;
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
    document.addEventListener('modal-assignment-saved', schedule);
    setInterval(renderFeed, 30000);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderFeed, 150);
  }

  function ensureFeed() {
    if (document.getElementById('aiLiveFeed')) return;
    const panel = document.createElement('section');
    panel.id = 'aiLiveFeed';
    panel.className = 'panel ai-live-feed';
    panel.setAttribute('aria-label', 'Campaign news feed');
    panel.innerHTML = `
      <div class="ai-feed-head">
        <div>
          <p class="eyebrow">AI News Feed</p>
          <h2>Campaign News</h2>
          <p>Live status, warnings, recommendations, and assignment updates.</p>
        </div>
        <span id="aiFeedUpdated" class="ai-feed-live">Loading</span>
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

    const metrics = readMetrics();
    updateChangeHistory(metrics);
    updated.textContent = metrics.total ? `Live | ${timeNow()}` : 'Waiting for data';

    if (!metrics.total) {
      list.innerHTML = '<div class="ai-feed-empty">Waiting for AI Dashboard data. Refresh once if the page just opened.</div>';
      return;
    }

    const items = [...loadHistory(), ...baseItems(metrics)].slice(0, maxItems);
    list.innerHTML = items.length
      ? items.map(feedItemMarkup).join('')
      : '<div class="ai-feed-empty">No campaign news found yet.</div>';
  }

  function readMetrics() {
    if (window.aiLearningSystem && typeof window.aiLearningSystem.metrics === 'function') {
      try {
        const m = window.aiLearningSystem.metrics();
        if (m && m.total) return normalizeMetrics(m);
      } catch (error) {
        console.warn('AI news metrics fallback used', error);
      }
    }

    const rows = readRows();
    return normalizeMetrics(metricsFromRows(rows));
  }

  function normalizeMetrics(m) {
    const latestAssignment = latestAssignments(readRows())[0] || null;
    const topHouse = Array.isArray(m.topHouses) && m.topHouses.length ? m.topHouses[0] : null;
    return {
      scope: String(m.scope || partyScope()).toUpperCase(),
      total: Number(m.total || 0),
      reached: Number(m.reached || 0),
      willVote: Number(m.willVote || 0),
      pending: Number(m.pending || 0),
      needCall: Number(m.needCall || 0),
      noPhone: Number(m.noPhone || 0),
      followUp: Number(m.followUp || 0),
      transport: Number(m.transport || 0),
      houses: Number(m.houses || 0),
      assigned: Number(m.assigned || 0),
      health: Number(m.health || 0),
      topHouse,
      topHouses: Array.isArray(m.topHouses) ? m.topHouses : [],
      topAssignees: Array.isArray(m.topAssignees) ? m.topAssignees : [],
      latestAssignment
    };
  }

  function metricsFromRows(rows) {
    const houses = new Map();
    const assignees = new Map();
    rows.forEach((row) => {
      const house = clean(row.house) || 'Unknown house';
      houses.set(house, (houses.get(house) || 0) + 1);
      clean(row.vote_assigned_by).split(',').map(clean).filter(Boolean).forEach((name) => {
        if (name.toLowerCase() !== 'naappe@gmail.com') assignees.set(name, (assignees.get(name) || 0) + 1);
      });
    });

    const output = {
      scope: partyScope(),
      total: rows.length,
      reached: rows.filter((row) => row.reach_status === 'reached').length,
      willVote: rows.filter((row) => row.vote_status === 'will-vote').length,
      pending: rows.filter((row) => row.vote_status === 'pending').length,
      needCall: rows.filter((row) => row.phone_status === 'need-call' && hasPhone(row)).length,
      noPhone: rows.filter((row) => row.phone_status === 'no-phone' || !hasPhone(row)).length,
      followUp: rows.filter(isFollowUp).length,
      transport: rows.filter((row) => row.transport_status === 'need-transport').length,
      houses: houses.size,
      assigned: rows.filter((row) => clean(row.vote_assigned_by)).length,
      topHouses: Array.from(houses.entries()).map(([name, count]) => ({ name, count })).sort(sortCountName).slice(0, 10),
      topAssignees: Array.from(assignees.entries()).map(([name, count]) => ({ name, count })).sort(sortCountName).slice(0, 10)
    };
    output.health = healthScore(output);
    return output;
  }

  function baseItems(m) {
    const items = [];
    items.push(item('status', 'Campaign status', `${formatNumber(m.total)} voters in ${m.scope}. ${formatNumber(m.assigned)} assigned.`, 'Just now', scopedUrl('voters.html')));

    if (m.latestAssignment) {
      items.push(item(
        'assignment',
        'Latest assignment',
        `${clean(m.latestAssignment.vote_assigned_by) || clean(m.latestAssignment.by) || 'Team'} assigned ${clean(m.latestAssignment.name) || 'a voter'}.`,
        formatTime(m.latestAssignment.vote_assigned_at || m.latestAssignment.at),
        scopedUrl('voters.html', { filter: 'assigned' })
      ));
    }

    if (m.willVote === 0) items.push(item('warning', 'No will-vote marked yet', 'Start marking confirmed supporters as Will Vote.', 'Warning', scopedUrl('voters.html', { filter: 'willvote' })));
    if (m.needCall) items.push(item('warning', 'Call queue needs attention', `${formatNumber(m.needCall)} voters still need phone contact.`, 'Task', scopedUrl('voters.html', { filter: 'needcall' })));
    if (m.followUp) items.push(item('risk', 'Follow-up queue', `${formatNumber(m.followUp)} voters need follow-up or D2D.`, 'Task', scopedUrl('voters.html', { filter: 'followup' })));
    if (m.noPhone) items.push(item('risk', 'No phone list', `${formatNumber(m.noPhone)} voters need phone numbers or direct visit.`, 'Task', scopedUrl('voters.html', { filter: 'nophone' })));
    if (m.transport) items.push(item('warning', 'Transport support', `${formatNumber(m.transport)} voters need transport.`, 'Task', scopedUrl('voters.html', { filter: 'transport' })));

    if (m.topHouse) {
      items.push(item('suggestion', 'House focus', `Focus on ${m.topHouse.name}: ${formatNumber(m.topHouse.count)} voters in this scope.`, 'AI suggestion', scopedUrl('voters.html', { house: m.topHouse.name })));
    }

    items.push(item('health', 'Campaign health', `Health score is ${m.health}/100. ${healthText(m.health)}`, 'AI status', scopedUrl('ai-dashboard.html')));

    const reachedPct = m.total ? Math.round((m.reached / m.total) * 100) : 0;
    if (reachedPct >= 50) items.push(item('success', 'Reach milestone', `${reachedPct}% of voters are reached.`, 'Milestone', scopedUrl('voters.html', { filter: 'reached' })));
    if (m.assigned && m.total && Math.round((m.assigned / m.total) * 100) >= 20) items.push(item('success', 'Assignment milestone', `${Math.round((m.assigned / m.total) * 100)}% of voters are assigned.`, 'Milestone', scopedUrl('voters.html', { filter: 'assigned' })));

    return items;
  }

  function updateChangeHistory(m) {
    const key = `${snapshotPrefix}:${m.scope}`;
    const previous = loadJson(key, null);
    saveJson(key, snapshot(m));
    if (!m.total) return;

    if (!previous || !previous.total) {
      addHistory(item('update', 'Data loaded', `${formatNumber(m.total)} voters loaded for ${m.scope}.`, 'Just now', scopedUrl('ai-dashboard.html')), 'data-loaded');
      return;
    }

    compareMetric('total', 'Total voters', previous.total, m.total, 'status');
    compareMetric('assigned', 'Assigned voters', previous.assigned, m.assigned, 'assignment');
    compareMetric('willVote', 'Will Vote', previous.willVote, m.willVote, 'success');
    compareMetric('reached', 'Reached voters', previous.reached, m.reached, 'success');
    compareMetric('needCall', 'Call queue', previous.needCall, m.needCall, 'warning');
  }

  function compareMetric(metric, label, oldValue, newValue, tone) {
    if (Number(oldValue || 0) === Number(newValue || 0)) return;
    const direction = Number(newValue || 0) > Number(oldValue || 0) ? 'increased' : 'changed';
    addHistory(
      item(tone, label, `${label} ${direction} from ${formatNumber(oldValue)} to ${formatNumber(newValue)}.`, 'Just now', scopedUrl('ai-dashboard.html')),
      `${metric}:${oldValue}:${newValue}`
    );
  }

  function addHistory(entry, signature) {
    const key = `${feedPrefix}:${partyScope()}`;
    const history = loadHistory();
    if (history.some((existing) => existing.signature === signature)) return;
    history.unshift({ ...entry, signature, createdAt: new Date().toISOString() });
    saveJson(key, history.slice(0, maxHistory));
  }

  function loadHistory() {
    const key = `${feedPrefix}:${partyScope()}`;
    return loadJson(key, []).map((entry) => ({ ...entry, meta: timeAgo(entry.createdAt) }));
  }

  function latestAssignments(rows) {
    return rows
      .filter((row) => clean(row.vote_assigned_by))
      .sort((a, b) => dateMs(b.vote_assigned_at) - dateMs(a.vote_assigned_at));
  }

  function feedItemMarkup(feedItem) {
    return `
      <article class="ai-feed-item ${esc(feedItem.tone)}">
        <div class="ai-feed-copy">
          <small>${esc(feedItem.meta || '')}</small>
          <strong>${esc(feedItem.title)}</strong>
          <p>${esc(feedItem.text || '')}</p>
        </div>
        <a href="${esc(feedItem.href)}">Open</a>
      </article>
    `;
  }

  function item(tone, title, text, meta, href) {
    return { tone, title, text, meta, href };
  }

  function readRows() {
    if (Array.isArray(window.__villimaleRows) && window.__villimaleRows.length) return window.__villimaleRows;
    const keys = [
      `${storagePrefix}:${partyScope()}:rows`,
      `${storagePrefix}:ALL:rows`,
      `${storagePrefix}:PNC:rows`,
      `${storagePrefix}:MDP:rows`
    ];
    for (const key of keys) {
      try {
        const rows = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(rows) && rows.length) return rows;
      } catch {}
    }
    return [];
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
    return Boolean(clean(row.phone)) && clean(row.phone).toLowerCase() !== 'no phone';
  }

  function healthScore(m) {
    if (!m.total) return 0;
    const reached = m.reached / m.total;
    const committed = m.willVote / m.total;
    const risk = (m.pending + m.needCall + m.noPhone + m.followUp) / Math.max(1, m.total * 4);
    return Math.max(0, Math.min(100, Math.round((reached * 35) + (committed * 45) + ((1 - risk) * 20))));
  }

  function healthText(score) {
    if (score >= 70) return 'Campaign view looks stable.';
    if (score >= 40) return 'Campaign needs focused follow-up.';
    return 'Campaign needs attention now.';
  }

  function snapshot(m) {
    return {
      total: m.total,
      assigned: m.assigned,
      willVote: m.willVote,
      reached: m.reached,
      needCall: m.needCall,
      at: new Date().toISOString()
    };
  }

  function sortCountName(a, b) {
    return b.count - a.count || a.name.localeCompare(b.name);
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
    if (Number.isNaN(date.getTime())) return clean(value) || 'Latest';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value || 0));
  }

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
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
      .ai-live-feed{margin:0 0 14px!important;padding:16px!important;background:#fff!important;border:1px solid #e4e7ec!important;box-shadow:0 16px 36px rgba(16,24,40,.06)!important}
      .ai-feed-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.ai-feed-head h2{margin:0 0 5px!important;font-size:22px!important}.ai-feed-head p{margin:0!important;color:#667085!important}.ai-feed-live{display:inline-flex;min-height:30px;align-items:center;border:1px solid #bbf7d0;border-radius:999px;background:#f0fdf4;color:#15803d;padding:5px 10px;font-size:12px;font-weight:900;white-space:nowrap}
      .ai-feed-list{display:grid;gap:9px;max-height:420px;overflow:auto;padding-right:2px}.ai-feed-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e4e7ec;border-radius:13px;background:#f8fafc;padding:11px 12px;border-left-width:4px}.ai-feed-copy{min-width:0}.ai-feed-item strong{display:block;color:#101828;font-size:14px;line-height:1.25}.ai-feed-item p{margin:3px 0 0!important;color:#475467!important;font-size:12px!important;line-height:1.35!important}.ai-feed-item small{display:block;color:#667085;font-size:11px;font-weight:850;margin-bottom:3px}.ai-feed-item a{display:inline-flex;align-items:center;justify-content:center;min-height:32px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#1d4ed8;padding:6px 10px;text-decoration:none;font-size:12px;font-weight:900}.ai-feed-item.status{border-left-color:#60a5fa;background:#eff6ff}.ai-feed-item.assignment{border-left-color:#8b5cf6;background:#f5f3ff}.ai-feed-item.success{border-left-color:#22c55e;background:#f0fdf4}.ai-feed-item.suggestion{border-left-color:#2563eb;background:#eff6ff}.ai-feed-item.warning{border-left-color:#f59e0b;background:#fffbeb}.ai-feed-item.risk{border-left-color:#ef4444;background:#fef2f2}.ai-feed-item.health{border-left-color:#14b8a6;background:#f0fdfa}.ai-feed-item.update{border-left-color:#64748b;background:#f8fafc}.ai-feed-empty{padding:14px;border:1px dashed #d0d5dd;border-radius:12px;background:#f8fafc;color:#667085;font-size:13px;font-weight:800;text-align:center}.ai-feed-list::-webkit-scrollbar{width:5px}.ai-feed-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}
      @media(max-width:760px){.ai-live-feed{padding:14px!important}.ai-feed-head{display:grid}.ai-feed-item{grid-template-columns:1fr}.ai-feed-item a{width:100%}.ai-feed-list{max-height:none;overflow:visible}}
    `;
    document.head.appendChild(style);
  }
})();