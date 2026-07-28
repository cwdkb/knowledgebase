// Knowledge Base — Suggestions dashboard.
// Cross-page view of every suggestion submitted (the per-page widget only ever shows
// the full list too, but this gives search/filter/sort and lets anyone compose one
// without needing to be on a specific page). Open to every role, including 'member'.
// Plain script (not type="module") — see Suggestions Widget/suggestions-widget.js.

(function () {
  if (typeof supabase === 'undefined') return;

  var SUPABASE_URL = 'https://eqhmgihlspqmcrnfgrrx.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1fFK3XlKY1EsdWyPpKEkeA_l5BAk4vz';
  var REMEMBER_FLAG = 'cwd-remember-me';

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

  // Same page titles used by the per-page widget (document.title-derived), so a
  // suggestion's page_context lines up with these when composed from the dashboard.
  var PAGE_LABELS = [
    'Knowledge Base', 'Builder Prime CRM Playbook', 'Org Chart', 'Marketing & Lead Source',
    'Admin & Finance', 'Sales', 'Scripts & Talk Tracks', 'Production & Installation',
    'Service', 'Ordering & Vendor', 'HR & Onboarding'
  ];

  function loginUrl() {
    return new URL('../auth/index.html', window.location.href).href;
  }
  function accountUrl() {
    return new URL('../auth/account.html', window.location.href).href;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function statusBadge(status) {
    if (status === 'added') return '<span class="badge badge-resolved">Added</span>';
    if (status === 'declined') return '<span class="badge badge-declined">Declined</span>';
    return '<span class="badge badge-audit">Pending</span>';
  }

  var messageEl = document.getElementById('dashMessage');
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message show message-' + type;
  }

  var listEl = document.getElementById('dashList');
  var loadingEl = document.getElementById('dashLoading');
  var filterButtons = document.querySelectorAll('.dash-filter');
  var searchInput = document.getElementById('dashSearch');
  var pageFilterSelect = document.getElementById('dashPageFilter');
  var sortSelect = document.getElementById('dashSort');
  var composePageSelect = document.getElementById('dashComposePage');

  PAGE_LABELS.forEach(function (label) {
    var opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    composePageSelect.appendChild(opt);
  });

  var currentUser = null;
  var isAdmin = false;
  var suggestions = [];
  var activeFilter = 'all';
  var pageFilterOptionsBuilt = false;

  function rebuildPageFilterOptions() {
    if (pageFilterOptionsBuilt) return;
    var seen = {};
    suggestions.forEach(function (s) {
      if (s.page_context) seen[s.page_context] = true;
    });
    Object.keys(seen).sort().forEach(function (label) {
      var opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      pageFilterSelect.appendChild(opt);
    });
    pageFilterOptionsBuilt = true;
  }

  function render() {
    var query = searchInput.value.trim().toLowerCase();
    var pageFilter = pageFilterSelect.value;
    var sortOrder = sortSelect.value;

    var filtered = suggestions.filter(function (s) {
      if (activeFilter !== 'all' && s.status !== activeFilter) return false;
      if (pageFilter !== 'all' && s.page_context !== pageFilter) return false;
      if (query) {
        var haystack = [s.title, s.description || '', s.requester_name, s.page_context || '']
          .join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      var diff = new Date(a.created_at) - new Date(b.created_at);
      return sortOrder === 'oldest' ? diff : -diff;
    });

    if (!filtered.length) {
      listEl.innerHTML = '<div class="kb-suggest-empty">Nothing here yet.</div>';
      return;
    }

    listEl.innerHTML = filtered.map(function (s) {
      var actions = '';
      if (isAdmin) {
        actions =
          '<div class="kb-suggest-actions">' +
            (s.status !== 'added' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="added">Mark added</button>' : '') +
            (s.status !== 'declined' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="declined">Decline</button>' : '') +
            (s.status !== 'pending' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="pending">Reopen</button>' : '') +
          '</div>';
      }
      var pageTag = s.page_context
        ? '<div class="dash-suggest-page">' + escapeHtml(s.page_context) + '</div>'
        : '';
      return (
        '<div class="kb-suggest-item">' +
          pageTag +
          '<div class="kb-suggest-meta">' +
            '<span class="kb-suggest-author">' + escapeHtml(s.requester_name) + '</span>' +
            '<span class="kb-suggest-date">' + formatDate(s.created_at) + '</span>' +
          '</div>' +
          '<p class="kb-suggest-body"><strong>' + escapeHtml(s.title) + '</strong>' +
            (s.description ? '<br>' + escapeHtml(s.description) : '') +
          '</p>' +
          '<div class="kb-suggest-footer">' + statusBadge(s.status) + '</div>' +
          actions +
        '</div>'
      );
    }).join('');

    Array.prototype.forEach.call(listEl.querySelectorAll('.kb-suggest-action'), function (btn) {
      btn.addEventListener('click', function () {
        setStatus(btn.dataset.id, btn.dataset.status);
      });
    });
  }

  function setStatus(id, status) {
    db.from('suggestions').update({
      status: status,
      actioned_by_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      actioned_by_email: currentUser.email,
      actioned_at: new Date().toISOString()
    }).eq('id', id).then(function (res) {
      if (res.error) {
        showMessage('Could not update: ' + res.error.message, 'error');
        return;
      }
      loadSuggestions();
    });
  }

  function loadSuggestions() {
    db.from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(function (res) {
        loadingEl.style.display = 'none';
        if (res.error) {
          showMessage('Suggestions are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        suggestions = res.data || [];
        rebuildPageFilterOptions();
        render();
      });
  }

  Array.prototype.forEach.call(filterButtons, function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(filterButtons, function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener('input', function () { render(); });
  pageFilterSelect.addEventListener('change', function () { render(); });
  sortSelect.addEventListener('change', function () { render(); });

  document.getElementById('dashComposeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var titleInput = document.getElementById('dashComposeTitle');
    var descInput = document.getElementById('dashComposeDesc');
    var title = titleInput.value.trim();
    if (!title || !currentUser) return;

    var submitBtn = document.getElementById('dashComposeSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    db.from('suggestions').insert({
      requester_id: currentUser.id,
      requester_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      requester_email: currentUser.email,
      page_context: composePageSelect.value || null,
      title: title,
      description: descInput.value.trim() || null
    }).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit suggestion';
      if (res.error) {
        showMessage('Could not submit: ' + res.error.message, 'error');
        return;
      }
      titleInput.value = '';
      descInput.value = '';
      loadSuggestions();
    });
  });

  db.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session) {
      window.location.href = loginUrl();
      return;
    }
    currentUser = session.user;

    db.from('profiles').select('role').eq('id', currentUser.id).single().then(function (profileRes) {
      var role = profileRes.data && profileRes.data.role;
      isAdmin = role === 'admin';
      loadSuggestions(); // open to every role — no redirect gate here
    });
  });
})();
