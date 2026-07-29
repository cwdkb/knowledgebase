// Knowledge Base — Comments & Revisions dashboard.
// Cross-page view of comments (per-page panels only ever show one page at a time) —
// the "check this instead of email" alternative to notifications. Non-admins only see
// their own comments ("Your Requests and Revisions"); admins see everyone's, since
// they're the ones triaging them.
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
    var tz = window.cwdTimezone ? window.cwdTimezone.get() : 'America/New_York';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
  }

  var PAGE_LABELS = {
    'hub': 'Knowledge Base (hub)',
    '001-crm-playbook': 'Builder Prime CRM Playbook',
    '002-org-chart': 'Org Chart',
    '003-marketing-lead-source': 'Marketing & Lead Source',
    '004-admin-finance': 'Admin & Finance',
    '005-sales': 'Sales',
    '006-scripts-talk-tracks': 'Scripts & Talk Tracks',
    '007-production-installation': 'Production & Installation',
    '008-service': 'Service',
    '009-ordering-vendor': 'Ordering & Vendor',
    '010-hr': 'HR & Onboarding'
  };

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

  Object.keys(PAGE_LABELS).forEach(function (pageId) {
    var label = PAGE_LABELS[pageId];

    var filterOpt = document.createElement('option');
    filterOpt.value = pageId;
    filterOpt.textContent = label;
    pageFilterSelect.appendChild(filterOpt);

    var composeOpt = document.createElement('option');
    composeOpt.value = pageId;
    composeOpt.textContent = label;
    composePageSelect.appendChild(composeOpt);
  });

  var currentUser = null;
  var isAdmin = false;
  var comments = [];
  var activeFilter = 'all';

  function renderCommentCard(c, isReply) {
    var pagePath = PAGE_PATHS[c.page_id] || '#';
    var pageLink = !isReply
      ? '<a class="dash-comment-page" href="' + pagePath + '">' + escapeHtml(c.page_title) + '</a>'
      : '';
    var resolvedTag = !isReply
      ? (c.resolved
          ? '<span class="badge badge-resolved">Actioned' + (c.resolved_by_name ? ' by ' + escapeHtml(c.resolved_by_name) : '') + '</span>'
          : '<span class="badge badge-audit">Open</span>')
      : '';
    var actionBtn = (!isReply && isAdmin)
      ? '<button type="button" class="kb-comments-resolve" data-id="' + c.id + '" data-resolved="' + c.resolved + '">' +
          (c.resolved ? 'Reopen' : 'Mark actioned') +
        '</button>'
      : '';
    var replyToggle = !isReply
      ? '<button type="button" class="kb-reply-toggle" data-parent-id="' + c.id + '">Reply</button>'
      : '';
    var anchorTag = (!isReply && c.anchor_label)
      ? '<div class="kb-comment-anchor">📍 ' + escapeHtml(c.anchor_label) + '</div>'
      : '';
    return (
      '<div class="kb-comment' + (!isReply && c.resolved ? ' resolved' : '') + (isReply ? ' kb-comment-reply' : '') + '">' +
        pageLink +
        anchorTag +
        '<div class="kb-comment-meta">' +
          '<span class="kb-comment-author">' + escapeHtml(c.author_name) + '</span>' +
          '<span class="kb-comment-date">' + formatDate(c.created_at) + '</span>' +
        '</div>' +
        '<p class="kb-comment-body">' + escapeHtml(c.body).replace(/\n/g, '<br>') + '</p>' +
        '<div class="kb-comment-footer">' + resolvedTag + actionBtn + replyToggle + '</div>' +
      '</div>'
    );
  }

  function renderThread(root, replies) {
    var repliesHtml = replies.length
      ? '<div class="kb-comment-replies">' + replies.map(function (r) { return renderCommentCard(r, true); }).join('') + '</div>'
      : '';
    return (
      '<div class="kb-comment-thread">' +
        renderCommentCard(root, false) +
        repliesHtml +
        '<form class="kb-reply-form" data-parent-id="' + root.id + '" hidden>' +
          '<textarea placeholder="Write a reply…" required></textarea>' +
          '<button type="submit" class="kb-reply-submit">Post Reply</button>' +
        '</form>' +
      '</div>'
    );
  }

  function render() {
    var query = searchInput.value.trim().toLowerCase();
    var pageFilter = pageFilterSelect.value;
    var sortOrder = sortSelect.value;

    var roots = comments.filter(function (c) { return !c.parent_id; });
    var repliesByParent = {};
    comments.forEach(function (c) {
      if (c.parent_id) {
        (repliesByParent[c.parent_id] = repliesByParent[c.parent_id] || []).push(c);
      }
    });
    Object.keys(repliesByParent).forEach(function (id) {
      repliesByParent[id].sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    });

    var filtered = roots.filter(function (c) {
      if (activeFilter === 'open' && c.resolved) return false;
      if (activeFilter === 'resolved' && !c.resolved) return false;
      if (pageFilter !== 'all' && c.page_id !== pageFilter) return false;
      if (query) {
        var haystack = [c.body, c.author_name, c.page_title, c.anchor_label || '']
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
      listEl.innerHTML = '<div class="kb-comments-empty">Nothing here yet.</div>';
      return;
    }

    listEl.innerHTML = filtered.map(function (c) {
      return renderThread(c, repliesByParent[c.id] || []);
    }).join('');

    Array.prototype.forEach.call(listEl.querySelectorAll('.kb-comments-resolve'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        setResolved(id, btn.dataset.resolved !== 'true');
      });
    });

    Array.prototype.forEach.call(listEl.querySelectorAll('.kb-reply-toggle'), function (btn) {
      btn.addEventListener('click', function () {
        var form = btn.closest('.kb-comment-thread').querySelector('.kb-reply-form');
        form.hidden = !form.hidden;
        if (!form.hidden) form.querySelector('textarea').focus();
      });
    });

    Array.prototype.forEach.call(listEl.querySelectorAll('.kb-reply-form'), function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var textarea = form.querySelector('textarea');
        var body = textarea.value.trim();
        if (!body || !currentUser) return;
        var submitBtn = form.querySelector('.kb-reply-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting…';
        postReply(form.dataset.parentId, body, function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post Reply';
        });
      });
    });
  }

  function postReply(parentId, body, done) {
    var parent = comments.filter(function (c) { return c.id === parentId; })[0];
    if (!parent) { done(); return; }
    db.from('comments').insert({
      page_id: parent.page_id,
      page_title: parent.page_title,
      anchor_id: parent.anchor_id,
      anchor_label: parent.anchor_label,
      parent_id: parentId,
      author_id: currentUser.id,
      author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      author_email: currentUser.email,
      body: body
    }).then(function (res) {
      done();
      if (res.error) {
        showMessage('Could not post reply: ' + res.error.message, 'error');
        return;
      }
      loadComments();
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
    if (isAdmin) {
      db.from('comments').select('*').order('created_at', { ascending: false }).then(function (res) {
        loadingEl.style.display = 'none';
        if (res.error) {
          showMessage('Comments are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        comments = res.data || [];
        render();
      });
      return;
    }

    // Non-admins only see their own threads — but a thread can include an admin's reply,
    // so fetch own root comments first, then pull in any replies to those specific threads.
    db.from('comments').select('*').eq('author_id', currentUser.id).is('parent_id', null)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) {
          loadingEl.style.display = 'none';
          showMessage('Comments are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        var roots = res.data || [];
        var ids = roots.map(function (r) { return r.id; });
        if (!ids.length) {
          loadingEl.style.display = 'none';
          comments = [];
          render();
          return;
        }
        db.from('comments').select('*').in('parent_id', ids).then(function (repliesRes) {
          loadingEl.style.display = 'none';
          if (repliesRes.error) {
            showMessage('Comments are unavailable right now: ' + repliesRes.error.message, 'error');
            return;
          }
          comments = roots.concat(repliesRes.data || []);
          render();
        });
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
    var pageId = composePageSelect.value;
    var bodyInput = document.getElementById('dashComposeBody');
    var body = bodyInput.value.trim();
    if (!body || !pageId || !currentUser) return;

    var submitBtn = document.getElementById('dashComposeSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting…';

    db.from('comments').insert({
      page_id: pageId,
      page_title: PAGE_LABELS[pageId],
      author_id: currentUser.id,
      author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      author_email: currentUser.email,
      body: body
    }).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add comment';
      if (res.error) {
        showMessage('Could not post: ' + res.error.message, 'error');
        return;
      }
      bodyInput.value = '';
      loadComments();
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
