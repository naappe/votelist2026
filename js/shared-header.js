(function(){
function q(id){return document.getElementById(id)}
function f(n){return new Intl.NumberFormat('en-US').format(Number(n||0))}
function c(v){return String(v||'').trim().toLowerCase()}
function p(){return (new URLSearchParams(location.search).get('party')||'PNC').toUpperCase()}
function page(){return location.pathname.split('/').pop().replace('.html','')||'index'}
function set(id,v){var e=q(id);if(e)e.textContent=v}
function time(){var e=q('headerUpdatedTime');if(e)e.textContent='Updated '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function nav(){var pg=page();document.querySelectorAll('.app-nav-link[data-nav-page]').forEach(function(a){a.classList.toggle('active',a.dataset.navPage===pg);if(!a.classList.contains('app-nav-logout')){var u=new URL(a.getAttribute('href'),location.href);u.searchParams.set('party',p());a.href=u.pathname.split('/').pop()+u.search}})}
function searchBox(){var box=document.querySelector('[data-header-search]');if(box)box.hidden=!['index','voters','call','vote'].includes(page())}
async function stats(){var cfg=window.APP_CONFIG;if(!window.supabase||!cfg){time();return}var sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);var all=[],from=0,size=1000;while(true){var req=sb.from(cfg.table).select('party,phone_status,vote_status,vote_assigned_by').range(from,from+size-1);if(p()!=='ALL')req=req.eq('party',p());var res=await req;if(res.error)break;all=all.concat(res.data||[]);if(!res.data||res.data.length<size)break;from+=size}set('headerTotal',f(all.length));set('headerNeedCall',f(all.filter(function(r){return c(r.phone_status)==='need-call'}).length));set('headerWillVote',f(all.filter(function(r){return c(r.vote_status)==='will-vote'}).length));set('headerAssigned',f(all.filter(function(r){var a=c(r.vote_assigned_by);return a&&a!=='naappe@gmail.com'}).length));time()}
function connect(){var hs=q('headerSearchInput'),ps=q('searchInput'),hh=q('headerHouseSelect'),ph=q('houseSelect'),cl=q('headerClearSearch');if(hs&&ps){hs.value=ps.value||'';hs.oninput=function(){ps.value=hs.value;ps.dispatchEvent(new Event('input',{bubbles:true}))}}if(hh&&ph){hh.innerHTML=ph.innerHTML;hh.value=ph.value||'';hh.onchange=function(){ph.value=hh.value;ph.dispatchEvent(new Event('change',{bubbles:true}))}}if(cl){cl.onclick=function(){if(hs)hs.value='';if(ps){ps.value='';ps.dispatchEvent(new Event('input',{bubbles:true}))}if(hh)hh.value='';if(ph){ph.value='';ph.dispatchEvent(new Event('change',{bubbles:true}))}}}}
function init(){nav();searchBox();time();stats();setTimeout(connect,300);setTimeout(connect,1000);setInterval(stats,60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();