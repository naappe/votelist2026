(function () {
  let cachedRows = null;

  function isDhafthar(value) {
    const raw = String(value || '').toLowerCase();
    const compact = raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`’.\-]/g, '')
      .replace(/\s+/g, '');
    return raw.includes('dhaf')
      || raw.includes('no dh r')
      || raw.includes('dh r')
      || /^df\d*/.test(compact)
      || /^dhr\d*/.test(compact)
      || /^nodhr\d*/.test(compact)
      || compact.startsWith('dhafthar')
      || compact.startsWith('dhaftharu')
      || compact.startsWith('dafthar');
  }

  function partyParam() {
    return (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = partyParam();
    const party = String(row.party || '').trim().toUpperCase();
    if (selected === 'ALL') return true;
    if (party === selected) return true;
    return selected === 'PNC' && !party && isDhafthar(row.house);
  }

  async function fetchRows() {
    if (cachedRows) return cachedRows;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return [];
    const client = window.__dhaftharClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    window.__dhaftharClient = client;
    const columns = 'id,photo_url,name,national_id,house,lives_in,living_place,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
    let from = 0;
    const pageSize = 1000;
    let rows = [];

    while (true) {
      const query = client.from(config.table).select(columns).order('image_number', { ascending: true, nullsFirst: false }).range(from, from + pageSize - 1);
      const { data, error } = await query;
      if (error) break;
      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    cachedRows = rows;
    return rows;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function chip(value) {
    return value ? `<span class="chip">${escapeHtml(String(value).replace(/[-_]/g, ' '))}</span>` : '';
  }

  function cleanHouse(row) {
    return String(row.house || row.lives_in || row.living_place || '-').trim() || '-';
  }

  function renderCard(voter) {
    const phone = String(voter.phone || '').trim() || 'No phone';
    return `
      <article class="voter-card" data-open-voter="${escapeHtml(voter.id)}" tabindex="0">
        <div class="voter-photo">${voter.photo_url ? `<img src="${escapeHtml(voter.photo_url)}" alt="${escapeHtml(voter.name || 'Voter photo')}" loading="lazy">` : `<div class="photo-placeholder">${escapeHtml(initials(voter.name))}</div>`}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${escapeHtml(voter.name || 'Unknown voter')}</h3><span class="party-tag">${escapeHtml(voter.party || 'Blank party')}</span></div>
          <p>${escapeHtml(cleanHouse(voter))} · ${escapeHtml(phone)}</p>
          <div class="chips">
            ${chip(voter.reach_status)}
            ${chip(voter.vote_status)}
            ${chip(voter.phone_status)}
            ${chip(voter.d2d_status)}
            ${chip(voter.support_level)}
          </div>
          <div class="section-label blue">House - Dhafthar</div>
        </div>
      </article>
    `;
  }

  async function dhaftharRows() {
    const rows = await fetchRows();
    return rows.filter((row) => partyAllowed(row) && isDhafthar([row.house, row.lives_in, row.living_place].join(' ')));
  }

  async function renderDhafthar() {
    const list = document.getElementById('voterList');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    const search = document.getElementById('searchInput');
    const house = document.getElementById('houseSelect');
    const box = document.getElementById('boxSelect');
    if (!list || !title || !filter || !total) return;

    if (search) search.value = 'Dhafthar';
    if (house) house.value = '__dhafthar__';
    if (box) box.value = '';

    title.textContent = 'House - Dhafthar';
    filter.textContent = 'Dhafthar includes Dhafthar, Dhaftharu, DF, Dh R, No Dh R, and blank-party Dhafthar rows.';
    total.textContent = 'Loading...';
    list.innerHTML = '<div class="empty">Loading Dhafthar voters...</div>';

    const voters = await dhaftharRows();
    total.textContent = `${new Intl.NumberFormat('en-US').format(voters.length)} voters`;
    list.innerHTML = voters.length ? voters.map(renderCard).join('') : '<div class="empty">No Dhafthar voters found.</div>';
    list.closest('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function refreshDhaftharTopHouse() {
    const topHouses = document.getElementById('topHouses');
    if (!topHouses || document.body.classList.contains('clean-read-view')) return;
    const rows = await dhaftharRows();
    if (!rows.length) return;
    let dhaftharRow = topHouses.querySelector('[data-cleanup-house="__dhafthar__"], [data-house-filter="__dhafthar__"]');
    if (!dhaftharRow) {
      dhaftharRow = document.createElement('button');
      dhaftharRow.className = 'house-row';
      dhaftharRow.type = 'button';
      dhaftharRow.dataset.cleanupHouse = '__dhafthar__';
      dhaftharRow.dataset.houseLabel = 'Dhafthar';
      topHouses.prepend(dhaftharRow);
    }
    dhaftharRow.innerHTML = `<span class="house-main"><span>1. Dhafthar</span></span><strong>${new Intl.NumberFormat('en-US').format(rows.length)}</strong>`;
  }

  function shouldForceDhafthar(event) {
    const select = event.target?.id === 'houseSelect' ? event.target : null;
    if (select?.value === '__dhafthar__') return true;
    const row = event.target?.closest?.('[data-cleanup-house], [data-house-filter]');
    return row && (row.dataset.cleanupHouse === '__dhafthar__' || isDhafthar(row.dataset.houseLabel || row.textContent));
  }

  document.addEventListener('change', (event) => {
    if (!shouldForceDhafthar(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    renderDhafthar();
  }, true);

  document.addEventListener('click', (event) => {
    if (!shouldForceDhafthar(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    renderDhafthar();
  }, true);

  window.addEventListener('load', () => setTimeout(refreshDhaftharTopHouse, 1200));
  setTimeout(refreshDhaftharTopHouse, 2500);
})();