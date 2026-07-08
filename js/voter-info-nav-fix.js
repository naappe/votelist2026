(function(){
  function forceHeaderHome(){
    document.querySelectorAll('.brand,.campaign-brand').forEach(function(a){
      a.setAttribute('href','index.html');
      a.addEventListener('click',function(e){e.preventDefault();location.href='index.html';},{capture:true});
    });
  }
  function init(){forceHeaderHome();setTimeout(forceHeaderHome,250);setTimeout(forceHeaderHome,800);setTimeout(forceHeaderHome,2000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',init,{once:true});
  new MutationObserver(forceHeaderHome).observe(document.documentElement,{childList:true,subtree:true});
})();