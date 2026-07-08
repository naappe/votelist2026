(function(){
  function installHeaderFixCss(){
    if(document.getElementById('finalVotersHeaderFix'))return;
    var s=document.createElement('style');
    s.id='finalVotersHeaderFix';
    s.textContent='@media(max-width:900px){.topbar,.campaign-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"brand logout" "nav nav"!important;gap:10px!important;padding:12px!important;height:auto!important;min-height:0!important;overflow:visible!important}.brand,.campaign-brand{grid-area:brand!important;min-width:0!important;max-width:100%!important;font-size:17px!important;line-height:1.15!important;white-space:normal!important}.brand-icon{flex:0 0 32px!important}#logoutBtn,.logout-link{grid-area:logout!important;min-width:112px!important;height:44px!important;min-height:44px!important;padding:0 16px!important}.toolbar,.nav,.campaign-nav{grid-area:nav!important;width:100%!important;max-width:100%!important;min-width:0!important;display:flex!important;justify-content:flex-start!important;align-items:center!important;gap:8px!important;overflow-x:auto!important;overflow-y:visible!important;padding:0 12px 4px 0!important;margin:0!important;scroll-padding-left:0!important}.toolbar .btn,.nav .btn,.campaign-nav .btn{flex:0 0 auto!important;height:44px!important;min-height:44px!important;font-size:14px!important;padding:0 14px!important}.toolbar .btn:first-child,.nav .btn:first-child,.campaign-nav .btn:first-child{margin-left:0!important}}';
    document.head.appendChild(s);
  }
  function forceHeader(){
    installHeaderFixCss();
    document.querySelectorAll('.brand,.campaign-brand').forEach(function(a){
      a.setAttribute('href','index.html');
      a.onclick=function(e){e.preventDefault();location.href='index.html'};
    });
    document.querySelectorAll('.toolbar,.nav,.campaign-nav').forEach(function(n){
      try{n.scrollLeft=0}catch(e){}
    });
  }
  function init(){forceHeader();[100,250,600,1200,2500,5000].forEach(function(t){setTimeout(forceHeader,t)});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',init,{once:true});
  new MutationObserver(forceHeader).observe(document.documentElement,{childList:true,subtree:true});
})();