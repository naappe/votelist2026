(function(){
  var params=new URLSearchParams(location.search);
  var party=(params.get('party')||'PNC').toUpperCase();
  var section=(params.get('section')||'voters').toLowerCase();
  if(section==='residents') section='voters';
  var items=[['voters','Residents'],['assign','Assign'],['calls','Calls'],['votes','Votes'],['visits','Visits'],['transport','Transport'],['insights','Insights']];
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  function init(){addCss();addSelect();centerActive();setTimeout(centerActive,300);setTimeout(centerActive,900);window.addEventListener('resize',centerActive);}
  function addSelect(){
    var nav=document.getElementById('nav')||document.querySelector('.nav');
    if(!nav||document.getElementById('mobileSectionNav')) return;
    var box=document.createElement('div');
    box.className='mobile-section-nav-wrap';
    var html='<label>Section</label><select id="mobileSectionNav">';
    items.forEach(function(x){html+='<option value="'+x[0]+'" '+(x[0]===section?'selected':'')+'>'+x[1]+'</option>';});
    html+='</select>';
    box.innerHTML=html;
    nav.parentNode.insertBefore(box,nav);
    box.querySelector('select').onchange=function(){location.href='residents.html?party='+encodeURIComponent(party)+'&section='+encodeURIComponent(this.value)+'&v=mobile-nav-1';};
  }
  function centerActive(){
    var nav=document.getElementById('nav')||document.querySelector('.nav');
    if(!nav) return;
    var active=nav.querySelector('.active');
    if(!active) return;
    var left=active.offsetLeft-(nav.clientWidth/2)+(active.clientWidth/2);
    nav.scrollTo({left:left,behavior:'smooth'});
  }
  function addCss(){
    if(document.getElementById('mobileNavFixStyles')) return;
    var style=document.createElement('style');
    style.id='mobileNavFixStyles';
    style.textContent='.mobile-section-nav-wrap{display:none}@media(max-width:850px){.topbar{position:sticky!important;top:0!important;z-index:50!important;background:#fff!important;border-bottom:1px solid #e2e8f0!important;padding:14px!important;gap:12px!important}.mobile-section-nav-wrap{display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:10px!important;width:100%!important;background:#f8fafc!important;border:1px solid #dbe4f0!important;border-radius:18px!important;padding:10px 12px!important}.mobile-section-nav-wrap label{font-size:12px!important;font-weight:950!important;text-transform:uppercase!important;letter-spacing:.08em!important;color:#64748b!important}.mobile-section-nav-wrap select{width:100%!important;height:44px!important;border:0!important;background:#fff!important;border-radius:14px!important;padding:0 12px!important;font:inherit!important;font-weight:950!important;color:#071226!important;box-shadow:inset 0 0 0 1px #dbe4f0!important}.nav{display:flex!important;width:100%!important;gap:10px!important;overflow-x:auto!important;scroll-snap-type:x mandatory!important;scrollbar-width:none!important;padding:2px 0 8px!important}.nav::-webkit-scrollbar{display:none!important}.nav .btn{flex:0 0 auto!important;min-width:112px!important;height:52px!important;border-radius:18px!important;font-size:17px!important;scroll-snap-align:center!important;display:grid!important;place-items:center!important}.brand{width:100%!important}}';
    document.head.appendChild(style);
  }
})();