(function(){
  var params=new URLSearchParams(location.search);
  var section=(params.get('section')||'voters').toLowerCase();
  if(section==='residents') section='voters';
  var lastCardId='';
  var savedState=null;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();

  function init(){
    document.addEventListener('click',function(e){
      var card=e.target.closest&&e.target.closest('.resident-card[data-row-id]');
      if(card) lastCardId=card.dataset.rowId||'';
    },true);

    document.addEventListener('submit',function(e){
      if(!e.target||e.target.id!=='modalForm') return;
      savedState={
        search:document.getElementById('searchInput')?.value||'',
        house:document.getElementById('houseSelect')?.value||'',
        scroll:window.scrollY||0,
        mode:currentMode(),
        rowId:lastCardId,
        reach:reachAfterSave()
      };
      if(savedState.reach) syncReachAfterCoreSave(savedState.rowId,savedState.reach);
      setTimeout(restoreState,800);
      setTimeout(restoreState,1600);
    },true);

    setTimeout(applyDefaultLanding,500);
    setTimeout(applyDefaultLanding,1200);
  }

  function applyDefaultLanding(){
    if(sessionStorage.getItem('appv2DefaultApplied:'+location.pathname+location.search)) return;
    if(section==='assign'){
      var btn=document.getElementById('assignModeAssigned');
      if(btn){sessionStorage.setItem('appv2DefaultApplied:'+location.pathname+location.search,'1');btn.click();}
    }
    if(section==='votes'){
      var will=[].slice.call(document.querySelectorAll('[data-mode="will-vote"]'))[0];
      if(will){sessionStorage.setItem('appv2DefaultApplied:'+location.pathname+location.search,'1');will.click();}
    }
  }

  function currentMode(){
    var title=(document.querySelector('#list')?.closest('.panel')?.querySelector('.panel-head h2')?.textContent||'').toLowerCase();
    if(title.includes('assigned residents')) return 'assigned';
    if(title.includes('unassigned')) return 'unassigned';
    var active=document.querySelector('.appv2-stat[data-mode].active,.appv2-stat[data-mode]:focus');
    return active?.dataset?.mode||'';
  }

  function restoreState(){
    if(!savedState) return;
    var q=document.getElementById('searchInput');
    var h=document.getElementById('houseSelect');
    if(q) q.value=savedState.search;
    if(h) h.value=savedState.house;
    var btn=null;
    if(savedState.mode==='assigned') btn=document.getElementById('assignModeAssigned');
    if(savedState.mode==='unassigned') btn=document.getElementById('assignModeUnassigned');
    if(btn) btn.click();
    else {
      if(q) q.dispatchEvent(new Event('input',{bubbles:true}));
      if(h) h.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(savedState.search&&q) q.dispatchEvent(new Event('input',{bubbles:true}));
    if(savedState.house&&h) h.dispatchEvent(new Event('change',{bubbles:true}));
    window.scrollTo({top:savedState.scroll,behavior:'instant'});
  }

  function reachAfterSave(){
    var vote=document.getElementById('modalVote')?.value||'';
    var phone=document.getElementById('modalPhone')?.value||'';
    var support=document.getElementById('modalSupport')?.value||'';
    if(vote==='will-vote'||vote==='no-vote'||support==='guaranteed'||phone==='called') return 'reached';
    if(phone==='need-call'||vote==='pending'||vote==='not-decided') return 'not-reached';
    return '';
  }

  async function syncReachAfterCoreSave(rowId,reach){
    if(!rowId||!reach) return;
    setTimeout(async function(){
      try{
        var cfg=window.APP_CONFIG||{};
        if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey) return;
        var client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
        await client.from('campaign').update({reach_status:reach}).eq('id',rowId);
      }catch(e){}
    },900);
  }
})();