document.addEventListener('DOMContentLoaded', () => {
  const app = new ResidentsAppV2();
  app.init();
});

class ResidentsAppV2 {
  constructor() {
    this.params = new URLSearchParams(location.search);
    this.party = (this.params.get('party') || 'PNC').toUpperCase();
    const rawSection = (this.params.get('section') || 'voters').toLowerCase();
    this.section = rawSection === 'residents' ? 'voters' : rawSection;
    this.client = null;
    this.allRows = [];
    this.currentRows = [];
    this.currentMode = '';
    this.currentAssignee = '';
    this.currentResident = null;

    this.sectionLabels = {
      voters: 'Residents',
      assign: 'Assign',
      calls: 'Calls',
      votes: 'Votes',
      visits: 'Visits',
      transport: 'Transport',
      insights: 'Insights'
    };
  }

  async init() {
    this.installStyles();
    this.createClient();
    this.buildNav();
    this.setHero();
    this.installModal();
    await this.loadRows();
    this.render();
  }

  createClient() {
    const cfg = window.APP_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) {
      this.setStatus('Supabase config not loaded.', true);
      return;
    }
    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }

  async loadRows() {
    if (!this.client) return;
    this.setStatus('Loading data...');
    const out = [];
    let from = 0;
    const size = 1000;
    while (true) {
      let query = this.client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at,area')
        .order('house', { ascending: true })
        .range(from, from + size - 1);
      if (this.party !== 'ALL') query = query.eq('party', this.party);
      const res = await query;
      if (res.error) {
        this.setStatus('Supabase error: ' + res.error.message, true);
        return;
      }
      out.push(...(res.data || []));
      if (!res.data || res.data.length < size) break;
      from += size;
    }
    this.allRows = out;
  }

  render() {
    this.renderTopCards();
    if (this.section === 'insights') {
      this.hideOperationsPanel();
      this.renderInsights();
      return;
    }
    this.showOperationsPanel();
    this.renderControls();
    this.applyDefaultMode();
  }

  buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const items = [
      ['voters', 'Residents'],
      ['assign', 'Assign'],
      ['calls', 'Calls'],
      ['votes', 'Votes'],
      ['visits', 'Visits'],
      ['transport', 'Transport'],
      ['insights', 'Insights']
    ];
    nav.innerHTML = items.map(([key, label]) => {
      const href = `residents.html?party=${encodeURIComponent(this.party)}&section=${key}&v=appv2`;
      return `<a class="btn ${key === this.section ? 'active' : ''}" href="${href}">${this.escape(label)}</a>`;
    }).join('') + '<a class="btn" href="index.html?v=appv2">Logout</a>';
  }

  setHero() {
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) heroTitle.innerHTML = `<span id="partyName">${this.escape(this.party === 'ALL' ? 'All' : this.party)}</span> ${this.escape(this.sectionLabels[this.section] || 'Residents')}`;
    const heroText = document.querySelector('.hero p:not(.eyebrow)');
    if (heroText) heroText.textContent = 'No login. Direct campaign workspace.';
  }

  renderTopCards() {
    const stats = document.getElementById('sectionResultCards') || document.querySelector('.stats');
    if (!stats) return;
    const cards = this.getTopCards();
    stats.className = 'stats appv2-stats';
    stats.innerHTML = cards.map(card => `
      <article class="stat appv2-stat ${card.color || ''}" data-mode="${this.escapeAttr(card.mode || '')}">
        <span>${this.escape(card.label)}</span>
        <strong>${this.format(card.count)}</strong>
      </article>
    `).join('');
    stats.querySelectorAll('[data-mode]').forEach(card => {
      card.onclick = () => {
        const mode = card.dataset.mode || '';
        if (mode === 'assignee-picker') {
          document.getElementById('assigneeSelect')?.focus();
          return;
        }
        if (mode) this.showMode(mode);
      };
    });
  }

  getTopCards() {
    const rows = this.allRows;
    const assigned = rows.filter(r => this.isAssigned(r)).length;
    const unassigned = rows.length - assigned;
    if (this.section === 'assign') {
      return [
        { label: 'Total Residents', count: rows.length, mode: 'all' },
        { label: 'Assigned', count: assigned, mode: 'assigned', color: 'green' },
        { label: 'Unassigned', count: unassigned, mode: 'unassigned', color: 'orange' },
        { label: 'Assigned People', count: this.assigneeList().length, mode: 'assignee-picker' },
        { label: 'Need Assignment', count: unassigned, mode: 'unassigned', color: 'red' }
      ];
    }
    if (this.section === 'calls') {
      return [
        { label: 'Need Call', count: this.count(r => r.phone_status === 'need-call'), mode: 'need-call', color: 'red' },
        { label: 'Called', count: this.count(r => r.phone_status === 'called'), mode: 'called', color: 'green' },
        { label: 'Wrong Number', count: this.count(r => r.phone_status === 'wrong-number'), mode: 'wrong-number', color: 'orange' },
        { label: 'No Phone', count: this.count(r => r.phone_status === 'no-phone' || !this.clean(r.phone)), mode: 'no-phone' },
        { label: 'Out Of Range', count: this.count(r => r.phone_status === 'out-of-range'), mode: 'out-of-range' }
      ];
    }
    if (this.section === 'votes') {
      return [
        { label: 'Will Vote', count: this.count(r => r.vote_status === 'will-vote'), mode: 'will-vote', color: 'green' },
        { label: 'Pending', count: this.count(r => r.vote_status === 'pending'), mode: 'pending', color: 'orange' },
        { label: 'No Vote', count: this.count(r => ['no-vote', 'not-vote'].includes(r.vote_status)), mode: 'no-vote', color: 'red' },
        { label: 'Guaranteed', count: this.count(r => r.support_level === 'guaranteed'), mode: 'guaranteed', color: 'green' },
        { label: 'Need Transport', count: this.count(r => r.transport_status === 'need-transport'), mode: 'need-transport' }
      ];
    }
    if (this.section === 'visits') {
      return [
        { label: 'Not Visited', count: this.count(r => r.d2d_status === 'not-visited'), mode: 'not-visited', color: 'red' },
        { label: 'Visited', count: this.count(r => r.d2d_status === 'visited'), mode: 'visited', color: 'green' },
        { label: 'Follow-up', count: this.count(r => r.d2d_status === 'follow-up'), mode: 'follow-up', color: 'orange' },
        { label: 'Not Home', count: this.count(r => r.d2d_status === 'not-home'), mode: 'not-home' },
        { label: 'Need Visit', count: this.count(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up'), mode: 'need-visit' }
      ];
    }
    if (this.section === 'transport') {
      return [
        { label: 'Need Transport', count: this.count(r => r.transport_status === 'need-transport'), mode: 'need-transport', color: 'red' },
        { label: 'Arranged', count: this.count(r => r.transport_status === 'arranged'), mode: 'arranged', color: 'orange' },
        { label: 'Picked Up', count: this.count(r => r.transport_status === 'picked-up'), mode: 'picked-up', color: 'green' },
        { label: 'Not Needed', count: this.count(r => r.transport_status === 'not-needed'), mode: 'not-needed' },
        { label: 'Total Residents', count: rows.length, mode: 'all' }
      ];
    }
    return [
      { label: 'Total Residents', count: rows.length, mode: 'all' },
      { label: 'Will Vote', count: this.count(r => r.vote_status === 'will-vote'), mode: 'will-vote', color: 'green' },
      { label: 'Pending', count: this.count(r => r.vote_status === 'pending'), mode: 'pending', color: 'orange' },
      { label: 'Need Call', count: this.count(r => r.phone_status === 'need-call'), mode: 'need-call', color: 'red' },
      { label: 'Assigned', count: assigned, mode: 'assigned' }
    ];
  }

  renderControls() {
    const panel = document.querySelector('.search')?.closest('.panel');
    if (!panel) return;
    panel.className = 'panel appv2-controls-panel';
    const isAssign = this.section === 'assign';
    panel.innerHTML = `
      ${isAssign ? this.assignDashboardHtml() : ''}
      <div class="appv2-search-grid">
        <label>Search residents<input id="searchInput" type="search" placeholder="Name, ID, phone, house, party"></label>
        <label>House<select id="houseSelect"><option value="">All houses</option></select></label>
        <button id="clearBtn" class="btn" type="button">Clear Search</button>
      </div>
      <div id="status" class="status"></div>
      ${this.shareToolsHtml()}
    `;
    this.populateHouses(this.allRows);
    document.getElementById('searchInput')?.addEventListener('input', () => this.renderCurrentList());
    document.getElementById('houseSelect')?.addEventListener('change', () => this.renderCurrentList());
    document.getElementById('clearBtn')?.addEventListener('click', () => {
      const q = document.getElementById('searchInput');
      const h = document.getElementById('houseSelect');
      if (q) q.value = '';
      if (h) h.value = '';
      this.renderCurrentList();
    });
    document.getElementById('assignModeUnassigned')?.addEventListener('click', () => this.showMode('unassigned'));
    document.getElementById('assignModeAssigned')?.addEventListener('click', () => this.showMode('assigned'));
    document.getElementById('assignModeAll')?.addEventListener('click', () => this.showMode('all'));
    document.getElementById('assigneeSelect')?.addEventListener('change', (e) => this.showAssignee(e.target.value));
    document.getElementById('assignLinkBtn')?.addEventListener('click', () => this.createShare('assign'));
    document.getElementById('safeLinkBtn')?.addEventListener('click', () => this.createShare('safe'));
    document.getElementById('copyLinkBtn')?.addEventListener('click', () => this.copyShareLink());
  }

  assignDashboardHtml() {
    const assigned = this.allRows.filter(r => this.isAssigned(r)).length;
    const unassigned = this.allRows.length - assigned;
    const assignees = this.assigneeList();
    return `
      <section class="appv2-assign-dashboard">
        <div class="panel-head"><h2>Assign Dashboard</h2><span class="pill">${this.format(assigned)} assigned / ${this.format(unassigned)} unassigned</span></div>
        <div class="assign-actions">
          <button id="assignModeUnassigned" class="btn active" type="button">Show Unassigned</button>
          <button id="assignModeAssigned" class="btn" type="button">Show Assigned</button>
          <button id="assignModeAll" class="btn" type="button">Show All</button>
        </div>
        <div class="assignee-select-panel">
          <label>Assigned person<select id="assigneeSelect"><option value="">Choose assigned person</option>${assignees.map(a => `<option value="${this.escapeAttr(a.name)}">${this.escape(a.name)} (${this.format(a.count)})</option>`).join('')}</select></label>
        </div>
      </section>
    `;
  }

  shareToolsHtml() {
    return `
      <details class="appv2-share-details">
        <summary>Create share links</summary>
        <div class="share-tools">
          <div class="share-row">
            <button id="assignLinkBtn" class="btn" type="button">Create Assign Link</button>
            <button id="safeLinkBtn" class="btn" type="button">Create Read Only Link</button>
            <button id="copyLinkBtn" class="btn" type="button">Copy Link</button>
          </div>
          <textarea id="shareLinkBox" readonly placeholder="Generated link will show here"></textarea>
          <small>Link uses the current visible list.</small>
        </div>
      </details>
    `;
  }

  applyDefaultMode() {
    const defaults = {
      assign: 'unassigned',
      calls: 'need-call',
      votes: 'pending',
      visits: 'not-visited',
      transport: 'need-transport',
      voters: 'all'
    };
    this.showMode(defaults[this.section] || 'all');
  }

  showMode(mode) {
    this.currentMode = mode || 'all';
    this.currentAssignee = '';
    const select = document.getElementById('assigneeSelect');
    if (select) select.value = '';
    this.updateModeButtons();
    this.renderCurrentList();
  }

  showAssignee(name) {
    if (!name) return;
    this.currentMode = 'assignee';
    this.currentAssignee = name;
    this.updateModeButtons();
    this.renderCurrentList();
  }

  updateModeButtons() {
    const map = {
      unassigned: 'assignModeUnassigned',
      assigned: 'assignModeAssigned',
      all: 'assignModeAll'
    };
    Object.values(map).forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById(map[this.currentMode] || '')?.classList.add('active');
  }

  baseRowsForMode() {
    let data = this.allRows.slice();
    const mode = this.currentMode;
    if (mode === 'unassigned') data = data.filter(r => !this.isAssigned(r));
    if (mode === 'assigned') data = data.filter(r => this.isAssigned(r));
    if (mode === 'assignee') data = data.filter(r => this.splitNames(r.vote_assigned_by).some(n => n.toLowerCase() === this.currentAssignee.toLowerCase()));
    if (mode === 'will-vote') data = data.filter(r => r.vote_status === 'will-vote');
    if (mode === 'pending') data = data.filter(r => r.vote_status === 'pending');
    if (mode === 'no-vote') data = data.filter(r => ['no-vote', 'not-vote'].includes(r.vote_status));
    if (mode === 'guaranteed') data = data.filter(r => r.support_level === 'guaranteed');
    if (mode === 'need-call') data = data.filter(r => r.phone_status === 'need-call');
    if (mode === 'called') data = data.filter(r => r.phone_status === 'called');
    if (mode === 'wrong-number') data = data.filter(r => r.phone_status === 'wrong-number');
    if (mode === 'no-phone') data = data.filter(r => r.phone_status === 'no-phone' || !this.clean(r.phone));
    if (mode === 'out-of-range') data = data.filter(r => r.phone_status === 'out-of-range');
    if (mode === 'not-visited') data = data.filter(r => r.d2d_status === 'not-visited');
    if (mode === 'visited') data = data.filter(r => r.d2d_status === 'visited');
    if (mode === 'follow-up') data = data.filter(r => r.d2d_status === 'follow-up');
    if (mode === 'not-home') data = data.filter(r => r.d2d_status === 'not-home');
    if (mode === 'need-visit') data = data.filter(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up');
    if (mode === 'need-transport') data = data.filter(r => r.transport_status === 'need-transport');
    if (mode === 'arranged') data = data.filter(r => r.transport_status === 'arranged');
    if (mode === 'picked-up') data = data.filter(r => r.transport_status === 'picked-up');
    if (mode === 'not-needed') data = data.filter(r => r.transport_status === 'not-needed');
    return data;
  }

  renderCurrentList() {
    let data = this.baseRowsForMode();
    const term = this.clean(document.getElementById('searchInput')?.value).toLowerCase();
    const house = this.clean(document.getElementById('houseSelect')?.value).toLowerCase();
    if (term) data = data.filter(r => [r.name, r.national_id, r.house, r.phone, r.party, r.election_box, r.remarks, r.vote_assigned_by].some(v => String(v || '').toLowerCase().includes(term)));
    if (house) data = data.filter(r => (this.clean(r.house) || 'unknown').toLowerCase() === house);
    this.currentRows = data;
    this.renderList(data);
  }

  renderList(data) {
    const panel = document.getElementById('list')?.closest('.panel');
    const list = document.getElementById('list');
    if (!panel || !list) return;
    const title = panel.querySelector('.panel-head h2');
    const pill = document.getElementById('sectionTotal');
    if (title) title.textContent = this.titleForMode();
    if (pill) pill.textContent = this.pillForMode(data.length);
    if (!data.length) {
      list.className = 'list';
      list.innerHTML = '<div class="empty">No residents found.</div>';
      this.setStatus(this.statusForMode(data.length));
      return;
    }
    list.className = 'list appv2-card-list';
    list.innerHTML = data.map(r => this.cardHtml(r)).join('');
    list.querySelectorAll('[data-row-id]').forEach(card => card.onclick = e => {
      if (e.target.closest('a,button,input,select,textarea')) return;
      const row = this.allRows.find(r => String(r.id) === card.dataset.rowId);
      if (row) this.openEditor(row);
    });
    this.setStatus(this.statusForMode(data.length));
  }

  titleForMode() {
    if (this.currentMode === 'unassigned') return 'Unassigned Residents';
    if (this.currentMode === 'assigned') return 'Assigned Residents';
    if (this.currentMode === 'assignee') return `Assigned to ${this.currentAssignee}`;
    if (this.section === 'calls') return this.label(this.currentMode) + ' Calls';
    if (this.section === 'votes') return this.label(this.currentMode) + ' Votes';
    if (this.section === 'visits') return this.label(this.currentMode) + ' Visits';
    if (this.section === 'transport') return this.label(this.currentMode) + ' Transport';
    return this.currentMode === 'all' ? 'All Residents' : this.label(this.currentMode);
  }

  pillForMode(n) {
    if (this.currentMode === 'assignee') return `${this.format(n)} residents assigned to ${this.currentAssignee}`;
    if (this.currentMode === 'unassigned') return `${this.format(n)} unassigned residents`;
    if (this.currentMode === 'assigned') return `${this.format(n)} assigned residents`;
    return `${this.format(n)} residents`;
  }

  statusForMode(n) {
    if (this.currentMode === 'unassigned') return `Loaded ${this.format(n)} unassigned residents from ${this.format(this.allRows.length)} total. ${this.format(this.allRows.filter(r => this.isAssigned(r)).length)} already assigned.`;
    if (this.currentMode === 'assignee') return `Showing ${this.format(n)} residents assigned to ${this.currentAssignee}.`;
    return `Loaded ${this.format(n)} residents from ${this.format(this.allRows.length)} total.`;
  }

  cardHtml(r) {
    return `
      <article class="resident-card" data-row-id="${this.escapeAttr(r.id)}" tabindex="0">
        <div class="photo">${r.photo_url ? `<img src="${this.escapeAttr(r.photo_url)}" alt="">` : `<div class="ph">${this.escape(String(r.name || '?').slice(0, 1))}</div>`}</div>
        <div class="info">
          <h3>${this.escape(r.name || 'Unknown')}</h3>
          <p>${this.escape(r.house || '-')} · Box ${this.escape(r.election_box || '-')} · ${this.escape(r.phone || 'No phone')}</p>
          <div class="assigned-visible-line ${this.isAssigned(r) ? 'assigned-ok' : 'assigned-empty'}"><strong>Assignment:</strong> ${this.escape(r.vote_assigned_by || 'Not assigned')}</div>
          <div class="chips">
            <span>${this.escape(r.party || '-')}</span><span>${this.escape(r.vote_status || 'pending')}</span><span>${this.escape(r.phone_status || 'need-call')}</span><span>${this.escape(r.reach_status || 'not-reached')}</span><span>${this.escape(r.d2d_status || 'not-visited')}</span><span>${this.escape(r.transport_status || 'not-needed')}</span>
          </div>
        </div>
      </article>
    `;
  }

  populateHouses(source) {
    const select = document.getElementById('houseSelect');
    if (!select) return;
    const map = new Map();
    source.forEach(r => {
      const h = this.clean(r.house) || 'Unknown';
      map.set(h, (map.get(h) || 0) + 1);
    });
    select.innerHTML = '<option value="">All houses</option>' + Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(h => `<option value="${this.escapeAttr(h)}">${this.escape(h)} (${this.format(map.get(h))})</option>`).join('');
  }

  hideOperationsPanel() {
    document.querySelector('.search')?.closest('.panel')?.remove();
  }

  showOperationsPanel() {}

  renderInsights() {
    const panel = document.getElementById('list')?.closest('.panel');
    const list = document.getElementById('list');
    if (!panel || !list) return;
    panel.className = 'panel insights-panel';
    panel.querySelector('.panel-head h2').textContent = 'Campaign Insights';
    const pill = document.getElementById('sectionTotal');
    if (pill) pill.textContent = `${this.format(this.allRows.length)} residents analysed`;
    list.className = 'insights-dashboard';

    const assignment = this.assigneeList().slice(0, 12);
    const houses = this.houseWorkload().slice(0, 12);
    list.innerHTML = `
      <section class="insight-section wide"><div class="insight-head"><h3>Campaign Overview</h3><span>${this.format(this.count(r => r.vote_status === 'will-vote'))} will vote</span></div><div class="mini-grid">${this.metric('Will Vote', this.count(r => r.vote_status === 'will-vote'))}${this.metric('Pending', this.count(r => r.vote_status === 'pending'))}${this.metric('Assigned', this.allRows.filter(r => this.isAssigned(r)).length)}${this.metric('Unassigned', this.allRows.filter(r => !this.isAssigned(r)).length)}</div>${this.bar('Vote progress', this.count(r => r.vote_status === 'will-vote'), this.allRows.length)}${this.bar('Assignment progress', this.allRows.filter(r => this.isAssigned(r)).length, this.allRows.length)}</section>
      <section class="insight-section"><div class="insight-head"><h3>Call Center</h3><span>${this.format(this.count(r => r.phone_status === 'need-call'))} need calls</span></div>${this.statusList('phone_status', ['need-call', 'called', 'wrong-number', 'no-phone', 'out-of-range', 'busy', 'disconnected'])}</section>
      <section class="insight-section"><div class="insight-head"><h3>Door to Door</h3><span>${this.format(this.count(r => r.d2d_status === 'not-visited'))} not visited</span></div>${this.statusList('d2d_status', ['not-visited', 'visited', 'follow-up', 'not-home'])}</section>
      <section class="insight-section"><div class="insight-head"><h3>Transport</h3><span>${this.format(this.count(r => r.transport_status === 'need-transport'))} need transport</span></div>${this.statusList('transport_status', ['need-transport', 'arranged', 'picked-up', 'not-needed'])}</section>
      <section class="insight-section wide"><div class="insight-head"><h3>Assignment Performance</h3><span>Top people</span></div>${this.rankList(assignment.map((a, i) => ({ rank: i + 1, name: a.name, value: a.count })))}</section>
      <section class="insight-section wide"><div class="insight-head"><h3>House Workload</h3><span>Needs action</span></div>${this.rankList(houses.map((h, i) => ({ rank: i + 1, name: h.house, value: h.score, note: `Call ${h.needCall} · Visit ${h.notVisited} · Unassigned ${h.unassigned}` })))}</section>
      <section class="insight-section wide recommendations"><div class="insight-head"><h3>Recommendations</h3><span>Priority</span></div><ol>${this.recommendations(houses, assignment).map(x => `<li>${this.escape(x)}</li>`).join('')}</ol></section>
    `;
  }

  statusList(field, keys) {
    const counts = this.statusCounts(field);
    return `<div class="status-list">${keys.map(k => `<div><span>${this.escape(this.label(k))}</span><strong>${this.format(counts[k] || 0)}</strong></div>`).join('')}</div>`;
  }

  statusCounts(field) {
    const out = {};
    this.allRows.forEach(r => { const k = this.clean(r[field]) || 'blank'; out[k] = (out[k] || 0) + 1; });
    return out;
  }

  rankList(items) {
    if (!items.length) return '<div class="empty">No data.</div>';
    return `<div class="rank-list">${items.map(i => `<div><b>${i.rank}</b><span>${this.escape(i.name)}</span>${i.note ? `<em>${this.escape(i.note)}</em>` : ''}<strong>${this.format(i.value)}</strong></div>`).join('')}</div>`;
  }

  metric(label, value) { return `<article><span>${this.escape(label)}</span><strong>${this.format(value)}</strong></article>`; }
  bar(label, value, total) { const pct = total ? Math.round((value / total) * 100) : 0; return `<div class="insight-bar"><div><span>${this.escape(label)}</span><strong>${pct}%</strong></div><i><b style="width:${pct}%"></b></i></div>`; }

  recommendations(houses, assignees) {
    const recs = [];
    const needCall = this.count(r => r.phone_status === 'need-call');
    const unassigned = this.count(r => !this.isAssigned(r));
    const notVisited = this.count(r => r.d2d_status === 'not-visited');
    if (needCall) recs.push(`${this.format(needCall)} residents still need calls. Prioritize call team.`);
    if (unassigned) recs.push(`${this.format(unassigned)} residents are still unassigned. Assign these before field work.`);
    if (notVisited) recs.push(`${this.format(notVisited)} residents are not visited. D2D team should focus on high workload houses.`);
    if (houses[0]) recs.push(`${houses[0].house} has the highest workload with ${this.format(houses[0].score)} pending actions.`);
    if (assignees[0]) recs.push(`${assignees[0].name} has the most assignments with ${this.format(assignees[0].count)} residents.`);
    return recs.length ? recs : ['Campaign data looks clean. Continue monitoring all sections.'];
  }

  houseWorkload() {
    const map = {};
    this.allRows.forEach(r => {
      const house = this.clean(r.house) || 'Unknown';
      if (!map[house]) map[house] = { house, needCall: 0, notVisited: 0, unassigned: 0, pending: 0, score: 0 };
      const x = map[house];
      if (r.phone_status === 'need-call') x.needCall++;
      if (r.d2d_status === 'not-visited') x.notVisited++;
      if (!this.isAssigned(r)) x.unassigned++;
      if (r.vote_status === 'pending') x.pending++;
      x.score = x.needCall + x.notVisited + x.unassigned + x.pending;
    });
    return Object.values(map).sort((a, b) => b.score - a.score || a.house.localeCompare(b.house));
  }

  assigneeList() {
    const out = {};
    this.allRows.forEach(r => this.splitNames(r.vote_assigned_by).forEach(n => { out[n] = (out[n] || 0) + 1; }));
    return Object.entries(out).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async createShare(kind) {
    if (!this.client) return;
    const source = this.currentRows.length ? this.currentRows : this.baseRowsForMode();
    if (!source.length) { this.setStatus('No residents to share.', true); return; }
    const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
    const payload = source.map(r => ({ row_id: r.id, id: r.national_id || '', national_id: r.national_id || '', name: r.name || '', house: r.house || '', mobile: r.phone || '', phone: r.phone || '', photo: r.photo_url || '', photo_url: r.photo_url || '', party: r.party || '', assigned_by: r.vote_assigned_by || '', vote_assigned_by: r.vote_assigned_by || '', assigned_names: this.splitNames(r.vote_assigned_by).join(', '), assigned_count: this.splitNames(r.vote_assigned_by).length }));
    this.setStatus(`Creating ${kind === 'safe' ? 'read-only' : 'assign'} link for ${this.format(source.length)} residents...`);
    const res = await this.client.from('assignment_shares').insert({ token, payload }).select('token').single();
    if (res.error) { this.setStatus('Create link failed: ' + res.error.message, true); return; }
    const base = location.href.split('/residents.html')[0] + '/';
    const url = base + (kind === 'safe' ? 'safe-share.html?s=' : 'shared.html?s=') + encodeURIComponent(token);
    const box = document.getElementById('shareLinkBox');
    if (box) box.value = url;
    try { await navigator.clipboard.writeText(url); } catch {}
    this.setStatus(`Created ${kind === 'safe' ? 'read-only' : 'assign'} link for ${this.format(source.length)} residents. Link copied.`);
  }

  copyShareLink() {
    const box = document.getElementById('shareLinkBox');
    if (!box || !box.value) { this.setStatus('No link created yet.', true); return; }
    box.select();
    navigator.clipboard?.writeText(box.value);
    this.setStatus('Copied link.');
  }

  installModal() {
    if (document.getElementById('appv2Modal')) return;
    const modal = document.createElement('section');
    modal.id = 'appv2Modal';
    modal.className = 'appv2-modal';
    modal.innerHTML = `
      <article class="appv2-modal-card">
        <div class="appv2-modal-head"><div><h2 id="modalName">Update resident</h2><p id="modalMeta"></p></div><button id="modalClose" class="btn" type="button">Close</button></div>
        <form id="modalForm" class="appv2-form">
          <label data-field="vote">Vote Status<select id="modalVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label>
          <label data-field="phone">Phone Status<select id="modalPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label>
          <label data-field="reach">Reach Status<select id="modalReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label>
          <label data-field="d2d">D2D Status<select id="modalD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label>
          <label data-field="transport">Transport Status<select id="modalTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label>
          <label data-field="support">Support Level<select id="modalSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label>
          <label data-field="assigned">Assigned By<input id="modalAssigned" type="text" placeholder="Name or comma separated names"></label>
          <label data-field="remarks">Remarks<textarea id="modalRemarks" placeholder="Write remarks"></textarea></label>
          <div class="appv2-actions"><button class="btn active" type="submit">Save Update</button><button id="modalCancel" class="btn" type="button">Cancel</button></div>
        </form>
      </article>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) this.closeEditor(); });
    document.getElementById('modalClose').onclick = () => this.closeEditor();
    document.getElementById('modalCancel').onclick = () => this.closeEditor();
    document.getElementById('modalForm').onsubmit = e => this.saveEditor(e);
  }

  openEditor(row) {
    this.currentResident = row;
    document.getElementById('modalName').textContent = row.name || 'Update resident';
    document.getElementById('modalMeta').textContent = `${row.house || '-'} · ${row.phone || 'No phone'}`;
    this.setValue('modalVote', row.vote_status || 'pending');
    this.setValue('modalPhone', row.phone_status || 'need-call');
    this.setValue('modalReach', row.reach_status || 'not-reached');
    this.setValue('modalD2D', row.d2d_status || 'not-visited');
    this.setValue('modalTransport', row.transport_status || 'not-needed');
    this.setValue('modalSupport', row.support_level || 'normal');
    this.setValue('modalAssigned', row.vote_assigned_by || '');
    this.setValue('modalRemarks', row.remarks || '');
    this.applySectionFields();
    document.getElementById('appv2Modal').classList.add('open');
  }

  applySectionFields() {
    const fields = {
      assign: ['assigned', 'remarks'],
      calls: ['phone', 'reach', 'remarks'],
      votes: ['vote', 'support', 'transport', 'remarks'],
      visits: ['d2d', 'remarks'],
      transport: ['transport', 'remarks'],
      voters: ['vote', 'phone', 'reach', 'd2d', 'transport', 'support', 'assigned', 'remarks']
    }[this.section] || ['remarks'];
    document.querySelectorAll('#modalForm [data-field]').forEach(label => {
      const show = fields.includes(label.dataset.field);
      label.style.display = show ? '' : 'none';
      label.querySelectorAll('input,select,textarea').forEach(el => { el.disabled = !show; });
    });
  }

  async saveEditor(e) {
    e.preventDefault();
    if (!this.currentResident || !this.client) return;
    const patch = { remarks: this.getValue('modalRemarks') };
    if (this.section === 'assign' || this.section === 'voters') { const assigned = this.getValue('modalAssigned'); patch.vote_assigned_by = assigned || null; patch.vote_assigned_at = assigned ? new Date().toISOString() : null; }
    if (this.section === 'calls' || this.section === 'voters') { patch.phone_status = this.getValue('modalPhone'); patch.reach_status = this.getValue('modalReach'); }
    if (this.section === 'votes' || this.section === 'voters') { patch.vote_status = this.getValue('modalVote'); patch.support_level = this.getValue('modalSupport'); patch.transport_status = this.getValue('modalTransport'); }
    if (this.section === 'visits' || this.section === 'voters') patch.d2d_status = this.getValue('modalD2D');
    if (this.section === 'transport') patch.transport_status = this.getValue('modalTransport');
    if (patch.vote_status === 'will-vote' || patch.vote_status === 'no-vote' || patch.support_level === 'guaranteed' || patch.phone_status === 'called') patch.reach_status = 'reached';
    const res = await this.client.from('campaign').update(patch).eq('id', this.currentResident.id).select().single();
    if (res.error) { alert('Save failed: ' + res.error.message); return; }
    this.allRows = this.allRows.map(r => String(r.id) === String(this.currentResident.id) ? Object.assign({}, r, res.data || patch) : r);
    this.closeEditor();
    this.renderTopCards();
    this.renderControls();
    this.showMode(this.currentMode || 'all');
  }

  closeEditor() { document.getElementById('appv2Modal')?.classList.remove('open'); this.currentResident = null; }

  count(fn) { return this.allRows.filter(fn).length; }
  isAssigned(row) { return !!this.clean(row.vote_assigned_by); }
  splitNames(value) { return Array.from(new Set(String(value || '').split(',').map(v => v.trim()).filter(Boolean).filter(v => v.toLowerCase() !== 'naappe@gmail.com'))); }
  clean(value) { return String(value || '').trim(); }
  format(n) { return Number(n || 0).toLocaleString('en-US'); }
  label(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  escape(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
  escapeAttr(value) { return this.escape(value).replace(/`/g, '&#96;'); }
  setStatus(text, error) { const el = document.getElementById('status'); if (el) { el.textContent = text || ''; el.className = error ? 'status error' : 'status'; } }
  setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
  getValue(id) { return this.clean(document.getElementById(id)?.value); }

  installStyles() {
    if (document.getElementById('residentsAppV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'residentsAppV2Styles';
    style.textContent = `
      .page{width:min(1180px,calc(100% - 28px));margin:22px auto}.appv2-stats{grid-template-columns:repeat(5,1fr)!important}.appv2-stat{cursor:pointer}.appv2-stat:hover{border-color:#93c5fd;box-shadow:0 18px 42px rgba(15,23,42,.1)}.appv2-controls-panel{display:grid;gap:12px}.appv2-search-grid{display:grid;grid-template-columns:1.2fr .8fr auto;gap:10px;align-items:end}.appv2-assign-dashboard{background:#f8fbff;border:1px solid #dbe4f0;border-radius:18px;padding:14px}.assign-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.assignee-select-panel{margin-top:10px}.assignee-select-panel select{width:100%;height:46px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font:inherit;font-weight:850;background:#fff}.appv2-share-details{border:1px solid #dbe4f0;border-radius:16px;background:#f8fafc;overflow:hidden}.appv2-share-details summary{padding:12px 14px;font-weight:950;color:#1f3b66;cursor:pointer}.share-tools{display:grid;gap:10px;padding:12px;border-top:1px solid #dbe4f0;background:#fff}.share-row{display:flex;gap:8px;flex-wrap:wrap}.share-tools textarea{width:100%;min-height:62px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.appv2-card-list .resident-card{cursor:pointer}.resident-card:hover{border-color:#93c5fd;box-shadow:0 14px 30px rgba(15,23,42,.1)}.assigned-visible-line{margin:0 0 10px;padding:8px 10px;border-radius:12px;font-size:12px;font-weight:900;border:1px solid #dbe4f0;background:#f8fafc;color:#334155}.assigned-visible-line.assigned-ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.assigned-visible-line.assigned-empty{background:#f8fafc;color:#64748b}.appv2-modal{position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:999;display:none;align-items:end;justify-content:center;padding:12px}.appv2-modal.open{display:flex}.appv2-modal-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(15,23,42,.24)}.appv2-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.appv2-modal-head h2{margin:0;font-size:22px}.appv2-modal-head p{margin:7px 0 0;color:#64748b;font-weight:800}.appv2-form{display:grid;gap:10px}.appv2-form label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.appv2-form input,.appv2-form select,.appv2-form textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.appv2-form textarea{min-height:88px}.appv2-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.insights-dashboard{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}.insight-section{background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:16px;box-shadow:0 14px 38px rgba(15,23,42,.06)}.insight-section.wide{grid-column:1/-1}.insight-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:14px}.insight-head h3{margin:0;font-size:22px}.mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.mini-grid article,.status-list div,.rank-list div{border:1px solid #dbe4f0;border-radius:13px;padding:10px;background:#f8fafc}.mini-grid span,.status-list span{display:block;color:#52627a;text-transform:uppercase;font-size:10px;font-weight:950}.mini-grid strong,.status-list strong{font-size:22px}.insight-bar{display:grid;gap:7px;margin:11px 0}.insight-bar div{display:flex;justify-content:space-between;font-weight:950}.insight-bar i{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}.insight-bar b{display:block;height:100%;background:#1f3b66}.status-list,.rank-list{display:grid;gap:8px}.rank-list div{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px}.rank-list b{width:28px;height:28px;border-radius:999px;background:#1f3b66;color:#fff;display:grid;place-items:center}.rank-list em{font-style:normal;color:#64748b;font-size:12px;font-weight:800}.recommendations li{margin:8px 0;font-weight:850;line-height:1.45}@media(max-width:850px){.topbar{align-items:flex-start;flex-direction:column}.nav{width:100%;overflow-x:auto}.page{margin:16px auto}.hero{align-items:flex-start;flex-direction:column}.appv2-stats{grid-template-columns:repeat(2,1fr)!important}.appv2-search-grid{grid-template-columns:1fr}.list{grid-template-columns:1fr}.resident-card{grid-template-columns:76px 1fr!important}.photo{width:76px!important;height:76px!important}.share-row{display:grid;grid-template-columns:1fr}.insights-dashboard{grid-template-columns:1fr!important}.mini-grid{grid-template-columns:repeat(2,1fr)}.rank-list div{grid-template-columns:28px 1fr auto}.appv2-modal{align-items:center}.nav .btn{min-width:max-content}}
    `;
    document.head.appendChild(style);
  }
}
