// Knowledge Base — access guard, included on every gated KB page.
// Redirects to the login page if there's no active session; reveals the page otherwise.
// Plain script (not type="module") on purpose — see search-widget.js for why.
// Loaded after the Supabase UMD script, which exposes a global `supabase.createClient`.

(function () {
  if (typeof supabase === 'undefined') {
    // Supabase SDK failed to load (e.g. offline) — fail open rather than permanently
    // hiding the page with no way to recover.
    document.documentElement.style.visibility = 'visible';
    return;
  }

  var SUPABASE_URL = 'https://eqhmgihlspqmcrnfgrrx.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1fFK3XlKY1EsdWyPpKEkeA_l5BAk4vz';
  var REMEMBER_FLAG = 'cwd-remember-me';

  // Matches auth/supabase-client.js so a session started there is recognized here.
  function activeStorage() {
    return window.localStorage.getItem(REMEMBER_FLAG) === '0' ? window.sessionStorage : window.localStorage;
  }

  var db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: {
        getItem: function (key) { return activeStorage().getItem(key); },
        setItem: function (key, value) { activeStorage().setItem(key, value); },
        removeItem: function (key) { activeStorage().removeItem(key); }
      },
      persistSession: true,
      autoRefreshToken: true
    }
  });

  var DEPTH = document.body.dataset.kbDepth === '1' ? 1 : 0;
  function resolveUrl(path) {
    return DEPTH === 1 ? '../' + path : path;
  }

  db.auth.getSession().then(function (res) {
    if (res.data.session) {
      document.documentElement.style.visibility = 'visible';
      return;
    }
    var returnTo = encodeURIComponent(window.location.href);
    window.location.replace(resolveUrl('auth/index.html') + '?returnTo=' + returnTo);
  }).catch(function () {
    document.documentElement.style.visibility = 'visible';
  });
})();
