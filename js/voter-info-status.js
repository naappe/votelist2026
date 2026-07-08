(function(){
  function removeDuplicateInfoStatus(){
    document.querySelectorAll('#voterInfoStatus,.voter-info-status,[aria-label="Information status"]').forEach(function(el){el.remove();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeDuplicateInfoStatus,{once:true});
  else removeDuplicateInfoStatus();
  window.addEventListener('load',removeDuplicateInfoStatus,{once:true});
  [200,700,1500,3000].forEach(function(t){setTimeout(removeDuplicateInfoStatus,t)});
  new MutationObserver(removeDuplicateInfoStatus).observe(document.documentElement,{childList:true,subtree:true});
})();