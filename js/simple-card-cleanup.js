(function(){
  var params=new URLSearchParams(location.search);
  var party=(params.get('party')||'PNC').toUpperCase();
  var rowsById={};
  var busy=false;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();

  async function init(){
    addCss();
    await loadRows();
    simpleClean();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    setTimeout(simpleClean,900);
  }

  async function loadRows(){
    try{
      var cfg=window.APP_CONFIG||{};
      if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey)return;
      var client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
      var q=client.from('campaign').select('id,name,national_id,house,phone,party').limit(5000);
      if(party!=='ALL')q=q.eq('party',party);
      var r=await q;
      if(!r.error)(r.data||[]).forEach(function(x){rowsById[String(x.id)]=x;});
    }catch(e){}
  }

  function schedule(){
    if(busy)return;
    busy=true;
    setTimeout(function(){busy=false;simpleClean();},100);
  }

  function simpleClean(){
    var list=document.getElementById('list');
    if(!list)return;
    list.querySelectorAll('.page-address-break,.address-break,.pagination-bar').forEach(function(x){x.remove();});
    var cards=Array.from(list.querySelectorAll('.resident-card[data-row-id]'));
    if(!cards.length)return;
    cards.forEach(cleanCard);
    cards.sort(function(a,b){
      return text(a,'h3').localeCompare(text(b,'h3'),undefined,{sensitivity:'base'});
    });
    cards.forEach(function(c){list.appendChild(c);});
    var pill=document.getElementById('sectionTotal');
    if(pill&&/Showing/i.test(pill.textContent||''))pill.textContent=cards.length.toLocaleString('en-US')+' residents';
  }

  function cleanCard(card){
    var row=rowsById[String(card.dataset.rowId)]||{};
    var info=card.querySelector('.info');
    if(!info)return;
    var old=info.querySelector('p');
    var phone=clean(row.phone)||phoneFromText(old?old.textContent:'')||'No phone';
    var nid=clean(row.national_id)||'-';
    var house=shortAddress(clean(row.house)||houseFromText(old?old.textContent:''));

    if(old)old.remove();
    var details=info.querySelector('.voter-details-lines');
    if(!details){
      details=document.createElement('div');
      details.className='voter-details-lines';
      var name=info.querySelector('h3');
      if(name)name.insertAdjacentElement('afterend',details);
      else info.prepend(details);
    }
    details.innerHTML='<div><b>ID:</b> '+esc(nid)+'</div><div><b>Mobile:</b> '+esc(phone)+'</div><div><b>Address:</b> '+esc(house||'-')+'</div>';
    var addr=info.querySelector('.short-address-line');
    if(addr)addr.remove();
  }

  function text(el,sel){return clean(el.querySelector(sel)?.textContent);}
  function clean(v){return String(v||'').trim();}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function shortAddress(v){return clean(v).replace(/\s*\|\s*Villimale'?[-\s]*[1-5]/ig,'').replace(/\bVillimale'?[-\s]*[1-5]\b/ig,'').replace(/\bBox\s*\d+\b/ig,'').replace(/\s{2,}/g,' ').replace(/[|·]+\s*$/,'').trim();}
  function phoneFromText(t){var m=String(t||'').match(/(?:\+?960)?\s*\d{6,7}/);return m?m[0].trim():'';}
  function houseFromText(t){return shortAddress(String(t||'').split('·')[0]||'');}

  function addCss(){
    if(document.getElementById('simpleCardCleanupStyles'))return;
    var s=document.createElement('style');
    s.id='simpleCardCleanupStyles';
    s.textContent='.voter-details-lines{display:grid;gap:3px;margin:6px 0 8px;color:#64748b;font-weight:900;font-size:14px}.voter-details-lines b{color:#334155}@media(max-width:850px){.voter-details-lines{font-size:13px}.nav{scroll-behavior:smooth!important}}';
    document.head.appendChild(s);
  }
})();