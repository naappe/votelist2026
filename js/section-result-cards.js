(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const rawSection = (params.get('section') || 'voters').toLowerCase();
  const section = rawSection === 'residents' ? 'voters' : rawSection;
  let rows = [];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    installStyles();
    await loadRows();
    if (!rows.length) return;
    renderSectionCards();
    renderSectionSummary();
    normalizeDefaultList();
  }

  async function loadRows() {
    try {
      const cfg = window.APP_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) return;
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at,area')
        .order('house', { ascending: true })
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
    const stats = document.getElementById('sectionResultCards') || document.querySelector('.stats');
    if (!stats) return;
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
      card.onclick = () => applySectionFilter(card.dataset.sectionFilter || 'all');
    });
  }

  function getCardsForSection() {
    const assigned = rows.filter(isAssigned);
    const unassigned = rows.filter(r => !isAssigned(r));
    const assigneeCount = Object.keys(assigneeCounts(rows)).length;

    if (section === 'assign') {
      return [
        { label: 'Total Residents', count: rows.length, filter: 'all' },
        { label: 'Assigned', count: assigned.length, filter: 'assigned', color: 'green' },
        { label: 'Unassigned', count: unassigned.length, filter: 'unassigned', color: 'orange' },
        { label: 'Assigned People', count: assigneeCount, filter: 'assignees' },
        { label: 'Need Assignment', count: unassigned.length, filter: 'unassigned', color: 'red' }
      ];
    }

    if (section === 'calls') {
      return [
        { label: 'Need Call', count: count(r => r.phone_status === 'need-call'), filter: 'need-call', color: 'red' },
        { label: 'Called', count: count(r => r.phone_status === 'called'), filter: 'called', color: 'green' },
        { label: 'Wrong Number', count: count(r => r.phone_status === 'wrong-number'), filter: 'wrong-number', color: 'orange' },
        { label: 'No Phone', count: count(r => r.phone_status === 'no-phone' || !clean(r.phone)), filter: 'no-phone' },
        { label: 'Out Of Range', count: count(r => r.phone_status === 'out-of-range'), filter: 'out-of-range' }
      ];
    }

    if (section === 'votes') {
      return [
        { label: 'Will Vote', count: count(r => r.vote_status === 'will-vote'), filter: 'will-vote', color: 'green' },
        { label: 'Pending', count: count(r => r.vote_status === 'pending'), filter: 'pending', color: 'orange' },
        { label: 'No Vote', count: count(r => ['no-vote','not-vote'].includes(r.vote_status)), filter: 'no-vote', color: 'red' },
        { label: 'Guaranteed', count: count(r => r.support_level === 'guaranteed'), filter: 'guaranteed', color: 'green' },
        { label: 'Need Transport', count: count(r => r.transport_status === 'need-transport'), filter: 'need-transport' }
      ];
    }

    if (section === 'visits') {
      return [
        { label: 'Not Visited', count: count(r => r.d2d_status === 'not-visited'), filter: 'not-visited', color: 'red' },
        { label: 'Visited', count: count(r => r.d2d_status === 'visited'), filter: 'visited', color: 'green' },
        { label: 'Follow-up', count: count(r => r.d2d_status === 'follow-up'), filter: 'follow-up', color: 'orange' },
        { label: 'Not Home', count: count(r => r.d2d_status === 'not-home'), filter: 'not-home' },
        { label: 'Need Visit', count: count(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up'), filter: 'need-visit' }
      ];
    }

    if (section === 'transport') {
      return [
        { label: 'Need Transport', count: count(r => r.transport_status === 'need-transport'), filter: 'need-transport', color: 'red' },
        { label: 'Arranged', count: count(r => r.transport_status === 'arranged'), filter: 'arranged', color: 'orange' },
        { label: 'Picked Up', count: count(r => r.transport_status === 'picked-up'), filter: 'picked-up', color: 'green' },
        { label: 'Not Needed', count: count(r => r.transport_status === 'not-needed'), filter: 'not-needed' },
        { label: 'Total Residents', count: rows.length, filter: 'all' }
      ];
    }

    return [
      { label: 'Total Residents', count: rows.length, filter: 'all' },
      { label: 'Will Vote', count: count(r => r.vote_status === 'will-vote'), filter: 'will-vote', color: 'green' },
      { label: 'Pending', count: count(r => r.vote_status === 'pending'), filter: 'pending', color: 'orange' },
      { label: 'Need Call', count: count(r => r.phone_status === 'need-call'), filter: 'need-call', color: 'red' },
      { label: 'Assigned', count: assigned.length, filter: 'assigned' }
    ];
  }

  function renderSectionSummary() {
    const searchPanel = getSearchPanel();
    if (!searchPanel) return;
    let panel = document.getElementById('sectionResultSummary');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'sectionResultSummary';
      panel.className = 'panel section-result-summary';
      searchPanel.insertAdjacentElement('afterend', panel);
    }

    if (section === 'assign') {
      const assigned = rows.filter(isAssigned);
      const unassigned = rows.filter(r => !isAssigned(r));
      const assignees = Object.entries(assigneeCounts(rows)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
      panel.innerHTML = `
        <div class="panel-head">
          <h2>Assign Dashboard</h2>
          <span class="pill">${assigned.length.toLocaleString()} assigned / ${unassigned.length.toLocaleString()} unassigned</span>
        </div>
        <div class="assign-actions">
          <button type="button" class="btn active" data-section-filter="unassigned">Show Unassigned</button>
          <button type="button" class="btn" data-section-filter="assigned">Show Assigned</button>
          <button type="button" class="btn" data-section-filter="all">Show All</button>
        </div>
        <div class="result-summary-note">Who is assigned. Click a name to show that person's assigned residents.</div>
        <div class="assignee-grid">
          ${assignees.length ? assignees.map(([name,count])=>`<button class="assignee-chip" type="button" data-assignee="${escapeAttr(name)}"><strong>${escapeHtml(name)}</strong><span>${count.toLocaleString()}</span></button>`).join('') : '<div class="empty-mini">No assigned people yet.</div>'}
        </div>
      `;
      panel.querySelectorAll('[data-section-filter]').forEach(btn => btn.onclick = () => applySectionFilter(btn.dataset.sectionFilter || 'all'));
      panel.querySelectorAll('[data-assignee]').forEach(btn => btn.onclick = () => showAssignee(btn.dataset.assignee));
      return;
    }

    panel.innerHTML = `
      <div class="panel-head"><h2>${escapeHtml(titleForSection())}</h2><span class="pill">${rows.length.toLocaleString()} total</span></div>
      <div class="result-summary-note">Use the result cards above to filter this section.</div>
    `;
  }

  function normalizeDefaultList() {
    if (section !== 'assign') return;
    setListTitle('Unassigned Residents', `${rows.filter(r => !isAssigned(r)).length.toLocaleString()} unassigned residents`);
    const status = document.getElementById('status');
    const assigned = rows.filter(isAssigned).length;
    const unassigned = rows.length - assigned;
    if (status) status.textContent = `Loaded ${unassigned.toLocaleString()} unassigned residents from ${rows.length.toLocaleString()} total. ${assigned.toLocaleString()} already assigned.`;
    addAssignedLineToNativeCards();
  }

  function applySectionFilter(filter) {
    if (filter === 'assignees') {
      document.getElementById('sectionResultSummary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    let data = rows.slice();
    let title = labelForFilter(filter);
    let pill = `${data.length.toLocaleString()} residents`;

    if (section === 'assign' && filter === 'unassigned') {
      data = rows.filter(r => !isAssigned(r));
      title = 'Unassigned Residents';
      pill = `${data.length.toLocaleString()} unassigned residents`;
      renderNativeLikeCards(data, title, pill);
      return;
    }
    if (section === 'assign' && filter === 'assigned') {
      data = rows.filter(isAssigned);
      title = 'Assigned Residents';
      pill = `${data.length.toLocaleString()} assigned residents`;
      renderNativeLikeCards(data, title, pill, true);
      return;
    }

    data = filterRows(filter, data);
    if (filter === 'all') title = section === 'assign' ? 'All Residents' : titleForSection();
    pill = `${data.length.toLocaleString()} residents`;
    renderNativeLikeCards(data, title, pill, filter !== 'unassigned');
  }

  function showAssignee(name) {
    const wanted = clean(name).toLowerCase();
    const data = rows.filter(r => splitNames(r.vote_assigned_by).some(n => n.toLowerCase() === wanted));
    renderNativeLikeCards(data, `Assigned to ${name}`, `${data.length.toLocaleString()} residents assigned to ${name}`, true, true);
  }

  function filterRows(filter, source) {
    let data = source.slice();
    if (filter === 'assigned') data = source.filter(isAssigned);
    if (filter === 'will-vote') data = source.filter(r => r.vote_status === 'will-vote');
    if (filter === 'pending') data = source.filter(r => r.vote_status === 'pending');
    if (filter === 'no-vote') data = source.filter(r => ['no-vote','not-vote'].includes(r.vote_status));
    if (filter === 'guaranteed') data = source.filter(r => r.support_level === 'guaranteed');
    if (filter === 'need-call') data = source.filter(r => r.phone_status === 'need-call');
    if (filter === 'called') data = source.filter(r => r.phone_status === 'called');
    if (filter === 'wrong-number') data = source.filter(r => r.phone_status === 'wrong-number');
    if (filter === 'no-phone') data = source.filter(r => r.phone_status === 'no-phone' || !clean(r.phone));
    if (filter === 'out-of-range') data = source.filter(r => r.phone_status === 'out-of-range');
    if (filter === 'not-visited') data = source.filter(r => r.d2d_status === 'not-visited');
    if (filter === 'visited') data = source.filter(r => r.d2d_status === 'visited');
    if (filter === 'follow-up') data = source.filter(r => r.d2d_status === 'follow-up');
    if (filter === 'not-home') data = source.filter(r => r.d2d_status === 'not-home');
    if (filter === 'need-visit') data = source.filter(r => r.d2d_status === 'not-visited' || r.d2d_status === 'follow-up');
    if (filter === 'need-transport') data = source.filter(r => r.transport_status === 'need-transport');
    if (filter === 'arranged') data = source.filter(r => r.transport_status === 'arranged');
    if (filter === 'picked-up') data = source.filter(r => r.transport_status === 'picked-up');
    if (filter === 'not-needed') data = source.filter(r => r.transport_status === 'not-needed');
    return data;
  }

  function renderNativeLikeCards(data, title, pill, showBack) {
    const list = document.getElementById('list');
    if (!list) return;
    setListTitle(title, pill);
    const header = getListPanel()?.querySelector('.panel-head');
    let actions = document.getElementById('assignViewActions');
    if (showBack && header && !actions) {
      actions = document.createElement('div');
      actions.id = 'assignViewActions';
      actions.className = 'assign-view-actions';
      actions.innerHTML = '<button class="btn" type="button" id="backToUnassignedBtn">Back to Unassigned</button>';
      header.appendChild(actions);
      actions.querySelector('button').onclick = () => applySectionFilter('unassigned');
    }
    if (!showBack && actions) actions.remove();

    if (!data.length) {
      list.innerHTML = '<div class="empty">No residents found for this result.</div>';
      return;
    }
    list.innerHTML = data.map(cardHtml).join('');
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cardHtml(r) {
    return `
      <article class="resident-card result-mode-card">
        <div class="photo">${r.photo_url ? `<img src="${escapeAttr(r.photo_url)}" alt="">` : `<div class="ph">${escapeHtml(String(r.name || '?').slice(0,1))}</div>`}</div>
        <div class="info">
          <h3>${escapeHtml(r.name || 'Unknown')}</h3>
          <p>${escapeHtml(r.house || '-')} · Box ${escapeHtml(r.election_box || '-')} · ${escapeHtml(r.phone || 'No phone')}</p>
          <div class="assigned-visible-line ${isAssigned(r) ? 'assigned-ok' : 'assigned-empty'}"><strong>Assignment:</strong> ${escapeHtml(r.vote_assigned_by || 'Not assigned')}</div>
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

  function addAssignedLineToNativeCards() {
    document.querySelectorAll('.resident-card').forEach(card => {
      const info = card.querySelector('.info');
      if (!info || info.querySelector('.assigned-visible-line')) return;
      const chips = Array.from(card.querySelectorAll('.chips span'));
      const assignedChip = chips.find(span => /^assigned\s*:/i.test(span.textContent || ''));
      const line = document.createElement('div');
      line.className = `assigned-visible-line ${assignedChip ? 'assigned-ok' : 'assigned-empty'}`;
      line.innerHTML = assignedChip
        ? '<strong>Assignment:</strong> ' + escapeHtml(assignedChip.textContent.replace(/^assigned\s*:/i, '').trim())
        : '<strong>Assignment:</strong> Not assigned';
      const meta = info.querySelector('p');
      if (meta) meta.insertAdjacentElement('afterend', line);
    });
  }

  function setListTitle(title, pill) {
    const panel = getListPanel();
    const h2 = panel?.querySelector('.panel-head h2');
    const total = document.getElementById('sectionTotal');
    if (h2) h2.textContent = title;
    if (total) total.textContent = pill;
  }

  function getSearchPanel() {
    return document.querySelector('.search')?.closest('.panel') || null;
  }

  function getListPanel() {
    return document.getElementById('list')?.closest('.panel') || null;
  }

  function assigneeCounts(source) {
    const out = {};
    source.filter(isAssigned).forEach(row => splitNames(row.vote_assigned_by).forEach(name => { out[name] = (out[name] || 0) + 1; }));
    return out;
  }

  function splitNames(value) {
    return Array.from(new Set(String(value || '').split(',').map(clean).filter(Boolean).filter(name => name.toLowerCase() !== 'naappe@gmail.com')));
  }

  function count(fn) { return rows.filter(fn).length; }
  function isAssigned(row) { return !!clean(row.vote_assigned_by); }
  function clean(value) { return String(value || '').trim(); }
  function titleForSection() { return ({voters:'Residents Result',assign:'Assign Dashboard',calls:'Calls Result',votes:'Votes Result',visits:'Visits Result',transport:'Transport Result',insights:'Insights Result'}[section] || 'Result'); }
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
      .result-summary-note{font-weight:850;color:#52627a;margin:10px 0 12px}
      .assign-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
      .assign-actions .btn.active{background:#1f3b66;color:#fff;border-color:#1f3b66}
      .assignee-grid{display:flex;flex-wrap:wrap;gap:8px}
      .assignee-chip{display:inline-flex;align-items:center;gap:9px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:999px;padding:8px 12px;font:inherit;font-weight:950;cursor:pointer}
      .assignee-chip span{background:#1f3b66;color:#fff;border-radius:999px;padding:3px 8px;font-size:11px}
      .assign-view-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
      .assigned-visible-line{margin:0 0 10px;padding:8px 10px;border-radius:12px;font-size:12px;font-weight:900;border:1px solid #dbe4f0;background:#f8fafc;color:#334155}
      .assigned-visible-line strong{color:#0f172a}
      .assigned-visible-line.assigned-ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}
      .assigned-visible-line.assigned-empty{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
      .result-mode-card{cursor:default!important}
      .empty-mini{font-weight:900;color:#64748b;padding:10px}
      @media(max-width:900px){.section-result-cards{grid-template-columns:repeat(2,1fr)!important}.section-result-card strong{font-size:24px}.assignee-chip{padding:7px 10px}.assigned-visible-line{font-size:11px;padding:7px 8px;margin-bottom:8px}.assign-view-actions{width:100%;margin-left:0}.assign-view-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }
})();