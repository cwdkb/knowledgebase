// Shared Supabase client for the auth pages (login/signup + account settings).
// Plain script (not type="module") on purpose — see search-widget.js for why.
// Loaded after the Supabase UMD script, which exposes a global `supabase.createClient`.

(function () {
  var SUPABASE_URL = 'https://eqhmgihlspqmcrnfgrrx.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1fFK3XlKY1EsdWyPpKEkeA_l5BAk4vz';
  var REMEMBER_FLAG = 'cwd-remember-me';

  // "Remember me" support: when checked (default), the session lives in localStorage
  // and survives closing the browser. When unchecked, it's kept in sessionStorage only —
  // gone as soon as the tab/browser closes. The flag itself always lives in localStorage
  // (it's just a preference, not session data), and this storage adapter checks it on
  // every read/write so switching stays possible even after the client is already created.
  function activeStorage() {
    return window.localStorage.getItem(REMEMBER_FLAG) === '0' ? window.sessionStorage : window.localStorage;
  }

  window.cwdSetRememberMe = function (remember) {
    window.localStorage.setItem(REMEMBER_FLAG, remember ? '1' : '0');
  };

  window.cwdAuth = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
})();
