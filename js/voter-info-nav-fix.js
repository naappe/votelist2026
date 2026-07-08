(function(){
  function init(){
    if(document.getElementById('safeVoterNavFix'))return;
    var s=document.createElement('style');
    s.id='safeVoterNavFix';
    s.textContent='@media(max-width:900px){.topbar,.campaign-header{height:auto!important;min-height:0!important;overflow:visible!important}.toolbar,.nav,.campaign-nav{display:flex!important;gap:8px!important;overflow-x:auto!important;overflow-y:visible!important}.toolbar .btn,.nav .btn,.campaign-nav .btn{flex:0 0 auto!important;min-height:44px!important}}';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();