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

  const storagePrefix = 'villimale_campaign_manager_v1';
  const whatsappNumber = '9607282399';

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
  const zeroDaySection = {
    key: 'zero-day',
    label: 'Zero Day',
    icon: '✓',
    tone: 'green',
    rule: 'Voting-day queue for will-vote and guaranteed voters. Mark voted/not voted, transport, phone result, and remarks.'
  };

  const state = {
    rows: [],
    user: null,
    role: null,
    partyScope: 'ALL',
    activeFilter: 'all',
    zeroDayMode: false,
    readOnly: false,
    searchTerm: '',
    selectedVoter: null,
    syncing: false
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
    applySharedView();

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
    const houseSelect = document.getElementById('houseSelect');
    const boxSelect = document.getElementById('boxSelect');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const shareViewBtn = document.getElementById('shareViewBtn');
    const zeroDayBtn = document.getElementById('zeroDayBtn');
    if (zeroDayBtn) {
      zeroDayBtn.addEventListener('click', () => {
        state.zeroDayMode = true;
        state.activeFilter = 'all';
        state.searchTerm = '';
        if (searchInput) searchInput.value = '';
        if (houseSelect) houseSelect.value = '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
        document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (houseSelect) {
      houseSelect.addEventListener('change', (event) => {
        const value = event.target.value;
        state.zeroDayMode = false;
        state.searchTerm = value;
        state.activeFilter = 'all';
        if (searchInput) searchInput.value = event.target.selectedOptions[0]?.dataset.label || '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (boxSelect) {
      boxSelect.addEventListener('change', (event) => {
        const value = event.target.value;
        state.zeroDayMode = false;
        state.searchTerm = value;
        state.activeFilter = 'all';
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
        if (houseSelect) houseSelect.value = '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.zeroDayMode = false;
        state.searchTerm = '';
        searchInput.value = '';
        if (houseSelect) houseSelect.value = '';
        if (boxSelect) boxSelect.value = '';
        renderDashboard();
      });
    }
    if (shareViewBtn) {
      shareViewBtn.addEventListener('click', shareReadView);
    }

    window.addEventListener('online', () => {
      setSyncNotice('Back online. Syncing offline saves...', 'warn');
      syncPendingUpdates();
    });
    window.addEventListener('offline', () => updateConnectionNotice());

    document.addEventListener('click', (event) => {
      const filterButton = event.target.closest('[data-filter]');
      if (filterButton) {
        state.zeroDayMode = false;
        state.activeFilter = filterButton.dataset.filter;
        state.searchTerm = '';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
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
        state.searchTerm = houseButton.dataset.houseFilter;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = houseButton.dataset.houseLabel || houseButton.dataset.houseFilter;
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

      if (event.target.closest('[data-whatsapp-alert]')) {
        event.preventDefault();
        sendWhatsAppAlert();
        return;
      }

      if (event.target.closest('[data-close-modal]')) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function loadRows() {
    if (!navigator.onLine) {
      const cached = loadCachedRows();
      state.rows = applyPendingToRows(cached);
      renderDashboard();
      updateConnectionNotice();
      setStatus(cached.length ? 'Offline mode. Showing saved voter data.' : 'Offline mode. No saved voter data found.', !cached.length);
      return;
    }

    setStatus('Loading voters...');
    if (!state.readOnly) await syncPendingUpdates({ silent: true });
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
        const cached = loadCachedRows();
        if (cached.length) {
          state.rows = applyPendingToRows(cached);
          renderDashboard();
          updateConnectionNotice();
          setStatus(`Could not refresh from Supabase. Showing saved offline data. ${error.message}`, true);
          return;
        }
        setStatus(error.message, true);
        return;
      }

      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    state.rows = applyPendingToRows(rows);
    saveCachedRows(state.rows);
    setStatus('');
    renderDashboard();
    updateConnectionNotice();
  }

  function renderShell() {
    const title = state.partyScope === 'ALL' ? 'Voter Manager Dashboard' : `${state.partyScope} Voter Manager`;
    const subtitle = state.partyScope === 'ALL'
      ? 'Filter voters, open a card, then complete campaign work inside the popup.'
      : `Showing only ${state.partyScope} voters. Sections filter the grid; popups save campaign work.`;
    document.getElementById('dashboardTitle').textContent = title;
    document.getElementById('dashboardSubtitle').textContent = state.readOnly ? `${subtitle} Read-only shared view.` : subtitle;
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
    const houseSelect = document.getElementById('houseSelect');
    const boxSelect = document.getElementById('boxSelect');
    if (zeroDayBtn) zeroDayBtn.classList.toggle('active', state.zeroDayMode);

    if (houseSelect) {
      const selectedHouse = state.searchTerm;
      houseSelect.innerHTML = '<option value="">All houses</option>' + houseOptions(state.rows).map((item) => `
        <option value="${escapeAttr(item.search)}" data-label="${escapeAttr(item.house)}" ${item.search === selectedHouse ? 'selected' : ''}>
          ${escapeHtml(item.house)} (${number(item.count)})
        </option>
      `).join('');
    }

    if (boxSelect) {
      const selectedBox = state.searchTerm;
      boxSelect.innerHTML = '<option value="">All boxes</option>' + boxOptions(state.rows).map((item) => `
        <option value="${escapeAttr(item.search)}" data-label="${escapeAttr(item.box)}" ${item.search === selectedBox ? 'selected' : ''}>
          ${escapeHtml(item.box)} (${number(item.count)})
        </option>
      `).join('');
    }

    updateConnectionNotice();
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
            <small>${escapeHtml(item.status)} · ${number(item.guaranteed)} guaranteed · ${number(item.possible)} possible · ${number(item.followUp)} D2D</small>
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
      ? 'Will Vote and guaranteed voters sorted by D2D, transport, phone, and not-voted priority.'
      : state.searchTerm
        ? `Smart search across ${state.partyScope} voters. Showing ${number(rows.length)} matches.`
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
            ${state.zeroDayMode ? zeroDayChip(voter) : ''}
          </div>
          <div class="section-label ${section.tone}">${section.icon} ${escapeHtml(section.label)}</div>
        </div>
      </article>
    `;
  }

  function openVoter(voter) {
    const sectionKey = state.zeroDayMode ? 'zero-day' : (state.activeFilter === 'all' ? sectionFor(voter) : state.activeFilter);
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
        <textarea name="remarks" placeholder="Short campaign note">${escapeHtml(stripZeroDayTag(voter.remarks || ''))}</textarea>
      </label>
      <div class="modal-actions">
        <button class="btn light" type="button" data-close-modal>Cancel</button>
        <button class="btn whatsapp" type="button" data-whatsapp-alert>WhatsApp Alert</button>
        ${state.readOnly ? '<button class="btn" type="button" disabled>Read Only</button>' : '<button class="btn" type="submit">Save Section</button>'}
      </div>
    `;

    const intro = `
      <div class="logic-box">
        <strong>${section.icon} ${escapeHtml(section.label)} Function</strong>
        <p>${escapeHtml(section.rule)}</p>
      </div>
    `;

    const priority = priorityRatingBox(voter);
    if (sectionKey === 'zero-day') return intro + priority + zeroDayField(voter) + phoneField(voter, 'Working Phone') + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + supportField(voter) + transportField(voter) + common;
    if (sectionKey === 'need-call') return intro + priority + phoneField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'reached') return intro + priority + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'will-vote') return intro + priority + supportField(voter) + transportField(voter) + common;
    if (sectionKey === 'pending') return intro + priority + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + voteField(voter) + transportField(voter) + common;
    if (sectionKey === 'no-phone') return intro + priority + phoneField(voter, 'New Phone') + d2dField(voter) + common;
    if (sectionKey === 'need-transport') return intro + priority + transportField(voter, 'need-transport') + supportField(voter) + common;
    if (sectionKey === 'follow-up') return intro + priority + d2dField(voter) + voteField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + transportField(voter) + common;
    return intro + priority + voteField(voter) + choiceGroup('call_result', callOptions(), voter.phone_status || 'need-call') + supportField(voter) + transportField(voter) + d2dField(voter) + common;
  }

  async function saveVoter(event, sectionKey) {
    event.preventDefault();
    if (state.readOnly) {
      setStatus('Read-only shared view. Saving is disabled.', true);
      return;
    }
    const voter = state.selectedVoter;
    if (!voter) return;

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';

    const formData = Object.fromEntries(new FormData(form).entries());
    const updates = buildUpdates(sectionKey, voter, formData);

    if (!navigator.onLine) {
      button.disabled = false;
      button.textContent = 'Save Section';
      saveVoterOffline(voter, updates, sectionKey);
      return;
    }

    let query = client.from(config.table).update(updates).eq('id', voter.id);
    if (state.partyScope !== 'ALL') query = query.eq('party', state.partyScope);

    let data;
    let error;
    try {
      const result = await query.select(columns).single();
      data = result.data;
      error = result.error;
    } catch (syncError) {
      error = syncError;
    }
    button.disabled = false;
    button.textContent = 'Save Section';

    if (error) {
      if (!navigator.onLine || String(error.message || error).toLowerCase().includes('failed to fetch')) {
        saveVoterOffline(voter, updates, sectionKey);
        return;
      }
      setStatus(error.message, true);
      return;
    }

    state.rows = state.rows.map((row) => row.id === voter.id ? data : row);
    saveCachedRows(state.rows);
    closeModal();
    renderDashboard();
    setStatus('Saved. Voter moved to the correct section.');
    updateConnectionNotice();
  }

  function saveVoterOffline(voter, updates, sectionKey) {
    const localRow = { ...voter, ...updates };
    state.rows = state.rows.map((row) => row.id === voter.id ? localRow : row);
    queuePendingUpdate(voter.id, updates, sectionKey);
    saveCachedRows(state.rows);
    closeModal();
    renderDashboard();
    const pending = getPendingUpdates().length;
    setStatus('Saved offline. It will update Supabase when online.');
    setSyncNotice(`Offline save queued. ${number(pending)} waiting to sync.`, 'warn');
    notifyUser('Saved offline', `${voter.name || 'Voter'} will sync when online.`);
  }

  async function syncPendingUpdates(options = {}) {
    if (state.syncing || !navigator.onLine) {
      updateConnectionNotice();
      return;
    }

    const pending = getPendingUpdates();
    if (!pending.length) {
      if (!options.silent) updateConnectionNotice();
      return;
    }

    state.syncing = true;
    if (!options.silent) setSyncNotice(`Syncing ${number(pending.length)} offline saves...`, 'warn');

    const remaining = [];
    const syncedRows = [];

    for (const item of pending) {
      let query = client.from(config.table).update(item.updates).eq('id', item.id);
      if (item.partyScope && item.partyScope !== 'ALL') query = query.eq('party', item.partyScope);

      try {
        const { data, error } = await query.select(columns).single();
        if (error) {
          remaining.push({ ...item, error: error.message });
        } else if (data) {
          syncedRows.push(data);
        }
      } catch (error) {
        remaining.push({ ...item, error: error.message || String(error) });
      }
    }

    savePendingUpdates(remaining);
    syncedRows.forEach((row) => {
      state.rows = state.rows.map((item) => item.id === row.id ? row : item);
    });
    state.rows = applyPendingToRows(state.rows);
    saveCachedRows(state.rows);
    state.syncing = false;

    if (state.rows.length) renderDashboard();

    if (remaining.length) {
      setSyncNotice(`${number(remaining.length)} offline saves still waiting. Check connection or permissions.`, 'warn');
    } else {
      setSyncNotice(`Online. Synced ${number(syncedRows.length)} offline saves.`, 'ok');
      notifyUser('Offline saves synced', `${number(syncedRows.length)} voter updates uploaded.`);
    }
  }

  function queuePendingUpdate(id, updates, sectionKey) {
    const pending = getPendingUpdates();
    const existing = pending.find((item) => item.id === id);
    if (existing) {
      existing.updates = { ...existing.updates, ...updates };
      existing.sectionKey = sectionKey;
      existing.queuedAt = new Date().toISOString();
    } else {
      pending.push({
        id,
        updates,
        sectionKey,
        partyScope: state.partyScope,
        queuedAt: new Date().toISOString()
      });
    }
    savePendingUpdates(pending);
  }

  function applyPendingToRows(rows) {
    const pending = getPendingUpdates();
    if (!pending.length) return rows;
    return rows.map((row) => {
      const local = pending.find((item) => item.id === row.id);
      return local ? { ...row, ...local.updates } : row;
    });
  }

  function loadCachedRows() {
    return readJson(storageKey('rows'), []);
  }

  function saveCachedRows(rows) {
    writeJson(storageKey('rows'), rows);
  }

  function getPendingUpdates() {
    return readJson(storageKey('pending'), []);
  }

  function savePendingUpdates(items) {
    writeJson(storageKey('pending'), items);
  }

  function storageKey(name) {
    return `${storagePrefix}:${state.partyScope}:${name}`;
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setSyncNotice('Local storage is full or blocked. Offline save may not work.', 'error');
    }
  }

  function updateConnectionNotice() {
    const pending = getPendingUpdates().length;
    if (!navigator.onLine) {
      setSyncNotice(`Offline mode. ${number(pending)} save${pending === 1 ? '' : 's'} waiting to sync.`, 'warn');
      return;
    }
    if (pending) {
      setSyncNotice(`Online. ${number(pending)} offline save${pending === 1 ? '' : 's'} waiting to sync.`, 'warn');
      return;
    }
    setSyncNotice('');
  }

  function setSyncNotice(message, tone) {
    const el = document.getElementById('syncNotice');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
    el.className = message ? `sync-notice ${tone || 'info'}` : 'sync-notice';
  }

  function sendWhatsAppAlert() {
    requestNotificationPermission();
    const voter = state.selectedVoter;
    if (!voter) return;
    const section = getFilter(state.activeFilter === 'all' ? sectionFor(voter) : state.activeFilter);
    const message = [
      'Campaign alert',
      `Name: ${voter.name || '-'}`,
      `House: ${voter.house || '-'}`,
      `Phone: ${voter.phone || 'No phone'}`,
      `Party: ${voter.party || 'Not party'}`,
      `Section: ${section.label}`,
      `Vote: ${label(voter.vote_status)}`,
      `D2D: ${label(voter.d2d_status)}`
    ].join('\n');
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    setSyncNotice('WhatsApp alert opened for +9607282399.', 'ok');
  }

  function notifyUser(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body });
  }

  function requestNotificationPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().catch(() => {});
  }

  async function shareReadView() {
    requestNotificationPermission();
    const url = new URL(location.href);
    url.searchParams.set('party', state.partyScope);
    url.searchParams.set('view', 'read');
    url.searchParams.set('filter', state.activeFilter);
    url.searchParams.set('zero', state.zeroDayMode ? '1' : '0');
    if (state.searchTerm) url.searchParams.set('q', state.searchTerm);
    else url.searchParams.delete('q');

    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      setSyncNotice('Read-only filter link copied.', 'ok');
      setStatus('Share link copied. This view opens without save actions.');
    } catch {
      history.replaceState(null, '', url);
      setSyncNotice('Read-only link ready in the address bar.', 'ok');
      setStatus('Share link created in the browser address bar.');
    }
  }

  function applySharedView() {
    const params = new URLSearchParams(location.search);
    state.readOnly = params.get('view') === 'read';
    const filter = params.get('filter');
    if (filters.some((item) => item.key === filter)) state.activeFilter = filter;
    state.zeroDayMode = params.get('zero') === '1';
    state.searchTerm = String(params.get('q') || '').trim().toLowerCase();

    const input = document.getElementById('searchInput');
    if (input) input.value = state.searchTerm;
    const houseSelect = document.getElementById('houseSelect');
    if (houseSelect) houseSelect.value = state.searchTerm;
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

    if (sectionKey === 'zero-day') {
      updates.vote_status = 'will-vote';
      updates.reach_status = 'reached';
      if (data.zero_day_action) {
        updates.remarks = mergeZeroDayRemark(updates.remarks, data.zero_day_action);
        if (data.zero_day_action === 'voted') {
          updates.d2d_status = 'visited';
          if (updates.transport_status === 'need-transport') updates.transport_status = 'picked-up';
        }
        if (data.zero_day_action === 'not-voted') {
          updates.d2d_status = 'follow-up';
        }
      }
    }
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

  function zeroDayField(voter) {
    return choiceGroup('zero_day_action', [
      ['pending', 'Not Voted Yet'],
      ['voted', 'Voted ✓'],
      ['not-voted', 'Not Voted']
    ], zeroDayAction(voter));
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
        guaranteed: 0,
        possible: 0,
        maxStars: 0,
        score: 0
      };
      item.count += 1;
      item.needCall += row.phone_status === 'need-call' && hasPhone(row) ? 1 : 0;
      item.followUp += isFollowUp(row) ? 1 : 0;
      item.pending += row.vote_status === 'pending' ? 1 : 0;
      item.noPhone += row.phone_status === 'no-phone' || !hasPhone(row) ? 1 : 0;
      item.transport += row.transport_status === 'need-transport' ? 1 : 0;
      item.guaranteed += row.support_level === 'guaranteed' ? 1 : 0;
      item.possible += isPossibleVote(row) ? 1 : 0;
      item.maxStars = Math.max(item.maxStars, starRating(row));
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
    const willVoteRows = rows.filter((row) => row.vote_status === 'will-vote' || row.support_level === 'guaranteed');
    willVoteRows.forEach((row) => {
      const key = houseGroupName(row.house).toLowerCase();
      houseScores.set(key, (houseScores.get(key) || 0) + voterPriority(row));
    });
    return willVoteRows
      .sort((a, b) => {
        const houseDiff = (houseScores.get(houseGroupName(b.house).toLowerCase()) || 0)
          - (houseScores.get(houseGroupName(a.house).toLowerCase()) || 0);
        if (houseDiff) return houseDiff;
        const votedDiff = zeroDaySortValue(b) - zeroDaySortValue(a);
        if (votedDiff) return votedDiff;
        const priorityDiff = voterPriority(b) - voterPriority(a);
        if (priorityDiff) return priorityDiff;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }

  function voterPriority(row) {
    let score = 0;

    if (row.support_level === 'guaranteed') score += 120;
    if (row.vote_status === 'will-vote') score += 100;
    if (isPossibleVote(row)) score += 65;

    if (row.d2d_status === 'follow-up') score += 95;
    if (row.d2d_status === 'not-home') score += 85;
    if (row.d2d_status === 'not-visited') score += 70;
    if (row.d2d_status === 'visited') score += 20;

    if (row.phone_status === 'need-call' && hasPhone(row)) score += 45;
    if (row.reach_status === 'reached') score += 20;
    if (row.transport_status === 'need-transport') score += 15;
    if (row.phone_status === 'no-phone' || !hasPhone(row)) score += 10;
    if (zeroDayAction(row) === 'not-voted') score += 60;
    if (zeroDayAction(row) === 'voted') score -= 120;

    return score;
  }

  function zeroDaySortValue(row) {
    const status = zeroDayAction(row);
    if (status === 'not-voted') return 3;
    if (status === 'pending') return 2;
    if (status === 'voted') return 1;
    return 2;
  }

  function isPossibleVote(row) {
    return ['pending', 'not-decided'].includes(row.vote_status) && row.support_level !== 'guaranteed';
  }

  function starRating(row) {
    const score = typeof row === 'number' ? row : voterPriority(row);
    if (score >= 230) return 5;
    if (score >= 180) return 4;
    if (score >= 120) return 3;
    if (score >= 70) return 2;
    return score > 0 ? 1 : 0;
  }

  function priorityRatingBox(row) {
    const rating = starRating(row);
    return `
      <div class="rating-box">
        <strong>Priority Rating</strong>
        <span class="rating-stars">${escapeHtml(stars(rating))}</span>
        <p>Based on D2D, guaranteed support, possible vote, phone contact, and transport status.</p>
      </div>
    `;
  }

  function zeroDayAction(row) {
    const match = String(row.remarks || '').match(/\[Zero Day: ([^\]]+)\]/i);
    if (!match) return 'pending';
    const value = match[1].toLowerCase().trim();
    return ['voted', 'not-voted', 'pending'].includes(value) ? value : 'pending';
  }

  function stripZeroDayTag(value) {
    return String(value || '').replace(/\s*\[Zero Day: [^\]]+\]\s*/i, ' ').trim();
  }

  function mergeZeroDayRemark(remarks, action) {
    const base = stripZeroDayTag(remarks);
    return `${base ? `${base} ` : ''}[Zero Day: ${action}]`;
  }

  function stars(count) {
    return '★★★★★'.slice(0, count || 0) || '-';
  }

  function housePriorityStatus(item) {
    if (item.guaranteed) return 'Guaranteed votes';
    if (item.possible) return 'Possible votes';
    if (item.followUp) return 'D2D follow-up';
    if (item.needCall) return 'Call first';
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
    const values = [
      row.name,
      row.national_id,
      row.phone,
      row.house,
      houseGroupName(row.house),
      row.election_box,
      boxSearchAlias(row.election_box),
      row.party,
      row.lives_in
    ];
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
    if (key === 'zero-day') return zeroDaySection;
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

  function zeroDayChip(voter) {
    const status = zeroDayAction(voter);
    if (status === 'voted') return chip('voted', 'green');
    if (status === 'not-voted') return chip('not-voted', 'red');
    return chip('not-voted-yet', 'amber');
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
