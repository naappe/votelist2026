(function(){
  var params=new URLSearchParams(location.search);
  var party=(params.get('party')||'PNC').toUpperCase();
  var rowsById={};
  var busy=false;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  async function init(){addCss();await loadRows();simpleClean();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});setTimeout(simpleClean,900);}
  async function loadRows(){try{var cfg=window.APP_CONFIG||{};if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey)return;var client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);var q=client.from('campaign').select('id,name,national_id,house,phone,party').limit(5000);if(party!=='ALL')q=q.eq('party',party);var r=await q;if(!r.error)(r.data||[]).forEach(function(x){rowsById[String(x.id)]=x;});}catch(e){}}
  function schedule(){if(busy)return;busy=true;setTimeout(function(){busy=false;simpleClean();},100);}
  function simpleClean(){
    var list=document.getElementById('list');if(!list)return;
    list.querySelectorAll('.page-address-break,.pagination-bar').forEach(function(x){x.remove();});
    var cards=Array.from(list.querySelectorAll('.resident-card[data-row-id]'));if(!cards.length)return;
    cards.forEach(cleanCard);
    cards.sort(function(a,b){return text(a,'h3').localeCompare(text(b,'h3'),undefined,{sensitivity:'base'});});
    cards.forEach(function(c){list.appendChild(c);});
    var pill=document.getElementById('sectionTotal');if(pill&&/Showing/i.test(pill.textContent||''))pill.textContent=cards.length.toLocaleString('en-US')+' residents';
  }
  function cleanCard(card){
    var row=rowsById[String(card.dataset.rowId)]||{};var info=card.querySelector('.info');if(!info)return;
    var p=info.querySelector('p');var phone=clean(row.phone)||phoneFromText(p?p.textContent:'')||'No phone';var nid=clean(row.national_id)||'-';var house=shortAddress(clean(row.house)||houseFromText(p?p.textContent:''));
    if(p){p.textContent='ID: '+nid+' · Mobile: '+phone;p.classList.add('voter-id-mobile-line');}
    var addr=info.querySelector('.short-address-line');if(!addr){addr=document.createElement('div');addr.className='short-address-line';if(p)p.insertAdjacentElement('afterend',addr);else info.appendChild(addr);}addr.textContent='Address: '+(house||'-');
  }
  function text(el,sel){return clean(el.querySelector(sel)?.textContent);}
  function clean(v){return String(v||'').trim();}
  function shortAddress(v){return clean(v).replace(/\s*\|\s*Villimale'?[-\s]*[1-5]/ig,'').replace(/\bVillimale'?[-\s]*[1-5]\b/ig,'').replace(/\bBox\s*\d+\b/ig,'').replace(/\s{2,}/g,' ').replace(/[|·]+\s*$/,'').trim();}
  function phoneFromText(t){var m=String(t||'').match(/(?:\+?960)?\s*\d{6,7}/);return m?m[0].trim():'';}
  function houseFromText(t){return shortAddress(String(t||'').split('·')[0]||'');}
  function addCss(){if(document.getElementById('simpleCardCleanupStyles'))return;var s=document.createElement('style');s.id='simpleCardCleanupStyles';s.textContent='.voter-id-mobile-line{font-weight:900!important;color:#64748b!important;margin:6px 0 4px!important}.short-address-line{font-size:12px;font-weight:950;color:#1f3b66;background:#f8fafc;border:1px solid #dbe4f0;border-radius:12px;padding:7px 9px;margin:0 0 8px}@media(max-width:850px){.short-address-line{font-size:11px;padding:6px 8px}.nav{scroll-behavior:smooth!important}}';document.head.appendChild(s);}
})();