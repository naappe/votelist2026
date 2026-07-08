(function(){
  function installHeaderFixCss(){
    if(document.getElementById('finalVotersHeaderFix'))return;
    var s=document.createElement('style');
    s.id='finalVotersHeaderFix';
    s.textContent='@media(max-width:900px){.topbar,.campaign-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"brand logout" "nav nav"!important;gap:10px!important;padding:12px!important;height:auto!important;min-height:0!important;overflow:visible!important}.brand,.campaign-brand{grid-area:brand!important;min-width:0!important;max-width:100%!important;font-size:17px!important;line-height:1.15!important;white-space:normal!important}.brand-icon{flex:0 0 32px!important}#logoutBtn,.logout-link{grid-area:logout!important;min-width:112px!important;height:44px!important;min-height:44px!important;padding:0 16px!important}.toolbar,.nav,.campaign-nav{grid-area:nav!important;width:100%!important;max-width:100%!important;min-width:0!important;display:flex!important;justify-content:flex-start!important;align-items:center!important;gap:8px!important;overflow-x:auto!important;overflow-y:visible!important;padding:0 12px 4px 0!important;margin:0!important;scroll-padding-left:0!important}.toolbar .btn,.nav .btn,.campaign-nav .btn{flex:0 0 auto!important;height:44px!important;min-height:44px!important;font-size:14px!important;padding:0 14px!important}.toolbar .btn:first-child,.nav .btn:first-child,.campaign-nav .btn:first-child{margin-left:0!important}}.resident-stats{display:grid!important;grid-template-columns:repeat(5,1fr)!important;gap:10px!important;margin:0 0 14px!important}.resident-stat{background:#fff!important;border:1px solid #dbe4f0!important;border-radius:14px!important;padding:14px!important;min-height:76px!important;cursor:pointer!important}.resident-stat span{display:block!important;text-transform:uppercase!important;font-size:10px!important;font-weight:950!important;letter-spacing:.06em!important;color:#52627a!important}.resident-stat strong{display:block!important;margin-top:6px!important;color:#061126!important;font-size:25px!important;font-weight:950!important;line-height:1!important}.resident-stat.green strong{color:#047857!important}.resident-stat.red strong{color:#b91c1c!important}.resident-stat.orange strong{color:#b45309!important}.resident-stat:hover{border-color:#93c5fd!important;box-shadow:0 14px 30px rgba(15,23,42,.1)!important}.voter-panel .panel-head p,#sectionFilter,.hero .eyebrow,.hero #dashboardSubtitle{display:none!important}@media(max-width:900px){.resident-stats{grid-template-columns:repeat(2,1fr)!important}.resident-stat{min-height:72px!important}}';
    document.head.appendChild(s);
  }
  function text(el){return String(el&&el.textContent||'')}
  function numFrom(el){var m=text(el).match(/[\d,]+/);return m?m[0]:'0'}
  function readCounts(){
    var listText=document.body.textContent||'';
    var total=numFrom(document.getElementById('sectionTotal'));
    var need='0',will='0',assigned='0';
    var cards=document.querySelectorAll('#summary .stat-card,.stats-grid .stat-card,.ai-metric,.status-metric');
    cards.forEach(function(c){var t=text(c).toLowerCase();var n=numFrom(c);if(t.includes('need call'))need=n;if(t.includes('will vote'))will=n;if(t.includes('assigned'))assigned=n;if(t.includes('voters')||t.includes('residents'))total=n;});
    if(total==='0'){var m=listText.match(/([\d,]+)\s+voters/i);if(m)total=m[1];}
    return {total:total,need:need,will:will,assigned:assigned};
  }
  function addResidentStats(){
    if(document.getElementById('residentStats'))return;
    var searchPanel=document.querySelector('[aria-label="Search voters"]');
    if(!searchPanel)return;
    var c=readCounts();
    var html='<section id="residentStats" class="resident-stats" aria-label="Resident status cards">'+
      '<article class="resident-stat" data-res-filter="all"><span>Total Residents</span><strong id="rsTotal">'+c.total+'</strong></article>'+
      '<article class="resident-stat green" data-res-filter="will-vote"><span>Will Vote</span><strong id="rsWill">'+c.will+'</strong></article>'+
      '<article class="resident-stat red" data-res-filter="no-vote"><span>Not Vote</span><strong id="rsNo">0</strong></article>'+
      '<article class="resident-stat orange" data-res-filter="pending"><span>Reached Pending</span><strong id="rsPending">0</strong></article>'+
      '<article class="resident-stat red" data-res-filter="need-call"><span>Need Call / Visit</span><strong id="rsNeed">'+c.need+'</strong></article>'+
      '</section>';
    searchPanel.insertAdjacentHTML('beforebegin',html);
  }
  function updateResidentStats(){
    addResidentStats();
    var c=readCounts();
    var total=document.getElementById('rsTotal'),will=document.getElementById('rsWill'),need=document.getElementById('rsNeed');
    if(total)total.textContent=c.total;if(will)will.textContent=c.will;if(need)need.textContent=c.need;
    var no=0,pending=0;
    document.querySelectorAll('.voter-card,[data-open-voter],.card').forEach(function(card){var t=text(card).toLowerCase();if(t.includes('not vote')||t.includes('no vote'))no++;if(t.includes('reached')&&t.includes('pending'))pending++;});
    var noEl=document.getElementById('rsNo'),pEl=document.getElementById('rsPending');if(noEl)noEl.textContent=no;if(pEl)pEl.textContent=pending;
  }
  function wireResidentStats(){
    document.querySelectorAll('[data-res-filter]').forEach(function(el){
      el.onclick=function(){var f=el.getAttribute('data-res-filter');var btn=document.querySelector('[data-filter="'+f+'"]');if(btn)btn.click();else{var url=new URL(location.href);url.searchParams.set('filter',f);history.replaceState(null,'',url.pathname.split('/').pop()+url.search);}setTimeout(function(){document.querySelector('.voter-panel')?.scrollIntoView({behavior:'smooth',block:'start'});},80);};
    });
  }
  function cleanText(){
    var title=document.getElementById('dashboardTitle');if(title)title.textContent='Residents';
    var section=document.getElementById('sectionTitle');if(section&&section.textContent.trim()==='All')section.textContent='Residents';
    var total=document.getElementById('sectionTotal');if(total)total.textContent=total.textContent.replace(/voters/i,'residents');
  }
  function forceHeader(){
    installHeaderFixCss();
    document.querySelectorAll('.brand,.campaign-brand').forEach(function(a){a.setAttribute('href','index.html');a.onclick=function(e){e.preventDefault();location.href='index.html'};});
    document.querySelectorAll('.toolbar,.nav,.campaign-nav').forEach(function(n){try{n.scrollLeft=0}catch(e){}});
    updateResidentStats();wireResidentStats();cleanText();
  }
  function init(){forceHeader();[100,250,600,1200,2500,5000].forEach(function(t){setTimeout(forceHeader,t)});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',init,{once:true});
  new MutationObserver(forceHeader).observe(document.documentElement,{childList:true,subtree:true});
})();