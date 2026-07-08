(function(){
  function load(src,key){
    if(window[key])return;
    window[key]=true;
    var s=document.createElement('script');
    s.src=src;
    document.head.appendChild(s);
  }
  load('js/campaign-header.js?v=20260708-3','__sharedCampaignHeader');
  load('js/campaign-global-status.js?v=20260708-1','__sharedCampaignGlobalStatus');
})();