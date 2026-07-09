(function(){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  function init(){cleanAll();new MutationObserver(cleanAll).observe(document.body,{childList:true,subtree:true});setInterval(cleanAll,1200);}
  function cleanAll(){
    document.querySelectorAll('.mobile-section-nav-wrap').forEach(function(el){el.remove();});
    document.querySelectorAll('.resident-card .info p').forEach(function(p){
      if(p.dataset.cleanedLocation==='1') return;
      var text=p.textContent||'';
      var parts=text.split('·').map(function(x){return x.trim();}).filter(Boolean);
      var clean=parts.filter(function(part){
        var s=part.toLowerCase();
        if(/^box\s*\d+/i.test(part)) return false;
        if(/villimale'?[-\s]*[1-5]/i.test(part)) return false;
        if(/^villimale/i.test(part)) return false;
        return true;
      });
      if(clean.length){p.textContent=clean.join(' · ');p.dataset.cleanedLocation='1';}
    });
  }
})();