(function () {
  function buildResidentsNav() {
    var params = new URLSearchParams(location.search);
    var party = (params.get('party') || 'PNC').toUpperCase();
    var section = (params.get('section') || 'voters').toLowerCase();
    if (section === 'residents') section = 'voters';

    var nav = document.getElementById('nav');
    if (!nav) return;

    var links = [
      ['voters', 'Residents'],
      ['assign', 'Assign'],
      ['calls', 'Calls'],
      ['votes', 'Votes'],
      ['visits', 'Visits'],
      ['transport', 'Transport'],
      ['insights', 'Insights']
    ];

    nav.innerHTML = links.map(function (item) {
      var key = item[0];
      var label = item[1];
      var href = 'residents.html?party=' + encodeURIComponent(party) + '&section=' + encodeURIComponent(key) + '&v=nav1';
      return '<a class="btn ' + (key === section ? 'active' : '') + '" href="' + href + '">' + label + '</a>';
    }).join('') + '<a class="btn" href="index.html?v=nav1">Logout</a>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildResidentsNav);
  } else {
    buildResidentsNav();
  }
  window.addEventListener('load', buildResidentsNav);
  setTimeout(buildResidentsNav, 250);
  setTimeout(buildResidentsNav, 900);
})();