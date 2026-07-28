// Knowledge Base — Comments & Revisions dashboard.
// Cross-page view of every comment left across the KB (per-page panels only ever show
// one page at a time) — the "check this instead of email" alternative to notifications.
// Plain script (not type="module") on purpose — see Comments Widget/comments-widget.js.

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

  var PAGE_PATHS = {
    'hub': '../index.html',
    '001-crm-playbook': '../001-crm-playbook/index.html',
    '002-org-chart': '../002-org-chart/org-chart.html',
    '003-marketing-lead-source': '../003-marketing-lead-source/index.html',
    '004-admin-finance': '../004-admin-finance/index.html',
    '005-sales': '../005-sales/index.html',
    '006-scripts-talk-tracks': '../006-scripts-talk-tracks/index.html',
    '007-production-installation': '../007-production-installation/index.html',
    '008-service': '../008-service/index.html',
    '009-ordering-vendor': '../009-ordering-vendor/index.html',
    '010-hr': '../010-hr/index.html'
  };

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

  var messageEl = document.getElementById('dashMessage');
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message show message-' + type;
  }

  var listEl = document.getElementById('dashList');
  var loadingEl = document.getElementById('dashLoading');
  var filterButtons = document.querySelectorAll('.dash-filter');

  var currentUser = null;
  var isAdmin = false;
  var comments = [];
  var activeFilter = 'all';

  function render() {
    var filtered = comments.filter(function (c) {
      if (activeFilter === 'open') return !c.resolved;
      if (activeFilter === 'resolved') return c.resolved;
      return true;
    });

    if (!filtered.length) {
      listEl.innerHTML = '<div class="kb-comments-empty">Nothing here yet.</div>';
      return;
    }

    listEl.innerHTML = filtered.map(function (c) {
      var pagePath = PAGE_PATHS[c.page_id] || '#';
      var resolvedTag = c.resolved
        ? '<span class="badge badge-resolved">Actioned' + (c.resolved_by_name ? ' by ' + escapeHtml(c.resolved_by_name) : '') + '</span>'
        : '<span class="badge badge-audit">Open</span>';
      var actionBtn = isAdmin
        ? '<button type="button" class="kb-comments-resolve" data-id="' + c.id + '" data-resolved="' + c.resolved + '">' +
            (c.resolved ? 'Reopen' : 'Mark actioned') +
          '</button>'
        : '';
      var anchorTag = c.anchor_label
        ? '<div class="kb-comment-anchor">📍 ' + escapeHtml(c.anchor_label) + '</div>'
        : '';
      return (
        '<div class="kb-comment' + (c.resolved ? ' resolved' : '') + '">' +
          '<a class="dash-comment-page" href="' + pagePath + '">' + escapeHtml(c.page_title) + '</a>' +
          anchorTag +
          '<div class="kb-comment-meta">' +
            '<span class="kb-comment-author">' + escapeHtml(c.author_name) + '</span>' +
            '<span class="kb-comment-date">' + formatDate(c.created_at) + '</span>' +
          '</div>' +
          '<p class="kb-comment-body">' + escapeHtml(c.body).replace(/\n/g, '<br>') + '</p>' +
          '<div class="kb-comment-footer">' + resolvedTag + actionBtn + '</div>' +
        '</div>'
      );
    }).join('');

    Array.prototype.forEach.call(listEl.querySelectorAll('.kb-comments-resolve'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        setResolved(id, btn.dataset.resolved !== 'true');
      });
    });
  }

  function setResolved(id, resolved) {
    var patch = resolved
      ? {
          resolved: true,
          resolved_by_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
          resolved_by_email: currentUser.email,
          resolved_at: new Date().toISOString()
        }
      : { resolved: false, resolved_by_name: null, resolved_by_email: null, resolved_at: null };

    db.from('comments').update(patch).eq('id', id).then(function (res) {
      if (res.error) {
        showMessage('Could not update: ' + res.error.message, 'error');
        return;
      }
      loadComments();
    });
  }

  function loadComments() {
    db.from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(function (res) {
        loadingEl.style.display = 'none';
        if (res.error) {
          showMessage('Comments are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        comments = res.data || [];
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

  db.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session) {
      window.location.href = loginUrl();
      return;
    }
    currentUser = session.user;

    db.from('profiles').select('role').eq('id', currentUser.id).single().then(function (profileRes) {
      var role = profileRes.data && profileRes.data.role;
      var canComment = role === 'admin' || role === 'editor' || role === 'commenter';
      if (!canComment) {
        showMessage('This page is for reviewers only — taking you back to your account.', 'error');
        setTimeout(function () { window.location.href = accountUrl(); }, 2000);
        return;
      }
      isAdmin = role === 'admin';
      loadComments();
    });
  });
})();
