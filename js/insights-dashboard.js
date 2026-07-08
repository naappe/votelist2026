(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = ((params.get('section') || 'voters').toLowerCase() === 'residents') ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  if (section !== 'insights') return;

  let client = null;
  let rows = [];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    installStyles();
    setupClient();
    await loadRows();
    renderInsights();
  }

  function setupClient() {
    const cfg = window.APP_CONFIG || {};
    if (window.supabase && cfg.supabaseUrl && cfg.supabaseKey) client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }

  async function loadRows() {
    if (!client) return;
    try {
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at,area')
        .limit(5000);
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query;
      if (res.error) throw res.error;
      rows = res.data || [];
    } catch (error) {
      console.warn('Insights load failed', error);
    }
  }

  function renderInsights() {
    if (!rows.length) return;
    const hero = document.querySelector('.hero h1');
    if (hero) hero.innerHTML = `<span id="partyName">${escapeHtml(party === 'ALL' ? 'All' : party)}</span> Insights`;

    const searchPanel = document.querySelector('.search')?.closest('.panel');
    if (searchPanel) searchPanel.remove();

    const listPanel = document.getElementById('list')?.closest('.panel');
    if (listPanel) listPanel.classList.add('insights-root-panel');

    renderTopCards();
    renderMainDashboard(listPanel);
  }

  function renderTopCards() {
    const stats = document.getElementById('sectionResultCards') || document.querySelector('.stats');
    if (!stats) return;
    const assigned = rows.filter(isAssigned).length;
    const will = count(r => r.vote_status === 'will-vote');
    const pending = count(r => r.vote_status === 'pending');
    const needCall = count(r => r.phone_status === 'need-call');
    const needVisit = count(r => r.d2d_status === 'not-visited');
    const needTransport = count(r => r.transport_status === 'need-transport');

    stats.classList.add('insights-top-cards');
    stats.innerHTML = [
      statCard('Total Residents', rows.length, 'neutral'),
      statCard('Assigned', assigned, 'green'),
      statCard('Will Vote', will, 'green'),
      statCard('Need Call', needCall, 'red'),
      statCard('Need Visit', needVisit, 'orange'),
      statCard('Need Transport', needTransport, 'blue'),
      statCard('Pending', pending, 'orange'),
      statCard('Unassigned', rows.length - assigned, 'red')
    ].join('');
  }

  function renderMainDashboard(listPanel) {
    const panel = listPanel || document.querySelector('.panel:last-of-type');
    if (!panel) return;
    const h2 = panel.querySelector('.panel-head h2');
    const pill = document.getElementById('sectionTotal');
    if (h2) h2.textContent = 'Campaign Insights';
    if (pill) pill.textContent = `${rows.length.toLocaleString()} residents analysed`;

    const call = statusCounts('phone_status');
    const vote = statusCounts('vote_status');
    const d2d = statusCounts('d2d_status');
    const transport = statusCounts('transport_status');
    const assignment = assignmentCounts();
    const houses = houseWorkload();
    const recommendations = buildRecommendations(assignment, houses);

    const list = document.getElementById('list');
    if (!list) return;
    list.className = 'insights-dashboard';
    list.innerHTML = `
      <section class="insight-section">
        <div class="insight-head"><h3>Campaign Overview</h3><span>${percent(count(r => r.vote_status === 'will-vote'), rows.length)} will vote</span></div>
        <div class="mini-grid">
          ${metric('Will Vote', count(r => r.vote_status === 'will-vote'))}
          ${metric('No Vote', count(r => ['no-vote','not-vote'].includes(r.vote_status)))}
          ${metric('Pending', count(r => r.vote_status === 'pending'))}
          ${metric('Guaranteed', count(r => r.support_level === 'guaranteed'))}
        </div>
        ${bar('Vote progress', count(r => r.vote_status === 'will-vote'), rows.length)}
        ${bar('Assignment progress', rows.filter(isAssigned).length, rows.length)}
      </section>

      <section class="insight-section">
        <div class="insight-head"><h3>Call Center</h3><span>${count(r => r.phone_status === 'need-call').toLocaleString()} need calls</span></div>
        ${statusList(call, ['need-call','called','wrong-number','no-phone','out-of-range','busy','disconnected'])}
      </section>

      <section class="insight-section">
        <div class="insight-head"><h3>Door to Door</h3><span>${count(r => r.d2d_status === 'not-visited').toLocaleString()} not visited</span></div>
        ${statusList(d2d, ['not-visited','visited','follow-up','not-home'])}
      </section>

      <section class="insight-section">
        <div class="insight-head"><h3>Transport</h3><span>${count(r => r.transport_status === 'need-transport').toLocaleString()} need transport</span></div>
        ${statusList(transport, ['need-transport','arranged','picked-up','not-needed'])}
      </section>

      <section class="insight-section wide">
        <div class="insight-head"><h3>Assignment Performance</h3><span>Top assigned people</span></div>
        ${assignmentList(assignment)}
      </section>

      <section class="insight-section wide">
        <div class="insight-head"><h3>House Workload</h3><span>Houses needing action</span></div>
        ${houseList(houses)}
      </section>

      <section class="insight-section wide recommendations">
        <div class="insight-head"><h3>AI Recommendations</h3><span>Priority actions</span></div>
        <ol>${recommendations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
      </section>
    `;
  }

  function buildRecommendations(assignment, houses) {
    const recs = [];
    const needCall = count(r => r.phone_status === 'need-call');
    const unassigned = rows.filter(r => !isAssigned(r)).length;
    const notVisited = count(r => r.d2d_status === 'not-visited');
    const topHouse = houses[0];
    const topAssignee = assignment[0];
    if (needCall > 0) recs.push(`${needCall.toLocaleString()} residents still need calls. Prioritize phone team first.`);
    if (unassigned > 0) recs.push(`${unassigned.toLocaleString()} residents are still unassigned. Assign them before field work starts.`);
    if (notVisited > 0) recs.push(`${notVisited.toLocaleString()} residents are not visited. D2D team should focus on high-count houses.`);
    if (topHouse) recs.push(`${topHouse.house} has the highest workload with ${topHouse.score.toLocaleString()} pending actions.`);
    if (topAssignee) recs.push(`${topAssignee.name} has the most assignments with ${topAssignee.count.toLocaleString()} residents.`);
    if (!recs.length) recs.push('Campaign data looks clean. Continue monitoring updates from each section.');
    return recs;
  }

  function assignmentCounts() {
    const out = {};
    rows.forEach(row => splitNames(row.vote_assigned_by).forEach(name => { out[name] = (out[name] || 0) + 1; }));
    return Object.entries(out).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name)).slice(0, 12);
  }

  function houseWorkload() {
    const map = {};
    rows.forEach(row => {
      const house = clean(row.house) || 'Unknown';
      if (!map[house]) map[house] = { house, total: 0, needCall: 0, notVisited: 0, unassigned: 0, pending: 0, score: 0 };
      const item = map[house];
      item.total += 1;
      if (row.phone_status === 'need-call') item.needCall += 1;
      if (row.d2d_status === 'not-visited') item.notVisited += 1;
      if (!isAssigned(row)) item.unassigned += 1;
      if (row.vote_status === 'pending') item.pending += 1;
      item.score = item.needCall + item.notVisited + item.unassigned + item.pending;
    });
    return Object.values(map).sort((a,b)=>b.score-a.score || b.total-a.total).slice(0, 12);
  }

  function statusCounts(field) {
    const out = {};
    rows.forEach(row => {
      const key = clean(row[field]) || 'blank';
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  function statusList(counts, order) {
    return `<div class="status-list">${order.map(key => `<div><span>${escapeHtml(label(key))}</span><strong>${Number(counts[key] || 0).toLocaleString()}</strong></div>`).join('')}</div>`;
  }

  function assignmentList(items) {
    if (!items.length) return '<div class="empty-mini">No assignments yet.</div>';
    return `<div class="rank-list">${items.map((item, index) => `<div><b>${index + 1}</b><span>${escapeHtml(item.name)}</span><strong>${item.count.toLocaleString()}</strong></div>`).join('')}</div>`;
  }

  function houseList(items) {
    if (!items.length) return '<div class="empty-mini">No house data.</div>';
    return `<div class="rank-list house-rank">${items.map((item, index) => `<div><b>${index + 1}</b><span>${escapeHtml(item.house)}</span><em>Call ${item.needCall} · Visit ${item.notVisited} · Unassigned ${item.unassigned}</em><strong>${item.score.toLocaleString()}</strong></div>`).join('')}</div>`;
  }

  function statCard(labelText, value, color) {
    return `<article class="stat insight-card ${color || ''}"><span>${escapeHtml(labelText)}</span><strong>${Number(value || 0).toLocaleString()}</strong></article>`;
  }

  function metric(labelText, value) {
    return `<article><span>${escapeHtml(labelText)}</span><strong>${Number(value || 0).toLocaleString()}</strong></article>`;
  }

  function bar(labelText, value, total) {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `<div class="insight-bar"><div><span>${escapeHtml(labelText)}</span><strong>${pct}%</strong></div><i><b style="width:${pct}%"></b></i></div>`;
  }

  function count(fn) { return rows.filter(fn).length; }
  function percent(value, total) { return total ? `${Math.round((value / total) * 100)}%` : '0%'; }
  function splitNames(value) { return Array.from(new Set(String(value || '').split(',').map(clean).filter(Boolean).filter(name => name.toLowerCase() !== 'naappe@gmail.com'))); }
  function isAssigned(row) { return !!clean(row.vote_assigned_by); }
  function clean(value) { return String(value || '').trim(); }
  function label(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }

  function installStyles() {
    if (document.getElementById('insightsDashboardStyles')) return;
    const style = document.createElement('style');
    style.id = 'insightsDashboardStyles';
    style.textContent = `
      body[data-insights],body{background:#f3f6fb}
      .insights-top-cards{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .insights-top-cards .stat{cursor:default!important}
      .insights-root-panel{border-color:#dbe4f0!important;background:transparent!important;box-shadow:none!important;padding:0!important}
      .insights-root-panel>.panel-head{background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:16px;margin-bottom:14px;box-shadow:0 14px 38px rgba(15,23,42,.06)}
      .insights-dashboard{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
      .insight-section{background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:16px;box-shadow:0 14px 38px rgba(15,23,42,.06)}
      .insight-section.wide{grid-column:1/-1}.insight-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.insight-head h3{margin:0;font-size:22px;letter-spacing:-.03em}.insight-head span{background:#eef4ff;color:#1647bb;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap}
      .mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.mini-grid article{border:1px solid #dbe4f0;border-radius:14px;padding:12px;background:#f8fafc}.mini-grid span,.status-list span{display:block;color:#52627a;text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:950}.mini-grid strong{display:block;margin-top:6px;font-size:24px;color:#071226}
      .insight-bar{display:grid;gap:7px;margin:11px 0}.insight-bar div{display:flex;justify-content:space-between;font-weight:950;color:#334155}.insight-bar i{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}.insight-bar b{display:block;height:100%;background:#1f3b66;border-radius:999px}
      .status-list{display:grid;gap:8px}.status-list div{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #dbe4f0;border-radius:13px;padding:10px 12px;background:#f8fafc}.status-list strong{font-size:20px;color:#071226}
      .rank-list{display:grid;gap:8px}.rank-list div{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;border:1px solid #dbe4f0;border-radius:13px;padding:10px 12px;background:#f8fafc}.rank-list b{width:28px;height:28px;border-radius:999px;background:#1f3b66;color:#fff;display:grid;place-items:center;font-size:12px}.rank-list span{font-weight:950;color:#071226}.rank-list strong{font-size:18px;color:#1647bb}.rank-list em{font-style:normal;color:#64748b;font-weight:800;font-size:12px}.house-rank div{grid-template-columns:32px 1fr 1.6fr auto}
      .recommendations ol{margin:0;padding-left:22px}.recommendations li{margin:8px 0;font-weight:850;color:#334155;line-height:1.45}
      @media(max-width:850px){.insights-top-cards{grid-template-columns:repeat(2,1fr)!important}.insights-dashboard{grid-template-columns:1fr!important}.mini-grid{grid-template-columns:repeat(2,1fr)}.insight-head{display:grid}.insight-head span{justify-self:start}.house-rank div{grid-template-columns:28px 1fr;gap:8px}.house-rank em,.house-rank strong{grid-column:2}.rank-list div{grid-template-columns:28px 1fr auto}.page{width:min(100% - 28px,1180px)!important;margin:16px auto!important}}
    `;
    document.head.appendChild(style);
  }
})();