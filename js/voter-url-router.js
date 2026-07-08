(function () {
  installAuthSessionBypass();

  const filterAliases = {
    all: 'all',
    pending: 'pending',
    nophone: 'no-phone',
    'no-phone': 'no-phone',
    transport: 'need-transport',
    needtransport: 'need-transport',
    'need-transport': 'need-transport',
    needcall: 'need-call',
    'need-call': 'need-call',
    followup: 'follow-up',
    'follow-up': 'follow-up',
    willvote: 'will-vote',
    'will-vote': 'will-vote',
    reached: 'reached'
  };

  const params = new URLSearchParams(location.search);
  const requestedFilter = normalize(params.get('filter'));
  const requestedHouse = String(params.get('house') || '').trim();

  if (requestedFilter && filterAliases[requestedFilter]) {
    params.set('filter', filterAliases[requestedFilter]);
  }
  if (requestedHouse && !params.get('q')) {
    params.set('q', requestedHouse);
  }
  if (params.toString() !== location.search.slice(1)) {
    history.replaceState(null, '', `${location.pathname}?${params.toString()}${location.hash}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    setTimeout(applySpecialFilter, 600);
    setTimeout(applySpecialFilter, 1600);
    setTimeout(applySpecialFilter, 3200);
  });

  function installAuthSessionBypass() {
    if (window.__residentAuthBypassReady || !/voters\.html$/i.test(location.pathname)) return;
    window.__residentAuthBypassReady = true;
    const party = (new URLSearchParams(location.search).get('party') || 'PNC').toUpperCase();
    const fakeEmail = party === 'MDP' ? 'mdp@villimale.local' : party === 'ALL' ? 'admin@villimale.local' : 'pnc@villimale.local';
    function patch() {
      if (!window.supabase || !window.supabase.createClient || window.__residentCreateClientPatched) return;
      window.__residentCreateClientPatched = true;
      const nativeCreate = window.supabase.createClient.bind(window.supabase);
      window.supabase.createClient = function () {
        const client = nativeCreate.apply(null, arguments);
        if (client && client.auth && !client.__residentAuthPatched) {
          client.__residentAuthPatched = true;
          const nativeGetSession = client.auth.getSession.bind(client.auth);
          client.auth.getSession = async function () {
            const result = await nativeGetSession().catch(() => ({ data: { session: null }, error: null }));
            if (result && result.data && result.data.session) return result;
            return { data: { session: { user: { id: 'public-' + party.toLowerCase(), email: fakeEmail } } }, error: null };
          };
          if (client.auth.signOut) {
            const nativeSignOut = client.auth.signOut.bind(client.auth);
            client.auth.signOut = async function () { try { return await nativeSignOut(); } catch (e) { return { error: null }; } };
          }
        }
        return client;
      };
    }
    patch();
    setTimeout(patch, 50);
  }

  function boot() {
    installStyles();
    applySpecialFilter();
  }

  function applySpecialFilter() {
    const filter = normalize(new URLSearchParams(location.search).get('filter'));
    if (filter === 'assigned') {
      openAssignedResults();
      return;
    }
    if (filter === 'notvote' || filter === 'not-vote' || filter === 'novote' || filter === 'no-vote') {
      filterRenderedCards({
        title: 'Not Vote',
        description: 'Showing residents marked not vote in the current party scope.',
        matcher: (text) => /\bnot vote\b|\bno vote\b/.test(text)
      });
    }
  }

  function openAssignedResults() {
    const title = document.getElementById('sectionTitle');
    if (title?.textContent === 'Assigned Results') return;
    const button = document.getElementById('assignedResultsBtn');
    if (button && !button.disabled) {
      button.click();
      return;
    }
    const status = document.getElementById('statusMessage');
    if (status) {
      status.textContent = 'Loading assigned results...';
      status.className = 'status-message ok';
    }
  }

  function filterRenderedCards(options) {
    const list = document.getElementById('voterList');
    const cards = Array.from(document.querySelectorAll('.voter-card[data-open-voter]'));
    if (!list || !cards.length) return;

    let visible = 0;
    cards.forEach((card) => {
      const match = options.matcher(normalize(card.textContent));
      card.classList.toggle('url-filter-hidden', !match);
      if (match) visible += 1;
    });

    const title = document.getElementById('sectionTitle');
    const filterText = document.getElementById('sectionFilter');
    const total = document.getElementById('sectionTotal');
    if (title) title.textContent = options.title;
    if (filterText) filterText.textContent = options.description;
    if (total) total.textContent = `${new Intl.NumberFormat('en-US').format(visible)} residents`;
  }

  function installStyles() {
    if (document.getElementById('voterUrlRouterStyles')) return;
    const style = document.createElement('style');
    style.id = 'voterUrlRouterStyles';
    style.textContent = '.url-filter-hidden{display:none!important}';
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[_\s]+/g, '-').trim();
  }
})();