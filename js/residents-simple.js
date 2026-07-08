(function(){
  const CFG=window.APP_CONFIG||{};
  const party=(new URLSearchParams(location.search).get('party')||'PNC').toUpperCase();
  const client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);
  let rows=[];
  const $=id=>document.getElementById(id);
  const clean=v=>String(v||'').trim();
  const fmt=n=>new Intl.NumberFormat('en-US').format(Number(n||0));

  document.addEventListener('DOMContentLoaded',init);

  function init(){
    buildHeader();
    $('partyName').textContent=party==='ALL'?'All':party;
    $('searchInput').addEventListener('input',render);
    $('houseSelect').addEventListener('change',render);
    $('refreshBtn').addEventListener('click',loadRows);
    loadRows();
  }

  function buildHeader(){
    const pages=[['voters','Residents'],['assign','Assign'],['call','Calls'],['vote','Votes'],['d2d','Visits'],['transport','Transport'],['ai-dashboard','Insights']];
    const nav=$('nav');
    nav.innerHTML=pages.map(([p,l])=>`<a class="btn ${p==='voters'?'active':''}" href="${p}.html?party=${encodeURIComponent(party)}&v=simple1">${l}</a>`).join('');
  }

  async function loadRows(){
    setStatus('Loading residents...');
    try{
      let from=0, pageSize=1000, out=[];
      while(true){
        let q=client.from(CFG.table||'campaign').select('id,image_number,photo_url,name,national_id,house,lives_in,phone,party,election_box,phone_status,reach_status,vote_status,transport_status,d2d_status,remarks,support_level').order('image_number',{ascending:true,nullsFirst:false}).range(from,from+pageSize-1);
        if(party!=='ALL')q=q.eq('party',party);
        const {data,error}=await q;
        if(error)throw error;
        out=out.concat(data||[]);
        if(!data||data.length<pageSize)break;
        from+=pageSize;
      }
      rows=out;
      buildHouseOptions();
      render();
      setStatus(rows.length?`Loaded ${fmt(rows.length)} residents.`:'No residents found for this party.');
    }catch(err){
      setStatus('Load failed: '+(err.message||String(err)),true);
      $('list').innerHTML='<div class="empty">Could not load residents. Check Supabase RLS/anon access or table name.</div>';
    }
  }

  function buildHouseOptions(){
    const map=new Map();
    rows.forEach(r=>{const h=clean(r.house)||'Unknown';map.set(h,(map.get(h)||0)+1)});
    const opts=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([h,c])=>`<option value="${esc(h)}">${esc(h)} (${fmt(c)})</option>`).join('');
    $('houseSelect').innerHTML='<option value="">All houses</option>'+opts;
  }

  function filtered(){
    const s=clean($('searchInput').value).toLowerCase();
    const h=clean($('houseSelect').value).toLowerCase();
    return rows.filter(r=>{
      const text=[r.name,r.national_id,r.house,r.phone,r.party,r.election_box,r.lives_in].map(v=>String(v||'').toLowerCase()).join(' ');
      if(h && String(r.house||'').toLowerCase()!==h)return false;
      return !s||text.includes(s);
    });
  }

  function render(){
    const data=filtered();
    $('total').textContent=fmt(data.length);
    $('will').textContent=fmt(data.filter(r=>r.vote_status==='will-vote').length);
    $('notvote').textContent=fmt(data.filter(r=>['no-vote','not-vote'].includes(r.vote_status)).length);
    $('pending').textContent=fmt(data.filter(r=>r.reach_status==='reached' && !['will-vote','no-vote','not-vote'].includes(r.vote_status)).length);
    $('need').textContent=fmt(data.filter(r=>r.reach_status!=='reached'||r.phone_status==='need-call'||r.d2d_status==='not-visited').length);
    $('sectionTotal').textContent=fmt(data.length)+' residents';
    $('list').innerHTML=data.length?data.map(card).join(''):'<div class="empty">No residents match this filter.</div>';
  }

  function card(r){
    const img=r.photo_url?`<img src="${esc(r.photo_url)}" alt="">`:`<div class="ph">${esc((r.name||'?').slice(0,1))}</div>`;
    return `<article class="resident-card"><div class="photo">${img}</div><div class="info"><h3>${esc(r.name||'Unknown')}</h3><p>${esc(r.house||'-')} · Box ${esc(r.election_box||'-')} · ${esc(r.phone||'No phone')}</p><div class="chips"><span>${esc(r.party||'-')}</span><span>${esc(label(r.vote_status||'pending'))}</span><span>${esc(label(r.phone_status||'need-call'))}</span><span>${esc(label(r.reach_status||'not-reached'))}</span></div></div></article>`;
  }

  function label(v){return String(v||'').replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}
  function esc(v){return String(v||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
  function setStatus(msg,err){const el=$('status');el.textContent=msg||'';el.className=err?'status error':'status'}
})();