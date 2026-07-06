(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('view') !== 'read') return;
  if (!window.supabase?.createClient) return;

  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient = function createReadViewClient(...args) {
    const client = nativeCreateClient(...args);
    if (!client?.auth) return client;

    const readUser = {
      id: 'read-view-public-user',
      email: 'read-view@local'
    };

    client.auth.getSession = async () => ({
      data: { session: { user: readUser } },
      error: null
    });
    client.auth.getUser = async () => ({
      data: { user: readUser },
      error: null
    });
    client.auth.signOut = async () => ({ error: null });

    return client;
  };

  document.documentElement.classList.add('read-view-public');
})();