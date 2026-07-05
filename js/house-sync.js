(function () {
  let rows = [];
  let loading = false;
  let loadedAt = 0;

  function selectedParty() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = selectedParty();
    const party = String(row.party || '').trim().toUpperCase();
    return selected === 'ALL' || party === selected;
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function compact(value) {
    return clean(value).toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`'.-]/g, '')
      .replace(/\s+/g, '');
  }

  function isDhafthar(value) {
    const raw = clean(value).toLowerCase();
    const key = compact(value);
    return raw.includes('dhaf')
      || raw.includes('no dh r')
      || raw.includes('dh r')
      || /^df\d*/.test(key)
      || /^dhr\d*/.test(key)
      || /^nodhr\d*/.test(key)
      || key.startsWith('dhafthar')
      || key.startsWith('dhaftharu')
      || key.startsWith('dafthar');
  }

  function houseName(row) {
    const house = clean(row.house);
    const livesIn = clean(row.lives_in);
    if (isDhafthar(house) || isDhafthar(livesIn)) return 'Dhafthar';

    const source = house || livesIn || 'Unknown house';
    const key = compact(source);
    if (key.includes('sinamale') || key.includes('sinamle')) return 'Sinamale';
    return source.replace(/^v\.\s*/i, '').trim();
  }

  function searchKey(value) {
    return clean(value).toLowerCase();
  }

  async function fetchRows(force) {
    if (!force && rows.length && Date.now() - loadedAt < 15000) return rows;
    if (loading) return rows;
    if (!window.supabase || !window.APP_CONFIG) return rows;

    loading = true;
    const client = window.__houseSyncClient || window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    window.__houseSyncClient = client;
    const columns = 'id,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
    const nextRows = [];
    let from = 0;
    const pageSize = 1000;

    try {
      while (true) {
        const { data, error } = await client.from(window.APP_CONFIG.table).select(columns).range(from, from + pageSize - 1);
        if (error) break;
        nextRows.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      rows = nextRows.filter(partyAllowed);
      loadedAt = Date.now();
    } finally {
      loading = false;
    }

    return rows;
  }

  function groupRows(sourceRows) {
    const groups = new Map();
    sourceRows.forEach((row) => {
      const house = houseName(row);
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

  function statusText(item) {
    if (item.guaranteed) return 'Guaranteed votes';
    if (item.possible) return 'Possible votes';
    if (item.followUp) return 'D2D follow-up';
    if (item.needCall) return 'Call first';
    if (item.noPhone) return 'Find phone';
    if (item.transport) return 'Transport';
    return 'Stable';
  }

  async function renderHouseControls(force) {
    const sourceRows = await fetchRows(force);
    const groups = groupRows(sourceRows);
    renderDropdown(groups);
    renderTopHouses(groups);
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

  function renderTopHouses(groups) {
    const topHouses = document.getElementById('topHouses');
    if (!topHouses || topHouses.hidden || document.body.classList.contains('clean-read-view')) return;
    const top = groups.slice().sort((a, b) => b.count - a.count || a.house.localeCompare(b.house)).slice(0, 10);
    topHouses.innerHTML = top.length
      ? top.map((item, index) => `
        <button class="house-row" type="button" data-house-filter="${escapeAttr(item.search)}" data-house-label="${escapeAttr(item.house)}">
          <span class="house-main">
            <span>${index + 1}. ${escapeHtml(item.house)}</span>
            <small>${escapeHtml(statusText(item))} · ${number(item.guaranteed)} guaranteed · ${number(item.possible)} possible · ${number(item.followUp)} D2D</small>
          </span>
          <strong>${number(item.count)}</strong>
        </button>
      `).join('')
      : '<div class="empty small">No house data.</div>';
  }

  async function renderExactHouse(value) {
    const selected = searchKey(value);
    if (!selected) return;
    const sourceRows = await fetchRows(false);
    const matches = sourceRows.filter((row) => searchKey(houseName(row)) === selected);
    if (!matches.length) return;

    const selectedHouse = houseName(matches[0]);
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
    list.innerHTML = matches.map(renderCard).join('');
    setTimeout(() => document.dispatchEvent(new Event('house-sync-rendered')), 40);
  }

  function renderCard(voter) {
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${photo(voter)}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${escapeHtml(voter.name || 'Unknown voter')}</h3><span class="party-tag">${escapeHtml(voter.party || 'Not party')}</span></div>
          <p>${escapeHtml(houseName(voter))} · ${escapeHtml(clean(voter.phone) || 'No phone')}</p>
          <div class="chips">
            ${chip(voter.reach_status, voter.reach_status === 'reached' ? 'green' : 'red')}
            ${chip(voter.vote_status, voter.vote_status === 'will-vote' ? 'green' : voter.vote_status === 'pending' ? 'amber' : '')}
            ${chip(voter.phone_status, voter.phone_status === 'called' ? 'green' : voter.phone_status === 'no-phone' ? 'red' : 'blue')}
            ${chip(voter.support_level, voter.support_level === 'guaranteed' ? 'green' : '')}
          </div>
          <div class="section-label blue">House - ${escapeHtml(houseName(voter))}</div>
        </div>
      </article>
    `;
  }

  function photo(voter) {
    if (voter.photo_url) return `<img src="${escapeAttr(voter.photo_url)}" alt="${escapeAttr(voter.name || 'Voter photo')}" loading="lazy">`;
    return `<div class="photo-placeholder">${escapeHtml(initials(voter.name))}</div>`;
  }

  function chip(value, color) {
    return value ? `<span class="chip ${color || ''}">${escapeHtml(label(value))}</span>` : '';
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

  document.addEventListener('change', (event) => {
    if (event.target?.id !== 'houseSelect') return;
    const value = event.target.value;
    setTimeout(() => renderHouseControls(false), 120);
    setTimeout(() => renderExactHouse(value), 160);
  }, true);

  document.addEventListener('click', (event) => {
    const row = event.target.closest('[data-house-filter]');
    if (!row) return;
    const select = document.getElementById('houseSelect');
    if (select) {
      select.value = row.dataset.houseFilter || '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      renderExactHouse(row.dataset.houseFilter || '');
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => renderHouseControls(true));
  window.addEventListener('load', () => renderHouseControls(true));
  document.addEventListener('house-sync-rendered', () => renderHouseControls(false));

  let runs = 0;
  const timer = setInterval(() => {
    renderHouseControls(false);
    runs += 1;
    if (runs > 30) clearInterval(timer);
  }, 500);
})();