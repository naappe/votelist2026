(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'read') return;

  let client;
  let allAssignedRows = [];
  let lastRenderToken = 0;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  function getClient() {
    if (client) return client;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return null;
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    return client;
  }

  function partyScope() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function initials(name) {
    return clean(name).split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
  }

  function renderPhoto(row) {
    if (row.photo_url) {
      return `<img src="${esc(row.photo_url)}" alt="${esc(row.name || 'Voter photo')}" loading="lazy">`;
    }
    return `<div class="photo-placeholder">${esc(initials(row.name))}</div>`;
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function rowText(row) {
    return [
      row.name,
      row.national_id,
      row.house,
      row.phone,
      row.party,
      row.vote_assigned_by
    ].map(lower).join(' ');
  }

  function visibleRows() {
    const search = lower(document.getElementById('searchInput')?.value || '');
    const house = lower(document.getElementById('houseSelect')?.value || '');
    return allAssignedRows.filter((row) => {
      const text = rowText(row);
      if (house && !text.includes(house)) return false;
      if (search && !text.includes(search)) return false;
      return true;
    });
  }

  function assignedCard(row) {
    const assignedTo = clean(row.vote_assigned_by) || 'Assigned';
    const assignedAt = formatTime(row.vote_assigned_at);
    return `
      <article class="voter-card pro-voter-card admin-assigned-card" data-open-voter="${esc(row.id)}" tabindex="0">
        <div class="voter-photo">${renderPhoto(row)}</div>
        <div class="voter-info">
          <div class="voter-title">
            <h3>${esc(row.name || 'Unknown voter')}</h3>
            <span class="party-tag">${esc(row.party || 'Not party')}</span>
          </div>
          <p>${esc(row.house || '-')} · ${esc(row.phone || 'No phone')}</p>
          <div class="assigned-result-box">
            <span>Assigned to</span>
            <strong>${esc(assignedTo)}</strong>
            ${assignedAt ? `<small>${esc(assignedAt)}</small>` : ''}
          </div>
          <div class="section-label blue">Assigned Result</div>
        </div>
      </article>
    `;
  }

  function setStatus(message, isError) {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = message ? `status-message ${isError ? 'error' : 'ok'}` : 'status-message';
  }

  function renderAssignedResults() {
    const token = ++lastRenderToken;
    const list = document.getElementById('voterList');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    if (!list || !title || !filter || !total) return;

    const rows = visibleRows();
    title.textContent = 'Assigned Results';
    filter.textContent = 'Admin view of voters assigned by friends or team members.';
    total.textContent = `${number(rows.length)} assigned`;
    list.innerHTML = rows.length
      ? rows.map(assignedCard).join('')
      : '<div class="empty">No assigned voters match this search.</div>';
    setStatus(rows.length ? `Showing ${number(rows.length)} assigned voter${rows.length === 1 ? '' : 's'}.` : 'No assigned voters found.', !rows.length);

    setTimeout(() => {
      if (token === lastRenderToken) window.dispatchEvent(new Event('assign-results-rendered'));
    }, 0);
  }

  async function fetchAssignedRows() {
    const sb = getClient();
    const config = window.APP_CONFIG;
    if (!sb || !config) throw new Error('Supabase is not ready.');

    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      let query = sb
        .from(config.table)
        .select('id,photo_url,name,national_id,house,phone,party,vote_assigned_by,vote_assigned_at')
        .not('vote_assigned_by', 'is', null)
        .order('vote_assigned_at', { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      const party = partyScope();
      if (party !== 'ALL') query = query.eq('party', party);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    allAssignedRows = rows.filter((row) => clean(row.vote_assigned_by));
    return allAssignedRows;
  }

  async function showAssignedResults() {
    const button = document.getElementById('assignedResultsBtn');
    const list = document.getElementById('voterList');
    if (button) {
      button.disabled = true;
      button.textContent = 'Loading Assigned...';
    }
    if (list) list.innerHTML = '<div class="empty">Loading assigned results...</div>';

    try {
      await fetchAssignedRows();
      renderAssignedResults();
      updateButtonCount();
    } catch (error) {
      setStatus(error.message || 'Could not load assigned results.', true);
      if (list) list.innerHTML = `<div class="empty">${esc(error.message || 'Could not load assigned results.')}</div>`;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function updateButtonCount() {
    const button = document.getElementById('assignedResultsBtn');
    if (!button) return;
    if (!allAssignedRows.length) {
      try { await fetchAssignedRows(); } catch {}
    }
    const count = allAssignedRows.length;
    button.innerHTML = `Assigned Results <span>${number(count)}</span>`;
  }

  function installStyles() {
    if (document.getElementById('assignResultsStyles')) return;
    const style = document.createElement('style');
    style.id = 'assignResultsStyles';
    style.textContent = `
      #assignedResultsBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px}
      #assignedResultsBtn span{display:inline-flex;min-width:24px;height:24px;align-items:center;justify-content:center;padding:0 8px;border-radius:999px;background:#eef4ff;color:#1d4ed8;font-size:12px;font-weight:900}
      .assigned-result-box{display:grid!important;gap:3px!important;margin:2px 0 14px!important;padding:10px 12px!important;border:1px solid #bfdbfe!important;border-radius:12px!important;background:#eff6ff!important;color:#1f3b66!important;text-align:left!important}
      .assigned-result-box span{font-size:10px!important;font-weight:950!important;text-transform:uppercase!important;letter-spacing:.08em!important;color:#2563eb!important}
      .assigned-result-box strong{font-size:13px!important;line-height:1.3!important;color:#111827!important;overflow-wrap:anywhere!important}
      .assigned-result-box small{font-size:11px!important;font-weight:800!important;color:#667085!important}
      .admin-assigned-card{border-color:#bfdbfe!important;box-shadow:0 12px 28px rgba(37,99,235,.08)!important}
    `;
    document.head.appendChild(style);
  }

  function ensureButton() {
    if (document.getElementById('assignedResultsBtn')) return;
    const searchPanel = document.querySelector('[aria-label="Search voters"] .form');
    const shareButton = document.getElementById('shareViewBtn');
    if (!searchPanel || !shareButton) return;
    const button = document.createElement('button');
    button.id = 'assignedResultsBtn';
    button.className = 'btn light';
    button.type = 'button';
    button.textContent = 'Assigned Results';
    button.addEventListener('click', showAssignedResults);
    shareButton.after(button);
    updateButtonCount();
  }

  function boot() {
    installStyles();
    ensureButton();
    const search = document.getElementById('searchInput');
    const house = document.getElementById('houseSelect');
    search?.addEventListener('input', () => {
      if (document.getElementById('sectionTitle')?.textContent === 'Assigned Results') renderAssignedResults();
    });
    house?.addEventListener('change', () => {
      if (document.getElementById('sectionTitle')?.textContent === 'Assigned Results') renderAssignedResults();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => setTimeout(boot, 300));
})();