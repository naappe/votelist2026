document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const rawSection = (params.get('section') || 'voters').toLowerCase();
  const section = rawSection === 'residents' ? 'voters' : rawSection;
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  const sectionTitles = {
    voters: 'All Residents',
    assign: 'Unassigned Residents',
    calls: 'Need Call',
    votes: 'Pending Votes',
    visits: 'Need Visit',
    transport: 'Need Transport',
    insights: 'Insights'
  };

  const sectionFilter = {
    assign: function (r) { return !String(r.vote_assigned_by || '').trim(); },
    calls: function (r) { return r.phone_status === 'need-call'; },
    votes: function (r) { return r.vote_status === 'pending'; },
    visits: function (r) { return r.d2d_status === 'not-visited'; },
    transport: function (r) { return r.transport_status === 'need-transport'; }
  }[section] || null;

  const status = document.getElementById('status');
  const list = document.getElementById('list');
  const total = document.getElementById('total');
  const partyName = document.getElementById('partyName');
  const searchInput = document.getElementById('searchInput');
  const houseSelect = document.getElementById('houseSelect');
  const clearBtn = document.getElementById('clearBtn');
  let allRows = [];
  let rows = [];
  let current = null;
  let currentFilter = 'all';

  if (partyName) partyName.textContent = party === 'ALL' ? 'All' : party;
  buildNav();
  setSectionTitle();
  installEditor();
  setupFilters();
  await loadRows();

  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const links = [['voters','Residents'],['assign','Assign'],['calls','Calls'],['votes','Votes'],['visits','Visits'],['transport','Transport'],['insights','Insights']];
    nav.innerHTML = links.map(function (item) {
      const key = item[0];
      const label = item[1];
      const href = 'residents.html?party=' + encodeURIComponent(party) + '&section=' + encodeURIComponent(key) + '&v=section1';
      return '<a class="btn ' + (key === section ? 'active' : '') + '" href="' + href + '">' + label + '</a>';
    }).join('') + '<a class="btn" href="index.html?v=section1">Logout</a>';
  }

  function setSectionTitle() {
    const title = sectionTitles[section] || 'Residents';
    const h2 = document.querySelector('.panel-head h2');
    if (h2) h2.textContent = title;
    const hero = document.querySelector('.hero h1');
    if (hero && partyName) hero.innerHTML = '<span id="partyName">' + (party === 'ALL' ? 'All' : party) + '</span> ' + title;
  }

  async function loadRows() {
    setStatus('Loading ' + (sectionTitles[section] || 'residents') + '...');
    let out = [];
    let from = 0;
    const size = 1000;
    while (true) {
      let query = client.from('campaign')
        .select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at')
        .range(from, from + size - 1);
      if (party !== 'ALL') query = query.eq('party', party);
      const result = await query;
      if (result.error) {
        setStatus('Supabase error: ' + result.error.message, true);
        return;
      }
      out = out.concat(result.data || []);
      if (!result.data || result.data.length < size) break;
      from += size;
    }
    allRows = out;
    rows = sectionFilter ? allRows.filter(sectionFilter) : allRows.slice();
    buildHouseOptions();
    updateStats(rows);
    applyFilter('all');
    setStatus('Loaded ' + rows.length.toLocaleString('en-US') + ' ' + (sectionTitles[section] || 'residents').toLowerCase() + ' from ' + allRows.length.toLocaleString('en-US') + ' total.');
  }

  function setupFilters() {
    bindStat('total', 'all');
    bindStat('will', 'will-vote');
    bindStat('notvote', 'not-vote');
    bindStat('pending', 'pending');
    bindStat('need', 'need-call');
    if (searchInput) searchInput.addEventListener('input', function () { applyFilter(currentFilter); });
    if (houseSelect) houseSelect.addEventListener('change', function () { applyFilter(currentFilter); });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (houseSelect) houseSelect.value = '';
      applyFilter('all');
    });
  }

  function bindStat(id, filter) {
    const el = document.getElementById(id)?.closest('.stat');
    if (!el) return;
    el.dataset.filter = filter;
    el.style.cursor = 'pointer';
    el.title = 'Click to filter';
    el.addEventListener('click', function () { applyFilter(filter); });
  }

  function buildHouseOptions() {
    if (!houseSelect) return;
    const selected = houseSelect.value;
    const counts = new Map();
    rows.forEach(function (r) {
      const house = String(r.house || 'Unknown').trim() || 'Unknown';
      counts.set(house, (counts.get(house) || 0) + 1);
    });
    const options = Array.from(counts.keys()).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
    houseSelect.innerHTML = '<option value="">All houses</option>' + options.map(function (h) {
      return '<option value="' + esc(h) + '">' + esc(h) + ' (' + (counts.get(h) || 0).toLocaleString('en-US') + ')</option>';
    }).join('');
    if (selected) houseSelect.value = selected;
  }

  function updateStats(data) {
    if (total) total.textContent = data.length.toLocaleString('en-US');
    setText('will', data.filter(r => r.vote_status === 'will-vote').length);
    setText('notvote', data.filter(r => r.vote_status === 'no-vote' || r.vote_status === 'not-vote').length);
    setText('pending', data.filter(r => r.reach_status === 'reached' && !['will-vote','no-vote','not-vote'].includes(r.vote_status)).length);
    setText('need', data.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call' || r.d2d_status === 'not-visited').length);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value || 0).toLocaleString('en-US');
  }

  function applyFilter(filter) {
    currentFilter = filter || 'all';
    let data = rows.slice();
    if (currentFilter === 'will-vote') data = data.filter(r => r.vote_status === 'will-vote');
    if (currentFilter === 'not-vote') data = data.filter(r => r.vote_status === 'no-vote' || r.vote_status === 'not-vote');
    if (currentFilter === 'pending') data = data.filter(r => r.reach_status === 'reached' && !['will-vote','no-vote','not-vote'].includes(r.vote_status));
    if (currentFilter === 'need-call') data = data.filter(r => r.reach_status !== 'reached' || r.phone_status === 'need-call' || r.d2d_status === 'not-visited');

    const term = String(searchInput?.value || '').trim().toLowerCase();
    if (term) {
      data = data.filter(function (r) {
        return [r.name, r.national_id, r.house, r.phone, r.party, r.election_box, r.remarks, r.vote_assigned_by].some(function (v) {
          return String(v || '').toLowerCase().includes(term);
        });
      });
    }
    const house = String(houseSelect?.value || '').trim().toLowerCase();
    if (house) data = data.filter(r => String(r.house || 'Unknown').trim().toLowerCase() === house);
    render(data);
    updateCount(data.length);
    highlightStat(currentFilter);
  }

  function updateCount(count) {
    const el = document.getElementById('sectionTotal');
    if (el) el.textContent = count.toLocaleString('en-US') + ' of ' + rows.length.toLocaleString('en-US') + ' ' + (sectionTitles[section] || 'residents').toLowerCase();
  }

  function highlightStat(filter) {
    document.querySelectorAll('.stat').forEach(function (el) {
      el.classList.toggle('active', el.dataset.filter === filter);
      el.style.outline = el.dataset.filter === filter ? '2px solid #1f3b66' : '';
      el.style.outlineOffset = el.dataset.filter === filter ? '2px' : '';
    });
  }

  function render(data) {
    if (!list) return;
    list.innerHTML = '';
    if (!data.length) {
      list.innerHTML = '<div class="empty">No residents match this section/filter.</div>';
      return;
    }
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
      [r.party || '-', r.vote_status || 'pending', r.phone_status || 'need-call', r.reach_status || 'not-reached', r.d2d_status || 'not-visited', r.transport_status || 'not-needed', r.vote_assigned_by ? 'Assigned: ' + r.vote_assigned_by : 'Unassigned'].forEach(function (x) {
        const s = document.createElement('span'); s.textContent = x; chips.appendChild(s);
      });
      info.appendChild(h); info.appendChild(p); info.appendChild(chips); card.appendChild(photo); card.appendChild(info); list.appendChild(card);
    });
  }

  function installEditor() {
    if (document.getElementById('editModal')) return;
    const css = document.createElement('style');
    css.textContent = '.edit-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99;display:none;align-items:end;justify-content:center;padding:12px}.edit-modal.open{display:flex}.edit-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(15,23,42,.22)}.edit-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.edit-head h2{margin:0;font-size:22px}.edit-form{display:grid;gap:10px}.edit-form label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.edit-form input,.edit-form select,.edit-form textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.edit-form textarea{min-height:88px}.edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}.resident-card{cursor:pointer}.resident-card:hover{border-color:#93c5fd;box-shadow:0 14px 30px rgba(15,23,42,.1)}.stat.active{background:#eff6ff}';
    document.head.appendChild(css);
    const modal = document.createElement('section');
    modal.id = 'editModal';
    modal.className = 'edit-modal';
    modal.innerHTML = '<article class="edit-card"><div class="edit-head"><div><h2 id="editName">Update resident</h2><p id="editMeta"></p></div><button id="editClose" class="btn" type="button">Close</button></div><form id="editForm" class="edit-form"><label>Vote Status<select id="editVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label><label>Phone Status<select id="editPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label><label>Reach Status<select id="editReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label><label>D2D Status<select id="editD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label><label>Transport Status<select id="editTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label><label>Support Level<select id="editSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label><label>Assigned By<input id="editAssigned" type="text" placeholder="Name or comma separated names"></label><label>Remarks<textarea id="editRemarks" placeholder="Write remarks"></textarea></label><div class="edit-actions"><button class="btn active" type="submit">Save Update</button><button id="editCancel" class="btn" type="button">Cancel</button></div></form></article>';
    document.body.appendChild(modal);
    document.getElementById('editClose').onclick = closeEditor;
    document.getElementById('editCancel').onclick = closeEditor;
    modal.addEventListener('click', function (e) { if (e.target === modal) closeEditor(); });
    document.getElementById('editForm').addEventListener('submit', saveEditor);
  }

  function openEditor(id) {
    current = allRows.find(r => String(r.id) === String(id));
    if (!current) return;
    document.getElementById('editName').textContent = current.name || 'Update resident';
    document.getElementById('editMeta').textContent = (current.house || '-') + ' · ' + (current.phone || 'No phone');
    document.getElementById('editVote').value = current.vote_status || 'pending';
    document.getElementById('editPhone').value = current.phone_status || 'need-call';
    document.getElementById('editReach').value = current.reach_status || 'not-reached';
    document.getElementById('editD2D').value = current.d2d_status || 'not-visited';
    document.getElementById('editTransport').value = current.transport_status || 'not-needed';
    document.getElementById('editSupport').value = current.support_level || 'normal';
    document.getElementById('editAssigned').value = current.vote_assigned_by || '';
    document.getElementById('editRemarks').value = current.remarks || '';
    document.getElementById('editModal').classList.add('open');
  }

  function closeEditor() { document.getElementById('editModal').classList.remove('open'); current = null; }

  async function saveEditor(e) {
    e.preventDefault();
    if (!current) return;
    const assigned = document.getElementById('editAssigned').value.trim();
    const patch = {
      vote_status: document.getElementById('editVote').value,
      phone_status: document.getElementById('editPhone').value,
      reach_status: document.getElementById('editReach').value,
      d2d_status: document.getElementById('editD2D').value,
      transport_status: document.getElementById('editTransport').value,
      support_level: document.getElementById('editSupport').value,
      vote_assigned_by: assigned || null,
      vote_assigned_at: assigned ? new Date().toISOString() : null,
      remarks: document.getElementById('editRemarks').value
    };
    if (patch.vote_status === 'will-vote' || patch.vote_status === 'no-vote' || patch.support_level === 'guaranteed' || patch.phone_status === 'called') patch.reach_status = 'reached';
    setStatus('Saving update...');
    const result = await client.from('campaign').update(patch).eq('id', current.id).select().single();
    if (result.error) { setStatus('Save failed: ' + result.error.message, true); return; }
    allRows = allRows.map(r => String(r.id) === String(current.id) ? Object.assign({}, r, result.data || patch) : r);
    rows = sectionFilter ? allRows.filter(sectionFilter) : allRows.slice();
    buildHouseOptions(); updateStats(rows); applyFilter(currentFilter); closeEditor();
    setStatus('Saved update for ' + (result.data?.name || current.name || 'resident') + '.');
  }

  function setStatus(text, isError) {
    if (!status) return;
    status.textContent = text || '';
    status.className = isError ? 'status error' : 'status';
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"]/g, function (m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; });
  }
});