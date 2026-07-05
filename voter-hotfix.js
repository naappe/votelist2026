(function () {
  const config = window.APP_CONFIG;
  if (!window.supabase || !config) return;

  const client = window.__voterHotfixClient || window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  window.__voterHotfixClient = client;

  const cols = 'id,photo_url,name,national_id,house,lives_in,living_place,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,remarks,support_level,vote_assigned_by,vote_assigned_at';
  const allowedVote = ['pending', 'will-vote', 'not-vote', 'no-vote', 'not-decided'];
  let currentVoter = null;

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

  async function fetchVoter(id) {
    let query = client.from(config.table).select(cols).eq('id', id).single();
    const { data, error } = await query;
    if (error) throw error;
    return data;
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
      if (msg) { msg.hidden = false; msg.className = 'hotfix-message'; msg.textContent = 'Saved. Refreshing voter list...'; }
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      if (msg) { msg.hidden = false; msg.className = 'hotfix-message error'; msg.textContent = error.message || String(error); }
      if (btn) { btn.disabled = false; btn.textContent = 'Save Voter'; }
    }
  }

  document.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-open-voter]');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      const voter = await fetchVoter(card.dataset.openVoter);
      const selectedParty = partyParam();
      const voterParty = String(voter.party || '').toUpperCase();
      const isDhafthar = normalizeHouse([voter.house, voter.lives_in, voter.living_place].join(' ')) === 'dhafthar';
      if (selectedParty !== 'ALL' && voterParty && voterParty !== selectedParty && !isDhafthar) return;
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
})();
