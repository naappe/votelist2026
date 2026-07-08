(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = ((params.get('section') || 'voters').toLowerCase() === 'residents') ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  let rows = [];

  const sectionTitles = {
    voters: 'Residents Result',
    assign: 'Assign Result',
    calls: 'Calls Result',
    votes: 'Votes Result',
    visits: 'Visits Result',
    transport: 'Transport Result',
    insights: 'Insights Result'
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    installStyles();
    await loadRows();
    renderSectionCards();
    renderSectionSummary();
  }

  async function loadRows() {
    try {
      const cfg = window.APP_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) return;
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at,area')
        .limit(5000);
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query;
      if (res.error) throw res.error;
      rows = res.data || [];
    } catch (error) {
      console.warn('Section result cards could not load Supabase rows', error);
    }
  }

  function renderSectionCards() {
    const stats = document.querySelector('.stats');
    if (!stats || !rows.length) return;

    const cards = getCardsForSection();
    stats.classList.add('section-result-cards');
    stats.innerHTML = cards.map(card => `
      <article class="stat section-result-card ${card.color || ''}" data-section-filter="${escapeAttr(card.filter || '')}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${Number(card.count || 0).toLocaleString('en-US')}</strong>
        ${card.note ? `<em>${escapeHtml(card.note)}</em>` : ''}
      </article>
    `).join('');

    stats.querySelectorAll('[data-section-filter]').forEach(card => {
      card.onclick = () => applySectionFilter(card.dataset.sectionFilter || '');
    });
  }

  function getCardsForSection() {
    const assignedRows = rows.filter(isAssigned);
    const unassignedRows = rows.filter(r => !isAssigned(r));
    const assigneeMap = assigneeCounts(rows);
    const assigneeCount = Object.keys(assigneeMap).length;

    if (section === 'assign') {
      return [
        { label: 'Total Residents', count: rows.length, filter: 'all' },
        { label: 'Assigned', count: assignedRows.length, filter: 'assigned', color: 'green' },
        { label: 'Unassigned', count: unassignedRows.length, filter: 'unassigned', color: 'orange' },
        { label: 'Assigned People', count: assigneeCount, filter: 'assignees' },
        { label: 'Need Assignment', count: unassignedRows.length, filter: 'unassigned', color: 'red' }
      ];
    }

    if (section === 'calls') {
      return [
        { label: 'Need Call', count: rows.filter(r => r.phone_status === 'need-call').length, filter: 'need-call', color: 'red' },
        { label: 'Called', count: rows.filter(r => r.phone_status === 'called').length, filter: 'called', color: 'green' },
        { label: 'Wrong Number', count: rows.filter(r => r.phone_status === 'wrong-number').length, filter: 'wrong-number', color: 'orange' },
        { label: 'No Phone', count: rows.filter(r => r.phone_status === 'no-phone' || !clean(r.phone)).length, filter: 'no-phone' },
        { label: 'Out Of Range', count: rows.filter(r => r.phone_status === 'out-of-range').length, filter: 'out-of-range' }
      ];
    }

    if (section === 'votes') {
      return [
        { label: 'Will Vote', count: rows.filter(r => r.vote_status === 'will-vote').length, filter: 'will-vote', color: 'green' },
        { label: 'Pending', count: rows.filter(r => r.vote_status === 'pending').length, filter: 'pending', color: 'orange' },
        { label: 'No Vote', count: rows.filter(r => ['no-vote','not-vote'].includes(r.vote_status)).length, filter: 'no-vote', color: 'red' },
        { label: 'Guaranteed', count: rows.filter(r => r.support_level === 'guaranteed').length, filter: 'guaranteed', color: 'green' },
        { label: 'Need Transport', count: rows.filter(r => r.transport_status === 'need-transport').length, filter: 'need-transport' }
      ];
    }

    if (section === 'visits') {
      return [
        { label: 'Not Visited', count: rows.filter(r => r.d2d_status === 'not-visited').length, filter: 'not-visited', color: 'red' },
        { label: 'Visited', count: rows.filter(r => r.d2d_status === 'visited').length, filter: 'visited', color: 'green' },
        { label: 'Follow-up', count: rows.filter(r => r.d2d_status === 'follow-up').length, filter: 'follow-up', color: 'orange' },
        { label: 'Not Home', count: rows.filter(r => r.d2d_status === 'not-home').length, filter: 'not-home' },
        { label: 'Need Visit', count: rows.filter(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up').length, filter: 'need-visit' }
      ];
    }

    if (section === 'transport') {
      return [
        { label: 'Need Transport', count: rows.filter(r => r.transport_status === 'need-transport').length, filter: 'need-transport', color: 'red' },
        { label: 'Arranged', count: rows.filter(r => r.transport_status === 'arranged').length, filter: 'arranged', color: 'orange' },
        { label: 'Picked Up', count: rows.filter(r => r.transport_status === 'picked-up').length, filter: 'picked-up', color: 'green' },
        { label: 'Not Needed', count: rows.filter(r => r.transport_status === 'not-needed').length, filter: 'not-needed' },
        { label: 'Total Residents', count: rows.length, filter: 'all' }
      ];
    }

    if (section === 'insights') {
      return [
        { label: 'Total Residents', count: rows.length, filter: 'all' },
        { label: 'Assigned', count: assignedRows.length, filter: 'assigned', color: 'green' },
        { label: 'Will Vote', count: rows.filter(r => r.vote_status === 'will-vote').length, filter: 'will-vote', color: 'green' },
        { label: 'Need Call', count: rows.filter(r => r.phone_status === 'need-call').length, filter: 'need-call', color: 'red' },
        { label: 'No Phone', count: rows.filter(r => r.phone_status === 'no-phone' || !clean(r.phone)).length, filter: 'no-phone' }
      ];
    }

    return [
      { label: 'Total Residents', count: rows.length, filter: 'all' },
      { label: 'Will Vote', count: rows.filter(r => r.vote_status === 'will-vote').length, filter: 'will-vote', color: 'green' },
      { label: 'Pending', count: rows.filter(r => r.vote_status === 'pending').length, filter: 'pending', color: 'orange' },
      { label: 'Need Call', count: rows.filter(r => r.phone_status === 'need-call').length, filter: 'need-call', color: 'red' },
      { label: 'Assigned', count: assignedRows.length, filter: 'assigned' }
    ];
  }

  function renderSectionSummary() {
    if (!rows.length) return;
    const searchPanel = document.querySelector('.panel');
    if (!searchPanel) return;
    let panel = document.getElementById('sectionResultSummary');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'sectionResultSummary';
      panel.className = 'panel section-result-summary';
      searchPanel.insertAdjacentElement('afterend', panel);
    }

    if (section === 'assign') {
      const assignees = Object.entries(assigneeCounts(rows)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
      panel.innerHTML = `
        <div class="panel-head"><h2>Assign Result</h2><span class="pill">${rows.filter(isAssigned).length.toLocaleString()} assigned</span></div>
        <div class="result-summary-note">Click a name to show that person's assigned residents.</div>
        <div class="assignee-grid">
          ${assignees.length ? assignees.map(([name,count])=>`<button class="assignee-chip" type="button" data-assignee="${escapeAttr(name)}"><strong>${escapeHtml(name)}</strong><span>${count.toLocaleString()}</span></button>`).join('') : '<div class="empty-mini">No assigned people yet.</div>'}
        </div>
      `;
      panel.querySelectorAll('[data-assignee]').forEach(btn => btn.onclick = () => showAssignee(btn.dataset.assignee));
      return;
    }

    panel.innerHTML = `
      <div class="panel-head"><h2>${escapeHtml(sectionTitles[section] || 'Result')}</h2><span class="pill">${rows.length.toLocaleString()} total</span></div>
      <div class="result-summary-note">Use the cards above to filter this section.</div>
    `;
  }

  function applySectionFilter(filter) {
    let filtered = rows.slice();
    if (filter === 'assigned') filtered = rows.filter(isAssigned);
    if (filter === 'unassigned') filtered = rows.filter(r => !isAssigned(r));
    if (filter === 'will-vote') filtered = rows.filter(r => r.vote_status === 'will-vote');
    if (filter === 'pending') filtered = rows.filter(r => r.vote_status === 'pending');
    if (filter === 'no-vote') filtered = rows.filter(r => ['no-vote','not-vote'].includes(r.vote_status));
    if (filter === 'guaranteed') filtered = rows.filter(r => r.support_level === 'guaranteed');
    if (filter === 'need-call') filtered = rows.filter(r => r.phone_status === 'need-call');
    if (filter === 'called') filtered = rows.filter(r => r.phone_status === 'called');
    if (filter === 'wrong-number') filtered = rows.filter(r => r.phone_status === 'wrong-number');
    if (filter === 'no-phone') filtered = rows.filter(r => r.phone_status === 'no-phone' || !clean(r.phone));
    if (filter === 'out-of-range') filtered = rows.filter(r => r.phone_status === 'out-of-range');
    if (filter === 'not-visited') filtered = rows.filter(r => r.d2d_status === 'not-visited');
    if (filter === 'visited') filtered = rows.filter(r => r.d2d_status === 'visited');
    if (filter === 'follow-up') filtered = rows.filter(r => r.d2d_status === 'follow-up');
    if (filter === 'not-home') filtered = rows.filter(r => r.d2d_status === 'not-home');
    if (filter === 'need-visit') filtered = rows.filter(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up');
    if (filter === 'need-transport') filtered = rows.filter(r => r.transport_status === 'need-transport');
    if (filter === 'arranged') filtered = rows.filter(r => r.transport_status === 'arranged');
    if (filter === 'picked-up') filtered = rows.filter(r => r.transport_status === 'picked-up');
    if (filter === 'not-needed') filtered = rows.filter(r => r.transport_status === 'not-needed');
    if (filter === 'assignees') {
      document.getElementById('sectionResultSummary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    renderCards(filtered, labelForFilter(filter));
  }

  function showAssignee(name) {
    const wanted = clean(name).toLowerCase();
    renderCards(rows.filter(r => splitNames(r.vote_assigned_by).some(n => n.toLowerCase() === wanted)), `Assigned to ${name}`);
  }

  function renderCards(data, title) {
    const list = document.getElementById('list');
    if (!list) return;
    const panelTitle = document.querySelector('.panel-head h2');
    const total = document.getElementById('sectionTotal');
    if (panelTitle) panelTitle.textContent = title || 'Result';
    if (total) total.textContent = `${data.length.toLocaleString()} residents`;
    if (!data.length) {
      list.innerHTML = '<div class="empty">No residents found for this result.</div>';
      return;
    }
    list.innerHTML = data.map(cardHtml).join('');
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cardHtml(r) {
    return `
      <article class="resident-card">
        <div class="photo">${r.photo_url ? `<img src="${escapeAttr(r.photo_url)}" alt="">` : `<div class="ph">${escapeHtml(String(r.name || '?').slice(0,1))}</div>`}</div>
        <div class="info">
          <h3>${escapeHtml(r.name || 'Unknown')}</h3>
          <p>${escapeHtml(r.house || '-')} · Box ${escapeHtml(r.election_box || '-')} · ${escapeHtml(r.phone || 'No phone')}</p>
          <div class="assigned-visible-line ${isAssigned(r) ? 'assigned-ok' : 'assigned-empty'}"><strong>Assigned:</strong> ${escapeHtml(r.vote_assigned_by || 'Not assigned')}</div>
          <div class="chips">
            <span>${escapeHtml(r.party || '-')}</span>
            <span>${escapeHtml(r.vote_status || 'pending')}</span>
            <span>${escapeHtml(r.phone_status || 'need-call')}</span>
            <span>${escapeHtml(r.reach_status || 'not-reached')}</span>
            <span>${escapeHtml(r.d2d_status || 'not-visited')}</span>
            <span>${escapeHtml(r.transport_status || 'not-needed')}</span>
          </div>
        </div>
      </article>
    `;
  }

  function assigneeCounts(source) {
    const out = {};
    source.filter(isAssigned).forEach(row => splitNames(row.vote_assigned_by).forEach(name => { out[name] = (out[name] || 0) + 1; }));
    return out;
  }

  function splitNames(value) {
    return Array.from(new Set(String(value || '').split(',').map(clean).filter(Boolean).filter(name => name.toLowerCase() !== 'naappe@gmail.com')));
  }

  function isAssigned(row) { return !!clean(row.vote_assigned_by); }
  function clean(value) { return String(value || '').trim(); }
  function labelForFilter(filter) { return String(filter || 'All').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

  function installStyles() {
    if (document.getElementById('sectionResultCardStyles')) return;
    const style = document.createElement('style');
    style.id = 'sectionResultCardStyles';
    style.textContent = `
      .section-result-cards{grid-template-columns:repeat(5,1fr)!important}
      .section-result-card{cursor:pointer;transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease}
      .section-result-card:hover{transform:translateY(-1px);border-color:#93c5fd;box-shadow:0 18px 42px rgba(15,23,42,.11)}
      .section-result-card em{display:block;margin-top:6px;color:#64748b;font-style:normal;font-size:11px;font-weight:900}
      .section-result-summary{border-color:#bfdbfe!important;background:#f8fbff!important}
      .result-summary-note{font-weight:850;color:#52627a;margin-bottom:12px}
      .assignee-grid{display:flex;flex-wrap:wrap;gap:8px}
      .assignee-chip{display:inline-flex;align-items:center;gap:9px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:999px;padding:8px 12px;font:inherit;font-weight:950;cursor:pointer}
      .assignee-chip span{background:#1f3b66;color:#fff;border-radius:999px;padding:3px 8px;font-size:11px}
      .assigned-visible-line{margin:0 0 10px;padding:8px 10px;border-radius:12px;font-size:12px;font-weight:900;border:1px solid #dbe4f0;background:#f8fafc;color:#334155}
      .assigned-visible-line strong{color:#0f172a}
      .assigned-visible-line.assigned-ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}
      .assigned-visible-line.assigned-empty{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
      .empty-mini{font-weight:900;color:#64748b;padding:10px}
      @media(max-width:900px){.section-result-cards{grid-template-columns:repeat(2,1fr)!important}.section-result-card strong{font-size:24px}.assignee-chip{padding:7px 10px}.assigned-visible-line{font-size:11px;padding:7px 8px;margin-bottom:8px}}
    `;
    document.head.appendChild(style);
  }
})();