document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const section = normalizeSection(params.get('section') || 'voters');
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  const config = {
    voters: { title: 'All Residents', filter: r => true, fields: ['party','vote_status','phone_status','reach_status','d2d_status','transport_status','vote_assigned_by'], modal: true },
    calls: { title: 'Call Center', filter: r => r.phone_status === 'need-call', fields: ['party'], actions: [{text:'Call', call:true}, {text:'Mark Called', patch:{phone_status:'called', reach_status:'reached'}}] },
    votes: { title: 'Votes', filter: r => !r.vote_status || r.vote_status === 'pending' || r.vote_status === 'not-decided', fields: ['party','vote_status','reach_status'], actions: [{text:'Will Vote', patch:{vote_status:'will-vote', reach_status:'reached', d2d_status:'visited'}}, {text:'No Vote', patch:{vote_status:'no-vote', reach_status:'reached', d2d_status:'visited'}}] },
    assign: { title: 'Assign', filter: r => !String(r.vote_assigned_by || '').trim(), fields: ['party'], assign: true },
    visits: { title: 'Visits (D2D)', filter: r => !r.d2d_status || r.d2d_status === 'not-visited', fields: ['party','d2d_status'], actions: [{text:'Visited', patch:{d2d_status:'visited', reach_status:'reached'}}, {text:'Not Home', patch:{d2d_status:'not-home'}}, {text:'Follow-up', patch:{d2d_status:'follow-up'}}] },
    transport: { title: 'Transport', filter: r => r.transport_status === 'need-transport', fields: ['party','transport_status'], actions: [{text:'Arranged', patch:{transport_status:'arranged'}}, {text:'Picked Up', patch:{transport_status:'picked-up', reach_status:'reached'}}] },
    insights: { title: 'Insights', filter: r => true, fields: ['party','vote_status','phone_status'], readOnly: true }
  }[section];

  const status = document.getElementById('status');
  const list = document.getElementById('list');
  const searchInput = document.getElementById('searchInput');
  const houseSelect = document.getElementById('houseSelect');
  const clearBtn = document.getElementById('clearBtn');
  let allRows = [];
  let sectionRows = [];
  let visibleRows = [];
  let currentFilter = 'all';
  let editRow = null;

  buildNav();
  setTitle();
  addLocalCss();
  installModal();
  installShareTools();
  wireFilters();
  await loadRows();

  function normalizeSection(value) {
    value = String(value || 'voters').toLowerCase();
    if (value === 'residents') return 'voters';
    if (value === 'call') return 'calls';
    if (value === 'vote') return 'votes';
    if (value === 'd2d') return 'visits';
    return ['voters','calls','votes','assign','visits','transport','insights'].includes(value) ? value : 'voters';
  }

  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const items = [['voters','Residents'],['calls','Call Center'],['votes','Votes'],['assign','Assign'],['visits','Visits'],['transport','Transport'],['insights','Insights']];
    nav.innerHTML = items.map(([key,label]) => '<a class="btn '+(key===section?'active':'')+'" href="residents.html?party='+encodeURIComponent(party)+'&section='+key+'&v=logic2">'+label+'</a>').join('') + '<a class="btn" href="login.html?v=logic2">Logout</a>';
  }

  function setTitle() {
    const partyLabel = party === 'ALL' ? 'All' : party;
    const partyName = document.getElementById('partyName');
    if (partyName) partyName.textContent = partyLabel;
    const hero = document.querySelector('.hero h1');
    if (hero) hero.innerHTML = '<span id="partyName">'+escapeHtml(partyLabel)+'</span> '+escapeHtml(config.title);
    const panelTitle = document.querySelector('.panel-head h2');
    if (panelTitle) panelTitle.textContent = config.title;
  }

  async function loadRows() {
    setStatus('Loading '+config.title+'...');
    let out = [];
    let from = 0;
    const size = 1000;
    while (true) {
      let query = client.from('campaign').select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at').range(from, from + size - 1);
      if (party !== 'ALL') query = query.eq('party', party);
      const result = await query;
      if (result.error) { setStatus('Supabase error: '+result.error.message, true); return; }
      out = out.concat(result.data || []);
      if (!result.data || result.data.length < size) break;
      from += size;
    }
    allRows = out;
    refreshSectionRows();
    buildHouseOptions();
    applyFilter('all');
    setStatus('Loaded '+sectionRows.length.toLocaleString('en-US')+' '+config.title.toLowerCase()+' from '+allRows.length.toLocaleString('en-US')+' total.');
  }

  function refreshSectionRows() { sectionRows = allRows.filter(config.filter); }

  function wireFilters() {
    bindStat('total','all'); bindStat('will','will-vote'); bindStat('notvote','no-vote'); bindStat('pending','reached-pending'); bindStat('need','need-call');
    if (searchInput) searchInput.addEventListener('input', () => applyFilter(currentFilter));
    if (houseSelect) houseSelect.addEventListener('change', () => applyFilter(currentFilter));
    if (clearBtn) clearBtn.addEventListener('click', () => { if(searchInput)searchInput.value=''; if(houseSelect)houseSelect.value=''; applyFilter('all'); });
  }

  function bindStat(id, filter) {
    const el = document.getElementById(id)?.closest('.stat');
    if (!el) return;
    el.dataset.filter = filter;
    el.onclick = () => applyFilter(filter);
  }

  function buildHouseOptions() {
    if (!houseSelect) return;
    const selected = houseSelect.value;
    const counts = new Map();
    sectionRows.forEach(r => { const h = String(r.house || 'Unknown').trim() || 'Unknown'; counts.set(h, (counts.get(h) || 0) + 1); });
    const houses = Array.from(counts.keys()).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
    houseSelect.innerHTML = '<option value="">All houses</option>' + houses.map(h => '<option value="'+escapeHtml(h)+'">'+escapeHtml(h)+' ('+counts.get(h).toLocaleString('en-US')+')</option>').join('');
    if (selected) houseSelect.value = selected;
  }

  function applyFilter(filter) {
    currentFilter = filter || 'all';
    let data = sectionRows.slice();
    if (currentFilter === 'will-vote') data = data.filter(r => r.vote_status === 'will-vote');
    if (currentFilter === 'no-vote') data = data.filter(r => r.vote_status === 'no-vote' || r.vote_status === 'not-vote');
    if (currentFilter === 'reached-pending') data = data.filter(r => r.reach_status === 'reached' && !['will-vote','no-vote','not-vote'].includes(r.vote_status));
    if (currentFilter === 'need-call') data = data.filter(r => r.phone_status === 'need-call' || r.reach_status !== 'reached' || r.d2d_status === 'not-visited');
    const term = String(searchInput?.value || '').trim().toLowerCase();
    if (term) data = data.filter(r => [r.name,r.national_id,r.house,r.phone,r.party,r.election_box,r.remarks,r.vote_assigned_by].some(v => String(v || '').toLowerCase().includes(term)));
    const house = String(houseSelect?.value || '').trim().toLowerCase();
    if (house) data = data.filter(r => String(r.house || 'Unknown').trim().toLowerCase() === house);
    visibleRows = data;
    updateStats(data);
    updateCount(data.length);
    renderCards(data);
    document.querySelectorAll('.stat').forEach(el => el.classList.toggle('active', el.dataset.filter === currentFilter));
  }

  function updateStats(data) {
    setText('total', data.length);
    setText('will', data.filter(r => r.vote_status === 'will-vote').length);
    setText('notvote', data.filter(r => r.vote_status === 'no-vote' || r.vote_status === 'not-vote').length);
    setText('pending', data.filter(r => r.reach_status === 'reached' && !['will-vote','no-vote','not-vote'].includes(r.vote_status)).length);
    setText('need', data.filter(r => r.phone_status === 'need-call' || r.reach_status !== 'reached' || r.d2d_status === 'not-visited').length);
  }

  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = Number(value || 0).toLocaleString('en-US'); }
  function updateCount(count) { const el = document.getElementById('sectionTotal'); if (el) el.textContent = count.toLocaleString('en-US')+' '+config.title.toLowerCase(); }

  function renderCards(data) {
    if (!list) return;
    list.className = 'list section-list section-' + section;
    list.innerHTML = '';
    if (!data.length) { list.innerHTML = '<div class="empty">No residents match this section/filter.</div>'; return; }
    data.forEach(r => {
      const card = document.createElement('article');
      card.className = 'resident-card section-card section-card-' + section;
      if (config.modal) card.onclick = e => { if(!e.target.closest('button,input,a')) openModal(r.id); };
      card.innerHTML = '<div class="photo">'+photoHtml(r)+'</div><div class="info"><h3>'+escapeHtml(r.name || 'Unknown')+'</h3><p>'+escapeHtml(r.house || '-')+' · '+escapeHtml(r.phone || 'No phone')+'</p>'+chipsHtml(r)+actionsHtml(r)+'</div>';
      list.appendChild(card);
      wireCardActions(card, r);
    });
  }

  function chipsHtml(r) {
    return '<div class="chips section-chips">' + config.fields.map(field => '<span>'+escapeHtml(labelFor(field, r[field]))+'</span>').join('') + '</div>';
  }

  function labelFor(field, value) {
    if (field === 'party') return 'Party: ' + (value || '-');
    if (field === 'vote_status') return 'Vote: ' + (value || '-');
    if (field === 'phone_status') return 'Call: ' + (value || '-');
    if (field === 'reach_status') return 'Reach: ' + (value || '-');
    if (field === 'd2d_status') return 'D2D: ' + (value || '-');
    if (field === 'transport_status') return 'Transport: ' + (value || '-');
    if (field === 'vote_assigned_by') return value ? 'Assigned: ' + value : 'Unassigned';
    return value || '-';
  }

  function actionsHtml(r) {
    if (config.readOnly || config.modal) return '';
    if (config.assign) return '<div class="section-actions"><input class="assign-input" placeholder="Assign name"><button class="btn success" data-action="assign" type="button">Assign</button></div>';
    if (!config.actions) return '';
    return '<div class="section-actions">' + config.actions.map((a,i) => a.call ? '<a class="btn light" href="tel:'+escapeHtml(String(r.phone || '').replace(/[^0-9+]/g,''))+'">Call</a>' : '<button class="btn '+buttonClass(a.text)+'" data-action-index="'+i+'" type="button">'+escapeHtml(a.text)+'</button>').join('') + '</div>';
  }

  function wireCardActions(card, r) {
    const assignBtn = card.querySelector('[data-action="assign"]');
    if (assignBtn) assignBtn.onclick = () => { const name = card.querySelector('.assign-input').value.trim(); if(!name){setStatus('Write assigner name first.', true);return;} quickUpdate(r.id, {vote_assigned_by:name, vote_assigned_at:new Date().toISOString()}); };
    card.querySelectorAll('[data-action-index]').forEach(btn => { btn.onclick = () => quickUpdate(r.id, config.actions[Number(btn.dataset.actionIndex)].patch); });
  }

  async function quickUpdate(id, patch) {
    setStatus('Saving update...');
    const result = await client.from('campaign').update(patch).eq('id', id).select().single();
    if (result.error) { setStatus('Save failed: ' + result.error.message, true); return; }
    allRows = allRows.map(r => String(r.id) === String(id) ? Object.assign({}, r, result.data || patch) : r);
    refreshSectionRows(); buildHouseOptions(); applyFilter(currentFilter);
    setStatus('Saved. List updated.');
  }

  function installShareTools() {
    const panel = document.querySelector('.panel');
    if (!panel || document.getElementById('shareTools')) return;
    const box = document.createElement('div');
    box.id = 'shareTools';
    box.className = 'share-tools';
    box.innerHTML = '<div class="share-title">Assign Links</div><div class="share-actions"><button id="createAssignLinkBtn" class="btn" type="button">Create Assign Link</button><button id="createSafeLinkBtn" class="btn" type="button">Create Read Only Link</button><button id="copyLastLinkBtn" class="btn" type="button">Copy Last Link</button></div><textarea id="shareLinkBox" readonly placeholder="Generated link will show here"></textarea><div class="share-help">Creates link for the current visible list.</div>';
    panel.appendChild(box);
    document.getElementById('createAssignLinkBtn').onclick = () => createShareLink('assign');
    document.getElementById('createSafeLinkBtn').onclick = () => createShareLink('safe');
    document.getElementById('copyLastLinkBtn').onclick = copyLastLink;
  }

  async function createShareLink(kind) {
    const data = visibleRows.length ? visibleRows : sectionRows;
    if (!data.length) { setStatus('No residents to share.', true); return; }
    const token = Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-6);
    const payload = data.map(r => ({row_id:r.id,id:r.national_id||'',national_id:r.national_id||'',name:r.name||'',house:r.house||'',mobile:r.phone||'',phone:r.phone||'',photo:r.photo_url||'',photo_url:r.photo_url||'',assigned_by:r.vote_assigned_by||'',vote_assigned_by:r.vote_assigned_by||''}));
    const result = await client.from('assignment_shares').insert({token:token,payload:payload}).select('token').single();
    if (result.error) { setStatus('Create link failed: '+result.error.message, true); return; }
    const base = location.origin + location.pathname.replace(/residents\.html$/, '');
    const url = base + (kind === 'safe' ? 'safe-share.html?s=' : 'shared.html?s=') + encodeURIComponent(token);
    const linkBox = document.getElementById('shareLinkBox');
    if (linkBox) linkBox.value = url;
    setStatus('Created link for '+data.length.toLocaleString('en-US')+' residents.');
  }

  function copyLastLink() { const box = document.getElementById('shareLinkBox'); if(!box || !box.value){setStatus('No link created yet.', true); return;} box.select(); document.execCommand('copy'); setStatus('Copied link.'); }

  function installModal() {
    if (document.getElementById('editModal')) return;
    const modal = document.createElement('section');
    modal.id = 'editModal';
    modal.className = 'edit-modal';
    modal.innerHTML = '<article class="edit-card"><div class="edit-head"><div><h2 id="editName">Update resident</h2><p id="editMeta"></p></div><button id="editClose" class="btn" type="button">Close</button></div><form id="editForm" class="edit-form"><label>Vote Status<select id="editVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label><label>Phone Status<select id="editPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label><label>Reach Status<select id="editReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label><label>D2D Status<select id="editD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label><label>Transport Status<select id="editTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label><label>Support Level<select id="editSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label><label>Assigned By<input id="editAssigned" type="text"></label><label>Remarks<textarea id="editRemarks"></textarea></label><div class="edit-actions"><button class="btn active" type="submit">Save Update</button><button id="editCancel" class="btn" type="button">Cancel</button></div></form></article>';
    document.body.appendChild(modal);
    document.getElementById('editClose').onclick = closeModal;
    document.getElementById('editCancel').onclick = closeModal;
    document.getElementById('editForm').onsubmit = saveModal;
  }

  function openModal(id) {
    editRow = allRows.find(r => String(r.id) === String(id));
    if (!editRow) return;
    document.getElementById('editName').textContent = editRow.name || 'Update resident';
    document.getElementById('editMeta').textContent = (editRow.house || '-') + ' · ' + (editRow.phone || 'No phone');
    document.getElementById('editVote').value = editRow.vote_status || 'pending';
    document.getElementById('editPhone').value = editRow.phone_status || 'need-call';
    document.getElementById('editReach').value = editRow.reach_status || 'not-reached';
    document.getElementById('editD2D').value = editRow.d2d_status || 'not-visited';
    document.getElementById('editTransport').value = editRow.transport_status || 'not-needed';
    document.getElementById('editSupport').value = editRow.support_level || 'normal';
    document.getElementById('editAssigned').value = editRow.vote_assigned_by || '';
    document.getElementById('editRemarks').value = editRow.remarks || '';
    document.getElementById('editModal').classList.add('open');
  }

  function closeModal() { document.getElementById('editModal').classList.remove('open'); editRow = null; }

  async function saveModal(e) {
    e.preventDefault();
    if (!editRow) return;
    const assigned = document.getElementById('editAssigned').value.trim();
    const patch = {vote_status:document.getElementById('editVote').value,phone_status:document.getElementById('editPhone').value,reach_status:document.getElementById('editReach').value,d2d_status:document.getElementById('editD2D').value,transport_status:document.getElementById('editTransport').value,support_level:document.getElementById('editSupport').value,vote_assigned_by:assigned||null,vote_assigned_at:assigned?new Date().toISOString():null,remarks:document.getElementById('editRemarks').value};
    if (patch.vote_status === 'will-vote' || patch.vote_status === 'no-vote' || patch.support_level === 'guaranteed' || patch.phone_status === 'called') patch.reach_status = 'reached';
    await quickUpdate(editRow.id, patch); closeModal();
  }

  function addLocalCss(){ if(document.getElementById('sectionLogicCss'))return; const s=document.createElement('style'); s.id='sectionLogicCss'; s.textContent='.btn.active,.stat.active{background:#eff6ff!important;border-color:#1d4ed8!important}.section-card{display:grid;grid-template-columns:82px minmax(0,1fr);gap:12px;padding:14px;border:1px solid #dbe4f0;border-radius:18px;background:#fff;box-shadow:0 12px 28px rgba(15,23,42,.06)}.section-card-voters{cursor:pointer}.section-card-voters:hover{border-color:#93c5fd}.section-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.section-actions .success{background:#047857;color:#fff}.section-actions .danger{background:#b91c1c;color:#fff}.section-actions .warning{background:#b45309;color:#fff}.assign-input{min-width:160px;flex:1 1 180px;min-height:40px;border:1px solid #cbd5e1;border-radius:12px;padding:9px 11px;font-weight:850}.edit-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99;display:none;align-items:end;justify-content:center;padding:12px}.edit-modal.open{display:flex}.edit-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px}.edit-form{display:grid;gap:10px}.edit-form input,.edit-form select,.edit-form textarea,.share-tools textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.share-tools{display:grid;gap:10px;margin-top:12px;padding:12px;border:1px solid #dbe4f0;border-radius:16px;background:#f8fafc}.share-actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:720px){.section-card{grid-template-columns:74px minmax(0,1fr)}.section-actions{display:grid}.assign-input{width:100%}}'; document.head.appendChild(s); }
  function photoHtml(r){ return r.photo_url ? '<img src="'+escapeHtml(r.photo_url)+'" alt="">' : '<div class="ph">'+escapeHtml(initials(r.name))+'</div>'; }
  function initials(n){ return String(n||'?').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase() || '?'; }
  function buttonClass(text){ return /No Vote/i.test(text) ? 'danger' : /Not Home|Arranged/i.test(text) ? 'warning' : 'success'; }
  function setStatus(text, error){ if(!status)return; status.textContent=text||''; status.className=error?'status error':'status'; }
  function escapeHtml(v){ return String(v||'').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])); }
});