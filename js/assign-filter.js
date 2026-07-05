(function () {
  let rows = [];
  let loading = false;
  let activeAssign = false;
  let currentVoterId = '';

  function client() {
    if (!window.supabase || !window.APP_CONFIG) return null;
    if (!window.__assignFilterClient) {
      window.__assignFilterClient = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    }
    return window.__assignFilterClient;
  }

  async function loadRows() {
    if (loading) return rows;
    const sb = client();
    const config = window.APP_CONFIG;
    if (!sb || !config) return rows;
    loading = true;
    const party = new URLSearchParams(location.search).get('party');
    const columns = 'id,photo_url,name,national_id,house,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level,vote_assigned_by,vote_assigned_at';
    let from = 0;
    const pageSize = 1000;
    const nextRows = [];
    try {
      while (true) {
        let query = sb.from(config.table).select(columns).order('image_number', { ascending: true, nullsFirst: false }).range(from, from + pageSize - 1);
        if (party && party !== 'ALL') query = query.eq('party', party);
        const { data, error } = await query;
        if (error) break;
        nextRows.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      if (nextRows.length) rows = nextRows;
    } finally {
      loading = false;
    }
    return rows;
  }

  function assignedRows() {
    return rows.filter((row) => String(row.vote_assigned_by || '').trim());
  }

  async function refreshAssignControls() {
    await loadRows();
    const count = assignedRows().length;
    upsertStat(count);
    upsertTab(count);
    setActiveState();
  }

  function upsertStat(count) {
    const summary = document.getElementById('summary');
    if (!summary) return;
    let button = summary.querySelector('[data-assign-filter="assigned"].stat-card');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'stat-card blue';
      button.dataset.assignFilter = 'assigned';
      summary.appendChild(button);
    }
    button.innerHTML = `<span class="stat-icon">👤</span><span class="stat-text"><strong>${number(count)}</strong><small>Assign</small></span>`;
  }

  function upsertTab(count) {
    const sections = document.getElementById('sections');
    if (!sections) return;
    let button = sections.querySelector('[data-assign-filter="assigned"].tab');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'tab';
      button.dataset.assignFilter = 'assigned';
      sections.appendChild(button);
    }
    button.innerHTML = `Assign <span>${number(count)}</span>`;
  }

  function setActiveState() {
    document.querySelectorAll('[data-assign-filter="assigned"]').forEach((node) => node.classList.toggle('active', activeAssign));
    if (activeAssign) document.querySelectorAll('[data-filter]').forEach((node) => node.classList.remove('active'));
  }

  async function showAssigned() {
    activeAssign = true;
    await refreshAssignControls();
    const filtered = assignedRows();
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    const list = document.getElementById('voterList');
    if (!title || !filter || !total || !list) return;
    title.textContent = 'Assign';
    filter.textContent = 'Showing voters with an assigned person. Open a card to change the Assign To name.';
    total.textContent = `${number(filtered.length)} voters`;
    list.innerHTML = filtered.length ? filtered.map(renderCard).join('') : '<div class="empty">No assigned voters found.</div>';
    document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCard(voter) {
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${photo(voter)}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${escapeHtml(voter.name || 'Unknown voter')}</h3><span class="party-tag">${escapeHtml(voter.party || 'Not party')}</span></div>
          <p>${escapeHtml(voter.house || '-')} · Box ${escapeHtml(voter.election_box || '-')} · ${escapeHtml(voter.phone || 'No phone')}</p>
          <div class="chips">
            ${chip(voter.reach_status)}
            ${chip(voter.vote_status)}
            ${chip(voter.phone_status)}
            ${chip(`Assign: ${voter.vote_assigned_by}`)}
          </div>
          <div class="section-label blue">👤 Assign</div>
        </div>
      </article>
    `;
  }

  function ensureAssignField() {
    const modal = document.getElementById('voterModal');
    const form = document.getElementById('voterForm');
    if (!modal || modal.hidden || !form || form.elements.vote_assigned_by) return;
    const label = document.createElement('label');
    label.textContent = 'Assign To';
    const input = document.createElement('input');
    input.name = 'vote_assigned_by';
    input.placeholder = 'Write assignee name';
    input.value = assignedName(currentVoterId);
    label.appendChild(input);
    const remarks = form.querySelector('textarea[name="remarks"]')?.closest('label');
    form.insertBefore(label, remarks || form.querySelector('.modal-actions'));
  }

  function assignedName(id) {
    return rows.find((row) => String(row.id) === String(id))?.vote_assigned_by || '';
  }

  async function saveAssignedName(id, assignee) {
    const sb = client();
    const config = window.APP_CONFIG;
    if (!sb || !config || !id) return;
    const updates = {
      vote_assigned_by: assignee || null,
      vote_assigned_at: assignee ? new Date().toISOString() : null
    };
    const { error } = await sb.from(config.table).update(updates).eq('id', id);
    if (error) return;
    rows = rows.map((row) => String(row.id) === String(id) ? { ...row, ...updates } : row);
    await refreshAssignControls();
  }

  function bind() {
    document.addEventListener('click', async (event) => {
      const assign = event.target.closest('[data-assign-filter="assigned"]');
      if (assign) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        await showAssigned();
        return;
      }

      const normalFilter = event.target.closest('[data-filter], [data-house-filter]');
      if (normalFilter) activeAssign = false;

      const card = event.target.closest('[data-open-voter]');
      if (card) {
        currentVoterId = card.dataset.openVoter || '';
        setTimeout(ensureAssignField, 0);
        setTimeout(ensureAssignField, 250);
      }
    }, true);

    document.addEventListener('submit', (event) => {
      if (event.target?.id !== 'voterForm') return;
      const assignee = String(event.target.elements.vote_assigned_by?.value || '').trim();
      const id = currentVoterId;
      setTimeout(() => saveAssignedName(id, assignee), 900);
    }, true);
  }

  function photo(voter) {
    if (voter.photo_url) return `<img src="${escapeAttr(voter.photo_url)}" alt="${escapeAttr(voter.name || 'Voter photo')}" loading="lazy">`;
    return `<div class="photo-placeholder">${escapeHtml(initials(voter.name))}</div>`;
  }

  function chip(value) {
    return value ? `<span class="chip">${escapeHtml(label(value))}</span>` : '';
  }

  function label(value) {
    return String(value || '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  bind();
  refreshAssignControls();
  let runs = 0;
  const timer = setInterval(() => {
    ensureAssignField();
    refreshAssignControls();
    runs += 1;
    if (runs > 20) clearInterval(timer);
  }, 700);
})();
