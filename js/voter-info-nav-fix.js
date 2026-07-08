(function () {
  function currentParty() {
    try { return (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase(); }
    catch (e) { return 'PNC'; }
  }

  function go(section, stat) {
    var url = 'residents.html?party=' + encodeURIComponent(currentParty()) + '&section=' + encodeURIComponent(section) + '&v=logic2';
    if (stat) url += '&stat=' + encodeURIComponent(stat);
    location.href = url;
  }

  function wireStats() {
    var map = [
      ['total', 'voters', 'all'],
      ['will', 'votes', 'will-vote'],
      ['notvote', 'votes', 'no-vote'],
      ['pending', 'votes', 'reached-pending'],
      ['need', 'calls', 'need-call']
    ];
    map.forEach(function (item) {
      var id = item[0];
      var el = document.getElementById(id);
      var card = el && el.closest('.stat,.resident-stat,.stat-card');
      if (!card) return;
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.onclick = function () { go(item[1], item[2]); };
    });
  }

  function removeAiText() {
    document.querySelectorAll('a,button,h1,h2,h3,p,span').forEach(function (el) {
      if (/AI Dashboard/i.test(el.textContent || '')) el.textContent = el.textContent.replace(/AI Dashboard/ig, 'Insights');
      if (/AI Insights/i.test(el.textContent || '')) el.textContent = el.textContent.replace(/AI Insights/ig, 'Insights');
    });
  }

  function init() {
    wireStats();
    removeAiText();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('load', init, { once: true });
})();