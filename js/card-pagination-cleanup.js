(function(){
  var params=new URLSearchParams(location.search);
  var party=(params.get('party')||'PNC').toUpperCase();
  var rowsById={};
  var busy=false;
  var page=1;
  var lastKey='';

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();

  async function init(){
    addCss();
    await loadRows();
    enhance();
    new MutationObserver(function(){schedule();}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',function(){page=1;schedule();});
    window.addEventListener('load',function(){centerActiveNav();setTimeout(centerActiveNav,300);});
    setTimeout(function(){enhance();centerActiveNav();},800);
  }

  async function loadRows(){
    try{
      var cfg=window.APP_CONFIG||{};
      if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey) return;
      var client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
      var q=client.from('campaign').select('id,name,national_id,house,phone,party').limit(5000);
      if(party!=='ALL') q=q.eq('party',party);
      var res=await q;
      if(res.error) return;
      (res.data||[]).forEach(function(r){rowsById[String(r.id)]=r;});
    }catch(e){console.warn('card cleanup data load failed',e);}
  }

  function schedule(){
    if(busy) return;
    busy=true;
    setTimeout(function(){busy=false;enhance();},80);
  }

  function enhance(){
    var list=document.getElementById('list');
    if(!list) return;
    var cards=Array.from(list.querySelectorAll('.resident-card[data-row-id]'));
    if(!cards.length) return;

    var key=cards.map(function(c){return c.dataset.rowId;}).join('|')+'|'+cards.length+'|'+perPage();
    if(key!==lastKey){page=1;lastKey=key;}

    cards.forEach(cleanCard);
    cards.sort(function(a,b){return nameOf(a).localeCompare(nameOf(b),undefined,{sensitivity:'base'});});

    list.querySelectorAll('.page-address-break,.pagination-bar').forEach(function(x){x.remove();});
    cards.forEach(function(c){c.remove();});

    var total=cards.length;
    var pp=perPage();
    var pages=Math.max(1,Math.ceil(total/pp));
    if(page>pages) page=pages;
    var start=(page-1)*pp;
    var visible=cards.slice(start,start+pp);

    var lastAddress='';
    visible.forEach(function(card){
      var addr=addressOf(card);
      if(addr&&addr!==lastAddress){
        var br=document.createElement('div');
        br.className='page-address-break';
        br.textContent=addr;
        list.appendChild(br);
        lastAddress=addr;
      }
      list.appendChild(card);
    });

    var bar=document.createElement('div');
    bar.className='pagination-bar';
    bar.innerHTML='<button class="btn" type="button" '+(page<=1?'disabled':'')+'>Previous</button><span>Page '+page+' of '+pages+' · '+total.toLocaleString('en-US')+' voters</span><button class="btn" type="button" '+(page>=pages?'disabled':'')+'>Next</button>';
    var btns=bar.querySelectorAll('button');
    btns[0].onclick=function(){if(page>1){page--;enhance();scrollToList();}};
    btns[1].onclick=function(){if(page<pages){page++;enhance();scrollToList();}};
    list.appendChild(bar);
    updateCount(total,start+1,Math.min(start+pp,total));
    centerActiveNav();
  }

  function cleanCard(card){
    if(card.dataset.cardShortClean==='1') return;
    var row=rowsById[String(card.dataset.rowId)]||{};
    var info=card.querySelector('.info');
    if(!info) return;
    var p=info.querySelector('p');
    var phone=clean(row.phone)||phoneFromText(p?p.textContent:'')||'No phone';
    var nid=clean(row.national_id)||'-';
    var house=shortAddress(clean(row.house)||houseFromText(p?p.textContent:''));
    if(p){p.textContent='ID: '+nid+' · Mobile: '+phone;p.classList.add('voter-id-mobile-line');}
    var addr=info.querySelector('.short-address-line');
    if(!addr){addr=document.createElement('div');addr.className='short-address-line';if(p)p.insertAdjacentElement('afterend',addr);else info.appendChild(addr);} 
    addr.textContent='Address: '+(house||'-');
    card.dataset.addressGroup=house||'Unknown';
    card.dataset.cardShortClean='1';
  }

  function updateCount(total,from,to){
    var pill=document.getElementById('sectionTotal');
    if(pill&&total) pill.textContent='Showing '+from+'-'+to+' of '+total.toLocaleString('en-US');
  }

  function perPage(){return window.matchMedia('(max-width: 850px)').matches?20:50;}
  function nameOf(card){return clean(card.querySelector('h3')?.textContent);}
  function addressOf(card){return clean(card.dataset.addressGroup)||'Unknown';}
  function clean(v){return String(v||'').trim();}
  function shortAddress(v){return clean(v).replace(/\s*\|\s*Villimale'?[-\s]*[1-5]/ig,'').replace(/\bVillimale'?[-\s]*[1-5]\b/ig,'').replace(/\bBox\s*\d+\b/ig,'').replace(/\s{2,}/g,' ').replace(/[|·]+\s*$/,'').trim();}
  function phoneFromText(t){var m=String(t||'').match(/(?:\+?960)?\s*\d{6,7}/);return m?m[0].trim():'';}
  function houseFromText(t){return shortAddress(String(t||'').split('·')[0]||'');}
  function scrollToList(){document.getElementById('list')?.closest('.panel')?.scrollIntoView({behavior:'smooth',block:'start'});}

  function centerActiveNav(){
    var nav=document.getElementById('nav')||document.querySelector('.nav');
    var active=nav?nav.querySelector('.active'):null;
    if(!nav||!active) return;
    var left=active.offsetLeft-(nav.clientWidth/2)+(active.clientWidth/2);
    nav.scrollTo({left:left,behavior:'smooth'});
  }

  function addCss(){
    if(document.getElementById('cardPaginationCleanupStyles')) return;
    var s=document.createElement('style');
    s.id='cardPaginationCleanupStyles';
    s.textContent='.voter-id-mobile-line{font-weight:900!important;color:#64748b!important;margin:6px 0 4px!important}.short-address-line{font-size:12px;font-weight:950;color:#1f3b66;background:#f8fafc;border:1px solid #dbe4f0;border-radius:12px;padding:7px 9px;margin:0 0 8px}.page-address-break{grid-column:1/-1;position:sticky;top:88px;z-index:5;background:#1f3b66;color:#fff;border-radius:14px;padding:9px 12px;font-weight:950;letter-spacing:.02em;box-shadow:0 8px 20px rgba(15,23,42,.12)}.pagination-bar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #dbe4f0;border-radius:16px;padding:12px;margin-top:8px}.pagination-bar span{font-weight:950;color:#334155;text-align:center}.pagination-bar button:disabled{opacity:.45}@media(max-width:850px){.short-address-line{font-size:11px;padding:6px 8px}.page-address-break{top:126px;font-size:13px}.pagination-bar{display:grid;grid-template-columns:1fr;gap:8px}.pagination-bar .btn{width:100%;height:48px}.nav{scroll-behavior:smooth!important}}';
    document.head.appendChild(s);
  }
})();