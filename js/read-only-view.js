(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('view') !== 'read') return;

  document.documentElement.classList.add('read-only-view');

  let allRows = [];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function initials(name) {
    return clean(name).split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
  }

  function photo(row) {
    if (row.photo_url) {
      return `<img src="${esc(row.photo_url)}" alt="${esc(row.name || 'Voter photo')}" loading="lazy">`;
    }
    return `<div class="public-photo-placeholder">${esc(initials(row.name))}</div>`;
  }

  function rowSearchText(row) {
    return [row.name, row.national_id, row.house, row.phone]
      .map(lower)
      .join(' ');
  }

  function card(row) {
    return `
      <article class="public-voter-card" tabindex="0" aria-label="${esc(row.name || 'Voter')}">
        <div class="public-voter-photo">${photo(row)}</div>
        <div class="public-voter-body">
          <h3>${esc(row.name || 'Unknown voter')}</h3>
          <dl>
            <div><dt>ID</dt><dd>${esc(row.national_id || '-')}</dd></div>
            <div><dt>House</dt><dd>${esc(row.house || '-')}</dd></div>
            <div><dt>Mobile</dt><dd>${esc(row.phone || 'No mobile')}</dd></div>
          </dl>
        </div>
      </article>
    `;
  }

  function houseKey(value) {
    return lower(value || 'No house');
  }

  function currentRows() {
    const searchInput = document.getElementById('searchInput');
    const houseSelect = document.getElementById('houseSelect');
    const term = lower(searchInput?.value || params.get('q') || '');
    const house = houseSelect?.value || '';
    return allRows.filter((row) => {
      if (house && houseKey(row.house) !== house) return false;
      if (!term) return true;
      return rowSearchText(row).includes(term);
    });
  }

  function renderHouseOptions() {
    const houseSelect = document.getElementById('houseSelect');
    if (!houseSelect) return;
    const selected = houseSelect.value;
    const houses = new Map();
    allRows.forEach((row) => {
      const house = clean(row.house) || 'No house';
      const key = houseKey(house);
      const item = houses.get(key) || { label: house, count: 0 };
      item.count += 1;
      houses.set(key, item);
    });
    const options = Array.from(houses.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label, undefined, { numeric: true }));
    houseSelect.innerHTML = '<option value="">All houses</option>' + options.map(([key, item]) => (
      `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(item.label)} (${item.count})</option>`
    )).join('');
  }

  function renderCards() {
    const list = document.getElementById('voterList');
    const total = document.getElementById('sectionTotal');
    if (!list) return;
    const rows = currentRows();
    if (total) total.textContent = `${new Intl.NumberFormat('en-US').format(rows.length)} voters`;
    list.innerHTML = rows.length ? rows.map(card).join('') : '<div class="empty">No voters found for this public view.</div>';
    cleanPublicUi();
  }

  async function loadPublicRows() {
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return [];
    const client = window.__readOnlyClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    window.__readOnlyClient = client;

    const party = (params.get('party') || 'ALL').toUpperCase();
    const columns = 'id,image_number,photo_url,name,national_id,house,phone,party';
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      let query = client
        .from(config.table)
        .select(columns)
        .order('image_number', { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (party !== 'ALL') query = query.eq('party', party);
      const { data, error } = await query;
      if (error) throw error;
      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }

  function installPublicStyles() {
    if (document.getElementById('publicReadStyles')) return;
    const style = document.createElement('style');
    style.id = 'publicReadStyles';
    style.textContent = `
      .read-only-view body{background:#f3f4f6!important}
      .read-only-view .hero,
      .read-only-view #summary,
      .read-only-view #sections,
      .read-only-view .insight-grid,
      .read-only-view #topHouses{display:none!important}
      .read-only-view .topbar{box-shadow:0 1px 0 rgba(15,23,42,.08)!important}
      .read-only-view .toolbar,#logoutBtn,#refreshBtn,#shareViewBtn{display:none!important}
      .read-only-view .page{width:min(1180px,calc(100% - 28px))!important;padding-top:20px!important}
      .read-only-view .panel[aria-label="Search voters"]{display:block!important;margin-bottom:16px!important;border-radius:18px!important;border-color:#e7ebf0!important;box-shadow:0 14px 34px rgba(15,23,42,.055)!important}
      .read-only-view .search-grid{grid-template-columns:minmax(240px,1fr) minmax(210px,320px) auto!important;gap:12px!important;align-items:end!important}
      .read-only-view #clearSearchBtn{display:inline-flex!important}
      .read-only-view .voter-panel{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
      .read-only-view .voter-panel .panel-head{background:#fff!important;border:1px solid #e7ebf0!important;border-radius:18px!important;box-shadow:0 14px 34px rgba(15,23,42,.055)!important;margin-bottom:16px!important;padding:18px 20px!important}
      .read-only-view #voterList{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))!important;gap:16px!important}
      .public-voter-card{display:grid!important;grid-template-columns:96px minmax(0,1fr)!important;gap:14px!important;align-items:center!important;background:#fff!important;border:1px solid #e7ebf0!important;border-radius:16px!important;box-shadow:0 12px 28px rgba(15,23,42,.06)!important;padding:14px!important;min-height:132px!important;text-align:left!important}
      .public-voter-photo{width:96px!important;height:108px!important;border-radius:14px!important;overflow:hidden!important;border:1px solid #e7ebf0!important;background:#eef4ff!important;box-shadow:0 10px 22px rgba(15,23,42,.10)!important;display:grid!important;place-items:center!important;color:#2563eb!important;font-size:24px!important;font-weight:950!important}
      .public-voter-photo img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      .public-photo-placeholder{display:grid!important;place-items:center!important;width:100%!important;height:100%!important}
      .public-voter-body{min-width:0!important}
      .public-voter-body h3{margin:0 0 10px!important;color:#111827!important;font-size:18px!important;line-height:1.18!important;font-weight:850!important;letter-spacing:0!important;overflow-wrap:anywhere!important}
      .public-voter-body dl{display:grid!important;gap:5px!important;margin:0!important}
      .public-voter-body dl div{display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;gap:8px!important;align-items:start!important}
      .public-voter-body dt{color:#667085!important;font-size:11px!important;font-weight:900!important;letter-spacing:.06em!important;text-transform:uppercase!important}
      .public-voter-body dd{margin:0!important;color:#344054!important;font-size:13px!important;font-weight:750!important;line-height:1.35!important;overflow-wrap:anywhere!important}
      .read-only-view .empty{grid-column:1 / -1!important;background:#fff!important;border:1px solid #e7ebf0!important;border-radius:16px!important;padding:28px!important;text-align:center!important;color:#667085!important;font-weight:850!important}
      @media(max-width:720px){.read-only-view .search-grid{grid-template-columns:1fr!important}.public-voter-card{grid-template-columns:88px minmax(0,1fr)!important;padding:12px!important}.public-voter-photo{width:88px!important;height:106px!important}.public-voter-body h3{font-size:16px!important}.public-voter-body dl div{grid-template-columns:52px minmax(0,1fr)!important}}
    `;
    document.head.appendChild(style);
  }

  function cleanPublicUi() {
    document.body.classList.add('clean-read-view');
    document.querySelectorAll('#logoutBtn, #refreshBtn, #shareViewBtn, .panel-tools, .share-pick, .modal-actions, [data-share-selected], [data-share-read-view], [data-hotfix-assign], .card-actions, .chips, .party-tag').forEach((node) => node.remove());
    const modal = document.getElementById('voterModal');
    if (modal) modal.hidden = true;
  }

  function prepareUi() {
    installPublicStyles();
    cleanPublicUi();
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearchBtn');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const pageTitle = document.getElementById('dashboardTitle');
    const pageSubtitle = document.getElementById('dashboardSubtitle');
    const list = document.getElementById('voterList');

    if (searchInput && !searchInput.dataset.publicReady) {
      searchInput.dataset.publicReady = '1';
      searchInput.placeholder = 'Search name, ID, house, mobile';
      searchInput.value = params.get('q') || '';
      searchInput.addEventListener('input', renderCards);
    }
    const houseSelect = document.getElementById('houseSelect');
    if (houseSelect && !houseSelect.dataset.publicReady) {
      houseSelect.dataset.publicReady = '1';
      houseSelect.addEventListener('change', renderCards);
    }
    if (clearButton && !clearButton.dataset.publicReady) {
      clearButton.dataset.publicReady = '1';
      clearButton.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (houseSelect) houseSelect.value = '';
        renderCards();
      });
    }

    if (pageTitle) pageTitle.textContent = 'Public Voter Gallery';
    if (pageSubtitle) pageSubtitle.textContent = 'Shared public view with photo, name, ID, house, and mobile only.';
    if (title) title.textContent = 'Public Voter Gallery';
    if (filter) filter.textContent = 'Only photo, name, ID, house, and mobile are shown.';
    if (list && !allRows.length) list.innerHTML = '<div class="empty">Loading public voter gallery...</div>';
  }

  async function render() {
    prepareUi();
    const total = document.getElementById('sectionTotal');
    if (total) total.textContent = 'Loading...';

    try {
      allRows = await loadPublicRows();
      renderHouseOptions();
      renderCards();
    } catch (error) {
      const list = document.getElementById('voterList');
      if (list) list.innerHTML = `<div class="empty">Could not load public voters: ${esc(error.message || error)}</div>`;
      if (total) total.textContent = '0 voters';
    }
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-open-voter], .public-voter-card, .read-only-card')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(render, 0);
  });
  window.addEventListener('load', () => setTimeout(() => {
    if (!allRows.length) render();
    else {
      prepareUi();
      renderCards();
    }
  }, 300));
})();