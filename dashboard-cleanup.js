(function () {
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

  function tidyDashboard() {
    hideMainBoxFilter();
    ensureZeroDayBoxTabs();
    ensurePanelTools();
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
    tabs.innerHTML = [
      `<button class="box-tab ${active ? '' : 'active'}" type="button" data-box-search="">All Boxes</button>`,
      ...Array.from(groups.values())
        .sort((a, b) => a.number - b.number || a.label.localeCompare(b.label))
        .map((item) => `<button class="box-tab ${active === item.search ? 'active' : ''}" type="button" data-box-search="${item.search}">${item.label}${item.count ? ` <span>${item.count}</span>` : ''}</button>`)
    ].join('');
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
    tools.innerHTML = '<button class="btn light compact" type="button" data-jump-search>Filter / Search</button><button class="btn light compact" type="button" data-share-read-view>Share Read View</button>';
    head.appendChild(tools);
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

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-jump-search]')) {
      scrollToSearch();
      return;
    }
    if (event.target.closest('[data-share-read-view]')) {
      document.getElementById('shareViewBtn')?.click();
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

  document.addEventListener('change', tidyDashboard, true);
  new MutationObserver(tidyDashboard).observe(document.documentElement, { childList: true, subtree: true });
  tidyDashboard();
})();
