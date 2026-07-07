(function () {
  installStyles();

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('#logoutBtn');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const next = currentLink();
    button.disabled = true;
    button.textContent = 'Logging out...';

    try {
      const config = window.APP_CONFIG || {};
      const client = window.__villimaleGetSupabaseClient?.(config.supabaseUrl, config.supabaseKey)
        || window.__villimaleSupabaseClient
        || (window.supabase?.createClient && config.supabaseUrl && config.supabaseKey
          ? window.supabase.createClient(config.supabaseUrl, config.supabaseKey)
          : null);
      if (client?.auth?.signOut) await client.auth.signOut();
    } catch (error) {
      console.warn('Logout redirect continuing after sign out issue:', error);
    }

    location.href = `login.html?next=${encodeURIComponent(next)}`;
  }, true);

  function currentLink() {
    const page = location.pathname.split('/').pop() || 'index.html';
    return `${page}${location.search}${location.hash}`;
  }

  function installStyles() {
    if (document.getElementById('logoutReturnStyles')) return;
    const style = document.createElement('style');
    style.id = 'logoutReturnStyles';
    style.textContent = `
      @media(max-width:760px){
        body[data-page="dashboard"] .topbar{position:relative!important;padding-right:126px!important}
        body[data-page="dashboard"] #logoutBtn{position:absolute!important;top:12px!important;right:12px!important;width:auto!important;min-width:102px!important;z-index:20!important}
        body[data-page="dashboard"] .toolbar{grid-template-columns:1fr 1fr!important}
      }
    `;
    document.head.appendChild(style);
  }
})();