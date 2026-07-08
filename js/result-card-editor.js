(function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = ((params.get('section') || 'voters').toLowerCase() === 'residents') ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  let rows = [];
  let current = null;
  let client = null;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    setupClient();
    installStyles();
    installEditor();
    await loadRows();
    document.addEventListener('click', handleCardClick, true);
  }

  function setupClient() {
    const cfg = window.APP_CONFIG || {};
    if (window.supabase && cfg.supabaseUrl && cfg.supabaseKey) {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    }
  }

  async function loadRows() {
    if (!client) return;
    try {
      let query = client
        .from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at')
        .limit(5000);
      if (party !== 'ALL') query = query.eq('party', party);
      const res = await query;
      if (!res.error) rows = res.data || [];
    } catch (error) {
      console.warn('Result editor rows load failed', error);
    }
  }

  function handleCardClick(event) {
    const card = event.target.closest('.result-mode-card');
    if (!card) return;
    if (event.target.closest('a,button,input,select,textarea')) return;
    event.preventDefault();
    event.stopPropagation();
    const row = findRowFromCard(card);
    if (row) openEditor(row);
  }

  function findRowFromCard(card) {
    const name = clean(card.querySelector('h3')?.textContent);
    const meta = clean(card.querySelector('.info p')?.textContent);
    const parts = meta.split('·').map(clean);
    const house = parts[0] || '';
    const phone = parts[parts.length - 1] || '';
    return rows.find(r => clean(r.name) === name && clean(r.phone || 'No phone') === phone)
      || rows.find(r => clean(r.name) === name && clean(r.house) === house)
      || rows.find(r => clean(r.name) === name);
  }

  function installEditor() {
    if (document.getElementById('resultEditModal')) return;
    const modal = document.createElement('section');
    modal.id = 'resultEditModal';
    modal.className = 'result-edit-modal';
    modal.innerHTML = `
      <article class="result-edit-card">
        <div class="result-edit-head">
          <div><h2 id="resultEditName">Update resident</h2><p id="resultEditMeta"></p></div>
          <button id="resultEditClose" class="btn" type="button">Close</button>
        </div>
        <form id="resultEditForm" class="result-edit-form">
          <label data-field="vote">Vote Status<select id="resultEditVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label>
          <label data-field="phone">Phone Status<select id="resultEditPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label>
          <label data-field="reach">Reach Status<select id="resultEditReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label>
          <label data-field="d2d">D2D Status<select id="resultEditD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label>
          <label data-field="transport">Transport Status<select id="resultEditTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label>
          <label data-field="support">Support Level<select id="resultEditSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label>
          <label data-field="assigned">Assigned By<input id="resultEditAssigned" type="text" placeholder="Name or comma separated names"></label>
          <label data-field="remarks">Remarks<textarea id="resultEditRemarks" placeholder="Write remarks"></textarea></label>
          <div class="result-edit-actions"><button class="btn active" type="submit">Save Update</button><button id="resultEditCancel" class="btn" type="button">Cancel</button></div>
        </form>
      </article>
    `;
    document.body.appendChild(modal);
    document.getElementById('resultEditClose').onclick = closeEditor;
    document.getElementById('resultEditCancel').onclick = closeEditor;
    modal.onclick = e => { if (e.target === modal) closeEditor(); };
    document.getElementById('resultEditForm').onsubmit = saveEditor;
  }

  function openEditor(row) {
    current = row;
    setText('resultEditName', row.name || 'Update resident');
    setText('resultEditMeta', `${row.house || '-'} · ${row.phone || 'No phone'}`);
    setValue('resultEditVote', row.vote_status || 'pending');
    setValue('resultEditPhone', row.phone_status || 'need-call');
    setValue('resultEditReach', row.reach_status || 'not-reached');
    setValue('resultEditD2D', row.d2d_status || 'not-visited');
    setValue('resultEditTransport', row.transport_status || 'not-needed');
    setValue('resultEditSupport', row.support_level || 'normal');
    setValue('resultEditAssigned', row.vote_assigned_by || '');
    setValue('resultEditRemarks', row.remarks || '');
    applySectionFields();
    document.getElementById('resultEditModal').classList.add('open');
  }

  function applySectionFields() {
    const fieldsBySection = {
      assign: ['assigned', 'remarks'],
      calls: ['phone', 'reach', 'remarks'],
      votes: ['vote', 'support', 'transport', 'remarks'],
      visits: ['d2d', 'remarks'],
      transport: ['transport', 'remarks'],
      insights: ['remarks'],
      voters: ['vote', 'phone', 'reach', 'd2d', 'transport', 'support', 'assigned', 'remarks']
    };
    const keep = fieldsBySection[section] || fieldsBySection.voters;
    document.querySelectorAll('#resultEditForm [data-field]').forEach(label => {
      const show = keep.includes(label.dataset.field);
      label.style.display = show ? '' : 'none';
      label.querySelectorAll('input,select,textarea').forEach(el => el.disabled = !show);
    });
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!current || !client) return;

    const patch = { remarks: getValue('resultEditRemarks') };
    if (section === 'assign' || section === 'voters') {
      const assigned = getValue('resultEditAssigned');
      patch.vote_assigned_by = assigned || null;
      patch.vote_assigned_at = assigned ? new Date().toISOString() : null;
    }
    if (section === 'calls' || section === 'voters') {
      patch.phone_status = getValue('resultEditPhone');
      patch.reach_status = getValue('resultEditReach');
    }
    if (section === 'votes' || section === 'voters') {
      patch.vote_status = getValue('resultEditVote');
      patch.support_level = getValue('resultEditSupport');
      patch.transport_status = getValue('resultEditTransport');
    }
    if (section === 'visits' || section === 'voters') patch.d2d_status = getValue('resultEditD2D');
    if (section === 'transport') patch.transport_status = getValue('resultEditTransport');

    if (patch.vote_status === 'will-vote' || patch.vote_status === 'no-vote' || patch.support_level === 'guaranteed' || patch.phone_status === 'called') {
      patch.reach_status = 'reached';
    }

    const saveBtn = document.querySelector('#resultEditForm button[type="submit"]');
    if (saveBtn) saveBtn.textContent = 'Saving...';
    const res = await client.from('campaign').update(patch).eq('id', current.id).select().single();
    if (saveBtn) saveBtn.textContent = 'Save Update';
    if (res.error) {
      alert('Save failed: ' + res.error.message);
      return;
    }

    rows = rows.map(r => String(r.id) === String(current.id) ? Object.assign({}, r, res.data || patch) : r);
    closeEditor();
    location.reload();
  }

  function closeEditor() {
    document.getElementById('resultEditModal')?.classList.remove('open');
    current = null;
  }

  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
  function getValue(id) { return clean(document.getElementById(id)?.value); }
  function clean(value) { return String(value || '').trim(); }

  function installStyles() {
    if (document.getElementById('resultCardEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'resultCardEditorStyles';
    style.textContent = `
      .result-mode-card{cursor:pointer!important}
      .result-mode-card:hover{border-color:#2563eb!important;box-shadow:0 18px 42px rgba(15,23,42,.12)!important}
      .result-edit-modal{position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:999;display:none;align-items:end;justify-content:center;padding:12px}
      .result-edit-modal.open{display:flex}
      .result-edit-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(15,23,42,.24)}
      .result-edit-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.result-edit-head h2{margin:0;font-size:22px}.result-edit-head p{margin:7px 0 0;color:#64748b;font-weight:800}
      .result-edit-form{display:grid;gap:10px}.result-edit-form label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.result-edit-form input,.result-edit-form select,.result-edit-form textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.result-edit-form textarea{min-height:88px}.result-edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
      @media(max-width:760px){.result-edit-modal{align-items:center}.result-edit-card{max-height:94vh}.result-edit-head h2{font-size:18px}}
    `;
    document.head.appendChild(style);
  }
})();