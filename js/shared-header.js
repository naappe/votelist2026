(function(){
  var params=new URLSearchParams(location.search);
  var currentParty=params.get('party');
  if(currentParty){try{sessionStorage.setItem('campaignParty',currentParty.toUpperCase())}catch(e){}}
  function savedParty(){try{return sessionStorage.getItem('campaignParty')||currentParty||'PNC'}catch(e){return currentParty||'PNC'}}
  var names={voters:'Residents',assign:'Assign',call:'Calls',vote:'Votes',d2d:'Visits',transport:'Transport','ai-dashboard':'Insights'};
  function renameNav(){
    document.querySelectorAll('[data-party-link]').forEach(function(a){var key=a.getAttribute('data-party-link');if(names[key])a.textContent=names[key];});
    document.querySelectorAll('a,button').forEach(function(el){
      var t=(el.textContent||'').trim();
      if(t==='Voters')el.textContent='Residents';
      if(t==='Call Center')el.textContent='Calls';
      if(t==='Vote')el.textContent='Votes';
      if(t==='D2D')el.textContent='Visits';
      if(t==='AI Dashboard')el.textContent='Insights';
    });
    document.querySelectorAll('#logoutBtn,.logout-link,a[href*="login.html"]').forEach(function(el){el.style.setProperty('display','none','important')});
    document.querySelectorAll('.brand,.campaign-brand').forEach(function(a){
      a.setAttribute('href','index.html?v=nologin1');
      var spans=a.querySelectorAll('span');
      if(spans.length>1)spans[spans.length-1].textContent='Villimale Campaign';
    });
    var title=document.getElementById('dashboardTitle');if(title&&/voter/i.test(title.textContent))title.textContent='Residents';
    var section=document.getElementById('sectionTitle');if(section&&section.textContent.trim()==='All')section.textContent='Residents';
    document.querySelectorAll('#campaignGlobalStatus,.app-header-stats,#summary,#sections,#voterInfoStatus,.voter-info-status').forEach(function(el){el.style.setProperty('display','none','important')});
  }
  function fixPartyLinks(){
    var p=savedParty();
    document.querySelectorAll('a[href*=".html"]').forEach(function(a){
      if(a.getAttribute('href').indexOf('login.html')>-1)return;
      var u=new URL(a.getAttribute('href'),location.href);
      if(['voters.html','assign.html','call.html','vote.html','d2d.html','transport.html','ai-dashboard.html'].indexOf(u.pathname.split('/').pop())>-1){u.searchParams.set('party',p);u.searchParams.set('v','nologin1');a.href=u.pathname.split('/').pop()+u.search;}
    });
    renameNav();
  }
  function load(src,key){if(window[key])return;window[key]=true;var s=document.createElement('script');s.src=src;document.head.appendChild(s)}
  load('js/campaign-header.js?v=nologin1','__sharedCampaignHeader');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixPartyLinks,{once:true});else fixPartyLinks();
  window.addEventListener('load',fixPartyLinks,{once:true});
  [100,400,900,1800,3500].forEach(function(t){setTimeout(fixPartyLinks,t)});
  new MutationObserver(fixPartyLinks).observe(document.documentElement,{childList:true,subtree:true});
})();