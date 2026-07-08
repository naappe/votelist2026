(function(){
  if(!/voters\.html$/i.test(location.pathname))return;
  const params=new URLSearchParams(location.search);
  if(params.get('filter')!=='assigned')return;
  const party=params.get('party')||'PNC';
  const next=`assign.html?party=${encodeURIComponent(party)}`;
  location.replace(next);
})();
