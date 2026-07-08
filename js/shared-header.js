(function(){
  var params=new URLSearchParams(location.search);
  var currentParty=params.get('party');
  if(currentParty){try{sessionStorage.setItem('campaignParty',currentParty.toUpperCase())}catch(e){}}
  function savedParty(){try{return sessionStorage.getItem('campaignParty')||currentParty||'PNC'}catch(e){return currentParty||'PNC'}}
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
  }
  function load(src,key){if(window[key])return;window[key]=true;var s=document.createElement('script');s.src=src;document.head.appendChild(s)}
  load('js/campaign-header.js?v=20260708-4','__sharedCampaignHeader');
  load('js/campaign-global-status.js?v=20260708-2','__sharedCampaignGlobalStatus');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixPartyLinks,{once:true});else fixPartyLinks();
  window.addEventListener('load',fixPartyLinks,{once:true});
  setTimeout(fixPartyLinks,500);
})();