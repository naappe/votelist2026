(function () {
  const voteOptions = [
    ['garentee', 'Garentee', { vote_status: 'will-vote', support_level: 'guaranteed' }],
    ['will-vote', 'Will Vote', { vote_status: 'will-vote', support_level: 'normal' }],
    ['no-vote', 'Not Give Vote', { vote_status: 'no-vote', support_level: 'normal' }],
    ['not-decided', 'Not Decided', { vote_status: 'not-decided', support_level: 'normal' }]
  ];
  const callOptions = [
    ['called', 'Connected', { call_result: 'called' }],
    ['out-of-range', 'Out of Coverage', { call_result: 'out-of-range', d2d_status: 'follow-up' }],
    ['busy', 'Busy', { call_result: 'busy', d2d_status: 'follow-up' }],
    ['switched-off', 'Not Answer', { call_result: 'switched-off', d2d_status: 'follow-up' }],
    ['disconnected', 'Disconnected', { call_result: 'disconnected', d2d_status: 'follow-up' }]
  ];
  const transportOptions = [
    ['need-transport', 'Need', { transport_status: 'need-transport' }],
    ['not-needed', 'Not Want', { transport_status: 'not-needed' }],
    ['arranged', 'Place To Pick', { transport_status: 'arranged' }]
  ];
  const d2dOptions = [
    ['visited', 'Reach', { d2d_status: 'visited' }],
    ['not-home', 'Not Home', { d2d_status: 'not-home' }],
    ['follow-up', 'Live In Another Place', { d2d_status: 'follow-up' }]
  ];

  function arrangeForm() {
    const modal = document.getElementById('voterModal');
    const form = document.getElementById('voterForm');
    if (!modal || modal.hidden || !form) return;

    ensureField(form, 'vote_status', 'not-decided');
    ensureField(form, 'support_level', 'normal');
    ensureField(form, 'call_result', 'called');
    ensureField(form, 'transport_status', 'not-needed');
    ensureField(form, 'd2d_status', 'not-visited');

    hideNative(form, 'vote_status');
    hideNative(form, 'support_level');
    hideNative(form, 'call_result');
    hideNative(form, 'transport_status');
    hideNative(form, 'd2d_status');

    const voteValue = form.elements.support_level.value === 'guaranteed'
      ? 'garentee'
      : form.elements.vote_status.value === 'will-vote'
        ? 'will-vote'
        : form.elements.vote_status.value === 'no-vote'
          ? 'no-vote'
          : 'not-decided';

    renderGroup(form, 'vote', 'Vote', voteOptions, voteValue);
    renderGroup(form, 'call', 'Call Center', callOptions, form.elements.call_result.value || 'called');
    renderGroup(form, 'transport', 'Transportation', transportOptions, form.elements.transport_status.value || 'not-needed');
    renderGroup(form, 'd2d', 'D2D', d2dOptions, form.elements.d2d_status.value || 'not-visited');
  }

  function ensureField(form, name, value) {
    if (form.elements[name]) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.insertBefore(input, form.querySelector('.modal-actions'));
  }

  function hideNative(form, name) {
    const field = form.elements[name];
    if (!field) return;
    if (field.tagName === 'SELECT') {
      const label = field.closest('label');
      if (label) label.hidden = true;
      return;
    }
    const parent = field.parentElement;
    if (parent && parent !== form && parent.querySelector('.choice-grid')) {
      parent.hidden = true;
      return;
    }
    const next = field.nextElementSibling;
    if (next && next.querySelector && next.querySelector('.choice-grid')) next.hidden = true;
  }

  function renderGroup(form, key, title, options, active) {
    let group = form.querySelector(`[data-campaign-group="${key}"]`);
    if (!group) {
      group = document.createElement('div');
      group.className = 'campaign-choice-group';
      group.dataset.campaignGroup = key;
      const remarks = form.querySelector('textarea[name="remarks"]')?.closest('label');
      form.insertBefore(group, remarks || form.querySelector('.modal-actions'));
    }
    group.innerHTML = '<label>' + escapeHtml(title) + '</label><div class="choice-grid">' + options.map(([value, text, fields]) => {
      return '<button class="choice-btn ' + (value === active ? 'active' : '') + '" type="button" data-campaign-choice="' + escapeHtml(key) + '" data-fields="' + escapeHtml(JSON.stringify(fields)) + '">' + escapeHtml(text) + '</button>';
    }).join('') + '</div>';
  }

  function setChoice(button) {
    const form = document.getElementById('voterForm');
    if (!form) return;
    let fields = {};
    try {
      fields = JSON.parse(button.dataset.fields || '{}');
    } catch {
      return;
    }
    Object.entries(fields).forEach(([name, value]) => {
      ensureField(form, name, value);
      form.elements[name].value = value;
    });
    const group = button.closest('[data-campaign-group]');
    group?.querySelectorAll('[data-campaign-choice]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  }

  async function cleanShareLink() {
    const current = new URL(location.href);
    const clean = new URL(current.pathname.split('/').pop() || 'dashboard.html', location.href);
    const party = current.searchParams.get('party') || 'PNC';
    const filter = document.querySelector('[data-filter].active')?.dataset.filter || current.searchParams.get('filter') || 'all';
    const query = document.getElementById('searchInput')?.value.trim() || current.searchParams.get('q') || '';
    clean.search = '';
    clean.hash = '';
    clean.username = '';
    clean.password = '';
    clean.searchParams.set('party', party);
    clean.searchParams.set('view', 'read');
    clean.searchParams.set('filter', filter);
    if (document.body.dataset.page === 'zero-day') clean.searchParams.set('zero', '1');
    if (query) clean.searchParams.set('q', query);
    const link = clean.toString();

    try {
      await navigator.clipboard.writeText(link);
      showStatus('Clean read-only link copied. No username or password included.');
    } catch {
      showStatus('Clean read-only link ready below. No username or password included.');
    }
    showLink(link);
  }

  function showStatus(message) {
    const status = document.getElementById('statusMessage');
    if (!status) return;
    status.textContent = message;
    status.className = 'status-message ok';
  }

  function showLink(link) {
    const status = document.getElementById('statusMessage') || document.querySelector('.voter-panel');
    if (!status) return;
    let box = document.getElementById('cleanShareLinkBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'cleanShareLinkBox';
      box.style.cssText = 'display:grid;gap:8px;margin:0 0 14px;padding:12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1f3b66;font-weight:800';
      status.after(box);
    }
    box.innerHTML = '<input readonly value="' + escapeHtml(link) + '" style="width:100%;min-height:38px;border:1px solid #bfdbfe;border-radius:10px;padding:8px;background:#fff;color:#111827;font-weight:700"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:950">Open read-only link</a>';
    box.querySelector('input')?.select();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  document.addEventListener('click', async (event) => {
    const choice = event.target.closest('[data-campaign-choice]');
    if (choice) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setChoice(choice);
      return;
    }
    if (event.target.closest('[data-share-read-view], #shareViewBtn')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await cleanShareLink();
    }
  }, true);

  let runs = 0;
  const timer = setInterval(() => {
    arrangeForm();
    runs += 1;
    if (runs >= 80) clearInterval(timer);
  }, 250);
  window.addEventListener('load', arrangeForm);
  document.addEventListener('click', () => setTimeout(arrangeForm, 0), true);
})();
