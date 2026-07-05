(function () {
  let rows = [];
  let loading = false;
  let lastLoad = 0;

  function client() {
    if (!window.supabase || !window.APP_CONFIG) return null;
    if (!window.__d2dCountFixClient) {
      window.__d2dCountFixClient = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    }
    return window.__d2dCountFixClient;
  }

  async function loadRows(force) {
    const now = Date.now();
    if (!force && rows.length && now - lastLoad < 15000) return rows;
    if (loading) return rows;

    const sb = client();
    const config = window.APP_CONFIG;
    if (!sb || !config) return rows;

    loading = true;
    const party = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
    const columns = 'id,image_number,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,support_level';
    const nextRows = [];
    let from = 0;
    const pageSize = 1000;

    try {
      while (true) {
        let query = sb
          .from(config.table)
          .select(columns)
          .order('image_number', { ascending: true, nullsFirst: false })
          .range(from, from + pageSize - 1);

        if (party !== 'ALL') query = query.eq('party', party);

        const { data, error } = await query;
        if (error) break;
        nextRows.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      if (nextRows.length) {
        rows = nextRows;
        lastLoad = now;
      }
    } finally {
      loading = false;
    }

    return rows;
  }

  async function patchCounts(force) {
    const allRows = await loadRows(force);
    const d2dCount = allRows.filter((row) => row.d2d_status === 'visited').length;

    document.querySelectorAll('[data-filter="reached"]').forEach((button) => {
      button.dataset.d2dFixed = 'true';
      const small = button.querySelector('.stat-text small');
      if (small) small.textContent = 'D2D';

      const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && /Reached|D2D/i.test(node.textContent || ''));
      if (textNode) textNode.textContent = textNode.textContent.replace(/Reached/i, 'D2D');

      const strong = button.querySelector('.stat-text strong');
      if (strong) strong.textContent = number(d2dCount);

      const pill = button.querySelector(':scope > span:last-child');
      if (button.classList.contains('tab') && pill) pill.textContent = number(d2dCount);
    });

    const title = document.getElementById('sectionTitle');
    if (title && /^Reached$/i.test(title.textContent.trim())) title.textContent = 'D2D';
  }

  async function showD2D() {
    const allRows = await loadRows(true);
    const filtered = allRows.filter((row) => row.d2d_status === 'visited');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    const list = document.getElementById('voterList');
    if (!title || !filter || !total || !list) return;

    document.querySelectorAll('[data-filter], [data-assign-filter]').forEach((node) => node.classList.remove('active'));
    document.querySelectorAll('[data-filter="reached"]').forEach((node) => node.classList.add('active'));

    title.textContent = 'D2D';
    filter.textContent = 'Showing voters marked D2D Reach / Visited only.';
    total.textContent = `${number(filtered.length)} voters`;
    list.innerHTML = filtered.length
      ? filtered.map(renderCard).join('')
      : '<div class="empty">No D2D visited voters found.</div>';

    setTimeout(() => {
      document.dispatchEvent(new Event('d2d-count-fix-rendered'));
      document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function renderCard(voter) {
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${photo(voter)}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${escapeHtml(voter.name || 'Unknown voter')}</h3><span class="party-tag">${escapeHtml(voter.party || 'Not party')}</span></div>
          <p>${escapeHtml(voter.house || '-')} · ${escapeHtml(voter.phone || 'No phone')}</p>
          <div class="chips">
            ${chip('D2D Reach', 'green')}
            ${chip(voter.vote_status, voter.vote_status === 'will-vote' ? 'green' : voter.vote_status === 'pending' ? 'amber' : '')}
            ${chip(voter.phone_status, voter.phone_status === 'called' ? 'green' : voter.phone_status === 'no-phone' ? 'red' : 'blue')}
            ${chip(voter.support_level, voter.support_level === 'guaranteed' ? 'green' : '')}
          </div>
          <div class="section-label green">D2D</div>
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
      "'": '&#039;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  document.addEventListener('click', (event) => {
    const d2dButton = event.target.closest('[data-filter="reached"]');
    if (!d2dButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showD2D();
  }, true);

  document.addEventListener('submit', (event) => {
    if (event.target?.id !== 'voterForm') return;
    setTimeout(() => patchCounts(true), 1200);
    setTimeout(() => patchCounts(true), 2500);
  }, true);

  document.addEventListener('DOMContentLoaded', () => patchCounts(true));
  window.addEventListener('load', () => patchCounts(true));
  document.addEventListener('d2d-count-fix-rendered', () => patchCounts(false));

  let runs = 0;
  const timer = setInterval(() => {
    patchCounts(false);
    runs += 1;
    if (runs > 80) clearInterval(timer);
  }, 300);
})();