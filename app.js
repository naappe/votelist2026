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

  const sectionCopy = {
    'need-call': {
      filter: 'phone_status = need-call, with a phone number',
      rule: 'Call result is one choice only. Called moves the voter to reached. Busy, switched off, disconnected, wrong number, and no phone stay not-reached and go to follow-up.'
    },
    reached: {
      filter: 'reach_status = reached',
      rule: 'Reached confirms contact, keeps phone_status called when needed, and saves the vote decision for this voter.'
    },
    'will-vote': {
      filter: 'vote_status = will-vote',
      rule: 'Will vote confirms support, can mark guaranteed support, and can request or arrange transport.'
    },
    pending: {
      filter: 'vote_status = pending',
      rule: 'Pending is the waiting list. Save the next call result or move the voter to will-vote, no-vote, or not-decided.'
    },
    'no-phone': {
      filter: 'phone_status = no-phone or blank phone',
      rule: 'No phone is for voters missing a usable number. Add a new phone to move them back to need-call, or keep them for door-to-door follow-up.'
    },
    'need-transport': {
      filter: 'transport_status = need-transport',
      rule: 'Need transport keeps the voter in will-vote and tracks whether pickup is needed, arranged, or completed.'
    },
    'follow-up': {
      filter: 'd2d_status = follow-up or unresolved call result',
      rule: 'Follow-up is for revisit work: not decided, no phone, busy, switched off, disconnected, wrong number, or not home.'
    }
  };

  const state = {
    rows: [],
    user: null,
    role: null,
    partyScope: 'ALL',
    activeSection: 'need-call',
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
      const account = findLoginAccount(username);

      if (!account) {
        showLoginError(message, 'Username not found.');
        return;
      }

      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Checking...';

      const { error } = await client.auth.signInWithPassword({
        email: account.email,
        password
      });

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
    bindDashboardEvents();

    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) {
      location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return;
    }

    state.user = session.user;
    state.role = await resolveRole(session.user);
    state.partyScope = resolvePartyScope();

    if (state.role.party && state.partyScope !== state.role.party) {
      state.partyScope = state.role.party;
      updateUrlParty(state.partyScope);
    }

    renderShell();
    await loadRows();
  }

  function bindDashboardEvents() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await client.auth.signOut();
      location.href = 'index.html';
    });

    document.getElementById('refreshBtn').addEventListener('click', loadRows);

    document.addEventListener('click', async (event) => {
      const sectionButton = event.target.closest('[data-section]');
      if (sectionButton) {
        state.activeSection = sectionButton.dataset.section;
        renderDashboard();
        return;
      }

      const voterCard = event.target.closest('[data-open-voter]');
      if (voterCard) {
        const voter = state.rows.find((row) => String(row.id) === voterCard.dataset.openVoter);
        if (voter) openVoter(voter);
        return;
      }

      const resultButton = event.target.closest('[data-result]');
      if (resultButton) {
        const form = document.getElementById('voterForm');
        form.querySelectorAll('[data-result]').forEach((button) => button.classList.remove('active'));
        resultButton.classList.add('active');
        form.elements.call_result.value = resultButton.dataset.result;
        return;
      }

      if (event.target.closest('[data-close-modal]')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function loadRows() {
    setStatus('Loading voters...');
    const pageSize = 1000;
    let from = 0;
    let rows = [];

    while (true) {
      let query = client
        .from(config.table)
        .select(columns)
        .order('image_number', { ascending: true, nullsFirst: false })
        .range(from, from + pageSize - 1);

      if (state.partyScope !== 'ALL') {
        query = query.eq('party', state.partyScope);
      }

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
    const title = state.partyScope === 'ALL' ? 'Admin Dashboard' : `${state.partyScope} Dashboard`;
    const subtitle = state.partyScope === 'ALL'
      ? 'Admin view shows total, MDP, PNC, no-party and every campaign section.'
      : `Only ${state.partyScope} voters are shown. Each section saves its own campaign result.`;
    document.getElementById('dashboardTitle').textContent = title;
    document.getElementById('dashboardSubtitle').textContent = subtitle;
  }

  function renderDashboard() {
    renderShell();
    renderSummary();
    renderSections();
    renderActiveSection();
  }

  function renderSummary() {
    const el = document.getElementById('summary');
    const rows = state.rows;
    const cards = state.partyScope === 'ALL'
      ? [
          ['Total voters', rows.length],
          ['MDP', rows.filter((row) => row.party === 'MDP').length],
          ['PNC', rows.filter((row) => row.party === 'PNC').length],
          ['Not party', rows.filter((row) => !['MDP', 'PNC'].includes(row.party)).length]
        ]
      : [
          ['Total in view', rows.length],
          ['Need call', rows.filter(isNeedCall).length],
          ['Will vote', rows.filter((row) => row.vote_status === 'will-vote').length],
          ['Pending', rows.filter((row) => row.vote_status === 'pending').length]
        ];

    el.innerHTML = cards.map(([label, value]) => `
      <article class="card">
        <strong>${number(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `).join('');
  }

  function renderSections() {
    const el = document.getElementById('sections');
    el.innerHTML = config.sections.map((section) => {
      const count = getSectionRows(section.key).length;
      const copy = sectionCopy[section.key];
      return `
        <button class="section-card ${section.key === state.activeSection ? 'active' : ''}" data-section="${section.key}" type="button">
          <small>${escapeHtml(section.field)}</small>
          <strong>${escapeHtml(section.label)}</strong>
          <span>${number(count)} voters<br>${escapeHtml(copy.filter)}</span>
        </button>
      `;
    }).join('');
  }

  function renderActiveSection() {
    const section = getSection(state.activeSection);
    const rows = getSectionRows(state.activeSection);
    const copy = sectionCopy[state.activeSection];

    document.getElementById('sectionTitle').textContent = section.label;
    document.getElementById('sectionFilter').textContent = copy.filter;
    document.getElementById('sectionTotal').textContent = `${number(rows.length)} voters`;
    document.getElementById('logicTitle').textContent = `${section.label} Function`;
    document.getElementById('logicText').textContent = copy.rule;
    document.getElementById('logicList').innerHTML = renderLogicList(state.activeSection);
    document.getElementById('sectionStats').innerHTML = renderSectionStats(rows);
    document.getElementById('voterList').innerHTML = rows.length
      ? rows.map(renderVoterCard).join('')
      : '<div class="empty">No voters in this section right now.</div>';
  }

  function renderVoterCard(voter) {
    return `
      <article class="voter-card" data-open-voter="${escapeAttr(voter.id)}" tabindex="0">
        <div class="voter-photo">${renderPhoto(voter)}</div>
        <div class="voter-info">
          <h3>${escapeHtml(voter.name || 'Unknown voter')}</h3>
          <div class="info-grid">
            <span>House: ${escapeHtml(voter.house || '-')}</span>
            <span>Box: ${escapeHtml(voter.election_box || '-')}</span>
            <span>Party: ${escapeHtml(voter.party || 'Not party')}</span>
            <span>Phone: ${escapeHtml(voter.phone || 'No phone')}</span>
          </div>
          <div class="chips">
            ${chip(voter.phone_status, 'blue')}
            ${chip(voter.reach_status, voter.reach_status === 'reached' ? 'green' : '')}
            ${chip(voter.vote_status, voter.vote_status === 'will-vote' ? 'green' : voter.vote_status === 'pending' ? 'amber' : '')}
            ${chip(voter.transport_status, voter.transport_status === 'need-transport' ? 'red' : '')}
            ${chip(voter.d2d_status, voter.d2d_status === 'follow-up' ? 'amber' : '')}
          </div>
        </div>
        <button class="btn" type="button" data-open-voter="${escapeAttr(voter.id)}">Open</button>
      </article>
    `;
  }

  function openVoter(voter) {
    state.selectedVoter = voter;
    const section = getSection(state.activeSection);
    const modal = document.getElementById('voterModal');
    document.getElementById('modalSection').textContent = section.label;
    document.getElementById('modalTitle').textContent = voter.name || 'Unknown voter';
    document.getElementById('modalMeta').textContent = `${voter.house || '-'} | Box ${voter.election_box || '-'} | ${voter.phone || 'No phone'}`;
    document.getElementById('modalPhoto').src = voter.photo_url || '';
    document.getElementById('modalPhoto').alt = voter.name || 'Voter photo';
    document.getElementById('voterForm').innerHTML = renderSectionForm(state.activeSection, voter);
    document.getElementById('voterForm').onsubmit = saveVoter;
    modal.hidden = false;
  }

  async function saveVoter(event) {
    event.preventDefault();
    const voter = state.selectedVoter;
    if (!voter) return;

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';

    const formData = Object.fromEntries(new FormData(form).entries());
    const updates = buildUpdates(state.activeSection, voter, formData);

    let query = client
      .from(config.table)
      .update(updates)
      .eq('id', voter.id);

    if (state.partyScope !== 'ALL') {
      query = query.eq('party', state.partyScope);
    }

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
    setStatus('Saved. Voter card updated and moved to the correct section.');
  }

  function renderSectionForm(sectionKey, voter) {
    const note = escapeAttr(voter.remarks || '');
    const commonRemarks = `
      <label>Remarks
        <textarea name="remarks" placeholder="Short campaign note">${escapeHtml(voter.remarks || '')}</textarea>
      </label>
      <button class="btn full" type="submit">Save Section</button>
    `;

    if (sectionKey === 'need-call') {
      return `
        ${callResultButtons(voter.phone_status || 'need-call')}
        <label>Vote Decision
          ${select('vote_status', ['pending', 'will-vote', 'no-vote', 'not-decided'], voter.vote_status || 'pending')}
        </label>
        ${commonRemarks}
      `;
    }

    if (sectionKey === 'reached') {
      return `
        <label>Vote Decision
          ${select('vote_status', ['pending', 'will-vote', 'no-vote', 'not-decided'], voter.vote_status || 'pending')}
        </label>
        ${commonRemarks}
      `;
    }

    if (sectionKey === 'will-vote') {
      return `
        <label>Support Level
          ${select('support_level', ['normal', 'guaranteed'], voter.support_level || 'normal')}
        </label>
        <label>Transport
          ${select('transport_status', ['not-needed', 'need-transport', 'arranged', 'picked-up'], voter.transport_status || 'not-needed')}
        </label>
        ${commonRemarks}
      `;
    }

    if (sectionKey === 'pending') {
      return `
        ${callResultButtons(voter.phone_status || 'need-call')}
        <label>Vote Decision
          ${select('vote_status', ['pending', 'will-vote', 'no-vote', 'not-decided'], voter.vote_status || 'pending')}
        </label>
        ${commonRemarks}
      `;
    }

    if (sectionKey === 'no-phone') {
      return `
        <label>New Phone Number
          <input name="phone" value="${escapeAttr(voter.phone || '')}" placeholder="Enter phone number if found">
        </label>
        <label>Door-to-door Status
          ${select('d2d_status', ['follow-up', 'not-visited', 'visited', 'not-home'], voter.d2d_status || 'follow-up')}
        </label>
        ${commonRemarks}
      `;
    }

    if (sectionKey === 'need-transport') {
      return `
        <label>Transport
          ${select('transport_status', ['need-transport', 'arranged', 'picked-up', 'not-needed'], voter.transport_status || 'need-transport')}
        </label>
        <label>Support Level
          ${select('support_level', ['normal', 'guaranteed'], voter.support_level || 'normal')}
        </label>
        ${commonRemarks}
      `;
    }

    return `
      <label>Door-to-door Status
        ${select('d2d_status', ['follow-up', 'not-visited', 'visited', 'not-home'], voter.d2d_status || 'follow-up')}
      </label>
      <label>Vote Decision
        ${select('vote_status', ['pending', 'will-vote', 'no-vote', 'not-decided'], voter.vote_status || 'not-decided')}
      </label>
      ${callResultButtons(voter.phone_status || 'need-call')}
      ${commonRemarks}
    `;
  }

  function buildUpdates(sectionKey, voter, data) {
    const updates = {
      remarks: clean(data.remarks) || voter.remarks || null,
      vote_assigned_by: state.user.email,
      vote_assigned_at: new Date().toISOString()
    };

    if (sectionKey === 'need-call') {
      applyCallResult(updates, data.call_result || voter.phone_status || 'need-call');
      updates.vote_status = data.vote_status || voter.vote_status || 'pending';
    }

    if (sectionKey === 'reached') {
      updates.reach_status = 'reached';
      updates.vote_status = data.vote_status || voter.vote_status || 'pending';
      if (voter.phone_status === 'need-call') updates.phone_status = 'called';
      if (updates.vote_status === 'not-decided') updates.d2d_status = 'follow-up';
    }

    if (sectionKey === 'will-vote') {
      updates.reach_status = 'reached';
      updates.vote_status = 'will-vote';
      updates.support_level = data.support_level || voter.support_level || 'normal';
      updates.transport_status = data.transport_status || voter.transport_status || 'not-needed';
    }

    if (sectionKey === 'pending') {
      updates.vote_status = data.vote_status || 'pending';
      if (data.call_result) applyCallResult(updates, data.call_result);
      if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
      if (['no-vote', 'not-decided'].includes(updates.vote_status)) updates.d2d_status = 'follow-up';
    }

    if (sectionKey === 'no-phone') {
      const newPhone = clean(data.phone);
      if (newPhone) {
        updates.phone = newPhone;
        updates.phone_status = 'need-call';
        updates.d2d_status = data.d2d_status || 'not-visited';
      } else {
        updates.phone_status = 'no-phone';
        updates.d2d_status = data.d2d_status || 'follow-up';
      }
    }

    if (sectionKey === 'need-transport') {
      updates.reach_status = 'reached';
      updates.vote_status = 'will-vote';
      updates.transport_status = data.transport_status || 'need-transport';
      updates.support_level = data.support_level || voter.support_level || 'normal';
    }

    if (sectionKey === 'follow-up') {
      updates.d2d_status = data.d2d_status || 'follow-up';
      updates.vote_status = data.vote_status || voter.vote_status || 'not-decided';
      if (data.call_result) applyCallResult(updates, data.call_result);
      if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';
    }

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

  function callResultButtons(active) {
    const options = [
      ['called', 'Called'],
      ['busy', 'Busy'],
      ['switched-off', 'Switched Off'],
      ['disconnected', 'Disconnected'],
      ['wrong-number', 'Wrong Number'],
      ['no-phone', 'No Phone']
    ];
    return `
      <input type="hidden" name="call_result" value="${escapeAttr(active)}">
      <div>
        <label>Call Result</label>
        <div class="result-grid">
          ${options.map(([value, label]) => `
            <button class="result-btn ${value === active ? 'active' : ''}" type="button" data-result="${value}">${label}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function select(name, values, active) {
    return `
      <select name="${escapeAttr(name)}">
        ${values.map((value) => `<option value="${escapeAttr(value)}" ${value === active ? 'selected' : ''}>${label(value)}</option>`).join('')}
      </select>
    `;
  }

  function renderLogicList(sectionKey) {
    const rules = {
      'need-call': ['Called -> reached', 'Busy / switched off / disconnected -> follow-up', 'No phone -> no-phone section'],
      reached: ['Save vote decision', 'Not decided -> follow-up', 'Called is set if phone was still need-call'],
      'will-vote': ['Vote status stays will-vote', 'Support can become guaranteed', 'Transport can become need-transport'],
      pending: ['Default waiting list', 'Can move to will-vote, no-vote, or not-decided', 'Call result also updates phone status'],
      'no-phone': ['Add phone -> need-call', 'No number -> follow-up', 'Door-to-door status is tracked'],
      'need-transport': ['Vote status stays will-vote', 'Transport can be arranged or picked-up', 'Support level can be guaranteed'],
      'follow-up': ['Door-to-door status is saved', 'Vote decision is saved', 'Resolved voters move to the correct section']
    };
    return (rules[sectionKey] || []).map((rule) => `<div class="logic-item">${escapeHtml(rule)}</div>`).join('');
  }

  function renderSectionStats(rows) {
    const called = rows.filter((row) => row.phone_status === 'called').length;
    const willVote = rows.filter((row) => row.vote_status === 'will-vote').length;
    const followUp = rows.filter((row) => row.d2d_status === 'follow-up').length;
    return [
      ['Called', called],
      ['Will vote', willVote],
      ['Follow-up', followUp]
    ].map(([labelText, value]) => `
      <div class="chart-tile">
        <strong>${number(value)}</strong>
        <span>${escapeHtml(labelText)}</span>
      </div>
    `).join('');
  }

  function getSectionRows(sectionKey) {
    return state.rows.filter((row) => {
      if (sectionKey === 'need-call') return isNeedCall(row);
      if (sectionKey === 'reached') return row.reach_status === 'reached';
      if (sectionKey === 'will-vote') return row.vote_status === 'will-vote';
      if (sectionKey === 'pending') return row.vote_status === 'pending';
      if (sectionKey === 'no-phone') return row.phone_status === 'no-phone' || !hasPhone(row);
      if (sectionKey === 'need-transport') return row.transport_status === 'need-transport';
      if (sectionKey === 'follow-up') return isFollowUp(row);
      return false;
    });
  }

  function isNeedCall(row) {
    return row.phone_status === 'need-call' && hasPhone(row);
  }

  function isFollowUp(row) {
    return row.d2d_status === 'follow-up'
      || row.vote_status === 'not-decided'
      || ['busy', 'switched-off', 'disconnected', 'wrong-number', 'out-of-range'].includes(row.phone_status);
  }

  function hasPhone(row) {
    return Boolean(String(row.phone || '').trim());
  }

  function getSection(key) {
    return config.sections.find((section) => section.key === key) || config.sections[0];
  }

  function findLoginAccount(username) {
    return Object.values(config.loginUsers).find((account) => account.username === username);
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

  function updateUrlParty(party) {
    const url = new URL(location.href);
    url.searchParams.set('party', party);
    history.replaceState(null, '', url);
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
    if (!voter.photo_url) {
      return `<div class="photo-placeholder">${escapeHtml((voter.name || '?').slice(0, 1))}</div>`;
    }
    return `<img src="${escapeAttr(voter.photo_url)}" alt="${escapeAttr(voter.name || 'Voter photo')}" loading="lazy">`;
  }

  function chip(value, color) {
    if (!value) return '';
    return `<span class="chip ${color || ''}">${escapeHtml(label(value))}</span>`;
  }

  function label(value) {
    return String(value || '-').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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