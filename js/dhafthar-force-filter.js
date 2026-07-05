(function () {
  let cachedRows = null;

  function compactText(value) {
    return String(value || '').toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`'.-]/g, '')
      .replace(/\s+/g, '');
  }

  function isDhafthar(value) {
    const raw = String(value || '').toLowerCase();
    const compact = compactText(value);
    return raw.includes('dhaf')
      || raw.includes('dhaft')
      || raw.includes('no dh r')
      || raw.includes('dh r')
      || /^df\d*/.test(compact)
      || /^dhr\d*/.test(compact)
      || /^nodhr\d*/.test(compact)
      || compact.startsWith('dhafthar')
      || compact.startsWith('dhaftharu')
      || compact.startsWith('dafthar');
  }

  function extractHouse(value) {
    const original = String(value || '').trim();
    if (!original) return 'Unknown house';
    if (!isDhafthar(original)) return original.replace(/^v\.\s*/i, '').replace(/\s+/g, ' ').trim();

    const house = original
      .replace(/^dhaftharu?\.?\s*/i, '')
      .replace(/^dhaftaru?\.?\s*/i, '')
      .replace(/^daftharu?\.?\s*/i, '')
      .replace(/^df\.?\s*/i, '')
      .replace(/^[,/:;-]\s*/, '')
      .replace(/\brs\s*no\.?\s*/i, 'RS ')
      .replace(/\bno\.?\s*/i, '')
      .replace(/\bdh\s*r\b\.?\s*/i, 'DH R ')
      .replace(/\s+/g, ' ')
      .trim();

    return houseCode(house) || house || 'Dhafthar';
  }

  function houseCode(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const dh = text.match(/\bDH\s*R\s*\d+\b/i);
    if (dh) return dh[0].replace(/\s+/g, ' ').replace(/^dh\s*r/i, 'DH R');
    const rs = text.match(/\bRS\s*\d+\b/i);
    if (rs) return rs[0].replace(/\s+/g, ' ').replace(/^rs/i, 'RS');
    const number = text.match(/\b\d+\b/);
    return number ? number[0] : '';
  }

  function partyParam() {
    return (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = partyParam();
    const party = String(row.party || '').trim().toUpperCase();
    if (selected === 'ALL') return true;
    return party === selected;
  }

  function cleanHouse(row) {
    const house = String(row.house || '').trim();
    const livesIn = String(row.lives_in || '').trim();
    if (house && livesIn && isDhafthar(house) && extractHouse(house) === 'Dhafthar') return livesIn;
    return String(house || livesIn || '-').trim() || '-';
  }

  async function fetchRows() {
    if (cachedRows) return cachedRows;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return [];
    const client = window.__dhaftharClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    window.__dhaftharClient = client;
    const columns = 'id,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
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
          <div class="section-label blue">House - ${escapeHtml(extractHouse(cleanHouse(voter)))}</div>
        </div>
      </article>
    `;
  }

  function groupedDhaftharRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const house = extractHouse(cleanHouse(row));
      const key = house.toLowerCase();
      const group = groups.get(key) || { house, voters: [] };
      group.voters.push(row);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => b.voters.length - a.voters.length || a.house.localeCompare(b.house));
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
    filter.textContent = 'Dhafthar voters grouped by their specific house number.';
    total.textContent = 'Loading...';
    list.innerHTML = '<div class="empty">Loading Dhafthar voters...</div>';

    const rows = await fetchRows();
    const voters = rows.filter((row) => partyAllowed(row) && isDhafthar([row.house, row.lives_in].join(' ')));
    const groups = groupedDhaftharRows(voters);
    total.textContent = `${new Intl.NumberFormat('en-US').format(voters.length)} voters`;
    list.innerHTML = groups.length
      ? groups.map((group) => `
        <section class="dhafthar-house-group">
          <h3>${escapeHtml(group.house)} <span>${new Intl.NumberFormat('en-US').format(group.voters.length)} voters</span></h3>
          ${group.voters.map(renderCard).join('')}
        </section>
      `).join('')
      : '<div class="empty">No Dhafthar voters found.</div>';
    list.closest('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function shouldForceDhafthar(event) {
    const select = event.target?.id === 'houseSelect' ? event.target : null;
    if (select?.value === '__dhafthar__') return true;
    const row = event.target?.closest?.('[data-cleanup-house], [data-house-filter]');
    return row?.dataset.cleanupHouse === '__dhafthar__' || row?.dataset.houseFilter === '__dhafthar__';
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
})();