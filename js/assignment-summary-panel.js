(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = (params.get('section') || 'voters').toLowerCase();
  let allRows = [];

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    installStyles();
    await loadFreshRows();
    renderSummaryPanel();
    fixStatusLine();
    showAssignedOnCards();
  }

  async function loadFreshRows() {
    try {
      const cfg = window.APP_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) return;
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at')
        .order('house', { ascending: true })
        .limit(5000);
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query;
      if (res.error) throw res.error;
      allRows = res.data || [];
      refreshStats(allRows);
    } catch (error) {
      console.warn('Assignment summary load failed', error);
    }
  }

  function renderSummaryPanel() {
    if (!allRows.length) return;
    let panel = document.getElementById('assignmentSummaryPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'assignmentSummaryPanel';
      panel.className = 'panel assignment-summary-panel';
      const searchPanel = document.querySelector('.panel');
      if (searchPanel) searchPanel.insertAdjacentElement('afterend', panel);
    }

    const assignedRows = allRows.filter(r => clean(r.vote_assigned_by));
    const unassignedRows = allRows.filter(r => !clean(r.vote_assigned_by));
    const people = splitAssignees(assignedRows);
    const topPeople = Object.entries(people).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    panel.innerHTML = `
      <div class="panel-head">
        <h2>Assignment Summary</h2>
        <span class="pill">${assignedRows.length.toLocaleString()} assigned / ${unassignedRows.length.toLocaleString()} unassigned</span>
      </div>
      <div class="assignment-kpis">
        <article><span>Total ${party === 'ALL' ? 'Residents' : party + ' Residents'}</span><strong>${allRows.length.toLocaleString()}</strong></article>
        <article><span>Assigned</span><strong>${assignedRows.length.toLocaleString()}</strong></article>
        <article><span>Unassigned</span><strong>${unassignedRows.length.toLocaleString()}</strong></article>
        <article><span>Assigned People</span><strong>${topPeople.length.toLocaleString()}</strong></article>
      </div>
      <div class="assignment-list-title">Who is assigned</div>
      <div class="assignment-people-list">
        ${topPeople.length ? topPeople.map(([name, count]) => `<button type="button" class="assignee-chip" data-assignee="${escapeAttr(name)}"><strong>${escapeHtml(name)}</strong><span>${count.toLocaleString()}</span></button>`).join('') : '<div class="empty-mini">No assigned people yet.</div>'}
      </div>
    `;

    panel.querySelectorAll('[data-assignee]').forEach(btn => {
      btn.onclick = () => showAssignee(btn.dataset.assignee);
    });
  }

  function showAssignee(name) {
    const wanted = clean(name).toLowerCase();
    const rows = allRows.filter(r => splitNames(r.vote_assigned_by).some(n => n.toLowerCase() === wanted));
    renderCards(rows, `Assigned to ${name}`);
  }

  function renderCards(rows, title) {
    const list = document.getElementById('list');
    if (!list) return;
    const h2 = document.querySelector('.panel-head h2');
    const total = document.getElementById('sectionTotal');
    if (h2) h2.textContent = title || 'Assigned Residents';
    if (total) total.textContent = `${rows.length.toLocaleString()} residents`;
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No residents found.</div>';
      return;
    }
    list.innerHTML = rows.map(row => `
      <article class="resident-card">
        <div class="photo">${row.photo_url ? `<img src="${escapeAttr(row.photo_url)}" alt="">` : `<div class="ph">${escapeHtml(String(row.name || '?').slice(0,1))}</div>`}</div>
        <div class="info">
          <h3>${escapeHtml(row.name || 'Unknown')}</h3>
          <p>${escapeHtml(row.house || '-')} · Box ${escapeHtml(row.election_box || '-')} · ${escapeHtml(row.phone || 'No phone')}</p>
          <div class="assigned-visible-line assigned-ok"><strong>Assigned:</strong> ${escapeHtml(row.vote_assigned_by || 'Not assigned')}</div>
          <div class="chips">
            <span>${escapeHtml(row.party || '-')}</span>
            <span>${escapeHtml(row.vote_status || 'pending')}</span>
            <span>${escapeHtml(row.phone_status || 'need-call')}</span>
            <span>${escapeHtml(row.reach_status || 'not-reached')}</span>
          </div>
        </div>
      </article>
    `).join('');
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fixStatusLine() {
    const status = document.getElementById('status');
    if (!status || !allRows.length) return;
    const assigned = allRows.filter(r => clean(r.vote_assigned_by)).length;
    const unassigned = allRows.length - assigned;
    if (section === 'assign') status.textContent = `Loaded ${unassigned.toLocaleString()} unassigned residents from ${allRows.length.toLocaleString()} total. ${assigned.toLocaleString()} already assigned.`;
  }

  function showAssignedOnCards() {
    document.querySelectorAll('.resident-card').forEach(card => {
      const info = card.querySelector('.info');
      if (!info || info.querySelector('.assigned-visible-line')) return;
      const chips = Array.from(card.querySelectorAll('.chips span'));
      const assignedChip = chips.find(span => /^assigned\s*:/i.test(span.textContent || ''));
      const line = document.createElement('div');
      line.className = 'assigned-visible-line ' + (assignedChip ? 'assigned-ok' : 'assigned-empty');
      line.innerHTML = assignedChip
        ? '<strong>Assigned:</strong> ' + escapeHtml(assignedChip.textContent.replace(/^assigned\s*:/i, '').trim())
        : '<strong>Assigned:</strong> Not assigned';
      const meta = info.querySelector('p');
      if (meta) meta.insertAdjacentElement('afterend', line);
    });
  }

  function refreshStats(rows) {
    setNum('total', rows.length);
    setNum('will', rows.filter(r => r.vote_status === 'will-vote').length);
    setNum('notvote', rows.filter(r => ['no-vote', 'not-vote'].includes(r.vote_status)).length);
    setNum('pending', rows.filter(r => r.vote_status === 'pending').length);
    setNum('need', rows.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call' || r.d2d_status === 'not-visited').length);
  }

  function splitAssignees(rows) {
    const out = {};
    rows.forEach(row => splitNames(row.vote_assigned_by).forEach(name => { out[name] = (out[name] || 0) + 1; }));
    return out;
  }

  function splitNames(value) {
    return Array.from(new Set(String(value || '').split(',').map(clean).filter(Boolean).filter(name => name.toLowerCase() !== 'naappe@gmail.com')));
  }

  function setNum(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value || 0).toLocaleString('en-US');
  }

  function clean(value) { return String(value || '').trim(); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

  function installStyles() {
    if (document.getElementById('assignmentSummaryStyles')) return;
    const style = document.createElement('style');
    style.id = 'assignmentSummaryStyles';
    style.textContent = `
      .assignment-summary-panel{border-color:#bfdbfe!important;background:#f8fbff!important}
      .assignment-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
      .assignment-kpis article{background:#fff;border:1px solid #dbe4f0;border-radius:16px;padding:12px}
      .assignment-kpis span{display:block;color:#52627a;text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:950}
      .assignment-kpis strong{display:block;margin-top:6px;font-size:26px;line-height:1;font-weight:950;color:#1f3b66}
      .assignment-list-title{font-weight:950;margin:6px 0 10px;color:#071226}
      .assignment-people-list{display:flex;flex-wrap:wrap;gap:8px}
      .assignee-chip{display:inline-flex;align-items:center;gap:9px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:999px;padding:8px 12px;font:inherit;font-weight:950;cursor:pointer}
      .assignee-chip span{background:#1f3b66;color:#fff;border-radius:999px;padding:3px 8px;font-size:11px}
      .assigned-visible-line{margin:0 0 10px;padding:8px 10px;border-radius:12px;font-size:12px;font-weight:900;border:1px solid #dbe4f0;background:#f8fafc;color:#334155}
      .assigned-visible-line strong{color:#0f172a}
      .assigned-visible-line.assigned-ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}
      .assigned-visible-line.assigned-empty{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
      .empty-mini{font-weight:900;color:#64748b;padding:10px}
      @media(max-width:850px){.assignment-kpis{grid-template-columns:repeat(2,1fr)}.assignment-kpis strong{font-size:22px}.assignee-chip{padding:7px 10px}.assigned-visible-line{font-size:11px;padding:7px 8px;margin-bottom:8px}}
    `;
    document.head.appendChild(style);
  }
})();