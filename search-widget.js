// Knowledge Base — shared search widget (used on every KB page)
// Plain script (not type="module") on purpose: these pages are often opened directly as
// local files (file://), and browsers block ES module cross-origin imports in that context.
// Loaded after the Supabase UMD script, which exposes a global `supabase.createClient`.

(function () {
  var SUPABASE_URL = 'https://eqhmgihlspqmcrnfgrrx.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1fFK3XlKY1EsdWyPpKEkeA_l5BAk4vz';

  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  var DEPTH = document.body.dataset.kbDepth === '1' ? 1 : 0;
  function resolveUrl(url) {
    return DEPTH === 1 ? '../' + url : url;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, query) {
    var terms = query.trim().split(/\s+/).filter(Boolean);
    var out = escapeHtml(text);
    terms.forEach(function (term) {
      var safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp('(' + safe + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }

  function init() {
    var input = document.getElementById('kbSearchInput');
    var resultsEl = document.getElementById('kbSearchResults');
    if (!input || !resultsEl) return;

    var items = [];
    var activeIndex = -1;
    var debounceTimer = null;

    function closeResults() {
      resultsEl.classList.remove('open');
      resultsEl.innerHTML = '';
      activeIndex = -1;
    }

    function renderResults(query) {
      if (!items.length) {
        resultsEl.innerHTML = '<div class="kb-search-empty">No matches for "' + escapeHtml(query) + '"</div>';
        resultsEl.classList.add('open');
        return;
      }
      resultsEl.innerHTML = items.map(function (item, i) {
        return '<a class="kb-search-result' + (i === activeIndex ? ' active' : '') + '" data-index="' + i + '" href="' + resolveUrl(item.url) + '">' +
          '<div class="kb-search-result-page">' + escapeHtml(item.page) + '</div>' +
          '<div class="kb-search-result-title">' + highlight(item.section_title, query) + '</div>' +
          '<div class="kb-search-result-snippet">' + highlight(item.content.slice(0, 160), query) + '</div>' +
          '</a>';
      }).join('');
      resultsEl.classList.add('open');
    }

    function runSearch(query) {
      if (!query.trim()) {
        closeResults();
        return;
      }
      resultsEl.innerHTML = '<div class="kb-search-loading">Searching…</div>';
      resultsEl.classList.add('open');

      db.from('search_index')
        .select('page, section_title, content, url')
        .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
        .limit(8)
        .then(function (res) {
          if (res.error) {
            resultsEl.innerHTML = '<div class="kb-search-empty">Search is unavailable right now.</div>';
            return;
          }
          items = res.data || [];
          activeIndex = -1;
          renderResults(query);
        })
        .catch(function () {
          resultsEl.innerHTML = '<div class="kb-search-empty">Search is unavailable right now.</div>';
        });
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var query = input.value;
      debounceTimer = setTimeout(function () { runSearch(query); }, 250);
    });

    input.addEventListener('keydown', function (e) {
      if (!resultsEl.classList.contains('open') || !items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        renderResults(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderResults(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var target = activeIndex >= 0 ? items[activeIndex] : items[0];
        if (target) window.location.href = resolveUrl(target.url);
      } else if (e.key === 'Escape') {
        closeResults();
        input.blur();
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.kb-search-wrap')) closeResults();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
