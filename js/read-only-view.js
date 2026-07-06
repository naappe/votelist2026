(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('view') !== 'read') return;

  document.documentElement.classList.add('read-only-view');

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function label(value) {
    return String(value || '-').replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function matchFilter(row, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'need-call') return row.phone_status === 'need-call';
    if (filter === 'reached') return row.reach_status === 'reached';
    if (filter === 'will-vote') return row.vote_status === 'will-vote';
    if (filter === 'pending') return row.vote_status === 'pending';
    if (filter === 'no-phone') return row.phone_status === 'no-phone';
    if (filter === 'need-transport') return row.transport_status === 'need-transport';
    if (filter === 'follow-up') return isFollowUp(row);
    return true;
  }

  function searchText(row) {
    return [row.name, row.national_id, row.house, row.party, row.election_box]
      .map((item) => String(item || '').toLowerCase())
      .join(' ');
  }

  function photo(row) {
    if (row.photo_url) {
      return `<img src="${esc(row.photo_url)}" alt="${esc(row.name || 'Voter photo')}" loading="lazy">`;
    }
    const initials = String(row.name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
    return `<div class="photo-placeholder">${esc(initials || '?')}</div>`;
  }

  function card(row) {
    return `
      <article class="voter-card read-only-card" tabindex="0" aria-label="${esc(row.name || 'Voter')}">
        <div class="voter-photo">${photo(row)}</div>
        <div class="voter-info">
          <div class="voter-title">
            <h3>${esc(row.name || 'Unknown voter')}</h3>
            <span class="party-tag">${esc(row.party || 'Not party')}</span>
          </div>
          <p><strong>ID</strong> ${esc(row.national_id || '-')}</p>
          <p><strong>Address</strong> ${esc(row.house || '-')}</p>
          <div class="chips">
            ${row.vote_status ? `<span class="chip">${esc(label(row.vote_status))}</span>` : ''}
            ${row.reach_status ? `<span class="chip">${esc(label(row.reach_status))}</span>` : ''}
            ${row.d2d_status ? `<span class="chip">${esc(label(row.d2d_status))}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  async function loadReadOnlyRows() {
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return [];
    const client = window.__readOnlyClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    window.__readOnlyClient = client;

    const party = (params.get('party') || 'ALL').toUpperCase();
    const columns = 'id,image_number,photo_url,name,national_id,house,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      let query = client.from(config.table).select(columns).order('image_number', { ascending: true, nullsFirst: false }).range(from, from + pageSize - 1);
      if (party !== 'ALL') query = query.eq('party', party);
      const { data, error } = await query;
      if (error) throw error;
      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    const filter = params.get('filter') || 'all';
    const q = String(params.get('q') || '').trim().toLowerCase();
    rows = rows.filter((row) => matchFilter(row, filter));
    if (q) rows = rows.filter((row) => searchText(row).includes(q));
    return rows;
  }

  function cleanReadOnlyUi() {
    document.body.classList.add('clean-read-view');
    document.querySelectorAll('#logoutBtn, #refreshBtn, #shareViewBtn, .panel-tools, .share-pick, .modal-actions, [data-share-selected], [data-share-read-view], [data-hotfix-assign]').forEach((node) => node.remove());
    const modal = document.getElementById('voterModal');
    if (modal) modal.hidden = true;
  }

  async function render() {
    cleanReadOnlyUi();
    const list = document.getElementById('voterList');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    const pageTitle = document.getElementById('dashboardTitle');
    const pageSubtitle = document.getElementById('dashboardSubtitle');
    if (!list) return;

    if (pageTitle) pageTitle.textContent = 'Read Only Voter View';
    if (pageSubtitle) pageSubtitle.textContent = 'Shared public view. No login, editing, or saving.';
    if (title) title.textContent = 'Shared Voters';
    if (filter) filter.textContent = 'Showing name, ID, address, and photo only.';
    if (total) total.textContent = 'Loading...';
    list.innerHTML = '<div class="empty">Loading shared voters...</div>';

    try {
      const rows = await loadReadOnlyRows();
      if (total) total.textContent = `${new Intl.NumberFormat('en-US').format(rows.length)} voters`;
      list.innerHTML = rows.length ? rows.map(card).join('') : '<div class="empty">No voters found for this shared view.</div>';
      cleanReadOnlyUi();
    } catch (error) {
      list.innerHTML = `<div class="empty">Could not load read-only voters: ${esc(error.message || error)}</div>`;
      if (total) total.textContent = '0 voters';
    }
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-open-voter], .read-only-card')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(render, 0);
    setTimeout(render, 500);
  });
  window.addEventListener('load', () => setTimeout(render, 300));
})();
