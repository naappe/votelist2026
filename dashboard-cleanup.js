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
    if (event.target.closest('[data-filter], [data-house-filter]')) {
      setTimeout(scrollToList, 80);
    }
    setTimeout(tidyDashboard, 0);
  }, true);

  document.addEventListener('change', tidyDashboard, true);
  new MutationObserver(tidyDashboard).observe(document.documentElement, { childList: true, subtree: true });
  tidyDashboard();
})();
