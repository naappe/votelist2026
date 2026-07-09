(function(){
  var params=new URLSearchParams(location.search);
  var section=(params.get('section')||'voters').toLowerCase();
  if(section==='residents') section='voters';
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  function init(){addCss();setTimeout(forceAssignedFirst,700);setTimeout(forceAssignedFirst,1500);fixCards();new MutationObserver(function(){fixCards();}).observe(document.body,{childList:true,subtree:true});}
  function forceAssignedFirst(){
    if(section!=='assign') return;
    var title=(document.querySelector('#list')?.closest('.panel')?.querySelector('.panel-head h2')?.textContent||'').toLowerCase();
    if(title.includes('unassigned')){
      var btn=document.querySelector('[data-mode="assigned"]')||document.querySelector('#assignModeAssigned');
      if(btn) btn.click();
    }
  }
  function fixCards(){
    document.querySelectorAll('.resident-card').forEach(function(card){
      var info=card.querySelector('.info');
      if(!info||info.dataset.orderFixed==='1') return;
      var name=info.querySelector('h3');
      var meta=info.querySelector('p');
      var assignment=info.querySelector('.assigned-visible-line');
      var chips=Array.from(info.querySelectorAll('.chips span')).map(function(x){return (x.textContent||'').trim();}).filter(Boolean);
      var vote=find(chips,['will-vote','pending','no-vote','not-vote','not-decided'])||'pending';
      var d2d=find(chips,['not-visited','visited','not-home','follow-up'])||'not-visited';
      var phone=find(chips,['need-call','called','busy','switched-off','disconnected','wrong-number','out-of-range','no-phone'])||'need-call';
      var reach=find(chips,['reached','not-reached'])||'not-reached';
      var transport=find(chips,['need-transport','arranged','picked-up','not-needed'])||'not-needed';
      var party=chips.find(function(x){return ['PNC','MDP'].indexOf(x)>-1;})||chips[0]||'';
      var assignText=(assignment?assignment.textContent:'Assignment: Not assigned').replace(/^\s*(assignment|assigned)\s*:\s*/i,'').trim()||'Not assigned';
      var stack=document.createElement('div');
      stack.className='card-status-stack';
      stack.innerHTML='<span class="status-pill status-assign">Assign: '+esc(assignText)+'</span><span class="status-pill">Vote: '+label(vote)+'</span><span class="status-pill">D2D: '+label(d2d)+'</span><span class="status-pill">Call: '+label(phone)+'</span><span class="status-pill">Reach: '+label(reach)+'</span><span class="status-pill">Transport: '+label(transport)+'</span>';
      if(name) name.insertAdjacentElement('afterend',stack);
      if(assignment) assignment.remove();
      var box=info.querySelector('.chips');
      if(box) box.innerHTML=party?'<span>'+esc(party)+'</span>':'';
      if(meta) meta.classList.add('clean-meta-line');
      info.dataset.orderFixed='1';
    });
  }
  function find(arr,keys){for(var i=0;i<keys.length;i++){if(arr.indexOf(keys[i])>-1)return keys[i];}return '';}
  function label(v){return esc(String(v||'').replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}));}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function addCss(){
    if(document.getElementById('assignDefaultCardOrderStyles')) return;
    var s=document.createElement('style');
    s.id='assignDefaultCardOrderStyles';
    s.textContent='.card-status-stack{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 8px}.status-pill{border:1px solid #dbe4f0;background:#f8fafc;color:#334155;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900;line-height:1.1}.status-assign{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.clean-meta-line{margin-top:6px!important;color:#64748b!important}@media(max-width:760px){.card-status-stack{gap:5px;margin:7px 0}.status-pill{font-size:10px;padding:4px 7px}.status-assign{width:100%;border-radius:12px}}';
    document.head.appendChild(s);
  }
})();