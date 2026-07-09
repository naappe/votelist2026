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
      var addrA=clean(a.dataset.cleanAddress || 'Unknown');
      var addrB=clean(b.dataset.cleanAddress || 'Unknown');
      var addressCompare=addrA.localeCompare(addrB,undefined,{sensitivity:'base',numeric:true});
      if(addressCompare!==0)return addressCompare;
      return text(a,'h3').localeCompare(text(b,'h3'),undefined,{sensitivity:'base',numeric:true});
    });
    var lastAddress='';
    cards.forEach(function(c){
      var addr=clean(c.dataset.cleanAddress || 'Unknown') || 'Unknown';
      if(addr!==lastAddress){
        var header=document.createElement('div');
        header.className='address-break';
        header.textContent=addr;
        list.appendChild(header);
        lastAddress=addr;
      }
      list.appendChild(c);
    });
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
    card.dataset.cleanAddress=house||'Unknown';

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
    s.textContent='.voter-details-lines{display:grid;gap:3px;margin:6px 0 8px;color:#64748b;font-weight:900;font-size:14px}.voter-details-lines b{color:#334155}.address-break{grid-column:1/-1;margin:12px 0 4px;padding:7px 12px;border-radius:14px;background:#eef4ff;color:#1f3b66;border:1px solid #dbeafe;font-size:13px;font-weight:950;letter-spacing:.02em}@media(max-width:850px){.voter-details-lines{font-size:13px}.address-break{font-size:13px;padding:7px 10px;margin:10px 0 4px}.nav{scroll-behavior:smooth!important}}';
    document.head.appendChild(s);
  }
})();