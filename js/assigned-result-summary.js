(function(){
  if(new URLSearchParams(location.search).get('view')==='read')return;
  let client=null;
  function n(v){return new Intl.NumberFormat('en-US').format(v||0)}
  function clean(v){return String(v||'').trim()}
  function assigned(row){const x=clean(row.vote_assigned_by).toLowerCase();return x&&x!=='naappe@gmail.com'}
  function will(row){return clean(row.vote_status).toLowerCase()==='will-vote'}
  function reached(row){return clean(row.reach_status).toLowerCase()==='reached'}
  function getClient(){if(client)return client;const c=window.APP_CONFIG;if(!window.supabase||!c)return null;client=window.supabase.createClient(c.supabaseUrl,c.supabaseKey);return client}
  async function fetchAssigned(){const sb=getClient(),c=window.APP_CONFIG;if(!sb||!c)return[];let out=[],from=0,size=1000;while(true){let q=sb.from(c.table).select('id,vote_assigned_by,vote_status,reach_status').not('vote_assigned_by','is',null).range(from,from+size-1);const p=(new URLSearchParams(location.search).get('party')||'ALL').toUpperCase();if(p!=='ALL')q=q.eq('party',p);const r=await q;if(r.error)throw r.error;out.push(...(r.data||[]));if(!r.data||r.data.length<size)break;from+=size}return out.filter(assigned)}
  function addStyles(){if(document.getElementById('assignedResultSimpleStyles'))return;const s=document.createElement('style');s.id='assignedResultSimpleStyles';s.textContent='.assigned-result-summary{display:none!important}.assignment-status-chip{display:inline-flex;width:max-content;margin:6px 0 8px;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:950}.assignment-status-chip.will{background:#dcfce7;color:#166534}.assignment-status-chip.pending{background:#fffbeb;color:#92400e}.assignment-status-chip.notreached{background:#fef2f2;color:#991b1b}.assignment-hidden{display:none!important}#assignedTaskFilters{display:none!important}';document.head.appendChild(s)}
  function status(row){if(will(row))return'will';if(reached(row))return'pending';return'notreached'}
  function chip(row){const st=status(row);if(st==='will')return'<span class="assignment-status-chip will">Finished · Will Vote</span>';if(st==='pending')return'<span class="assignment-status-chip pending">Reached · Need Update</span>';return'<span class="assignment-status-chip notreached">Need Call / Visit</span>'}
  function markCards(rows){const map=new Map(rows.map(r=>[String(r.id),r]));document.querySelectorAll('.admin-assigned-card[data-open-voter]').forEach(card=>{const row=map.get(String(card.getAttribute('data-open-voter')));if(!row)return;card.dataset.assignmentStatus=status(row);if(card.querySelector('.assignment-status-chip'))return;const box=card.querySelector('.assigned-result-box');if(box)box.insertAdjacentHTML('afterend',chip(row))})}
  function removeDuplicatePanels(){document.getElementById('assignedResultSummary')?.remove();document.getElementById('assignedTaskFilters')?.remove()}
  function render(rows){const title=document.getElementById('sectionTitle');const total=document.getElementById('sectionTotal');const msg=document.getElementById('statusMessage');if(!title||title.textContent!=='Assigned Results')return;removeDuplicatePanels();const a=rows.length,w=rows.filter(will).length,r=rows.filter(reached).length,need=a-w,nr=a-r;if(total)total.textContent=`${n(a)} assigned · ${n(w)} finished · ${n(need)} need update`;if(msg){msg.textContent=`Update list: ${n(need)} need update. ${n(nr)} need call/visit. ${n(w)} finished will-vote.`;msg.className='status-message ok'}markCards(rows)}
  async function run(){try{addStyles();const rows=await fetchAssigned();render(rows)}catch(e){}}
  window.addEventListener('assign-results-rendered',run);
  document.addEventListener('click',e=>{if(e.target.closest('#assignedResultsBtn'))setTimeout(run,900)});
})();
