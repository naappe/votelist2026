(function(){
  const page=document.body?.dataset?.workspacePage;
  if(!page)return;
  const $=id=>document.getElementById(id);
  function applyLogic(){
    const phone=$('phoneStatus')?.value||'need-call';
    const vote=$('voteStatus')?.value||'pending';
    const d2d=$('d2dStatus')?.value||'pending';
    let reach=$('reachStatus')?.value||'not-reached';
    if(page==='call'){
      reach=phone==='connected'?'reached':'not-reached';
      const meta=$('modalMeta');
      if(meta){
        const base=meta.dataset.base||meta.textContent.split(' · Connected = ')[0].split(' · Not connected = ')[0];
        meta.dataset.base=base;
        meta.textContent=base+' · '+(phone==='connected'?'Connected = Reached. Select Vote Status and Save.':'Not connected = Not Reached. Keep Vote Pending unless result is known.');
      }
    }
    if(page==='d2d'){
      if(d2d==='visited'||d2d==='follow-up')reach='reached';
      if((d2d==='pending'||d2d==='not-home')&&vote==='pending')reach='not-reached';
    }
    if(vote==='will-vote'||vote==='no-vote')reach='reached';
    if($('reachStatus'))$('reachStatus').value=reach;
  }
  function simplifyCallModal(){
    if(page!=='call')return;
    const phone=$('phoneStatus');
    const vote=$('voteStatus');
    const reach=$('reachStatus')?.closest('label');
    const d2d=$('d2dStatus')?.closest('label');
    const transport=$('transportStatus')?.closest('label');
    if(phone){
      const label=phone.closest('label');
      if(label&&label.childNodes[0])label.childNodes[0].textContent='Call Result';
      phone.innerHTML='<option value="need-call">Need Call</option><option value="connected">Connected</option><option value="not-answer">Not Receiving Phone</option><option value="disconnected">Disconnected Number</option><option value="switch-off">Switch Off</option><option value="busy">Busy</option><option value="wrong-number">Wrong Number</option><option value="no-phone">No Phone</option>';
    }
    if(vote){vote.innerHTML='<option value="pending">Pending</option><option value="will-vote">Will Vote</option><option value="no-vote">Not Vote</option>'}
    [reach,d2d,transport].forEach(el=>{if(el)el.style.display='none'});
  }
  function onOpen(){setTimeout(()=>{simplifyCallModal();applyLogic()},0)}
  document.addEventListener('change',e=>{if(['phoneStatus','voteStatus','d2dStatus','transportStatus'].includes(e.target.id))applyLogic()},true);
  document.addEventListener('submit',e=>{if(e.target&&e.target.id==='form')applyLogic()},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-row-id]'))onOpen()},true);
  window.addEventListener('load',()=>setTimeout(()=>{document.querySelectorAll('[data-row-id]').forEach(card=>card.addEventListener('click',onOpen,{capture:true}))},500));
})();
