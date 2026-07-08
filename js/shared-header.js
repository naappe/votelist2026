(function(){
  var params=new URLSearchParams(location.search);
  var currentParty=params.get('party');
  if(currentParty){try{sessionStorage.setItem('campaignParty',currentParty.toUpperCase())}catch(e){}}
  function savedParty(){try{return sessionStorage.getItem('campaignParty')||currentParty||'PNC'}catch(e){return currentParty||'PNC'}}
  function renameNav(){
    var names={voters:'Residents',assign:'Assign',call:'Calls',vote:'Votes',d2d:'Visits',transport:'Transport','ai-dashboard':'Insights'};
    document.querySelectorAll('[data-party-link]').forEach(function(a){
      var key=a.getAttribute('data-party-link');
      if(names[key])a.textContent=names[key];
    });
    document.querySelectorAll('.brand,.campaign-brand').forEach(function(a){
      a.setAttribute('href','index.html');
      var spans=a.querySelectorAll('span');
      if(spans.length>1)spans[spans.length-1].textContent='Villimale Campaign';
    });
  }
  function fixPartyLinks(){
    var p=savedParty();
    document.querySelectorAll('a[href*=".html"]').forEach(function(a){
      if(a.getAttribute('href').indexOf('login.html')>-1)return;
      var u=new URL(a.getAttribute('href'),location.href);
      if(['voters.html','assign.html','call.html','vote.html','d2d.html','transport.html','ai-dashboard.html'].indexOf(u.pathname.split('/').pop())>-1){
        u.searchParams.set('party',p);
        a.href=u.pathname.split('/').pop()+u.search;
      }
    });
    renameNav();
  }
  function load(src,key){if(window[key])return;window[key]=true;var s=document.createElement('script');s.src=src;document.head.appendChild(s)}
  load('js/campaign-header.js?v=20260708-6','__sharedCampaignHeader');
  load('js/campaign-global-status.js?v=20260708-2','__sharedCampaignGlobalStatus');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixPartyLinks,{once:true});else fixPartyLinks();
  window.addEventListener('load',fixPartyLinks,{once:true});
  [100,500,1200,2500].forEach(function(t){setTimeout(fixPartyLinks,t)});
})();