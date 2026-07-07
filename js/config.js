window.APP_CONFIG = {
  supabaseUrl: 'https://espezmdpkoixnfchomqb.supabase.co',
  supabaseKey: 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1',
  table: 'full_import',
  loginUsers: {
    admin: { username: 'admin', email: 'naappe@gmail.com' },
    pnc: { username: 'pnc2026', email: 'pnc2026@villimaledhaaira.local' }
  },
  sections: [
    { key: 'need-call', label: 'Need Call', field: 'phone_status', value: 'need-call' },
    { key: 'reached', label: 'Reached', field: 'reach_status', value: 'reached' },
    { key: 'will-vote', label: 'Will Vote', field: 'vote_status', value: 'will-vote' },
    { key: 'pending', label: 'Pending', field: 'vote_status', value: 'pending' },
    { key: 'no-phone', label: 'No Phone', field: 'phone_status', value: 'no-phone' },
    { key: 'need-transport', label: 'Need Transport', field: 'transport_status', value: 'need-transport' },
    { key: 'follow-up', label: 'Follow-up', field: 'd2d_status', value: 'follow-up' }
  ]
};

(function () {
  if (!window.supabase?.createClient || window.__villimaleSupabaseFactoryReady) return;

  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  const clients = new Map();

  window.__villimaleGetSupabaseClient = function getVillimaleSupabaseClient(url, key, options) {
    const config = window.APP_CONFIG || {};
    const finalUrl = url || config.supabaseUrl;
    const finalKey = key || config.supabaseKey;
    if (!finalUrl || !finalKey) return null;

    const cacheKey = `${finalUrl}|${finalKey}`;
    if (!options && clients.has(cacheKey)) return clients.get(cacheKey);

    const client = nativeCreateClient(finalUrl, finalKey, options);
    if (!options && finalUrl === config.supabaseUrl && finalKey === config.supabaseKey) {
      clients.set(cacheKey, client);
      window.__villimaleSupabaseClient = client;
    }
    return client;
  };

  window.supabase.createClient = function createSharedVillimaleClient(url, key, options) {
    const config = window.APP_CONFIG || {};
    if (!options && url === config.supabaseUrl && key === config.supabaseKey) {
      return window.__villimaleGetSupabaseClient(url, key);
    }
    return nativeCreateClient(url, key, options);
  };

  window.__villimaleSupabaseFactoryReady = true;
})();

(function () {
  if (!/shared\.html$/i.test(location.pathname)) return;

  let lastTouchedRowId = '';
  let lastSnapshot = null;

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value || '';
  }

  function captureSnapshot() {
    lastSnapshot = {
      search: valueOf('searchInput'),
      house: valueOf('houseSelect'),
      filter: valueOf('filterSelect') || 'all',
      rowId: lastTouchedRowId,
      scrollY: window.scrollY
    };
  }

  function restoreToSnapshot(snapshot) {
    const item = snapshot || lastSnapshot;
    if (!item) return;

    setValue('searchInput', item.search);
    setValue('houseSelect', item.house);
    setValue('filterSelect', item.filter || 'all');
    document.getElementById('searchBtn')?.click();
    document.getElementById('searchInput')?.dispatchEvent(new Event('input', { bubbles: true }));

    const card = item.rowId ? document.querySelector(`[data-row-id="${cssEscape(item.rowId)}"]`) : null;
    if (card) {
      card.scrollIntoView({ block: 'center', behavior: 'auto' });
      return;
    }
    window.scrollTo({ top: item.scrollY || 0, left: 0, behavior: 'auto' });
  }

  document.addEventListener('change', (event) => {
    const toggle = event.target.closest?.('[data-toggle-assign]');
    if (toggle?.dataset?.toggleAssign) lastTouchedRowId = toggle.dataset.toggleAssign;
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('#saveChangesBtn, #confirmSaveBtn')) return;
    captureSnapshot();
    const snapshot = lastSnapshot;
    [120, 350, 800, 1400, 2400].forEach((delay) => {
      setTimeout(() => restoreToSnapshot(snapshot), delay);
    });
  }, true);
})();