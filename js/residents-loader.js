document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = (params.get('section') || 'voters').toLowerCase() === 'residents' ? 'voters' : (params.get('section') || 'voters').toLowerCase();
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const status = document.getElementById('status');
  const list = document.getElementById('list');
  const total = document.getElementById('total');
  const partyName = document.getElementById('partyName');
  let rows = [];
  let current = null;

  if (partyName) partyName.textContent = party === 'ALL' ? 'All' : party;
  buildNav();
  installEditor();
  await loadRows();

  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const links = [['voters','Residents'],['assign','Assign'],['calls','Calls'],['votes','Votes'],['visits','Visits'],['transport','Transport'],['insights','Insights']];
    nav.innerHTML = links.map(function (item) {
      const key = item[0];
      const label = item[1];
      const href = 'residents.html?party=' + encodeURIComponent(party) + '&section=' + encodeURIComponent(key) + '&v=edit1';
      return '<a class="btn ' + (key === section ? 'active' : '') + '" href="' + href + '">' + label + '</a>';
    }).join('') + '<a class="btn" href="index.html?v=edit1">Logout</a>';
  }

  async function loadRows() {
    if (status) status.textContent = 'Loading residents...';
    let out = [];
    let from = 0;
    const size = 1000;
    while (true) {
      let query = client.from('campaign').select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks').range(from, from + size - 1);
      if (party !== 'ALL') query = query.eq('party', party);
      const result = await query;
      if (result.error) {
        if (status) { status.textContent = 'Supabase error: ' + result.error.message; status.className = 'status error'; }
        return;
      }
      out = out.concat(result.data || []);
      if (!result.data || result.data.length < size) break;
      from += size;
    }
    rows = out;
    updateStats(rows);
    render(rows);
    if (status) { status.textContent = 'Loaded ' + rows.length.toLocaleString('en-US') + ' residents. Click a card to update.'; status.className = 'status'; }
  }

  function updateStats(data) {
    if (total) total.textContent = data.length.toLocaleString('en-US');
    const will = document.getElementById('will'); if (will) will.textContent = data.filter(r => r.vote_status === 'will-vote').length.toLocaleString('en-US');
    const notvote = document.getElementById('notvote'); if (notvote) notvote.textContent = data.filter(r => r.vote_status === 'no-vote').length.toLocaleString('en-US');
    const pending = document.getElementById('pending'); if (pending) pending.textContent = data.filter(r => r.reach_status === 'reached' && r.vote_status !== 'will-vote' && r.vote_status !== 'no-vote').length.toLocaleString('en-US');
    const need = document.getElementById('need'); if (need) need.textContent = data.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call').length.toLocaleString('en-US');
    const sectionTotal = document.getElementById('sectionTotal'); if (sectionTotal) sectionTotal.textContent = data.length.toLocaleString('en-US') + ' residents';
  }

  function render(data) {
    if (!list) return;
    list.innerHTML = '';
    data.forEach(function (r) {
      const card = document.createElement('article');
      card.className = 'resident-card';
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.addEventListener('click', function () { openEditor(r.id); });
      const photo = document.createElement('div');
      photo.className = 'photo';
      if (r.photo_url) {
        const img = document.createElement('img'); img.src = r.photo_url; img.alt = ''; photo.appendChild(img);
      } else {
        const ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = String(r.name || '?').slice(0, 1); photo.appendChild(ph);
      }
      const info = document.createElement('div'); info.className = 'info';
      const h = document.createElement('h3'); h.textContent = r.name || 'Unknown';
      const p = document.createElement('p'); p.textContent = (r.house || '-') + ' · Box ' + (r.election_box || '-') + ' · ' + (r.phone || 'No phone');
      const chips = document.createElement('div'); chips.className = 'chips';
      [r.party || '-', r.vote_status || 'pending', r.phone_status || 'need-call', r.reach_status || 'not-reached', r.d2d_status || 'not-visited', r.transport_status || 'not-needed'].forEach(function (x) { const s = document.createElement('span'); s.textContent = x; chips.appendChild(s); });
      info.appendChild(h); info.appendChild(p); info.appendChild(chips); card.appendChild(photo); card.appendChild(info); list.appendChild(card);
    });
  }

  function installEditor() {
    if (document.getElementById('editModal')) return;
    const css = document.createElement('style');
    css.textContent = '.edit-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99;display:none;align-items:end;justify-content:center;padding:12px}.edit-modal.open{display:flex}.edit-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(15,23,42,.22)}.edit-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.edit-head h2{margin:0;font-size:22px}.edit-form{display:grid;gap:10px}.edit-form label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.edit-form select,.edit-form textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.edit-form textarea{min-height:88px}.edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}.resident-card{cursor:pointer}.resident-card:hover{border-color:#93c5fd;box-shadow:0 14px 30px rgba(15,23,42,.1)}';
    document.head.appendChild(css);
    const modal = document.createElement('section');
    modal.id = 'editModal';
    modal.className = 'edit-modal';
    modal.innerHTML = '<article class="edit-card"><div class="edit-head"><div><h2 id="editName">Update resident</h2><p id="editMeta"></p></div><button id="editClose" class="btn" type="button">Close</button></div><form id="editForm" class="edit-form"><label>Vote Status<select id="editVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label><label>Phone Status<select id="editPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label><label>Reach Status<select id="editReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label><label>D2D Status<select id="editD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label><label>Transport Status<select id="editTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label><label>Support Level<select id="editSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label><label>Remarks<textarea id="editRemarks" placeholder="Write remarks"></textarea></label><div class="edit-actions"><button class="btn active" type="submit">Save Update</button><button id="editCancel" class="btn" type="button">Cancel</button></div></form></article>';
    document.body.appendChild(modal);
    document.getElementById('editClose').onclick = closeEditor;
    document.getElementById('editCancel').onclick = closeEditor;
    modal.addEventListener('click', function (e) { if (e.target === modal) closeEditor(); });
    document.getElementById('editForm').addEventListener('submit', saveEditor);
  }

  function openEditor(id) {
    current = rows.find(r => String(r.id) === String(id));
    if (!current) return;
    document.getElementById('editName').textContent = current.name || 'Update resident';
    document.getElementById('editMeta').textContent = (current.house || '-') + ' · ' + (current.phone || 'No phone');
    document.getElementById('editVote').value = current.vote_status || 'pending';
    document.getElementById('editPhone').value = current.phone_status || 'need-call';
    document.getElementById('editReach').value = current.reach_status || 'not-reached';
    document.getElementById('editD2D').value = current.d2d_status || 'not-visited';
    document.getElementById('editTransport').value = current.transport_status || 'not-needed';
    document.getElementById('editSupport').value = current.support_level || 'normal';
    document.getElementById('editRemarks').value = current.remarks || '';
    document.getElementById('editModal').classList.add('open');
  }

  function closeEditor() { document.getElementById('editModal').classList.remove('open'); current = null; }

  async function saveEditor(e) {
    e.preventDefault();
    if (!current) return;
    const patch = {
      vote_status: document.getElementById('editVote').value,
      phone_status: document.getElementById('editPhone').value,
      reach_status: document.getElementById('editReach').value,
      d2d_status: document.getElementById('editD2D').value,
      transport_status: document.getElementById('editTransport').value,
      support_level: document.getElementById('editSupport').value,
      remarks: document.getElementById('editRemarks').value
    };
    if (patch.vote_status === 'will-vote' || patch.vote_status === 'no-vote' || patch.support_level === 'guaranteed' || patch.phone_status === 'called') patch.reach_status = 'reached';
    if (status) status.textContent = 'Saving update...';
    const result = await client.from('campaign').update(patch).eq('id', current.id).select().single();
    if (result.error) { if (status) { status.textContent = 'Save failed: ' + result.error.message; status.className = 'status error'; } return; }
    rows = rows.map(r => String(r.id) === String(current.id) ? Object.assign({}, r, result.data || patch) : r);
    updateStats(rows); render(rows); closeEditor();
    if (status) { status.textContent = 'Saved update for ' + (result.data?.name || current.name || 'resident') + '.'; status.className = 'status'; }
  }
});