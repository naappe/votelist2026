(function () {
  const config = window.APP_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  const columns = [
    'id',
    'image_number',
    'photo_url',
    'name',
    'national_id',
    'house',
    'lives_in',
    'phone',
    'party',
    'election_box',
    'phone_status',
    'reach_status',
    'vote_status',
    'transport_status',
    'd2d_status',
    'remarks',
    'support_level',
    'vote_assigned_by',
    'vote_assigned_at'
  ].join(',');

  const filters = [
    { key: 'all', label: 'All', icon: '👥', tone: 'blue', rule: 'All voters in the current dashboard scope.' },
    { key: 'need-call', label: 'Need Call', icon: '📞', tone: 'yellow', rule: 'Phone contact is required. Called moves to reached; missed results move to follow-up.' },
    { key: 'reached', label: 'Reached', icon: '✅', tone: 'green', rule: 'Contact was successful. Save vote decision and notes.' },
    { key: 'will-vote', label: 'Will Vote', icon: '👍', tone: 'green', rule: 'Committed supporters. Track support strength and transport needs.' },
    { key: 'pending', label: 'Pending', icon: '⏰', tone: 'purple', rule: 'Awaiting decision. Save call result, vote decision, and notes.' },
    { key: 'no-phone', label: 'No Phone', icon: '🚫', tone: 'red', rule: 'Missing contact information. Add phone or send to door-to-door follow-up.' },
    { key: 'need-transport', label: 'Transport', icon: '🚗', tone: 'yellow', rule: 'Ride assistance needed. Track arranged and picked-up progress.' },
    { key: 'follow-up', label: 'Follow-up', icon: '🔄', tone: 'pink', rule: 'Needs revisit or recontact. Update D2D, call result, and vote decision.' }
  ];

  const state = {
    rows: [],
    user: null,
    role: null,
    partyScope: 'ALL',
    activeFilter: 'all',
    zeroDayMode: false,
    searchField: 'all',
    searchTerm: '',
    selectedVoter: null
  };

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'login') initLogin();
    if (page === 'dashboard') initDashboard();
  });

  function initLogin() {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('loginMessage');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.className = 'message';
      message.textContent = '';

      const data = new FormData(form);
      const username = String(data.get('username') || '').trim();
      const password = String(data.get('password') || '');
      const account = Object.values(config.loginUsers).find((item) => item.username === username);

      if (!account) {
        showLoginError(message, 'Username not found.');
        return;
      }

      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Checking...';

      const { error } = await client.auth.signInWithPassword({ email: account.email, password });
      button.disabled = false;
      button.textContent = 'Login';

      if (error) {
        showLoginError(message, error.message);
        return;
      }

      const next = new URLSearchParams(location.search).get('next') || 'dashboard.html?party=ALL';
      location.href = next;
    });
  }

  async function initDashboard() {
    bindEvents();

    const { data } = await client.auth.getSession();
    if (!data.session) {
      location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }

    state.user = data.session.user;
    state.role = await resolveRole(state.user);
    state.partyScope = resolvePartyScope();

    if (state.role.party && state.partyScope !== state.role.party) {
      state.partyScope = state.role.party;
      const url = new URL(location.href);
      url.searchParams.set('party', state.partyScope);
      history.replaceState(null, '', url);
    }

    renderShell();
    await loadRows();
  }

  function bindEvents() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await client.auth.signOut();
      location.href = 'index.html';
    });

    document.getElementById('refreshBtn').addEventListener('click', loadRows);

    const searchInput = document.getElementById('searchInput');
    const searchField = document.getElementById('searchField');
    const houseSelect = document.getElementById('houseSelect');
    const boxSelect = document.getElementById('boxSelect');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const zeroDayBtn = document.getElementById('zeroDayBtn');
    if (zeroDayBtn) {
      zeroDayBtn.addEventListener('click', () => {
        state.zeroDayMode = true;
        state.activeFilter = 'all';
        state.searchField = 'all';
        state.searchTerm = '';
        if (searchInput) searchInput.value = '';
        if (searchField) searchField.value = 'all';
        if (houseSelect) houseSelect.value = '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
        document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (searchField) {
      searchField.addEventListener('change', (event) => {
        state.searchField = event.target.value;
        state.zeroDayMode = false;
        if (state.searchTerm) state.activeFilter = 'all';
        if (state.searchField !== 'house' && houseSelect) houseSelect.value = '';
        if (state.searchField !== 'election_box' && boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (houseSelect) {
      houseSelect.addEventListener('change', (event) => {
        const value = event.target.value;
        state.zeroDayMode = false;
        state.searchField = value ? 'house' : 'all';
        state.searchTerm = value;
        state.activeFilter = 'all';
        if (searchField) searchField.value = state.searchField;
        if (searchInput) searchInput.value = event.target.selectedOptions[0]?.dataset.label || '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (boxSelect) {
      boxSelect.addEventListener('change', (event) => {
        const value = event.target.value;
        state.zeroDayMode = false;
        state.searchField = value ? 'election_box' : 'all';
        state.searchTerm = value;
        state.activeFilter = 'all';
        if (searchField) searchField.value = state.searchField;
        if (searchInput) searchInput.value = event.target.selectedOptions[0]?.dataset.label || '';
        if (houseSelect) houseSelect.value = '';
        renderDashboard();
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        state.searchTerm = event.target.value.trim().toLowerCase();
        state.zeroDayMode = false;
        if (state.searchTerm) state.activeFilter = 'all';
        if (state.searchField !== 'house' && houseSelect) houseSelect.value = '';
        if (state.searchField !== 'election_box' && boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.zeroDayMode = false;
        state.searchField = 'all';
        state.searchTerm = '';
        searchInput.value = '';
        if (searchField) searchField.value = 'all';
        if (houseSelect) houseSelect.value = '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }

    document.addEventListener('click', (event) => {
      const filterButton = event.target.closest('[data-filter]');
      if (filterButton) {
        state.zeroDayMode = false;
        state.activeFilter = filterButton.dataset.filter;
        state.searchField = 'all';
        state.searchTerm = '';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        const select = document.getElementById('searchField');
        if (select) select.value = 'all';
        const house = document.getElementById('houseSelect');
        if (house) house.value = '';
        const box = document.getElementById('boxSelect');
        if (box) box.value = '';
        renderDashboard();
        return;
      }

      const houseButton = event.target.closest('[data-house-filter]');
      if (houseButton) {
        state.zeroDayMode = false;
        state.activeFilter = 'all';
        state.searchField = 'house';
        state.searchTerm = houseButton.dataset.houseFilter;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = houseButton.dataset.houseLabel || houseButton.dataset.houseFilter;
        const field = document.getElementById('searchField');
        if (field) field.value = 'house';
        const house = document.getElementById('houseSelect');
        if (house) house.value = houseButton.dataset.houseFilter;
        const box = document.getElementById('boxSelect');
        if (box) box.value = '';
        renderDashboard();
        return;
      }

      const voterCard = event.target.closest('[data-open-voter]');
      if (voterCard) {
        const voter = state.rows.find((row) => String(row.id) === voterCard.dataset.openVoter);
        if (voter) openVoter(voter);
        return;
      }

      const option = event.target.closest('[data-choice]');
      if (option) {
        const form = document.getElementById('voterForm');
        const input = form.elements[option.dataset.name];
        form.querySelectorAll(`[data-name="${option.dataset.name}"]`).forEach((button) => button.classList.remove('active'));
        option.classList.add('active');
        input.value = option.dataset.choice;
        return;
      }

      if (event.target.closest('[data-close-modal]')) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function loadRows() {
    setStatus('Loading voters...');
    let from = 0;
    const pageSize = 1000;
    let rows = [];

    while (true) {
      let query = client
        .from(config.table)
        .select(columns)
        .order('image_number', { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);

      if (state.partyScope !== 'ALL') query = query.eq('party', state.partyScope);

      const { data, error } = await query;
      if (error) {
        setStatus(error.message, true);
        return;
      }

      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    state.rows = rows;
    setStatus('');
    renderDashboard();
  }

  function renderShell() {
    const title = state.partyScope === 'ALL' ? 'Voter Manager Dashboard' : `${state.partyScope} Voter Manager`;
    const subtitle = state.partyScope === 'ALL'
      ? 'Filter voters, open a card, then complete campaign work inside the popup.'
      : `Showing only ${state.partyScope} voters. Sections filter the grid; popups save campaign work.`;
    document.getElementById('dashboardTitle').textContent = title;
    document.getElementById('dashboardSubtitle').textContent = subtitle;
  }

  function renderDashboard() {
    renderShell();
    renderSearchControls();
    renderStats();
    renderTabs();
    renderInsights();
    renderGrid();
  }

  function renderStats() {
    document.getElementById('summary').innerHTML = filters.map((filter) => {
      const value = countFor(filter.key);
      return `
        <button class="stat-card ${filter.tone} ${!state.zeroDayMode && state.activeFilter === filter.key ? 'active' : ''}" data-filter="${filter.key}" type="button">
          <span class="stat-icon">${filter.icon}</span>
          <span class="stat-text">
            <strong>${number(value)}</strong>
            <small>${escapeHtml(filter.label)}</small>
          </span>
        </button>
      `;
    }).join('');
  }

  function renderTabs() {
    document.getElementById('sections').innerHTML = filters.map((filter) => `
      <button class="tab ${!state.zeroDayMode && state.activeFilter === filter.key ? 'active' : ''}" data-filter="${filter.key}" type="button">
        ${escapeHtml(filter.label)}
        <span>${number(countFor(filter.key))}</span>
      </button>
    `).join('');
  }

  function renderSearchControls() {
    const zeroDayBtn = document.getElementById('zeroDayBtn');
    const searchField = document.getElementById('searchField');
    const houseSelect = document.getElementById('houseSelect');
    const boxSelect = document.getElementById('boxSelect');
    if (zeroDayBtn) zeroDayBtn.classList.toggle('active', state.zeroDayMode);
    if (searchField) searchField.value = state.searchField;

    if (houseSelect) {
      const selectedHouse = state.searchField === 'house' ? state.searchTerm : '';
      houseSelect.innerHTML = '<option value="">All houses</option>' + houseOptions(state.rows).map((item) => `
        <option value="${escapeAttr(item.search)}" data-label="${escapeAttr(item.house)}" ${item.search === selectedHouse ? 'selected' : ''}>
          ${escapeHtml(item.house)} (${number(item.count)})
        </option>
      `).join('');
    }

    if (boxSelect) {
      const selectedBox = state.searchField === 'election_box' ? state.searchTerm : '';
      boxSelect.innerHTML = '<option value="">All boxes</option>' + boxOptions(state.rows).map((item) => `
        <option value="${escapeAttr(item.search)}" data-label="${escapeAttr(item.box)}" ${item.search === selectedBox ? 'selected' : ''}>
          ${escapeHtml(item.box)} (${number(item.count)})
        </option>
      `).join('');
    }
  }

  function renderInsights() {
    const targetEl = document.getElementById('targetStats');
    const progressEl = document.getElementById('targetProgressBar');
    const predictionEl = document.getElementById('targetPrediction');
    const topHousesEl = document.getElementById('topHouses');
    if (!targetEl || !progressEl || !predictionEl || !topHousesEl) return;

    const opponentVotes = 428;
    const targetVotes = opponentVotes + 1;
    const committed = state.rows.filter((row) => row.vote_status === 'will-vote').length;
    const guaranteed = state.rows.filter((row) => row.support_level === 'guaranteed').length;
    const gap = Math.max(0, targetVotes - committed);
    const progress = Math.min(100, Math.round((committed / targetVotes) * 100));
    const poolGap = Math.max(0, targetVotes - state.rows.length);

    targetEl.innerHTML = [
      ['Opponent', opponentVotes],
      ['Target', targetVotes],
      ['Committed', committed],
      ['Need More', gap],
      ['Progress', `${progress}%`],
      ['Guaranteed', guaranteed]
    ].map(([labelText, value]) => `
      <div class="metric">
        <strong>${typeof value === 'number' ? number(value) : escapeHtml(value)}</strong>
        <span>${escapeHtml(labelText)}</span>
      </div>
    `).join('');

    progressEl.style.width = `${progress}%`;
    if (committed >= targetVotes) {
      predictionEl.textContent = 'Prediction: winning if committed voters hold.';
      predictionEl.className = 'prediction good';
    } else if (state.rows.length >= targetVotes) {
      predictionEl.textContent = `Prediction: possible to win. Need ${number(gap)} more committed voters.`;
      predictionEl.className = 'prediction warn';
    } else {
      predictionEl.textContent = `Prediction: current pool is short by ${number(poolGap)} voters against target.`;
      predictionEl.className = 'prediction bad';
    }

    const houses = topHouses(state.rows);
    topHousesEl.innerHTML = houses.length
      ? houses.map((item, index) => `
        <button class="house-row" type="button" data-house-filter="${escapeAttr(item.search)}" data-house-label="${escapeAttr(item.house)}">
          <span class="house-main">
            <span>${index + 1}. ${escapeHtml(item.house)}</span>
            <small>${escapeHtml(item.status)} · ${number(item.needCall)} need call · ${number(item.followUp)} follow-up</small>
          </span>
          <strong>${number(item.count)}</strong>
        </button>
      `).join('')
      : '<div class="empty small">No house data.</div>';
  }

  function renderGrid() {
    const filter = getFilter(state.activeFilter);
    const allSectionRows = state.zeroDayMode
      ? zeroDayRows(state.rows)
      : state.searchTerm
        ? state.rows
        : getRows(state.activeFilter);
    const rows = state.zeroDayMode ? allSectionRows : applySearch(allSectionRows);
    document.getElementById('sectionTitle').textContent = state.zeroDayMode
      ? 'Zero Day Priority'
      : state.searchTerm
        ? 'Search Results'
        : filter.label;
    document.getElementById('sectionFilter').textContent = state.zeroDayMode
      ? 'Call-first house priority: need-call, follow-up, pending, no-phone, and transport status.'
      : state.searchTerm
        ? `Searching ${state.searchField === 'all' ? 'all fields' : label(state.searchField)} across ${state.partyScope} voters. Showing ${number(rows.length)} matches.`
        : filter.rule;
    document.getElementById('sectionTotal').textContent = `${number(rows.length)} voters`;
    document.getElementById('voterList').innerHTML = rows.length
      ? rows.map(renderVoterCard).join('')
      : '<div class="empty">No voters in this section right now.</div>';
  }

  function renderVoterCard(voter) {
    const section = getFilter(sectionFor(voter));
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${renderPhoto(voter)}</div>
        <div class="voter-info">
          <div class="voter-title">
            <h3>${escapeHtml(voter.name || 'Unknown voter')}</h3>
            <span class="party-tag">${escapeHtml(voter.party || 'Not party')}</span>
          </div>
          <p>${escapeHtml(voter.house || '-')} · Box ${escapeHtml(voter.election_box || '-')} · ${escapeHtml(voter.phone || 'No phone')}</p>
          <div class="chips">
            ${chip(voter.reach_status, voter.reach_status === 'reached' ? 'green' : 'red')}
            ${chip(voter.vote_status, voter.vote_status === 'will-vote' ? 'green' : voter.vote_status === 'pending' ? 'amber' : '')}
            ${chip(voter.phone_status, voter.phone_status === 'called' ? 'green' : voter.phone_status === 'no-phone' ? 'red' : 'blue')}
            ${chip(voter.support_level, voter.support_level === 'guaranteed' ? 'green' : '')}
          </div>
          <div class="section-label ${section.tone}">${section.icon} ${escapeHtml(section.label)}</div>
        </div>
      </article>
    `;
  }

  function openVoter(voter) {
    const sectionKey = state.activeFilter === 'all' ? sectionFor(voter) : state.activeFilter;
    const section = getFilter(sectionKey);
    state.selectedVoter = voter;

    document.getElementById('modalSection').textContent = section.label;
    document.getElementById('modalTitle').textContent = voter.name || 'Unknown voter';
    document.getElementById('modalMeta').textContent = `${voter.house || '-'} · Box ${voter.election_box || '-'} · ${voter.phone || 'No phone'}`;
    document.getElementById('modalPhoto').src = voter.photo_url || '';
    document.getElementById('modalPhoto').alt = voter.name || 'Voter photo';
    document.getElementById('voterForm').innerHTML = renderModalForm(sectionKey, voter);
    document.getElementById('voterForm').onsubmit = (event) => saveVoter(event, sectionKey);
    document.getElementById('voterModal').hidden = false;
  }

  function renderModalForm(sectionKey, voter) {
    const section = getFilter(sectionKey);
    const common = `
      <label>Remarks
        <textarea name="remarks" placeholder="Short campaign note">${escapeHtml(voter.remarks || '')}</textarea>
      </label>
      <div class="modal-actions">
        <button class="btn light" type="button" data-close-modal>Cancel</button>
        <button class="btn" type="submit">Save Section</button>
      </div>
    `;

    const intro = `
      <div class="logic-box">
        <strong>${section.icon} ${escapeHtml(section.label)} Function</strong>
        <p>${escapeHtml(section.rule)}</p>
      </div>
    `;

    if (sectionKey === 'need-call') return intro + phoneField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'reached') return intro + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'will-vote') return intro + supportField(voter) + transportField(voter) + common;
    if (sectionKey === 'pending') return intro + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'no-phone') return intro + phoneField(voter, 'New Phone') + d2dField(voter) + common;
    if (sectionKey === 'need-transport') return intro + transportField(voter, 'need-transport') + supportField(voter) + common;
    if (sectionKey === 'follow-up') return intro + d2dField(voter) + voteField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + transportField(voter) + common;
    return intro + voteField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + supportField(voter) + transportField(voter) + d2dField(voter) + common;
  }

  async function saveVoter(event, sectionKey) {
    event.preventDefault();
    const voter = state.selectedVoter;
    if (!voter) return;

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';

    const formData = Object.fromEntries(new FormData(form).entries());
    const updates = buildUpdates(sectionKey, voter, formData);

    let query = client.from(config.table).update(updates).eq('id', voter.id);
    if (state.partyScope !== 'ALL') query = query.eq('party', state.partyScope);

    const { data, error } = await query.select(columns).single();
    button.disabled = false;
    button.textContent = 'Save Section';

    if (error) {
      setStatus(error.message, true);
      return;
    }

    state.rows = state.rows.map((row) => row.id === voter.id ? data : row);
    closeModal();
    renderDashboard();
    setStatus('Saved. Voter moved to the correct section.');
  }

  function buildUpdates(sectionKey, voter, data) {
    const updates = {
      remarks: clean(data.remarks) || voter.remarks || null,
      vote_assigned_by: state.user.email,
      vote_assigned_at: new Date().toISOString()
    };

    if (data.phone !== undefined) {
      const phone = clean(data.phone);
      if (phone) updates.phone = phone;
    }
    if (data.vote_status) updates.vote_status = data.vote_status;
    if (data.support_level) updates.support_level = data.support_level;
    if (data.transport_status) updates.transport_status = data.transport_status;
    if (data.d2d_status) updates.d2d_status = data.d2d_status;
    if (data.call_result) applyCallResult(updates, data.call_result);

    if (sectionKey === 'need-call' && data.call_result === 'called') updates.reach_status = 'reached';
    if (sectionKey === 'reached') updates.reach_status = 'reached';
    if (sectionKey === 'will-vote') {
      updates.vote_status = 'will-vote';
      updates.reach_status = 'reached';
    }
    if (sectionKey === 'no-phone') {
      if (clean(data.phone)) {
        updates.phone_status = 'need-call';
        updates.d2d_status = data.d2d_status || 'not-visited';
      } else {
        updates.phone_status = 'no-phone';
        updates.d2d_status = data.d2d_status || 'follow-up';
      }
    }
    if (sectionKey === 'need-transport') {
      updates.vote_status = 'will-vote';
      updates.reach_status = 'reached';
      updates.transport_status = data.transport_status || 'need-transport';
    }
    if (['need-transport', 'arranged', 'picked-up'].includes(updates.transport_status)) {
      updates.vote_status = 'will-vote';
      updates.reach_status = 'reached';
    }
    if (sectionKey === 'follow-up' && data.vote_status === 'will-vote') updates.reach_status = 'reached';
    if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
    if (['no-vote', 'not-decided'].includes(updates.vote_status)) updates.d2d_status = updates.d2d_status || 'follow-up';

    return updates;
  }

  function applyCallResult(updates, result) {
    updates.phone_status = result;
    if (result === 'called') {
      updates.reach_status = 'reached';
      return;
    }
    updates.reach_status = 'not-reached';
    if (['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range', 'no-phone'].includes(result)) {
      updates.d2d_status = 'follow-up';
    }
  }

  function phoneField(voter, labelText) {
    return `
      <label>${escapeHtml(labelText || 'Phone')}
        <input name="phone" value="${escapeAttr(voter.phone || '')}" placeholder="Phone number">
      </label>
    `;
  }

  function voteField(voter) {
    return `
      <label>Vote Decision
        ${select('vote_status', ['pending', 'will-vote', 'no-vote', 'not-decided'], voter.vote_status || 'pending')}
      </label>
    `;
  }

  function supportField(voter) {
    return `
      <label>Support Level
        ${select('support_level', ['normal', 'guaranteed'], voter.support_level || 'normal')}
      </label>
    `;
  }

  function transportField(voter, fallback) {
    return `
      <label>Transport Status
        ${select('transport_status', ['not-needed', 'need-transport', 'arranged', 'picked-up'], voter.transport_status || fallback || 'not-needed')}
      </label>
    `;
  }

  function d2dField(voter) {
    return `
      <label>D2D Status
        ${select('d2d_status', ['not-visited', 'visited', 'not-home', 'follow-up'], voter.d2d_status || 'not-visited')}
      </label>
    `;
  }

  function choiceGroup(name, options, active) {
    return `
      <input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(active)}">
      <div>
        <label>${label(name)}</label>
        <div class="choice-grid">
          ${options.map(([value, text]) => `
            <button class="choice-btn ${value === active ? 'active' : ''}" type="button" data-name="${escapeAttr(name)}" data-choice="${escapeAttr(value)}">
              ${escapeHtml(text)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function callOptions() {
    return [
      ['called', 'Called'],
      ['busy', 'Busy'],
      ['switched-off', 'Switched Off'],
      ['disconnected', 'Disconnected'],
      ['wrong-number', 'Wrong Number'],
      ['no-phone', 'No Phone']
    ];
  }

  function select(name, values, active) {
    return `
      <select name="${escapeAttr(name)}">
        ${values.map((value) => `<option value="${escapeAttr(value)}" ${value === active ? 'selected' : ''}>${label(value)}</option>`).join('')}
      </select>
    `;
  }

  function countFor(key) {
    return getRows(key).length;
  }

  function topHouses(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const house = houseGroupName(row.house);
      const item = groups.get(house) || {
        house,
        search: house.toLowerCase(),
        count: 0,
        needCall: 0,
        followUp: 0,
        pending: 0,
        noPhone: 0,
        transport: 0,
        score: 0
      };
      item.count += 1;
      item.needCall += row.phone_status === 'need-call' && hasPhone(row) ? 1 : 0;
      item.followUp += isFollowUp(row) ? 1 : 0;
      item.pending += row.vote_status === 'pending' ? 1 : 0;
      item.noPhone += row.phone_status === 'no-phone' || !hasPhone(row) ? 1 : 0;
      item.transport += row.transport_status === 'need-transport' ? 1 : 0;
      item.score += voterPriority(row);
      groups.set(house, item);
    });
    return Array.from(groups.values()).map((item) => ({
      ...item,
      status: housePriorityStatus(item)
    }))
      .sort((a, b) => b.count - a.count || a.house.localeCompare(b.house))
      .slice(0, 10);
  }

  function houseOptions(rows) {
    return topHouses(rows)
      .concat(extraHouseOptions(rows))
      .filter((item, index, list) => list.findIndex((other) => other.search === item.search) === index)
      .sort((a, b) => a.house.localeCompare(b.house));
  }

  function boxOptions(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const box = clean(row.election_box) || 'No box';
      const key = box.toLowerCase();
      const item = groups.get(key) || { box, search: key, count: 0 };
      item.count += 1;
      groups.set(key, item);
    });
    return Array.from(groups.values())
      .sort((a, b) => boxSortValue(a.box) - boxSortValue(b.box) || a.box.localeCompare(b.box));
  }

  function boxSortValue(value) {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  function extraHouseOptions(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const house = houseGroupName(row.house);
      const item = groups.get(house) || { house, search: house.toLowerCase(), count: 0 };
      item.count += 1;
      groups.set(house, item);
    });
    return Array.from(groups.values());
  }

  function zeroDayRows(rows) {
    const houseScores = new Map();
    rows.forEach((row) => {
      const key = houseGroupName(row.house).toLowerCase();
      houseScores.set(key, (houseScores.get(key) || 0) + voterPriority(row));
    });
    return rows
      .filter((row) => voterPriority(row) > 0)
      .sort((a, b) => {
        const houseDiff = (houseScores.get(houseGroupName(b.house).toLowerCase()) || 0)
          - (houseScores.get(houseGroupName(a.house).toLowerCase()) || 0);
        if (houseDiff) return houseDiff;
        const priorityDiff = voterPriority(b) - voterPriority(a);
        if (priorityDiff) return priorityDiff;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }

  function voterPriority(row) {
    if (row.phone_status === 'need-call' && hasPhone(row)) return 100;
    if (isFollowUp(row)) return 85;
    if (row.vote_status === 'pending') return 65;
    if (row.transport_status === 'need-transport') return 55;
    if (row.phone_status === 'no-phone' || !hasPhone(row)) return 35;
    return 0;
  }

  function housePriorityStatus(item) {
    if (item.needCall) return 'Call first';
    if (item.followUp) return 'Follow-up';
    if (item.pending) return 'Pending';
    if (item.noPhone) return 'Find phone';
    if (item.transport) return 'Transport';
    return 'Stable';
  }

  function houseGroupName(value) {
    const house = clean(value) || 'Unknown house';
    const normalized = house.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['`’.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = normalized.replace(/\s+/g, '');
    if (/^df\d*/.test(compact) || compact.startsWith('dhafthar') || compact.startsWith('dafthar')) return 'Dhafthar';
    if (compact.includes('sinamale') || compact.includes('sinamle')) return 'Sinamale';
    return house;
  }

  function applySearch(rows) {
    if (!state.searchTerm) return rows;
    return rows.filter((row) => searchText(row).includes(state.searchTerm));
  }

  function searchText(row) {
    const fields = {
      name: [row.name],
      national_id: [row.national_id],
      phone: [row.phone],
      house: [row.house, houseGroupName(row.house)],
      election_box: [row.election_box, boxSearchAlias(row.election_box)],
      party: [row.party]
    };
    const values = state.searchField === 'all'
      ? [row.name, row.national_id, row.phone, row.house, houseGroupName(row.house), row.election_box, boxSearchAlias(row.election_box), row.party, row.lives_in]
      : fields[state.searchField] || [];
    return values.map((value) => String(value || '').toLowerCase()).join(' ');
  }

  function boxSearchAlias(value) {
    const text = String(value || '');
    const villimale = text.match(/villimale['’]?-?(\d+)/i);
    if (villimale) return `box ${villimale[1]} villimale ${villimale[1]}`;
    const firstNumber = text.match(/^\s*(\d+)/);
    return firstNumber ? `box ${firstNumber[1]}` : '';
  }

  function getRows(key) {
    if (key === 'all') return state.rows;
    return state.rows.filter((row) => {
      if (key === 'need-call') return row.phone_status === 'need-call' && hasPhone(row);
      if (key === 'reached') return row.reach_status === 'reached';
      if (key === 'will-vote') return row.vote_status === 'will-vote';
      if (key === 'pending') return row.vote_status === 'pending';
      if (key === 'no-phone') return row.phone_status === 'no-phone' || !hasPhone(row);
      if (key === 'need-transport') return row.transport_status === 'need-transport';
      if (key === 'follow-up') return isFollowUp(row);
      return false;
    });
  }

  function sectionFor(row) {
    if (row.phone_status === 'no-phone' || !hasPhone(row)) return 'no-phone';
    if (row.transport_status === 'need-transport') return 'need-transport';
    if (isFollowUp(row)) return 'follow-up';
    if (row.vote_status === 'will-vote') return 'will-vote';
    if (row.reach_status === 'reached') return 'reached';
    if (row.vote_status === 'pending') return 'pending';
    if (row.phone_status === 'need-call') return 'need-call';
    return 'all';
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function hasPhone(row) {
    return Boolean(String(row.phone || '').trim());
  }

  function getFilter(key) {
    return filters.find((filter) => filter.key === key) || filters[0];
  }

  async function resolveRole(user) {
    const fallback = user.email === config.loginUsers.admin.email
      ? { role: 'admin', party: null }
      : user.email === config.loginUsers.pnc.email
        ? { role: 'member', party: 'PNC' }
        : { role: 'viewer', party: null };

    const { data, error } = await client
      .from('user_roles')
      .select('role,party,can_edit,can_export')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return fallback;
    return {
      role: data.role || fallback.role,
      party: data.role === 'admin' ? null : (data.party || fallback.party)
    };
  }

  function resolvePartyScope() {
    const requested = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
    if (state.role.role === 'admin') return ['MDP', 'PNC', 'ALL'].includes(requested) ? requested : 'ALL';
    return state.role.party || requested;
  }

  function closeModal() {
    const modal = document.getElementById('voterModal');
    if (modal) modal.hidden = true;
    state.selectedVoter = null;
  }

  function setStatus(message, isError) {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = message ? `status-message ${isError ? 'error' : 'ok'}` : 'status-message';
  }

  function showLoginError(el, message) {
    el.className = 'message error';
    el.textContent = message;
  }

  function renderPhoto(voter) {
    if (voter.photo_url) {
      return `<img src="${escapeAttr(voter.photo_url)}" alt="${escapeAttr(voter.name || 'Voter photo')}" loading="lazy">`;
    }
    return `<div class="photo-placeholder">${escapeHtml(initials(voter.name))}</div>`;
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function chip(value, color) {
    if (!value) return '';
    return `<span class="chip ${color || ''}">${escapeHtml(label(value))}</span>`;
  }

  function label(value) {
    return String(value || '-').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function clean(value) {
    const text = String(value || '').trim();
    return text || null;
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
})();
