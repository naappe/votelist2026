(function () {
  const config = window.APP_CONFIG;
  if (!window.supabase || !config) return;

  const client = window.__voterHotfixClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  window.__voterHotfixClient = client;

  const cols = 'id,photo_url,name,national_id,house,lives_in,living_place,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,remarks,support_level,vote_assigned_by,vote_assigned_at';
  const allowedVote = ['pending', 'will-vote', 'not-vote', 'no-vote', 'not-decided'];
  let currentVoter = null;
  let allRowsCache = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function initials(name) {
    return clean(name).split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
  }

  function label(value) {
    return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function normalizeHouse(value) {
    const text = String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['`’.\-]/g, '').replace(/\s+/g, ' ').trim();
    const compact = text.replace(/\s+/g, '');
    if (text.includes('dhaf') || text.includes('dh r') || text.includes('no dh r') || /^df\d*/.test(compact) || /^dhr\d*/.test(compact) || /^nodhr\d*/.test(compact) || compact.startsWith('dafthar')) return 'dhafthar';
    return text;
  }

  function partyParam() {
    return (new URLSearchParams(location.search).get('party') || 'ALL').toUpperCase();
  }

  function partyAllowed(row) {
    const selected = partyParam();
    const voterParty = String(row.party || '').trim().toUpperCase();
    const isDhafthar = normalizeHouse([row.house, row.lives_in, row.living_place].join(' ')) === 'dhafthar';
    if (selected === 'ALL') return true;
    if (voterParty === selected) return true;
    return selected === 'PNC' && !voterParty && isDhafthar;
  }

  async function fetchVoter(id) {
    let query = client.from(config.table).select(cols).eq('id', id).single();
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async function fetchAllRows(force) {
    if (allRowsCache && !force) return allRowsCache;
    let from = 0;
    const pageSize = 1000;
    let rows = [];
    while (true) {
      const { data, error } = await client.from(config.table).select(cols).order('image_number', { ascending: true, nullsFirst: false }).range(from, from + pageSize - 1);
      if (error) break;
      rows = rows.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    allRowsCache = rows.filter(partyAllowed);
    return allRowsCache;
  }

  function option(value, active) {
    return `<option value="${esc(value)}" ${value === active ? 'selected' : ''}>${esc(label(value))}</option>`;
  }

  function openModal(voter) {
    currentVoter = voter;
    const modal = document.getElementById('voterModal');
    const form = document.getElementById('voterForm');
    const photo = document.getElementById('modalPhoto');
    const title = document.getElementById('modalTitle');
    const meta = document.getElementById('modalMeta');
    const section = document.getElementById('modalSection');
    if (!modal || !form || !title || !meta || !section) return;

    section.textContent = normalizeHouse([voter.house, voter.lives_in, voter.living_place].join(' ')) === 'dhafthar' ? 'House - Dhafthar' : 'Voter Assignment';
    title.textContent = voter.name || 'Unknown voter';
    meta.textContent = `${voter.house || voter.lives_in || '-'} · Box ${voter.election_box || '-'} · ${voter.phone || 'No phone'}`;
    if (photo) {
      photo.src = voter.photo_url || '';
      photo.alt = voter.name || 'Voter photo';
      photo.parentElement.innerHTML = voter.photo_url ? `<img id="modalPhoto" src="${esc(voter.photo_url)}" alt="${esc(voter.name || 'Voter photo')}">` : `<div class="photo-placeholder">${esc(initials(voter.name))}</div>`;
    }

    form.innerHTML = `
      <div class="assign-panel">
        <strong>Assign this voter</strong>
        <div class="assign-inline">
          <label>Assigned person name
            <input name="vote_assigned_by" value="${esc(voter.vote_assigned_by || '')}" placeholder="Write name here, example: Ahmed / Ali / Team 1">
          </label>
          <button class="btn" type="button" id="quickAssignBtn">Assign</button>
        </div>
      </div>
      <div class="hotfix-grid">
        <label>Phone
          <input name="phone" value="${esc(voter.phone || '')}" placeholder="Phone number">
        </label>
        <label>Call Status
          <select name="phone_status">
            ${['need-call','called','busy','switched-off','disconnected','wrong-number','out-of-range','no-phone'].map(v => option(v, voter.phone_status || 'need-call')).join('')}
          </select>
        </label>
        <label>Reach Status
          <select name="reach_status">
            ${['not-reached','reached'].map(v => option(v, voter.reach_status || 'not-reached')).join('')}
          </select>
        </label>
        <label>Vote Status
          <select name="vote_status">
            ${allowedVote.map(v => option(v, voter.vote_status || 'pending')).join('')}
          </select>
        </label>
        <label>D2D Status
          <select name="d2d_status">
            ${['not-visited','visited','not-home','follow-up'].map(v => option(v, voter.d2d_status || 'not-visited')).join('')}
          </select>
        </label>
        <label>Transport
          <select name="transport_status">
            ${['not-needed','need-transport','arranged','picked-up'].map(v => option(v, voter.transport_status || 'not-needed')).join('')}
          </select>
        </label>
        <label>Support Level
          <select name="support_level">
            ${['normal','guaranteed'].map(v => option(v, voter.support_level || 'normal')).join('')}
          </select>
        </label>
        <label>Party
          <input value="${esc(voter.party || 'Blank party')}" disabled>
        </label>
      </div>
      <label>Remarks
        <textarea name="remarks" placeholder="Write remarks">${esc(voter.remarks || '')}</textarea>
      </label>
      <div id="hotfixMessage" class="hotfix-message" hidden></div>
      <div class="modal-actions">
        <button class="btn light" type="button" data-close-modal>Cancel</button>
        <button class="btn whatsapp" type="button" id="hotfixWhatsappBtn">WhatsApp Alert</button>
        <button class="btn" type="submit">Save Voter</button>
      </div>
    `;

    const quickAssign = form.querySelector('#quickAssignBtn');
    quickAssign?.addEventListener('click', () => form.requestSubmit());
    form.querySelector('#hotfixWhatsappBtn')?.addEventListener('click', () => {
      const msg = ['Campaign assignment', `Name: ${voter.name || '-'}`, `House: ${voter.house || voter.lives_in || '-'}`, `Phone: ${voter.phone || 'No phone'}`, `Assigned: ${form.elements.vote_assigned_by.value || '-'}`].join('\n');
      window.open(`https://wa.me/9607282399?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
    form.onsubmit = saveVoter;
    modal.hidden = false;
  }

  async function saveVoter(event) {
    event.preventDefault();
    if (!currentVoter) return;
    const form = event.currentTarget;
    const msg = form.querySelector('#hotfixMessage');
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const fd = Object.fromEntries(new FormData(form).entries());
    const updates = {
      phone: clean(fd.phone) || null,
      phone_status: fd.phone_status || 'need-call',
      reach_status: fd.reach_status || 'not-reached',
      vote_status: fd.vote_status || 'pending',
      d2d_status: fd.d2d_status || 'not-visited',
      transport_status: fd.transport_status || 'not-needed',
      support_level: fd.support_level || 'normal',
      remarks: clean(fd.remarks) || null,
      vote_assigned_by: clean(fd.vote_assigned_by) || null,
      vote_assigned_at: clean(fd.vote_assigned_by) ? new Date().toISOString() : currentVoter.vote_assigned_at || null
    };

    if (updates.phone_status === 'called' || updates.vote_status === 'will-vote' || updates.support_level === 'guaranteed') updates.reach_status = 'reached';
    if (updates.phone_status === 'no-phone' || !updates.phone) updates.d2d_status = updates.d2d_status === 'not-visited' ? 'follow-up' : updates.d2d_status;
    if (['busy','switched-off','disconnected','wrong-number','out-of-range'].includes(updates.phone_status)) updates.d2d_status = 'follow-up';
    if (updates.vote_status === 'will-vote') updates.reach_status = 'reached';

    try {
      const { error } = await client.from(config.table).update(updates).eq('id', currentVoter.id);
      if (error) throw error;
      allRowsCache = null;
      if (msg) { msg.hidden = false; msg.className = 'hotfix-message'; msg.textContent = 'Saved. Refreshing voter list...'; }
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      if (msg) { msg.hidden = false; msg.className = 'hotfix-message error'; msg.textContent = error.message || String(error); }
      if (btn) { btn.disabled = false; btn.textContent = 'Save Voter'; }
    }
  }

  function renderAssignedCard(voter) {
    const phone = clean(voter.phone) || 'No phone';
    const house = clean(voter.house || voter.lives_in || voter.living_place) || '-';
    return `
      <article class="voter-card" data-open-voter="${esc(voter.id)}" tabindex="0">
        <div class="voter-photo">${voter.photo_url ? `<img src="${esc(voter.photo_url)}" alt="${esc(voter.name || 'Voter photo')}" loading="lazy">` : `<div class="photo-placeholder">${esc(initials(voter.name))}</div>`}</div>
        <div class="voter-info">
          <div class="voter-title"><h3>${esc(voter.name || 'Unknown voter')}</h3><span class="party-tag">${esc(voter.party || 'Blank party')}</span></div>
          <p>${esc(house)} · ${esc(phone)}</p>
          <div class="chips">
            <span class="chip blue">Assigned: ${esc(voter.vote_assigned_by || '-')}</span>
            ${voter.vote_status ? `<span class="chip">${esc(label(voter.vote_status))}</span>` : ''}
            ${voter.phone_status ? `<span class="chip">${esc(label(voter.phone_status))}</span>` : ''}
          </div>
          <div class="section-label blue">Assign</div>
        </div>
      </article>
    `;
  }

  async function renderAssignSection() {
    const list = document.getElementById('voterList');
    const title = document.getElementById('sectionTitle');
    const filter = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    if (!list || !title || !filter || !total) return;
    title.textContent = 'Assigned Voters';
    filter.textContent = 'Voters that already have a name written in Assign. Open card to change the assigned person.';
    total.textContent = 'Loading...';
    list.innerHTML = '<div class="empty">Loading assigned voters...</div>';
    const rows = await fetchAllRows(true);
    const assigned = rows.filter(row => clean(row.vote_assigned_by)).sort((a, b) => clean(a.vote_assigned_by).localeCompare(clean(b.vote_assigned_by)) || clean(a.name).localeCompare(clean(b.name)));
    total.textContent = `${new Intl.NumberFormat('en-US').format(assigned.length)} voters`;
    list.innerHTML = assigned.length ? assigned.map(renderAssignedCard).join('') : '<div class="empty">No voters assigned yet. Open any voter card and write the assigned person name.</div>';
    document.querySelector('.voter-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function injectAssignCounter() {
    const summary = document.getElementById('summary');
    const tabs = document.getElementById('sections');
    if (!summary || summary.dataset.assignReady === '1') return;
    summary.dataset.assignReady = '1';
    const rows = await fetchAllRows(false);
    const count = rows.filter(row => clean(row.vote_assigned_by)).length;
    const number = new Intl.NumberFormat('en-US').format(count);
    summary.insertAdjacentHTML('beforeend', `
      <button class="stat-card assign-stat blue" data-hotfix-assign="1" type="button">
        <span class="stat-icon">A</span>
        <span class="stat-text"><strong>${number}</strong><small>Assign</small></span>
      </button>
    `);
    if (tabs && !tabs.querySelector('[data-hotfix-assign]')) {
      tabs.insertAdjacentHTML('beforeend', `<button class="tab" data-hotfix-assign="1" type="button">Assign <span>${number}</span></button>`);
    }
  }

  document.addEventListener('click', async (event) => {
    const assignButton = event.target.closest('[data-hotfix-assign]');
    if (!assignButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelectorAll('[data-filter], [data-hotfix-assign]').forEach(el => el.classList.remove('active'));
    assignButton.classList.add('active');
    await renderAssignSection();
  }, true);

  document.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-open-voter]');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      const voter = await fetchVoter(card.dataset.openVoter);
      if (!partyAllowed(voter)) return;
      openModal(voter);
    } catch (error) {
      console.error('Voter hotfix open failed:', error);
    }
  }, true);

  document.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const card = event.target.closest('[data-open-voter]');
    if (!card) return;
    card.click();
  }, true);

  window.addEventListener('load', () => setTimeout(injectAssignCounter, 1400));
  setTimeout(injectAssignCounter, 2400);
})();
