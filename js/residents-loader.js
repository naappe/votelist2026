document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(location.search);
  const party = (params.get('party') || 'PNC').toUpperCase();
  const rawSection = (params.get('section') || 'voters').toLowerCase();
  const section = rawSection === 'residents' ? 'voters' : rawSection;
  const cfg = window.APP_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const titles = {voters:'All Residents',assign:'Unassigned Residents',calls:'Need Call',votes:'Pending Votes',visits:'Need Visit',transport:'Need Transport',insights:'Insights'};
  const status = document.getElementById('status'), list = document.getElementById('list'), total = document.getElementById('total');
  const searchInput = document.getElementById('searchInput'), houseSelect = document.getElementById('houseSelect'), clearBtn = document.getElementById('clearBtn');
  let allRows = [], rows = [], visibleRows = [], current = null, currentFilter = 'all';

  buildNav(); setTitles(); installStyles(); installEditor(); installShareTools(); wireFilters(); await loadRows();

  function sectionOk(r){
    if(section==='assign') return !String(r.vote_assigned_by||'').trim();
    if(section==='calls') return r.phone_status==='need-call';
    if(section==='votes') return r.vote_status==='pending';
    if(section==='visits') return r.d2d_status==='not-visited';
    if(section==='transport') return r.transport_status==='need-transport';
    return true;
  }
  function buildNav(){
    const nav=document.getElementById('nav'); if(!nav) return;
    nav.innerHTML=[['voters','Residents'],['assign','Assign'],['calls','Calls'],['votes','Votes'],['visits','Visits'],['transport','Transport'],['insights','Insights']].map(x=>'<a class="btn '+(x[0]===section?'active':'')+'" href="residents.html?party='+encodeURIComponent(party)+'&section='+x[0]+'&v=share2">'+x[1]+'</a>').join('')+'<a class="btn" href="index.html?v=share2">Logout</a>';
  }
  function setTitles(){
    const p=document.getElementById('partyName'); if(p) p.textContent=party==='ALL'?'All':party;
    const h2=document.querySelector('.panel-head h2'); if(h2) h2.textContent=titles[section]||'Residents';
    const hero=document.querySelector('.hero h1'); if(hero) hero.innerHTML='<span id="partyName">'+(party==='ALL'?'All':party)+'</span> '+(titles[section]||'Residents');
  }
  async function loadRows(){
    setStatus('Loading '+(titles[section]||'residents')+'...');
    let out=[], from=0, size=1000;
    while(true){
      let q=client.from('campaign').select('id,name,national_id,house,phone,party,election_box,photo_url,vote_status,phone_status,reach_status,d2d_status,transport_status,support_level,remarks,vote_assigned_by,vote_assigned_at').range(from,from+size-1);
      if(party!=='ALL') q=q.eq('party',party);
      const res=await q; if(res.error){setStatus('Supabase error: '+res.error.message,true);return;}
      out=out.concat(res.data||[]); if(!res.data||res.data.length<size) break; from+=size;
    }
    allRows=out; rows=allRows.filter(sectionOk); buildHouseOptions(); updateStats(rows); applyFilter('all');
    setStatus('Loaded '+rows.length.toLocaleString('en-US')+' '+(titles[section]||'residents').toLowerCase()+' from '+allRows.length.toLocaleString('en-US')+' total.');
  }
  function wireFilters(){
    bindStat('total','all'); bindStat('will','will-vote'); bindStat('notvote','not-vote'); bindStat('pending','pending'); bindStat('need','need-call');
    if(searchInput) searchInput.oninput=()=>applyFilter(currentFilter);
    if(houseSelect) houseSelect.onchange=()=>applyFilter(currentFilter);
    if(clearBtn) clearBtn.onclick=()=>{ if(searchInput)searchInput.value=''; if(houseSelect)houseSelect.value=''; applyFilter('all'); };
  }
  function bindStat(id,filter){ const el=document.getElementById(id)?.closest('.stat'); if(!el)return; el.dataset.filter=filter; el.style.cursor='pointer'; el.onclick=()=>applyFilter(filter); }
  function buildHouseOptions(){
    if(!houseSelect)return; const keep=houseSelect.value, m=new Map();
    rows.forEach(r=>{const h=String(r.house||'Unknown').trim()||'Unknown';m.set(h,(m.get(h)||0)+1);});
    houseSelect.innerHTML='<option value="">All houses</option>'+Array.from(m.keys()).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(h=>'<option value="'+esc(h)+'">'+esc(h)+' ('+m.get(h).toLocaleString('en-US')+')</option>').join('');
    if(keep) houseSelect.value=keep;
  }
  function updateStats(data){
    setNum('total',data.length); setNum('will',data.filter(r=>r.vote_status==='will-vote').length); setNum('notvote',data.filter(r=>['no-vote','not-vote'].includes(r.vote_status)).length);
    setNum('pending',data.filter(r=>r.reach_status==='reached'&&!['will-vote','no-vote','not-vote'].includes(r.vote_status)).length);
    setNum('need',data.filter(r=>r.reach_status!=='reached'||r.phone_status==='need-call'||r.d2d_status==='not-visited').length);
  }
  function setNum(id,n){const el=document.getElementById(id); if(el) el.textContent=Number(n||0).toLocaleString('en-US');}
  function applyFilter(filter){
    currentFilter=filter||'all'; let data=rows.slice();
    if(currentFilter==='will-vote') data=data.filter(r=>r.vote_status==='will-vote');
    if(currentFilter==='not-vote') data=data.filter(r=>['no-vote','not-vote'].includes(r.vote_status));
    if(currentFilter==='pending') data=data.filter(r=>r.reach_status==='reached'&&!['will-vote','no-vote','not-vote'].includes(r.vote_status));
    if(currentFilter==='need-call') data=data.filter(r=>r.reach_status!=='reached'||r.phone_status==='need-call'||r.d2d_status==='not-visited');
    const term=String(searchInput?.value||'').trim().toLowerCase(); if(term)data=data.filter(r=>[r.name,r.national_id,r.house,r.phone,r.party,r.election_box,r.remarks,r.vote_assigned_by].some(v=>String(v||'').toLowerCase().includes(term)));
    const h=String(houseSelect?.value||'').trim().toLowerCase(); if(h)data=data.filter(r=>String(r.house||'Unknown').trim().toLowerCase()===h);
    visibleRows=data; render(data); updateCount(data.length); document.querySelectorAll('.stat').forEach(el=>{el.classList.toggle('active',el.dataset.filter===currentFilter);});
  }
  function updateCount(n){const el=document.getElementById('sectionTotal'); if(el)el.textContent=n.toLocaleString('en-US')+' of '+rows.length.toLocaleString('en-US')+' '+(titles[section]||'residents').toLowerCase();}
  function render(data){
    if(!list)return; list.innerHTML=''; if(!data.length){list.innerHTML='<div class="empty">No residents match this section/filter.</div>';return;}
    data.forEach(r=>{const card=document.createElement('article');card.className='resident-card';card.tabIndex=0;card.onclick=()=>openEditor(r.id); const photo=document.createElement('div');photo.className='photo'; if(r.photo_url){const img=document.createElement('img');img.src=r.photo_url;img.alt='';photo.appendChild(img);}else{const ph=document.createElement('div');ph.className='ph';ph.textContent=String(r.name||'?').slice(0,1);photo.appendChild(ph);} const info=document.createElement('div');info.className='info'; const h=document.createElement('h3');h.textContent=r.name||'Unknown'; const p=document.createElement('p');p.textContent=(r.house||'-')+' · Box '+(r.election_box||'-')+' · '+(r.phone||'No phone'); const chips=document.createElement('div');chips.className='chips'; [r.party||'-',r.vote_status||'pending',r.phone_status||'need-call',r.reach_status||'not-reached',r.d2d_status||'not-visited',r.transport_status||'not-needed',r.vote_assigned_by?'Assigned: '+r.vote_assigned_by:'Unassigned'].forEach(x=>{const s=document.createElement('span');s.textContent=x;chips.appendChild(s);}); info.append(h,p,chips); card.append(photo,info); list.appendChild(card);});
  }
  function installShareTools(){
    const panel=document.querySelector('.panel'); if(!panel||document.getElementById('shareTools'))return;
    const box=document.createElement('div'); box.id='shareTools'; box.className='share-tools';
    box.innerHTML='<strong>Assign Links</strong><div class="share-row"><button id="assignLinkBtn" class="btn" type="button">Create Assign Link</button><button id="safeLinkBtn" class="btn" type="button">Create Read Only Link</button><button id="copyLinkBtn" class="btn" type="button">Copy Link</button></div><textarea id="shareLinkBox" readonly placeholder="Generated link will show here"></textarea><small>Link uses current visible list. Use search/house first for smaller links.</small>';
    panel.appendChild(box); document.getElementById('assignLinkBtn').onclick=()=>createShare('assign'); document.getElementById('safeLinkBtn').onclick=()=>createShare('safe'); document.getElementById('copyLinkBtn').onclick=copyLink;
  }
  async function createShare(kind){
    const source=(visibleRows&&visibleRows.length)?visibleRows:rows; if(!source.length){setStatus('No residents to share.',true);return;}
    const token=Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-6);
    const payload=source.map(r=>({row_id:r.id,id:r.national_id||'',national_id:r.national_id||'',name:r.name||'',house:r.house||'',mobile:r.phone||'',phone:r.phone||'',photo:r.photo_url||'',photo_url:r.photo_url||'',assigned_by:r.vote_assigned_by||'',vote_assigned_by:r.vote_assigned_by||'',assigned_names:names(r.vote_assigned_by).join(', '),assigned_count:names(r.vote_assigned_by).length}));
    setStatus('Creating link...'); const res=await client.from('assignment_shares').insert({token,payload}).select('token').single(); if(res.error){setStatus('Create link failed: '+res.error.message,true);return;}
    const base=location.href.split('/residents.html')[0]+'/'; const url=base+(kind==='safe'?'safe-share.html?s=':'shared.html?s=')+encodeURIComponent(token); const out=document.getElementById('shareLinkBox'); if(out)out.value=url; try{await navigator.clipboard.writeText(url);setStatus('Created and copied link for '+source.length.toLocaleString('en-US')+' residents.');}catch{setStatus('Created link for '+source.length.toLocaleString('en-US')+' residents.');}
  }
  function copyLink(){const b=document.getElementById('shareLinkBox'); if(!b||!b.value){setStatus('No link created yet.',true);return;} b.select(); navigator.clipboard?.writeText(b.value); setStatus('Copied link.');}
  function names(v){return Array.from(new Set(String(v||'').split(',').map(x=>x.trim()).filter(Boolean).filter(x=>x.toLowerCase()!=='naappe@gmail.com')));}
  function installStyles(){const st=document.createElement('style');st.textContent='.share-tools{display:grid;gap:10px;margin-top:12px;padding:12px;border:1px solid #dbe4f0;border-radius:16px;background:#f8fafc}.share-row{display:flex;gap:8px;flex-wrap:wrap}.share-tools textarea{width:100%;min-height:58px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.edit-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99;display:none;align-items:end;justify-content:center;padding:12px}.edit-modal.open{display:flex}.edit-card{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;padding:16px;box-shadow:0 24px 60px rgba(15,23,42,.22)}.edit-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.edit-head h2{margin:0;font-size:22px}.edit-form{display:grid;gap:10px}.edit-form label{font-size:12px;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.edit-form input,.edit-form select,.edit-form textarea{width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font:inherit;font-weight:800}.edit-form textarea{min-height:88px}.edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}.resident-card{cursor:pointer}.resident-card:hover{border-color:#93c5fd;box-shadow:0 14px 30px rgba(15,23,42,.1)}.stat.active{background:#eff6ff}';document.head.appendChild(st);}
  function installEditor(){
    if(document.getElementById('editModal'))return; const modal=document.createElement('section'); modal.id='editModal'; modal.className='edit-modal';
    modal.innerHTML='<article class="edit-card"><div class="edit-head"><div><h2 id="editName">Update resident</h2><p id="editMeta"></p></div><button id="editClose" class="btn" type="button">Close</button></div><form id="editForm" class="edit-form"><label>Vote Status<select id="editVote"><option value="pending">Pending</option><option value="not-decided">Not Decided</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option></select></label><label>Phone Status<select id="editPhone"><option value="need-call">Need Call</option><option value="called">Called</option><option value="busy">Busy</option><option value="switched-off">Switched Off</option><option value="disconnected">Disconnected</option><option value="wrong-number">Wrong Number</option><option value="out-of-range">Out Of Range</option><option value="no-phone">No Phone</option></select></label><label>Reach Status<select id="editReach"><option value="not-reached">Not Reached</option><option value="reached">Reached</option></select></label><label>D2D Status<select id="editD2D"><option value="not-visited">Not Visited</option><option value="visited">Visited</option><option value="not-home">Not Home</option><option value="follow-up">Follow Up</option></select></label><label>Transport Status<select id="editTransport"><option value="not-needed">Not Needed</option><option value="need-transport">Need Transport</option><option value="arranged">Arranged</option><option value="picked-up">Picked Up</option></select></label><label>Support Level<select id="editSupport"><option value="normal">Normal</option><option value="guaranteed">Guaranteed</option></select></label><label>Assigned By<input id="editAssigned" type="text" placeholder="Name or comma separated names"></label><label>Remarks<textarea id="editRemarks" placeholder="Write remarks"></textarea></label><div class="edit-actions"><button class="btn active" type="submit">Save Update</button><button id="editCancel" class="btn" type="button">Cancel</button></div></form></article>';
    document.body.appendChild(modal); document.getElementById('editClose').onclick=closeEditor; document.getElementById('editCancel').onclick=closeEditor; modal.onclick=e=>{if(e.target===modal)closeEditor();}; document.getElementById('editForm').onsubmit=saveEditor;
  }
  function openEditor(id){current=allRows.find(r=>String(r.id)===String(id)); if(!current)return; document.getElementById('editName').textContent=current.name||'Update resident'; document.getElementById('editMeta').textContent=(current.house||'-')+' · '+(current.phone||'No phone'); document.getElementById('editVote').value=current.vote_status||'pending'; document.getElementById('editPhone').value=current.phone_status||'need-call'; document.getElementById('editReach').value=current.reach_status||'not-reached'; document.getElementById('editD2D').value=current.d2d_status||'not-visited'; document.getElementById('editTransport').value=current.transport_status||'not-needed'; document.getElementById('editSupport').value=current.support_level||'normal'; document.getElementById('editAssigned').value=current.vote_assigned_by||''; document.getElementById('editRemarks').value=current.remarks||''; document.getElementById('editModal').classList.add('open');}
  function closeEditor(){document.getElementById('editModal').classList.remove('open');current=null;}
  async function saveEditor(e){e.preventDefault(); if(!current)return; const assigned=document.getElementById('editAssigned').value.trim(); const patch={vote_status:document.getElementById('editVote').value,phone_status:document.getElementById('editPhone').value,reach_status:document.getElementById('editReach').value,d2d_status:document.getElementById('editD2D').value,transport_status:document.getElementById('editTransport').value,support_level:document.getElementById('editSupport').value,vote_assigned_by:assigned||null,vote_assigned_at:assigned?new Date().toISOString():null,remarks:document.getElementById('editRemarks').value}; if(patch.vote_status==='will-vote'||patch.vote_status==='no-vote'||patch.support_level==='guaranteed'||patch.phone_status==='called')patch.reach_status='reached'; setStatus('Saving update...'); const res=await client.from('campaign').update(patch).eq('id',current.id).select().single(); if(res.error){setStatus('Save failed: '+res.error.message,true);return;} allRows=allRows.map(r=>String(r.id)===String(current.id)?Object.assign({},r,res.data||patch):r); rows=allRows.filter(sectionOk); buildHouseOptions(); updateStats(rows); applyFilter(currentFilter); closeEditor(); setStatus('Saved update.');}
  function setStatus(t,e){if(!status)return;status.textContent=t||'';status.className=e?'status error':'status';}
  function esc(v){return String(v||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
});