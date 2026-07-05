(function () {
  const config = window.APP_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  const columns = 'id,image_number,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,remarks,support_level,vote_assigned_by,vote_assigned_at';
  const whatsappNumber = '9607282399';
  const storagePrefix = 'villimale_zero_day_v1';
  const filters = [
    ['all', 'All', '👥'],
    ['will-vote', 'Will Vote', '👍'],
    ['guaranteed', 'Guaranteed', '✅'],
    ['not-voted', 'Not Voted', '⏰'],
    ['voted', 'Voted', '✓'],
    ['transport', 'Transport', '🚗'],
    ['phone', 'Working Phone', '📞'],
    ['follow-up', 'Follow-up', '🔄']
  ];
  const state = { rows: [], party: 'ALL', user: null, term: '', selected: null, syncing: false };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindEvents();
    const { data } = await client.auth.getSession();
    if (!data.session) {
      location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }
    state.user = data.session.user;
    state.party = await partyScope(state.user);
    setLinks();
    await syncPending(true);
    await loadRows();
  }

  function bindEvents() {
    const savedTheme = localStorage.getItem('villimale_theme');
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'dark') document.body.classList.add('dark');
    if (themeToggle) {
      themeToggle.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('villimale_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        themeToggle.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
      });
    }
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await client.auth.signOut();
      location.href = 'index.html';
    });
    document.getElementById('refreshBtn').addEventListener('click', loadRows);
    document.getElementById('searchInput').addEventListener('input', (event) => {
      state.term = event.target.value.trim().toLowerCase();
      document.getElementById('houseSelect').value = '';
      document.getElementById('boxSelect').value = '';
      render();
    });
    document.getElementById('houseSelect').addEventListener('change', (event) => {
      state.term = event.target.value;
      document.getElementById('searchInput').value = event.target.selectedOptions[0]?.dataset.label || '';
      document.getElementById('boxSelect').value = '';
      render();
    });
    document.getElementById('boxSelect').addEventListener('change', (event) => {
      state.term = event.target.value;
      document.getElementById('searchInput').value = event.target.selectedOptions[0]?.dataset.label || '';
      document.getElementById('houseSelect').value = '';
      render();
    });
    document.getElementById('clearSearchBtn').addEventListener('click', () => {
      state.term = '';
      document.getElementById('searchInput').value = '';
      document.getElementById('houseSelect').value = '';
      document.getElementById('boxSelect').value = '';
      render();
    });
    document.getElementById('shareViewBtn').addEventListener('click', shareView);
    window.addEventListener('online', () => syncPending(false));
    window.addEventListener('offline', renderSync);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function partyScope(user) {
    const requested = (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
    const fallback = user.email === config.loginUsers.admin.email ? null : 'PNC';
    const { data } = await client.from('user_roles').select('role,party').eq('user_id', user.id).maybeSingle();
    if (data?.role === 'admin') return ['ALL', 'PNC', 'MDP'].includes(requested) ? requested : 'ALL';
    return data?.party || fallback || requested;
  }

  function setLinks() {
    document.getElementById('dashboardLink').href = scopedUrl('dashboard.html');
  }

  async function loadRows() {
    if (!navigator.onLine) {
      state.rows = applyPending(readJson(storageKey('rows'), []));
      render();
      status(state.rows.length ? 'Offline mode. Showing saved Zero Day data.' : 'Offline. No saved Zero Day data found.', !state.rows.length);
      renderSync();
      return;
    }
    status('Loading Zero Day voters...');
    let from = 0;
    const pageSize = 1000;
    let rows = [];
    while (true) {
      let query = client.from(config.table).select(columns).order('image_number', { ascending: true, nullsFirst: false }).range(from, from + pageSize - 1);
      if (state.party !== 'ALL') query = query.eq('party', state.party);
      const { data, error } = await query;
      if (error) {
        state.rows = applyPending(readJson(storageKey('rows'), []));
        render();
        status(error.message, true);
        return;
      }
      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    state.rows = applyPending(rows);
    writeJson(storageKey('rows'), state.rows);
    status('');
    render();
    renderSync();
  }

  function render() {
    document.getElementById('dashboardTitle').textContent = state.party === 'ALL' ? 'Zero Day Priority' : `${state.party} Zero Day`;
    document.getElementById('dashboardSubtitle').textContent = `Separate voting-day page for ${state.party} will-vote and guaranteed voters.`;
    renderSearchOptions();
    renderStats();
    renderInsights();
    renderGrid();
  }

  function renderSearchOptions() {
    const rows = zeroRows();
    fillSelect('houseSelect', houseOptions(rows), 'house');
    fillSelect('boxSelect', boxOptions(rows), 'box');
  }

  function fillSelect(id, items, labelKey) {
    const el = document.getElementById(id);
    const first = id === 'houseSelect' ? 'All houses' : 'All boxes';
    el.innerHTML = `<option value="">${first}</option>` + items.map((item) => `
      <option value="${esc(item.search)}" data-label="${esc(item[labelKey])}" ${state.term === item.search ? 'selected' : ''}>${esc(item[labelKey])} (${num(item.count)})</option>
    `).join('');
  }

  function renderStats() {
    document.getElementById('summary').innerHTML = filters.map(([key, labelText, icon]) => `
      <button class="stat-card ${key === 'voted' || key === 'guaranteed' || key === 'will-vote' ? 'green' : key === 'not-voted' || key === 'transport' ? 'yellow' : ''}" type="button" data-zero-filter="${esc(key)}">
        <span class="stat-icon">${icon}</span>
        <span class="stat-text"><strong>${num(filterRows(key).length)}</strong><small>${esc(labelText)}</small></span>
      </button>
    `).join('');
    document.getElementById('sections').innerHTML = filters.map(([key, labelText]) => `
      <button class="tab" type="button" data-zero-filter="${esc(key)}">${esc(labelText)} <span>${num(filterRows(key).length)}</span></button>
    `).join('');
  }

  function renderInsights() {
    const opponentVotes = 428;
    const targetVotes = 429;
    const committed = state.rows.filter((row) => row.vote_status === 'will-vote').length;
    const guaranteed = state.rows.filter((row) => row.support_level === 'guaranteed').length;
    const voted = zeroRows().filter((row) => zeroAction(row) === 'voted').length;
    const needMore = Math.max(0, targetVotes - committed);
    const progress = Math.min(100, Math.round((committed / targetVotes) * 100));
    document.getElementById('targetStats').innerHTML = [
      ['Opponent', opponentVotes],
      ['Target', targetVotes],
      ['Committed', committed],
      ['Guaranteed', guaranteed],
      ['Voted', voted],
      ['Need More', needMore]
    ].map(([labelText, value]) => `<div class="metric"><strong>${num(value)}</strong><span>${esc(labelText)}</span></div>`).join('');
    document.getElementById('targetProgressBar').style.width = `${progress}%`;
    const prediction = document.getElementById('targetPrediction');
    prediction.textContent = committed >= targetVotes ? 'Prediction: winning if committed voters vote.' : `Prediction: need ${num(needMore)} more committed voters to pass target.`;
    prediction.className = committed >= targetVotes ? 'prediction good' : 'prediction warn';
    document.getElementById('topHouses').innerHTML = topHouses(zeroRows()).map((item, index) => `
      <button class="house-row" type="button" data-house-filter="${esc(item.search)}" data-house-label="${esc(item.house)}">
        <span class="house-main"><span>${index + 1}. ${esc(item.house)}</span><small>${num(item.notVoted)} not voted · ${num(item.transport)} transport · ${num(item.guaranteed)} guaranteed</small></span>
        <strong>${num(item.count)}</strong>
      </button>
    `).join('') || '<div class="empty small">No house data.</div>';
  }

  function renderGrid() {
    const rows = applySearch(zeroRows());
    document.getElementById('sectionTitle').textContent = 'Zero Day Priority';
    document.getElementById('sectionFilter').textContent = 'Will Vote and guaranteed voters sorted by not-voted, D2D, transport, phone, and house priority.';
    document.getElementById('sectionTotal').textContent = `${num(rows.length)} voters`;
    document.getElementById('voterList').innerHTML = rows.length ? rows.map(card).join('') : '<div class="empty">No Zero Day voters found.</div>';
  }

  function card(voter) {
    return `
      <article class="voter-card" data-open-voter="${esc(voter.id)}" tabindex="0">
        <div class="voter-photo">${photo(voter)}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${esc(voter.name || 'Unknown voter')}</h3><span class="party-tag">${esc(voter.party || 'Not party')}</span></div>
          <p>${esc(voter.house || '-')} · Box ${esc(voter.election_box || '-')} · ${esc(voter.phone || 'No phone')}</p>
          <div class="chips">
            ${chip(voter.vote_status, 'green')}
            ${chip(voter.support_level, voter.support_level === 'guaranteed' ? 'green' : '')}
            ${chip(voter.transport_status, voter.transport_status === 'need-transport' ? 'amber' : '')}
            ${zeroChip(voter)}
          </div>
          <div class="quick-actions" aria-label="Quick actions">
            <button class="quick-btn call" type="button" data-quick-call="${esc(voter.id)}" title="C = Call">C Call</button>
            <button class="quick-btn assign" type="button" data-quick-assign="${esc(voter.id)}" title="A = Assign guaranteed">A Assign</button>
            <button class="quick-btn remark" type="button" data-quick-remark="${esc(voter.id)}" title="R = Remark">R Remark</button>
          </div>
          <div class="section-label green">✓ Zero Day</div>
        </div>
      </article>
    `;
  }

  function handleClick(event) {
    const quickCall = event.target.closest('[data-quick-call]');
    if (quickCall) {
      const voter = findVoter(quickCall.dataset.quickCall);
      if (voter) quickCallVoter(voter);
      return;
    }
    const quickAssign = event.target.closest('[data-quick-assign]');
    if (quickAssign) {
      const voter = findVoter(quickAssign.dataset.quickAssign);
      if (voter) quickAssignVoter(voter);
      return;
    }
    const quickRemark = event.target.closest('[data-quick-remark]');
    if (quickRemark) {
      const voter = findVoter(quickRemark.dataset.quickRemark);
      if (voter) openModal(voter, true);
      return;
    }
    const house = event.target.closest('[data-house-filter]');
    if (house) {
      state.term = house.dataset.houseFilter;
      document.getElementById('searchInput').value = house.dataset.houseLabel || state.term;
      document.getElementById('houseSelect').value = state.term;
      document.getElementById('boxSelect').value = '';
      render();
      document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const filter = event.target.closest('[data-zero-filter]');
    if (filter) {
      state.term = `zero:${filter.dataset.zeroFilter}`;
      document.getElementById('searchInput').value = filter.textContent.trim().replace(/\s+\d+$/, '');
      document.getElementById('houseSelect').value = '';
      document.getElementById('boxSelect').value = '';
      render();
      return;
    }
    const cardEl = event.target.closest('[data-open-voter]');
    if (cardEl) {
      const voter = findVoter(cardEl.dataset.openVoter);
      if (voter) openModal(voter);
      return;
    }
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      const form = document.getElementById('voterForm');
      form.elements[choice.dataset.name].value = choice.dataset.choice;
      form.querySelectorAll(`[data-name="${choice.dataset.name}"]`).forEach((button) => button.classList.remove('active'));
      choice.classList.add('active');
      return;
    }
    const star = event.target.closest('[data-priority-star]');
    if (star) {
      const form = document.getElementById('voterForm');
      const value = Number(star.dataset.priorityStar);
      form.elements.priority_rating.value = String(value);
      form.querySelectorAll('[data-priority-star]').forEach((button) => {
        button.classList.toggle('active', Number(button.dataset.priorityStar) <= value);
      });
      const labelEl = form.querySelector('.priority-label');
      if (labelEl) labelEl.textContent = priorityLabel(value);
      return;
    }
    if (event.target.closest('[data-whatsapp-alert]')) {
      event.preventDefault();
      whatsapp();
      return;
    }
    if (event.target.closest('[data-close-modal]')) closeModal();
  }

  function openModal(voter, focusRemark) {
    state.selected = voter;
    document.getElementById('modalSection').textContent = 'Zero Day';
    document.getElementById('modalTitle').textContent = voter.name || 'Unknown voter';
    document.getElementById('modalMeta').textContent = `${voter.house || '-'} · Box ${voter.election_box || '-'} · ${voter.phone || 'No phone'}`;
    document.getElementById('modalPhoto').src = voter.photo_url || '';
    document.getElementById('modalPhoto').alt = voter.name || 'Voter photo';
    document.getElementById('voterForm').innerHTML = `
      <div class="logic-box"><strong>✓ Zero Day Function</strong><p>Mark if the committed voter has voted. Keep transport, working phone, support level, and remarks aligned.</p></div>
      ${priorityPicker(voter)}
      ${choiceGroup('zero_day_action', [['pending', 'Not Voted Yet'], ['voted', 'Voted ✓'], ['not-voted', 'Not Voted']], zeroAction(voter))}
      <label>Working Phone<input name="phone" value="${esc(voter.phone || '')}" placeholder="Phone number"></label>
      ${choiceGroup('call_result', [['called', 'Called'], ['busy', 'Busy'], ['switched-off', 'Switched Off'], ['disconnected', 'Disconnected'], ['wrong-number', 'Wrong Number'], ['no-phone', 'No Phone']], voter.phone_status || 'need-call')}
      <label>Support Level${select('support_level', ['normal', 'guaranteed'], voter.support_level || 'normal')}</label>
      <label>Transport Status${select('transport_status', ['not-needed', 'need-transport', 'arranged', 'picked-up'], voter.transport_status || 'not-needed')}</label>
      <label>Remarks<textarea name="remarks" placeholder="Short campaign note">${esc(stripZero(voter.remarks || ''))}</textarea></label>
      <div class="modal-actions"><button class="btn light" type="button" data-close-modal>Cancel</button><button class="btn whatsapp" type="button" data-whatsapp-alert>WhatsApp Alert</button><button class="btn" type="submit">Save Zero Day</button></div>
    `;
    document.getElementById('voterForm').onsubmit = saveModal;
    document.getElementById('voterModal').hidden = false;
    if (focusRemark) document.querySelector('#voterForm textarea[name="remarks"]')?.focus();
  }

  function findVoter(id) {
    return state.rows.find((row) => String(row.id) === String(id));
  }

  function quickCallVoter(voter) {
    if (voter.phone) window.location.href = `tel:${String(voter.phone).replace(/\s+/g, '')}`;
    quickUpdate(voter, { phone_status: 'called', reach_status: 'reached', vote_status: 'will-vote', vote_assigned_by: state.user.email, vote_assigned_at: new Date().toISOString() }, 'C saved: call marked reached.');
  }

  function quickAssignVoter(voter) {
    quickUpdate(voter, { vote_status: 'will-vote', reach_status: 'reached', support_level: 'guaranteed', vote_assigned_by: state.user.email, vote_assigned_at: new Date().toISOString() }, 'A saved: voter assigned guaranteed.');
  }

  async function quickUpdate(voter, updates, message) {
    if (!navigator.onLine) {
      saveOffline(voter, updates);
      status(`${message} Offline sync pending.`);
      return;
    }
    let query = client.from(config.table).update(updates).eq('id', voter.id);
    if (state.party !== 'ALL') query = query.eq('party', state.party);
    const { data, error } = await query.select(columns).single();
    if (error) {
      status(error.message, true);
      return;
    }
    state.rows = state.rows.map((row) => row.id === voter.id ? data : row);
    writeJson(storageKey('rows'), state.rows);
    render();
    status(message);
  }

  async function saveModal(event) {
    event.preventDefault();
    const voter = state.selected;
    if (!voter) return;
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';
    const data = Object.fromEntries(new FormData(form).entries());
    const updates = buildUpdates(voter, data);
    if (!navigator.onLine) {
      saveOffline(voter, updates);
      return;
    }
    let query = client.from(config.table).update(updates).eq('id', voter.id);
    if (state.party !== 'ALL') query = query.eq('party', state.party);
    const { data: saved, error } = await query.select(columns).single();
    button.disabled = false;
    button.textContent = 'Save Zero Day';
    if (error) {
      status(error.message, true);
      return;
    }
    state.rows = state.rows.map((row) => row.id === voter.id ? saved : row);
    writeJson(storageKey('rows'), state.rows);
    closeModal();
    render();
    status('Zero Day saved.');
  }

  function buildUpdates(voter, data) {
    const rating = Number(data.priority_rating || priorityRating(voter));
    const updates = {
      vote_status: 'will-vote',
      reach_status: data.call_result === 'called' ? 'reached' : voter.reach_status || 'reached',
      support_level: rating === 5 ? 'guaranteed' : data.support_level || voter.support_level || 'normal',
      transport_status: data.transport_status || voter.transport_status || 'not-needed',
      phone_status: data.call_result || voter.phone_status || 'need-call',
      remarks: mergePriority(mergeZero(data.remarks || voter.remarks || '', data.zero_day_action || 'pending'), rating),
      vote_assigned_by: state.user.email,
      vote_assigned_at: new Date().toISOString()
    };
    if (data.phone) updates.phone = String(data.phone).trim();
    if (data.zero_day_action === 'voted') {
      updates.d2d_status = 'visited';
      if (updates.transport_status === 'need-transport') updates.transport_status = 'picked-up';
    }
    if (data.zero_day_action === 'not-voted') updates.d2d_status = 'follow-up';
    if (['busy', 'switched-off', 'disconnected', 'wrong-number', 'no-phone'].includes(data.call_result)) updates.d2d_status = 'follow-up';
    return updates;
  }

  function saveOffline(voter, updates) {
    state.rows = state.rows.map((row) => row.id === voter.id ? { ...row, ...updates } : row);
    const pending = readJson(storageKey('pending'), []);
    const found = pending.find((item) => item.id === voter.id);
    if (found) found.updates = { ...found.updates, ...updates };
    else pending.push({ id: voter.id, updates, party: state.party });
    writeJson(storageKey('pending'), pending);
    writeJson(storageKey('rows'), state.rows);
    closeModal();
    render();
    status('Saved offline. It will sync when online.');
    renderSync();
  }

  async function syncPending(silent) {
    if (state.syncing || !navigator.onLine) return;
    const pending = readJson(storageKey('pending'), []);
    if (!pending.length) {
      renderSync();
      return;
    }
    state.syncing = true;
    const left = [];
    for (const item of pending) {
      let query = client.from(config.table).update(item.updates).eq('id', item.id);
      if (item.party && item.party !== 'ALL') query = query.eq('party', item.party);
      const { error } = await query;
      if (error) left.push(item);
    }
    writeJson(storageKey('pending'), left);
    state.syncing = false;
    if (!silent) status(left.length ? `${num(left.length)} offline saves still waiting.` : 'Offline saves synced.');
    renderSync();
  }

  function zeroRows() {
    return state.rows.filter((row) => row.vote_status === 'will-vote' || row.support_level === 'guaranteed').sort((a, b) => priority(b) - priority(a) || String(a.name || '').localeCompare(String(b.name || '')));
  }

  function filterRows(key) {
    const rows = zeroRows();
    if (key === 'all') return rows;
    if (key === 'will-vote') return rows.filter((row) => row.vote_status === 'will-vote');
    if (key === 'guaranteed') return rows.filter((row) => row.support_level === 'guaranteed');
    if (key === 'voted') return rows.filter((row) => zeroAction(row) === 'voted');
    if (key === 'not-voted') return rows.filter((row) => zeroAction(row) !== 'voted');
    if (key === 'transport') return rows.filter((row) => row.transport_status === 'need-transport');
    if (key === 'phone') return rows.filter((row) => hasPhone(row));
    if (key === 'follow-up') return rows.filter((row) => row.d2d_status === 'follow-up' || zeroAction(row) === 'not-voted');
    return rows;
  }

  function applySearch(rows) {
    if (!state.term) return rows;
    if (state.term.startsWith('zero:')) return filterRows(state.term.slice(5));
    return rows.filter((row) => searchText(row).includes(state.term));
  }

  function searchText(row) {
    return [row.name, row.national_id, row.phone, row.house, houseGroup(row.house), row.election_box, boxAlias(row.election_box), row.party, row.lives_in].map((value) => String(value || '').toLowerCase()).join(' ');
  }

  function topHouses(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const house = houseGroup(row.house);
      const item = map.get(house) || { house, search: house.toLowerCase(), count: 0, notVoted: 0, transport: 0, guaranteed: 0 };
      item.count += 1;
      item.notVoted += zeroAction(row) !== 'voted' ? 1 : 0;
      item.transport += row.transport_status === 'need-transport' ? 1 : 0;
      item.guaranteed += row.support_level === 'guaranteed' ? 1 : 0;
      map.set(house, item);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.house.localeCompare(b.house)).slice(0, 10);
  }

  function houseOptions(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const house = houseGroup(row.house);
      const item = map.get(house) || { house, search: house.toLowerCase(), count: 0 };
      item.count += 1;
      map.set(house, item);
    });
    return Array.from(map.values()).sort((a, b) => a.house.localeCompare(b.house));
  }

  function boxOptions(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const box = clean(row.election_box) || 'No box';
      const item = map.get(box.toLowerCase()) || { box, search: box.toLowerCase(), count: 0 };
      item.count += 1;
      map.set(box.toLowerCase(), item);
    });
    return Array.from(map.values()).sort((a, b) => boxSort(a.box) - boxSort(b.box) || a.box.localeCompare(b.box));
  }

  function priority(row) {
    let score = 0;
    if (zeroAction(row) === 'not-voted') score += 300;
    if (zeroAction(row) === 'pending') score += 220;
    if (row.support_level === 'guaranteed') score += 120;
    if (row.vote_status === 'will-vote') score += 100;
    if (row.d2d_status === 'follow-up') score += 90;
    if (row.transport_status === 'need-transport') score += 50;
    if (row.phone_status === 'need-call' && hasPhone(row)) score += 40;
    if (zeroAction(row) === 'voted') score -= 150;
    return score;
  }

  function starRating(row) {
    const saved = priorityRating(row);
    if (saved) return saved;
    const score = priority(row);
    if (score >= 380) return 5;
    if (score >= 300) return 4;
    if (score >= 200) return 3;
    if (score >= 90) return 2;
    return score > 0 ? 1 : 0;
  }

  function priorityPicker(voter) {
    const active = priorityRating(voter) || starRating(voter) || 3;
    return `<div class="rating-box"><strong>Priority Rating</strong><input type="hidden" name="priority_rating" value="${esc(active)}"><div class="star-picker" role="radiogroup" aria-label="Priority rating">${[1, 2, 3, 4, 5].map((value) => `<button class="star-btn ${value <= active ? 'active' : ''}" type="button" data-priority-star="${value}" title="${esc(priorityLabel(value))}">★</button>`).join('')}</div><p><strong class="priority-label">${esc(priorityLabel(active))}</strong> · 1 low priority, 5 guaranteed.</p></div>`;
  }

  function priorityRating(row) {
    const match = String(row.remarks || '').match(/\[Priority: ([1-5])\]/i);
    return match ? Number(match[1]) : 0;
  }

  function priorityLabel(value) {
    return { 1: '1 Star · Low', 2: '2 Stars · Watch', 3: '3 Stars · Possible', 4: '4 Stars · Strong', 5: '5 Stars · Guaranteed' }[Number(value)] || '3 Stars · Possible';
  }

  function zeroAction(row) {
    const match = String(row.remarks || '').match(/\[Zero Day: ([^\]]+)\]/i);
    return match ? match[1].toLowerCase().trim() : 'pending';
  }

  function zeroChip(row) {
    const action = zeroAction(row);
    if (action === 'voted') return chip('voted', 'green');
    if (action === 'not-voted') return chip('not-voted', 'red');
    return chip('not-voted-yet', 'amber');
  }

  function stripZero(value) {
    return String(value || '').replace(/\s*\[Zero Day: [^\]]+\]\s*/i, ' ').replace(/\s*\[Priority: [1-5]\]\s*/i, ' ').trim();
  }

  function mergeZero(remarks, action) {
    const base = stripZero(remarks);
    return `${base ? `${base} ` : ''}[Zero Day: ${action}]`;
  }

  function mergePriority(remarks, rating) {
    const cleanRemarks = String(remarks || '').replace(/\s*\[Priority: [1-5]\]\s*/i, ' ').trim();
    return `${cleanRemarks ? `${cleanRemarks} ` : ''}[Priority: ${Math.min(5, Math.max(1, Number(rating) || 3))}]`;
  }

  function choiceGroup(name, options, active) {
    return `<input type="hidden" name="${esc(name)}" value="${esc(active)}"><div><label>${label(name)}</label><div class="choice-grid">${options.map(([value, text]) => `<button class="choice-btn ${value === active ? 'active' : ''}" type="button" data-name="${esc(name)}" data-choice="${esc(value)}">${esc(text)}</button>`).join('')}</div></div>`;
  }

  function select(name, values, active) {
    return `<select name="${esc(name)}">${values.map((value) => `<option value="${esc(value)}" ${value === active ? 'selected' : ''}>${label(value)}</option>`).join('')}</select>`;
  }

  function whatsapp() {
    const voter = state.selected;
    if (!voter) return;
    const text = ['Zero Day alert', `Name: ${voter.name || '-'}`, `House: ${voter.house || '-'}`, `Phone: ${voter.phone || 'No phone'}`, `Party: ${voter.party || '-'}`, `Vote: ${label(voter.vote_status)}`, `Zero Day: ${label(zeroAction(voter))}`].join('\n');
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function shareView() {
    const url = scopedUrl('zero-day.html');
    if (state.term) url.searchParams.set('q', state.term);
    navigator.clipboard?.writeText(url.toString()).then(() => status('Zero Day read link copied.')).catch(() => {
      history.replaceState(null, '', url);
      status('Zero Day link ready in address bar.');
    });
  }

  function applyPending(rows) {
    const pending = readJson(storageKey('pending'), []);
    return rows.map((row) => {
      const item = pending.find((entry) => entry.id === row.id);
      return item ? { ...row, ...item.updates } : row;
    });
  }

  function renderSync() {
    const pending = readJson(storageKey('pending'), []).length;
    const el = document.getElementById('syncNotice');
    if (!el) return;
    if (!navigator.onLine) {
      el.hidden = false;
      el.className = 'sync-notice warn';
      el.textContent = `Offline mode. ${num(pending)} save${pending === 1 ? '' : 's'} waiting to sync.`;
      return;
    }
    el.hidden = !pending;
    el.className = 'sync-notice warn';
    el.textContent = pending ? `${num(pending)} offline save${pending === 1 ? '' : 's'} waiting to sync.` : '';
  }

  function status(message, isError) {
    const el = document.getElementById('statusMessage');
    el.textContent = message || '';
    el.className = message ? `status-message ${isError ? 'error' : 'ok'}` : 'status-message';
  }

  function closeModal() {
    document.getElementById('voterModal').hidden = true;
    state.selected = null;
  }

  function scopedUrl(path) {
    const url = new URL(path, location.href);
    url.searchParams.set('party', state.party);
    return url.toString();
  }

  function houseGroup(value) {
    const house = clean(value) || 'Unknown house';
    const compact = house.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['`’.-]/g, '').replace(/\s+/g, '');
    if (/^df\d*/.test(compact) || compact.startsWith('dhafthar') || compact.startsWith('dafthar')) return 'Dhafthar';
    if (compact.includes('sinamale') || compact.includes('sinamle')) return 'Sinamale';
    return house;
  }

  function boxAlias(value) {
    const text = String(value || '');
    const villimale = text.match(/villimale['’]?-?(\d+)/i);
    if (villimale) return `box ${villimale[1]} villimale ${villimale[1]}`;
    const first = text.match(/^\s*(\d+)/);
    return first ? `box ${first[1]}` : '';
  }

  function boxSort(value) {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  function photo(voter) {
    return voter.photo_url ? `<img src="${esc(voter.photo_url)}" alt="${esc(voter.name || 'Voter photo')}" loading="lazy">` : `<div class="photo-placeholder">${esc(initials(voter.name))}</div>`;
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
  }

  function chip(value, color) {
    return value ? `<span class="chip ${color || ''}">${label(value)}</span>` : '';
  }

  function hasPhone(row) {
    return Boolean(String(row.phone || '').trim());
  }

  function clean(value) {
    const text = String(value || '').trim();
    return text || null;
  }

  function label(value) {
    return esc(String(value || '-').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
  }

  function num(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
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
      status('Local storage is blocked. Offline save may not work.', true);
    }
  }

  function storageKey(name) {
    return `${storagePrefix}:${state.party}:${name}`;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
})();
