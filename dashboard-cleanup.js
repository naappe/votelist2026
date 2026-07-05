(function () {
  if (stripNormalShareParams()) return;

  const selectedVoters = new Set();
  const d2dOptions = [
    ['not-visited', 'Not Visited'],
    ['visited', 'Visited'],
    ['not-home', 'Not Home'],
    ['follow-up', 'Follow-up']
  ];

  function scrollToList() {
    document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToSearch() {
    document.querySelector('[aria-label="Search voters"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function stripNormalShareParams() {
    const url = new URL(location.href);
    if (url.searchParams.get('view') === 'read') return false;
    const stale = ['filter', 'zero', 'q'].some((key) => url.searchParams.has(key));
    if (!stale) return false;
    ['filter', 'zero', 'q'].forEach((key) => url.searchParams.delete(key));
    location.replace(url.toString());
    return true;
  }

  function tidyDashboard() {
    applyCleanReadView();
    hideMainBoxFilter();
    ensureZeroDayBoxTabs();
    ensurePanelTools();
    ensureShareSelection();
    ensureD2DField();
    document.querySelectorAll('.logic-box, .rating-box p, .house-main small').forEach((node) => node.remove());

    document.querySelectorAll('.voter-card').forEach((card) => {
      const label = card.querySelector('.section-label');
      if (!label || !/Reached/i.test(label.textContent || '')) return;
      const chips = Array.from(card.querySelectorAll('.chip')).map((chip) => chip.textContent.trim().toLowerCase());
      if (!chips.includes('pending') || chips.includes('need call')) return;
      label.className = 'section-label purple';
      label.textContent = '⏰ Pending';
    });

    const modal = document.getElementById('voterModal');
    if (!modal || modal.hidden) return;
    const modalSection = document.getElementById('modalSection');
    const voteSelect = document.querySelector('#voterForm select[name="vote_status"]');
    if (modalSection && voteSelect?.value === 'pending' && /Reached/i.test(modalSection.textContent || '')) {
      modalSection.textContent = 'Pending';
    }
  }

  function applyCleanReadView() {
    const params = new URLSearchParams(location.search);
    const isReadView = params.get('view') === 'read';
    document.body.classList.toggle('clean-read-view', isReadView);
    if (!isReadView) return;
    document.querySelectorAll('.share-pick, .panel-tools, #shareViewBtn').forEach((node) => node.remove());
  }

  function hideMainBoxFilter() {
    if (document.body.dataset.page === 'zero-day') return;
    const box = document.getElementById('boxSelect');
    const label = box?.closest('label');
    if (label) label.hidden = true;
  }

  function ensureZeroDayBoxTabs() {
    if (document.body.dataset.page !== 'zero-day') return;
    const select = document.getElementById('boxSelect');
    const search = document.getElementById('searchInput');
    const panel = document.querySelector('[aria-label="Search voters"] .form');
    if (!select || !search || !panel) return;

    let tabs = document.getElementById('zeroBoxTabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.id = 'zeroBoxTabs';
      tabs.className = 'box-tabs';
      panel.after(tabs);
    }

    const groups = new Map();
    Array.from(select.options).filter((option) => option.value).forEach((option) => {
      const box = normalizeBox(option.textContent + ' ' + option.value);
      if (!box) return;
      const item = groups.get(box.search) || { ...box, count: 0 };
      item.count += countFromOption(option.textContent);
      groups.set(box.search, item);
    });

    const active = search.value.trim().toLowerCase();
    const nextHtml = [
      `<button class="box-tab ${active ? '' : 'active'}" type="button" data-box-search="">All Boxes</button>`,
      ...Array.from(groups.values())
        .sort((a, b) => a.number - b.number || a.label.localeCompare(b.label))
        .map((item) => `<button class="box-tab ${active === item.search ? 'active' : ''}" type="button" data-box-search="${item.search}">${item.label}${item.count ? ` <span>${item.count}</span>` : ''}</button>`)
    ].join('');
    if (tabs.innerHTML !== nextHtml) tabs.innerHTML = nextHtml;
  }

  function normalizeBox(text) {
    const value = String(text || '');
    const villimale = value.match(/villimale['’]?-?(\d+)/i);
    const boxed = value.match(/\bbox\s*(\d+)\b/i);
    const number = Number((villimale || boxed || [])[1]);
    if (!number) return null;
    return { label: `Box ${number}`, search: `box ${number}`, number };
  }

  function countFromOption(text) {
    const match = String(text || '').match(/\((\d+)\)\s*$/);
    return match ? Number(match[1]) : 0;
  }

  function ensurePanelTools() {
    const head = document.querySelector('.voter-panel .panel-head');
    if (!head || head.querySelector('.panel-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'panel-tools';
    tools.innerHTML = '<button class="btn light compact" type="button" data-jump-search>Filter / Search</button><button class="btn light compact" type="button" data-share-selected>Share Selected <span id="shareSelectedCount">0</span></button><button class="btn light compact" type="button" data-share-read-view>Share Read View</button>';
    head.appendChild(tools);
  }

  function ensureShareSelection() {
    document.querySelectorAll('.voter-card[data-open-voter]').forEach((card) => {
      const id = card.dataset.openVoter;
      if (!id || card.querySelector('[data-share-select]')) return;
      const label = document.createElement('label');
      label.className = 'share-pick';
      label.innerHTML = `<input type="checkbox" data-share-select value="${escapeAttr(id)}" ${selectedVoters.has(id) ? 'checked' : ''}><span>Select</span>`;
      card.appendChild(label);
    });
    updateShareCount();
  }

  function updateShareCount() {
    const count = document.getElementById('shareSelectedCount');
    if (count) count.textContent = String(selectedVoters.size);
  }

  function ensureD2DField() {
    const form = document.getElementById('voterForm');
    const modal = document.getElementById('voterModal');
    if (!form || !modal || modal.hidden || form.elements.d2d_status) return;
    const label = document.createElement('label');
    label.textContent = 'D2D Status';
    const select = document.createElement('select');
    select.name = 'd2d_status';
    d2dOptions.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    label.appendChild(select);
    const remarks = form.querySelector('textarea[name="remarks"]')?.closest('label');
    form.insertBefore(label, remarks || form.querySelector('.modal-actions'));
  }

  async function shareSelected() {
    const ids = Array.from(selectedVoters);
    if (!ids.length) {
      showStatus('Select voters first.');
      return;
    }
    const rows = await selectedRows(ids);
    if (!rows.length) {
      showStatus('Could not prepare selected voters.', true);
      return;
    }
    const url = new URL('shared.html', location.href);
    url.searchParams.set('list', encodePayload(rows));
    navigator.clipboard?.writeText(url.toString()).then(() => {
      showStatus(`Read-only link copied for ${rows.length} selected voters.`);
    }).catch(() => {
      history.replaceState(null, '', url);
      showStatus('Read-only selected voter link ready in address bar.');
    });
  }

  async function shareReadView() {
    const url = new URL(location.href);
    const active = document.querySelector('[data-filter].active')?.dataset.filter || url.searchParams.get('filter') || 'all';
    const term = document.getElementById('searchInput')?.value.trim();
    const party = url.searchParams.get('party') || 'PNC';
    url.search = '';
    url.searchParams.set('party', party);
    url.searchParams.set('view', 'read');
    url.searchParams.set('filter', active);
    if (document.body.dataset.page === 'zero-day') url.searchParams.set('zero', '1');
    if (term) url.searchParams.set('q', term);

    const link = url.toString();
    const preview = window.open(link, '_blank', 'noopener');
    try {
      await navigator.clipboard.writeText(link);
      showShareLink(link, preview ? 'Read-only link copied and opened.' : 'Read-only link copied. Popup was blocked.');
    } catch (error) {
      showShareLink(link, preview ? 'Copy blocked, but link opened.' : 'Copy/open blocked. Use this link.');
    }
  }

  function showShareLink(link, message) {
    showStatus(message);
    const host = document.getElementById('statusMessage') || document.querySelector('.voter-panel');
    if (!host) return;
    let box = document.getElementById('cleanupShareLink');
    if (!box) {
      box = document.createElement('div');
      box.id = 'cleanupShareLink';
      box.style.cssText = 'display:grid;gap:8px;margin:0 0 14px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1f3b66;font-weight:800';
      host.after(box);
    }
    box.innerHTML = `<span>${escapeAttr(message)}</span><input readonly value="${escapeAttr(link)}" style="width:100%;min-height:38px;border:1px solid #bfdbfe;border-radius:10px;padding:8px;background:#fff;color:#111827;font-weight:700"><a href="${escapeAttr(link)}" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:950">Open read-only link</a>`;
    box.querySelector('input')?.select();
  }

  async function selectedRows(ids) {
    const fallback = ids.map((id) => rowFromCard(id)).filter(Boolean);
    try {
      const config = window.APP_CONFIG;
      if (!window.supabase || !config) return fallback;
      const client = window.__shareClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      window.__shareClient = client;
      const { data, error } = await client
        .from(config.table)
        .select('id,national_id,name,house,phone')
        .in('id', ids);
      if (error || !data) return fallback;
      const byId = new Map(data.map((row) => [String(row.id), row]));
      return ids.map((id) => {
        const row = byId.get(String(id));
        const backup = rowFromCard(id) || {};
        return {
          id: row?.national_id || backup.id || id,
          name: row?.name || backup.name || '',
          house: row?.house || backup.house || '',
          mobile: row?.phone || backup.mobile || ''
        };
      });
    } catch (error) {
      return fallback;
    }
  }

  function rowFromCard(id) {
    const card = document.querySelector(`.voter-card[data-open-voter="${cssEscape(id)}"]`);
    if (!card) return null;
    const meta = (card.querySelector('.voter-info p')?.textContent || '').split('·').map((item) => item.trim());
    return {
      id,
      name: card.querySelector('h3')?.textContent.trim() || '',
      house: meta[0] || '',
      mobile: meta[2] || ''
    };
  }

  function encodePayload(rows) {
    const json = JSON.stringify(rows.map((row) => ({
      id: String(row.id || ''),
      name: String(row.name || ''),
      house: String(row.house || ''),
      mobile: String(row.mobile || '')
    })));
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function showStatus(message, isError) {
    const el = document.getElementById('statusMessage');
    if (el) {
      el.textContent = message;
      el.className = `status-message ${isError ? 'error' : 'ok'}`;
      return;
    }
    alert(message);
  }

  function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  document.addEventListener('click', async (event) => {
    if (event.target.closest('.share-pick')) {
      event.stopPropagation();
      return;
    }
    if (event.target.closest('[data-jump-search]')) {
      scrollToSearch();
      return;
    }
    if (event.target.closest('[data-share-selected]')) {
      event.preventDefault();
      event.stopPropagation();
      await shareSelected();
      return;
    }
    if (event.target.closest('[data-share-read-view], #shareViewBtn')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await shareReadView();
      return;
    }
    const boxTab = event.target.closest('[data-box-search]');
    if (boxTab) {
      const search = document.getElementById('searchInput');
      const house = document.getElementById('houseSelect');
      const box = document.getElementById('boxSelect');
      if (house) house.value = '';
      if (box) box.value = '';
      if (search) {
        search.value = boxTab.dataset.boxSearch || '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTimeout(scrollToList, 80);
      return;
    }
    if (event.target.closest('[data-filter], [data-house-filter]')) {
      setTimeout(scrollToList, 80);
    }
    setTimeout(tidyDashboard, 0);
  }, true);

  document.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-share-select]');
    if (checkbox) {
      if (checkbox.checked) selectedVoters.add(checkbox.value);
      else selectedVoters.delete(checkbox.value);
      updateShareCount();
      event.stopPropagation();
      return;
    }
    tidyDashboard();
  }, true);
  let startupRuns = 0;
  const startupTimer = setInterval(() => {
    tidyDashboard();
    startupRuns += 1;
    if (startupRuns >= 20) clearInterval(startupTimer);
  }, 500);
  window.addEventListener('load', tidyDashboard);
  tidyDashboard();
})();
