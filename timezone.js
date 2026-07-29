// Knowledge Base — shared timestamp timezone preference.
// Defaults to Eastern Time (where Complete Windows & Doors operates) regardless of the
// viewer's device — a viewer can switch to their own device's local time instead from
// Settings. Stored in localStorage since it's a per-device display preference, not
// account data, so it doesn't need a Supabase round-trip to read on every page.
// Plain script (not type="module") on purpose — see search-widget.js for why.

(function () {
  var MODE_FLAG = 'cwd-timezone-mode'; // 'eastern' (default) | 'local'

  function getMode() {
    return window.localStorage.getItem(MODE_FLAG) === 'local' ? 'local' : 'eastern';
  }

  window.cwdTimezone = {
    getMode: getMode,
    setMode: function (mode) {
      window.localStorage.setItem(MODE_FLAG, mode === 'local' ? 'local' : 'eastern');
    },
    // A timeZone value for Intl/toLocale* options — undefined means "let the browser
    // use whatever timezone the device is already set to."
    get: function () {
      return getMode() === 'local' ? undefined : 'America/New_York';
    }
  };
})();
