(function () {
  let cachedRows = null;
  let applying = false;
  let scheduled = false;

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
      || compact.startsWith('dafthar')
      || compact.startsWith('dhaftr');
  }

  function selectedParty() {
    return (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = selectedParty();
    const party = String(row.party || '').trim().toUpperCase();
    if (selected === 'ALL') return true;
    return party === selected;
  }

  function clean(value) {
    const text = String(value || '').trim();
    return text || '';
  }

  function sourceHouse(row) {
    const house = clean(row.house);
    const livesIn = clean(row.lives_in);
    if (house && livesIn && isGenericDhafthar(house)) return livesIn;
    return house || livesIn || 'Unknown house';
  }

  function isGenericDhafthar(value) {
    return isDhafthar(value) && extractHouse(value) === 'Dhafthar';
  }

  function extractHouse(value) {
    const original = clean(value);
    if (!original) return 'Unknown house';

    if (isDhafthar(original)) {
      let house = original
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

      house = house.replace(/^dh\s*r\s*/i, 'DH R ');
      house = house.replace(/^rs\s*/i, 'RS ');
      return house || 'Dhafthar';
    }

    return original.replace(/^v\.\s*/i, '').replace(/\s+/g, ' ').trim();
  }

  function searchKey(house) {
    return String(house || '').toLowerCase().trim();
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  async function fetchRows() {
    if (cachedRows) return cachedRows;
    const config = window.APP_CONFIG;
    if (!window.supabase || !config) return [];
    const client = window.__houseNormalizeClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    window.__houseNormalizeClient = client;
    const columns = 'id,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
    let from = 0;
    const pageSize = 1000;
    const rows = [];

    while (true) {
      const { data, error } = await client.from(config.table).select(columns).range(from, from + pageSize - 1);
      if (error) break;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    cachedRows = rows.filter(partyAllowed);
    return cachedRows;
  }

  function groupRows(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const house = extractHouse(sourceHouse(row));
      if (!house || house === 'Unknown house') return;
      const key = searchKey(house);
      const item = groups.get(key) || {
        house,
        search: key,
        count: 0,
        guaranteed: 0,
        possible: 0,
        followUp: 0,
        needCall: 0,
        noPhone: 0,
        transport: 0
      };
      item.count += 1;
      item.guaranteed += row.support_level === 'guaranteed' ? 1 : 0;
      item.possible += ['pending', 'not-decided'].includes(row.vote_status) && row.support_level !== 'guaranteed' ? 1 : 0;
      item.followUp += ['follow-up', 'not-home'].includes(row.d2d_status) ? 1 : 0;
      item.needCall += row.phone_status === 'need-call' && clean(row.phone) ? 1 : 0;
      item.noPhone += row.phone_status === 'no-phone' || !clean(row.phone) ? 1 : 0;
      item.transport += row.transport_status === 'need-transport' ? 1 : 0;
      groups.set(key, item);
    });
    return Array.from(groups.values());
  }

  function houseStatus(item) {
    if (item.guaranteed) return 'Guaranteed votes';
    if (item.possible) return 'Possible votes';
    if (item.followUp) return 'D2D follow-up';
    if (item.needCall) return 'Call first';
    if (item.noPhone) return 'Find phone';
    if (item.transport) return 'Transport';
    return 'Stable';
  }

  function renderTopHouses(groups) {
    const topHouses = document.getElementById('topHouses');
    if (!topHouses || document.body.classList.contains('clean-read-view')) return;
    const top = groups
      .slice()
      .sort((a, b) => b.count - a.count || a.house.localeCompare(b.house))
      .slice(0, 10);

    const html = top.length
      ? top.map((item, index) => `
        <button class="house-row" type="button" data-house-filter="${escapeAttr(item.search)}" data-house-label="${escapeAttr(item.house)}">
          <span class="house-main">
            <span>${index + 1}. ${escapeHtml(item.house)}</span>
            <small>${escapeHtml(houseStatus(item))} · ${number(item.guaranteed)} guaranteed · ${number(item.possible)} possible · ${number(item.followUp)} D2D</small>
          </span>
          <strong>${number(item.count)}</strong>
        </button>
      `).join('')
      : '<div class="empty small">No house data.</div>';
    if (topHouses.innerHTML.trim() !== html.trim()) topHouses.innerHTML = html;
  }

  function renderDropdown(groups) {
    const select = document.getElementById('houseSelect');
    if (!select || document.activeElement === select) return;
    const selected = select.value;
    const sorted = groups.slice().sort((a, b) => a.house.localeCompare(b.house));
    const html = '<option value="">All houses</option>' + sorted.map((item) => `
      <option value="${escapeAttr(item.search)}" data-label="${escapeAttr(item.house)}" ${item.search === selected ? 'selected' : ''}>
        ${escapeHtml(item.house)} (${number(item.count)})
      </option>
    `).join('');
    if (select.innerHTML.trim() !== html.trim()) select.innerHTML = html;
  }

  function renderExactHouse(value) {
    const selected = String(value || '').trim().toLowerCase();
    if (!selected) return;

    fetchRows().then((rows) => {
      const matches = rows.filter((row) => searchKey(extractHouse(sourceHouse(row))) === selected);
      if (!matches.length) return;

      const selectedHouse = extractHouse(sourceHouse(matches[0]));
      const title = document.getElementById('sectionTitle');
      const filter = document.getElementById('sectionFilter');
      const total = document.getElementById('sectionTotal');
      const list = document.getElementById('voterList');
      const search = document.getElementById('searchInput');
      if (!list) return;

      if (title) title.textContent = selectedHouse;
      if (filter) filter.textContent = `Showing exact house group: ${selectedHouse}.`;
      if (total) total.textContent = `${number(matches.length)} voter${matches.length === 1 ? '' : 's'}`;
      if (search) search.value = selectedHouse;
      list.innerHTML = matches.map(renderVoterCard).join('');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
    });
  }

  function renderVoterCard(voter) {
    const phone = clean(voter.phone) || 'No phone';
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${voter.photo_url ? `<img src="${escapeAttr(voter.photo_url)}" alt="${escapeAttr(voter.name || 'Voter photo')}" loading="lazy">` : `<div class="photo-placeholder">${escapeHtml(initials(voter.name))}</div>`}</div>
        <div class="voter-info">
          <div class="voter-title">
            <h3>${escapeHtml(voter.name || 'Unknown voter')}</h3>
            <span class="party-tag">${escapeHtml(voter.party || 'Not party')}</span>
          </div>
          <p>${escapeHtml(sourceHouse(voter))} · Box ${escapeHtml(voter.election_box || '-')} · ${escapeHtml(phone)}</p>
          <div class="chips">
            ${chip(voter.reach_status, voter.reach_status === 'reached' ? 'green' : 'red')}
            ${chip(voter.vote_status, voter.vote_status === 'will-vote' ? 'green' : voter.vote_status === 'pending' ? 'amber' : '')}
            ${chip(voter.phone_status, voter.phone_status === 'called' ? 'green' : voter.phone_status === 'no-phone' ? 'red' : 'blue')}
            ${chip(voter.support_level, voter.support_level === 'guaranteed' ? 'green' : '')}
          </div>
          <div class="section-label blue">House - ${escapeHtml(extractHouse(sourceHouse(voter)))}</div>
        </div>
      </article>
    `;
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function chip(value, color) {
    if (!value) return '';
    return `<span class="chip ${color || ''}">${escapeHtml(String(value).replace(/[_-]/g, ' '))}</span>`;
  }

  async function applyHouseGrouping() {
    if (applying) return;
    applying = true;
    try {
      const rows = await fetchRows();
      const groups = groupRows(rows);
      renderTopHouses(groups);
      renderDropdown(groups);
    } finally {
      applying = false;
    }
  }

  function scheduleApply(delay) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      applyHouseGrouping();
    }, delay || 120);
  }

  document.addEventListener('DOMContentLoaded', () => scheduleApply(600));
  window.addEventListener('load', () => scheduleApply(800));
  document.addEventListener('change', (event) => {
    if (event.target?.id !== 'houseSelect') return;
    const value = event.target.value;
    scheduleApply(300);
    setTimeout(() => renderExactHouse(value), 120);
    setTimeout(() => renderExactHouse(value), 420);
  }, true);

  const observer = new MutationObserver(() => scheduleApply(200));
  window.addEventListener('load', () => {
    const topHouses = document.getElementById('topHouses');
    const houseSelect = document.getElementById('houseSelect');
    if (topHouses) observer.observe(topHouses, { childList: true });
    if (houseSelect) observer.observe(houseSelect, { childList: true });
  });
})();