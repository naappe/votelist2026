(function () {
  const heartbeatMs = 30000;
  const storagePrefix = 'villimale_campaign_manager_v1';
  let pulse = 0;
  let detailsOpen = false;
  let lastAssignmentEvent = null;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    installStyles();
    applyCleanLayout();
    ensurePanel();
    render();

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-ai-brain-details]')) {
        detailsOpen = !detailsOpen;
        render();
      }
    });

    document.addEventListener('modal-assignment-saved', (event) => {
      lastAssignmentEvent = event.detail?.updates || null;
      render();
    });

    window.addEventListener('villimale:rows-updated', render);
    window.addEventListener('villimale-rows-updated', render);
    window.addEventListener('online', render);
    window.addEventListener('offline', render);

    setInterval(() => {
      pulse += 1;
      render();
    }, heartbeatMs);

    const target = document.getElementById('voterList') || document.body;
    new MutationObserver(debounce(() => {
      applyCleanLayout();
      render();
    }, 120)).observe(target, { childList: true, subtree: true });
  }

  function applyCleanLayout() {
    if (!['management', 'analytics'].includes(document.body.dataset.view)) return;
    const summary = document.getElementById('summary');
    if (!summary) return;
    summary.hidden = true;
    summary.setAttribute('aria-hidden', 'true');
  }

  function ensurePanel() {
    if (document.getElementById('aiBrainLive')) return;
    const sync = document.getElementById('syncNotice');
    const panel = document.createElement('section');
    panel.id = 'aiBrainLive';
    panel.className = 'panel ai-brain-live';
    panel.setAttribute('aria-label', 'AI Brain live status');
    if (sync) sync.after(panel);
    else document.querySelector('.page')?.prepend(panel);
  }

  function render() {
    const panel = document.getElementById('aiBrainLive');
    if (!panel || document.body.classList.contains('clean-read-view')) return;
    applyCleanLayout();

    const metrics = readMetrics();
    const status = navigator.onLine ? 'Alive' : 'Offline';
    const tone = navigator.onLine ? 'ok' : 'warn';
    const dashboardHref = scopedUrl(isAiDashboardPage() ? 'voters.html' : 'ai-dashboard.html');
    const dashboardLabel = isAiDashboardPage() ? 'Open voters' : 'Open AI Dashboard';

    panel.innerHTML = `
      <div class="ai-brain-head">
        <div>
          <p class="eyebrow">AI Brain Live</p>
          <h2>${esc(isAiDashboardPage() ? 'Information Status' : 'Smart Insights')}</h2>
          <p>${esc(metrics.source === 'cache'
            ? 'Reading the current campaign rows already loaded by this page.'
            : 'Watching the visible voter list without heavy AI processing.')}</p>
        </div>
        <div class="ai-brain-status ${tone}">
          <span class="live-dot"></span>
          <strong>${status}</strong>
          <small>pulse ${pulse}</small>
        </div>
      </div>
      <div class="ai-brain-metrics">
        ${metric('All', metrics.total)}
        ${metric('Need Call', metrics.needCall)}
        ${metric('Will Vote', metrics.willVote)}
        ${metric('Follow-up', metrics.followUp)}
        ${metric('Pending', metrics.pending)}
        ${metric('No Phone', metrics.noPhone)}
        ${metric('Transport', metrics.transport)}
        ${metric('Assigned', metrics.assigned)}
      </div>
      <div class="ai-brain-actions">
        <button class="btn light compact" type="button" data-ai-brain-details aria-expanded="${detailsOpen ? 'true' : 'false'}">
          ${detailsOpen ? 'Hide details' : 'Show details'}
        </button>
        <a class="btn light compact" href="${esc(dashboardHref)}">${esc(dashboardLabel)}</a>
      </div>
      ${detailsOpen ? detailsMarkup(metrics) : ''}
      <div class="ai-brain-insights">
        ${insights(metrics).map((item) => `<article class="ai-insight ${item.tone}"><strong>${esc(item.title)}</strong><span>${esc(item.text)}</span></article>`).join('')}
      </div>
    `;
  }

  function readMetrics() {
    const rows = readRows();
    const cards = readVisibleCards();
    const sectionTotal = readSectionTotal(cards.length);
    const source = rows.length ? 'cache' : 'visible';
    const total = rows.length || sectionTotal || cards.length;
    const rowHouses = rows.length ? rows.map((row) => houseGroupName(row.house)).filter(Boolean) : cards.map((card) => card.house).filter(Boolean);
    const houseSet = new Set(rowHouses.map((house) => house.toLowerCase()));
    const assignments = readAssignments(rows);
    const fallback = readTextFallback(cards);

    const metrics = {
      source,
      scope: partyScope(),
      section: clean(document.getElementById('sectionTitle')?.textContent) || 'Current view',
      search: clean(document.getElementById('searchInput')?.value),
      houseFilter: clean(document.getElementById('houseSelect')?.selectedOptions?.[0]?.textContent),
      visible: cards.length || sectionTotal || total,
      pageTotal: sectionTotal || cards.length || total,
      total,
      houses: houseSet.size,
      needCall: rows.length ? rows.filter((row) => row.phone_status === 'need-call' && hasPhone(row)).length : fallback.needCall,
      followUp: rows.length ? rows.filter(isFollowUp).length : fallback.followUp,
      willVote: rows.length ? rows.filter((row) => row.vote_status === 'will-vote').length : fallback.willVote,
      pending: rows.length ? rows.filter((row) => row.vote_status === 'pending').length : fallback.pending,
      noPhone: rows.length ? rows.filter((row) => row.phone_status === 'no-phone' || !hasPhone(row)).length : fallback.noPhone,
      transport: rows.length ? rows.filter((row) => row.transport_status === 'need-transport').length : fallback.transport,
      reached: rows.length ? rows.filter((row) => row.reach_status === 'reached').length : fallback.reached,
      guaranteed: rows.length ? rows.filter((row) => row.support_level === 'guaranteed').length : fallback.guaranteed,
      assigned: assignments.count,
      lastAssigned: assignments.last,
      topAssignees: assignments.topAssignees,
      topHouse: topHouse(rowHouses)
    };

    if (lastAssignmentEvent?.vote_assigned_by) {
      metrics.lastAssigned = {
        by: lastAssignmentEvent.vote_assigned_by,
        at: lastAssignmentEvent.vote_assigned_at || new Date().toISOString()
      };
    }

    return metrics;
  }

  function readRows() {
    if (Array.isArray(window.__villimaleRows) && window.__villimaleRows.length) {
      return window.__villimaleRows;
    }

    const key = `${storagePrefix}:${partyScope()}:rows`;
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function readVisibleCards() {
    return Array.from(document.querySelectorAll('.voter-card[data-open-voter]')).map((card) => ({
      text: card.textContent.toLowerCase(),
      house: houseFromCard(card)
    }));
  }

  function readSectionTotal(fallback) {
    const totalText = document.getElementById('sectionTotal')?.textContent || '';
    return Number((totalText.match(/\d+/) || [fallback])[0]) || fallback;
  }

  function readAssignments(rows) {
    const domAssignments = readDomAssignments();
    const assignedRows = rows
      .filter((row) => clean(row.vote_assigned_by))
      .map((row) => ({ by: clean(row.vote_assigned_by), at: row.vote_assigned_at || '', name: clean(row.name) }));

    const assignments = assignedRows.length ? assignedRows : domAssignments;
    const sorted = assignments.slice().sort((a, b) => dateMs(b.at) - dateMs(a.at));
    const counts = new Map();
    assignments.forEach((item) => {
      const by = clean(item.by) || 'Assigned';
      counts.set(by, (counts.get(by) || 0) + 1);
    });

    return {
      count: assignments.length,
      last: sorted[0] || null,
      topAssignees: Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 5)
    };
  }

  function readDomAssignments() {
    return Array.from(document.querySelectorAll('.assigned-result-box')).map((box) => ({
      by: clean(box.querySelector('strong')?.textContent),
      at: clean(box.querySelector('small')?.textContent)
    })).filter((item) => item.by);
  }

  function readTextFallback(cards) {
    const output = { needCall: 0, followUp: 0, willVote: 0, pending: 0, noPhone: 0, transport: 0, reached: 0, guaranteed: 0 };
    cards.forEach((card) => {
      if (card.text.includes('need call')) output.needCall += 1;
      if (card.text.includes('follow up') || card.text.includes('follow-up')) output.followUp += 1;
      if (card.text.includes('will vote')) output.willVote += 1;
      if (card.text.includes('pending')) output.pending += 1;
      if (card.text.includes('no phone')) output.noPhone += 1;
      if (card.text.includes('transport')) output.transport += 1;
      if (card.text.includes('reached')) output.reached += 1;
      if (card.text.includes('guaranteed')) output.guaranteed += 1;
    });
    return output;
  }

  function detailsMarkup(metrics) {
    const latest = metrics.lastAssigned
      ? `${metrics.lastAssigned.by || 'Assigned'}${metrics.lastAssigned.at ? ` at ${formatTime(metrics.lastAssigned.at)}` : ''}`
      : 'No assignment date found yet';
    const assignees = metrics.topAssignees.length
      ? metrics.topAssignees.map((item) => `${item.name}: ${formatNumber(item.count)}`).join(' | ')
      : 'No assigned people found yet';
    const topHouseText = metrics.topHouse ? `${metrics.topHouse.name} (${formatNumber(metrics.topHouse.count)})` : 'No house data yet';

    const rows = [
      ['Scope', metrics.scope],
      ['Current view', metrics.section],
      ['Visible now', formatNumber(metrics.visible)],
      ['Current view total', formatNumber(metrics.pageTotal)],
      ['Houses', formatNumber(metrics.houses)],
      ['Reached', formatNumber(metrics.reached)],
      ['Guaranteed', formatNumber(metrics.guaranteed)],
      ['Top house', topHouseText],
      ['Latest assignment', latest],
      ['Assigned people', assignees]
    ];

    if (metrics.search) rows.push(['Search', metrics.search]);
    if (metrics.houseFilter && metrics.houseFilter !== 'All houses') rows.push(['House filter', metrics.houseFilter]);

    return `
      <div class="ai-brain-details">
        ${rows.map(([label, value]) => `
          <div class="ai-detail-row">
            <span>${esc(label)}</span>
            <strong>${esc(value || '-')}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  function insights(metrics) {
    const items = [];
    if (!metrics.total && !metrics.visible) {
      return [{ tone: 'warn', title: 'Waiting for voters', text: 'The brain is ready. Load or filter voters to see live suggestions.' }];
    }
    if (metrics.lastAssigned) {
      items.push({ tone: 'info', title: 'Latest assignment', text: `${metrics.lastAssigned.by || 'Assigned'} ${metrics.lastAssigned.at ? `at ${formatTime(metrics.lastAssigned.at)}` : 'has assigned voters'}.` });
    }
    if (metrics.needCall) items.push({ tone: 'warn', title: 'Call queue', text: `${formatNumber(metrics.needCall)} voters need call attention.` });
    if (metrics.followUp) items.push({ tone: 'bad', title: 'Follow-up', text: `${formatNumber(metrics.followUp)} voters need follow-up or D2D.` });
    if (metrics.noPhone) items.push({ tone: 'bad', title: 'No phone', text: `${formatNumber(metrics.noPhone)} voters need phone numbers or direct visit.` });
    if (metrics.transport) items.push({ tone: 'warn', title: 'Transport', text: `${formatNumber(metrics.transport)} voters need transport support.` });
    if (metrics.willVote) items.push({ tone: 'good', title: 'Support pool', text: `${formatNumber(metrics.willVote)} voters are marked will vote.` });
    if (metrics.houses > 1) items.push({ tone: 'info', title: 'House breaks active', text: `${formatNumber(metrics.houses)} house groups are visible or loaded in this scope.` });
    if (!items.length) items.push({ tone: 'good', title: 'Stable view', text: 'No urgent visible pattern detected. Continue from the filters.' });
    return items.slice(0, 4);
  }

  function metric(label, value) {
    return `<div class="ai-metric"><strong>${formatNumber(value || 0)}</strong><span>${esc(label)}</span></div>`;
  }

  function partyScope() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function scopedUrl(path) {
    const url = new URL(path, location.href);
    const party = partyScope();
    if (party) url.searchParams.set('party', party);
    return url.pathname.split('/').pop() + url.search;
  }

  function isAiDashboardPage() {
    return /ai-dashboard\.html$/i.test(location.pathname);
  }

  function houseFromCard(card) {
    const meta = card.querySelector('.voter-info p')?.textContent || '';
    return houseGroupName(meta.split('·')[0]?.trim() || '');
  }

  function topHouse(houses) {
    const counts = new Map();
    houses.filter(Boolean).forEach((house) => counts.set(house, (counts.get(house) || 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
  }

  function houseGroupName(value) {
    const house = clean(value) || '';
    if (!house) return '';
    const normalized = house.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`'.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = normalized.replace(/\s+/g, '');
    if (/^df\d*/.test(compact) || compact.startsWith('dhafthar') || compact.startsWith('dafthar')) return 'Dhafthar';
    if (compact.includes('sinamale') || compact.includes('sinamle')) return 'Sinamale';
    return house;
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function hasPhone(row) {
    return Boolean(clean(row.phone));
  }

  function dateMs(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
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

  function installStyles() {
    if (document.getElementById('aiBrainLiveStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiBrainLiveStyles';
    style.textContent = `
      body[data-page="dashboard"][data-view="management"] #summary,
      body[data-page="dashboard"][data-view="analytics"] #summary{display:none!important}
      .ai-brain-live{margin:0 0 14px!important;padding:16px!important;background:linear-gradient(135deg,#fff,#f8fbff)!important}
      .ai-brain-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}
      .ai-brain-head h2{margin:0 0 5px!important;font-size:22px!important;letter-spacing:0!important}
      .ai-brain-head p{margin:0!important;color:#667085!important;line-height:1.45!important}
      .ai-brain-status{display:grid;justify-items:end;gap:2px;min-width:120px;border:1px solid #e4e7ec;border-radius:13px;background:#fff;padding:9px 11px}
      .ai-brain-status strong{font-size:12px;text-transform:uppercase;letter-spacing:.08em}.ai-brain-status small{font-size:11px;color:#667085;font-weight:800}.live-dot{width:10px;height:10px;border-radius:99px;background:#16a34a;box-shadow:0 0 0 6px rgba(22,163,74,.12);justify-self:end}.ai-brain-status.warn .live-dot{background:#d97706;box-shadow:0 0 0 6px rgba(217,119,6,.13)}.ai-brain-status.ok strong{color:#166534}.ai-brain-status.warn strong{color:#92400e}
      .ai-brain-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:10px}.ai-metric{border:1px solid #e4e7ec;border-radius:12px;background:#fff;padding:10px}.ai-metric strong{display:block;font-size:20px;line-height:1}.ai-metric span{display:block;margin-top:4px;color:#667085;font-size:11px;font-weight:900;text-transform:uppercase}
      .ai-brain-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}.ai-brain-actions .btn{text-decoration:none}
      .ai-brain-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 10px}.ai-detail-row{display:grid;gap:3px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff;padding:10px}.ai-detail-row span{font-size:11px;font-weight:900;text-transform:uppercase;color:#2563eb}.ai-detail-row strong{font-size:13px;color:#101828;overflow-wrap:anywhere}
      .ai-brain-insights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ai-insight{border:1px solid #e4e7ec;border-radius:12px;background:#fff;padding:10px}.ai-insight strong{display:block;margin-bottom:4px;font-size:13px}.ai-insight span{display:block;color:#667085;font-size:12px;line-height:1.4}.ai-insight.good{border-color:#bbf7d0;background:#f0fdf4}.ai-insight.warn{border-color:#fde68a;background:#fffbeb}.ai-insight.bad{border-color:#fecaca;background:#fef2f2}.ai-insight.info{border-color:#bfdbfe;background:#eff6ff}
      @media(max-width:760px){.ai-brain-head,.ai-brain-metrics,.ai-brain-insights,.ai-brain-details{display:grid;grid-template-columns:1fr}.ai-brain-status{justify-items:start}.live-dot{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function debounce(fn, delay) {
    let timer;
    return function debounced() {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  function clean(value) {
    return String(value || '').trim();
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
})();