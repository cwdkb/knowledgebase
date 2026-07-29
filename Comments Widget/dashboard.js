// Knowledge Base — Comments & Revisions dashboard.
// Gmail/HubSpot-style three-pane rework: left rail (status + page filters), center
// row-list, right detail pane with the thread + reply box. Replaces the old single-
// column stacked-card layout — same underlying Supabase queries/permissions as before.
// Non-admins only see their own comments ("Your Requests and Revisions"); admins see
// everyone's, since they're the ones triaging them.
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

  function loginUrl() { return new URL('../auth/index.html', window.location.href).href; }
  function accountUrl() { return new URL('../auth/account.html', window.location.href).href; }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatDate(iso) {
    var d = new Date(iso);
    var tz = window.cwdTimezone ? window.cwdTimezone.get() : 'America/New_York';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: tz }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
  }

  var messageEl = document.getElementById('dashMessage');
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'dash-message show message-' + type;
  }
  function hideMessage() {
    messageEl.className = 'dash-message';
  }

  var railEl = document.getElementById('rail');
  var rowsEl = document.getElementById('rows');
  var listCountEl = document.getElementById('listCount');
  var detailEl = document.getElementById('detailPane');
  var searchInput = document.getElementById('searchInput');
  var sortBtn = document.getElementById('sortBtn');

  var currentUser = null;
  var isAdmin = false;
  var roots = [];              // top-level comments visible to this user
  var repliesByParent = {};    // parent_id -> [reply, ...] sorted oldest-first

  var state = { statusFilter: 'all', pageFilter: 'all', sort: 'newest', query: '', selectedId: null };

  function matchesQuery(item) {
    if (!state.query) return true;
    var haystack = [item.author_name, item.body || '', item.anchor_label || '', item.page_title || '']
      .join(' ').toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  function filteredSorted() {
    var data = roots.filter(function (c) {
      if (state.statusFilter === 'open' && c.resolved) return false;
      if (state.statusFilter === 'actioned' && !c.resolved) return false;
      if (state.pageFilter !== 'all' && c.page_id !== state.pageFilter) return false;
      return matchesQuery(c);
    });
    data.sort(function (a, b) {
      var diff = new Date(a.created_at) - new Date(b.created_at);
      return state.sort === 'oldest' ? diff : -diff;
    });
    return data;
  }

  function pruneSelection() {
    if (!state.selectedId) return;
    var stillVisible = filteredSorted().some(function (c) { return c.id === state.selectedId; });
    if (!stillVisible) state.selectedId = null;
  }

  function statusDotColor(resolved) { return resolved ? 'var(--green)' : 'var(--navy)'; }
  function statusBadge(c) {
    return c.resolved
      ? '<span class="badge badge-resolved">Actioned' + (c.resolved_by_name ? ' by ' + escapeHtml(c.resolved_by_name) : '') + '</span>'
      : '<span class="badge badge-audit">Open</span>';
  }

  function pageCounts(data) {
    var counts = {};
    data.forEach(function (c) { counts[c.page_id] = (counts[c.page_id] || 0) + 1; });
    return counts;
  }
  function statusCounts(data) {
    var counts = { open: 0, actioned: 0 };
    data.forEach(function (c) { counts[c.resolved ? 'actioned' : 'open']++; });
    return counts;
  }

  function renderRail() {
    var searched = roots.filter(matchesQuery);
    var sCounts = statusCounts(searched);
    var pCounts = pageCounts(searched);

    var html = '<div class="rail-section-label">Status</div>';
    [['all', 'All', null], ['open', 'Open', 'var(--navy)'], ['actioned', 'Actioned', 'var(--green)']].forEach(function (s) {
      var count = s[0] === 'all' ? searched.length : sCounts[s[0]];
      var dot = s[2] ? '<span class="rail-dot" style="background:' + s[2] + '"></span>' : '';
      html += '<button class="rail-item' + (state.statusFilter === s[0] ? ' active' : '') + '" data-status="' + s[0] + '">' +
        '<span class="rail-item-label">' + dot + s[1] + '</span><span class="rail-count">' + count + '</span></button>';
    });

    html += '<div class="rail-divider"></div><div class="rail-section-label">Pages</div>';
    html += '<button class="rail-item' + (state.pageFilter === 'all' ? ' active' : '') + '" data-page="all">' +
      '<span class="rail-item-label">All pages</span><span class="rail-count">' + searched.length + '</span></button>';
    Object.keys(PAGE_LABELS).forEach(function (pageId) {
      if (!pCounts[pageId]) return;
      html += '<button class="rail-item' + (state.pageFilter === pageId ? ' active' : '') + '" data-page="' + pageId + '">' +
        '<span class="rail-item-label">' + PAGE_LABELS[pageId] + '</span><span class="rail-count">' + pCounts[pageId] + '</span></button>';
    });

    railEl.innerHTML = html;
    Array.prototype.forEach.call(railEl.querySelectorAll('[data-status]'), function (btn) {
      btn.addEventListener('click', function () { state.statusFilter = btn.dataset.status; renderAll(); });
    });
    Array.prototype.forEach.call(railEl.querySelectorAll('[data-page]'), function (btn) {
      btn.addEventListener('click', function () { state.pageFilter = btn.dataset.page; renderAll(); });
    });
  }

  function renderRows() {
    var data = filteredSorted();
    listCountEl.textContent = data.length + ' comment' + (data.length === 1 ? '' : 's');

    if (!data.length) {
      rowsEl.innerHTML = '<div class="empty-list">Nothing matches these filters.</div>';
      return;
    }

    rowsEl.innerHTML = data.map(function (c) {
      var pageLabel = PAGE_LABELS[c.page_id] || c.page_title || 'Unknown page';
      var selected = state.selectedId === c.id;
      var replyCount = (repliesByParent[c.id] || []).length;
      var replyTag = replyCount ? '<div class="row-replies">' + replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') + '</div>' : '';
      return '<div class="row' + (selected ? ' selected' : '') + '" data-id="' + c.id + '" role="button" tabindex="0" aria-pressed="' + selected + '">' +
        '<span class="row-status-dot" style="background:' + statusDotColor(c.resolved) + '"></span>' +
        '<div class="row-main">' +
          '<div class="row-top"><span class="row-author">' + escapeHtml(c.author_name) + '</span><span class="row-date">' + formatDate(c.created_at) + '</span></div>' +
          '<span class="row-page">' + escapeHtml(pageLabel) + '</span>' +
          '<p class="row-snippet">' + escapeHtml(c.body) + '</p>' + replyTag +
        '</div></div>';
    }).join('');

    function selectRow(row) {
      state.selectedId = row.dataset.id;
      document.getElementById('listPane').classList.add('has-selection');
      renderRows();
      renderDetail();
    }
    Array.prototype.forEach.call(rowsEl.querySelectorAll('.row'), function (row) {
      row.addEventListener('click', function () { selectRow(row); });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRow(row); }
      });
    });
  }

  function renderDetail() {
    var item = roots.filter(function (c) { return c.id === state.selectedId; })[0];

    if (!item) {
      detailEl.innerHTML = '<div class="detail-empty"><div class="detail-empty-icon">&#128172;</div>' +
        '<div class="detail-empty-text">Select a comment to view it here.</div></div>';
      return;
    }

    var pageLabel = PAGE_LABELS[item.page_id] || item.page_title || 'Unknown page';
    var pagePath = PAGE_PATHS[item.page_id];
    var anchorHtml = item.anchor_label
      ? ' <span class="crumb-sep">&rsaquo;</span> <span class="crumb-anchor">&#128205; ' + escapeHtml(item.anchor_label) + '</span>'
      : '';
    var crumbHref = pagePath ? (pagePath + (item.anchor_id ? '#' + item.anchor_id : '')) : null;
    var crumb = crumbHref
      ? '<a class="detail-crumb" href="' + crumbHref + '" target="_blank" rel="noopener" title="Open this section in the Knowledge Base (new tab)">' +
          escapeHtml(pageLabel) + anchorHtml + ' <span class="crumb-ext" aria-hidden="true">&#8599;</span>' +
          '<span class="sr-only"> (opens in a new tab)</span></a>'
      : '<span class="detail-crumb detail-crumb-plain">' + escapeHtml(pageLabel) + anchorHtml + '</span>';

    var actions = isAdmin
      ? (item.resolved
          ? '<button class="action-btn" data-action="reopen">Reopen</button>'
          : '<button class="action-btn primary" data-action="resolve">Mark actioned</button>')
      : '';

    var headHtml = '<div>' + crumb + '</div><div class="detail-actions">' + statusBadge(item) + actions + '</div>';

    function renderThreadItem(entry, isReply) {
      var isOwn = currentUser && entry.author_id === currentUser.id;
      var editBtn = isOwn ? '<button type="button" class="thread-edit-toggle" data-id="' + entry.id + '">Edit</button>' : '';
      return '<div class="thread-item' + (isReply ? ' thread-reply' : '') + '" data-thread-id="' + entry.id + '">' +
        '<div class="thread-meta"><span class="thread-author">' + escapeHtml(entry.author_name) +
        '</span><span class="thread-date">' + formatDate(entry.created_at) + '</span></div>' +
        '<p class="thread-text">' + escapeHtml(entry.body) + '</p>' +
        '<form class="thread-edit-form" data-id="' + entry.id + '" hidden>' +
          '<textarea required>' + escapeHtml(entry.body) + '</textarea>' +
          '<div class="thread-edit-form-btns">' +
            '<button type="submit" class="action-btn primary thread-edit-submit">Save</button>' +
            '<button type="button" class="action-btn thread-edit-cancel">Cancel</button>' +
          '</div>' +
        '</form>' +
        '<div class="thread-item-footer">' + editBtn + '</div>' +
      '</div>';
    }

    var replies = repliesByParent[item.id] || [];
    var bodyHtml = renderThreadItem(item, false);
    if (replies.length) {
      bodyHtml += '<div class="thread-divider"></div>';
      replies.forEach(function (r) { bodyHtml += renderThreadItem(r, true); });
    }

    var replyBoxHtml;
    if (item.resolved) {
      replyBoxHtml = '<div class="reply-box reply-box-locked">&#128274; This thread is closed' +
        (isAdmin ? ' — Reopen it above to add a new reply.' : ' — an admin needs to reopen it before anyone can reply again.') + '</div>';
    } else {
      replyBoxHtml = '<div class="reply-box"><textarea id="replyText" placeholder="Write a reply…"></textarea>' +
        '<div class="form-error hidden" id="replyError"></div>' +
        '<div class="reply-box-footer"><button type="button" class="action-btn primary" id="postReplyBtn">Post Reply</button></div></div>';
    }

    detailEl.innerHTML = '<div class="detail-head">' + headHtml + '</div>' +
      '<div class="detail-body">' + bodyHtml + '</div>' + replyBoxHtml;

    var resolveBtn = detailEl.querySelector('[data-action="resolve"]');
    if (resolveBtn) resolveBtn.addEventListener('click', function () { setResolved(item.id, true, resolveBtn); });
    var reopenBtn = detailEl.querySelector('[data-action="reopen"]');
    if (reopenBtn) reopenBtn.addEventListener('click', function () { setResolved(item.id, false, reopenBtn); });

    var postReplyBtn = document.getElementById('postReplyBtn');
    if (postReplyBtn) {
      postReplyBtn.addEventListener('click', function () {
        var ta = document.getElementById('replyText');
        var val = ta.value.trim();
        var errEl = document.getElementById('replyError');
        if (!val) {
          errEl.textContent = 'Please write a reply before posting.';
          errEl.classList.remove('hidden');
          ta.focus();
          return;
        }
        postReplyBtn.disabled = true;
        postReplyBtn.textContent = 'Posting…';
        postReply(item, val, function () {
          postReplyBtn.disabled = false;
          postReplyBtn.textContent = 'Post Reply';
        });
      });
    }

    Array.prototype.forEach.call(detailEl.querySelectorAll('.thread-edit-toggle'), function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.thread-item');
        card.querySelector('.thread-text').hidden = true;
        var form = card.querySelector('.thread-edit-form');
        form.hidden = false;
        var textarea = form.querySelector('textarea');
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      });
    });

    Array.prototype.forEach.call(detailEl.querySelectorAll('.thread-edit-cancel'), function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.thread-item');
        card.querySelector('.thread-edit-form').hidden = true;
        card.querySelector('.thread-text').hidden = false;
      });
    });

    Array.prototype.forEach.call(detailEl.querySelectorAll('.thread-edit-form'), function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var textarea = form.querySelector('textarea');
        var body = textarea.value.trim();
        if (!body) return;
        var submitBtn = form.querySelector('.thread-edit-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
        db.from('comments').update({ body: body }).eq('id', form.dataset.id).then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save';
          if (res.error) {
            showMessage('Could not save your edit: ' + res.error.message, 'error');
            return;
          }
          hideMessage();
          loadComments();
        });
      });
    });
  }

  function renderAll() {
    pruneSelection();
    renderRail();
    renderRows();
    renderDetail();
  }

  function postReply(parent, body, done) {
    db.from('comments').insert({
      page_id: parent.page_id,
      page_title: parent.page_title,
      anchor_id: parent.anchor_id,
      anchor_label: parent.anchor_label,
      parent_id: parent.id,
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
      hideMessage();
      loadComments();
    });
  }

  function setResolved(id, resolved, btn) {
    btn.disabled = true;
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
        btn.disabled = false;
        showMessage('Could not update: ' + res.error.message, 'error');
        return;
      }
      hideMessage();
      loadComments();
    });
  }

  function buildThreads(all) {
    roots = [];
    repliesByParent = {};
    all.forEach(function (c) {
      if (c.parent_id) {
        (repliesByParent[c.parent_id] = repliesByParent[c.parent_id] || []).push(c);
      } else {
        roots.push(c);
      }
    });
    Object.keys(repliesByParent).forEach(function (id) {
      repliesByParent[id].sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    });
  }

  function loadComments() {
    if (isAdmin) {
      db.from('comments').select('*').order('created_at', { ascending: false }).then(function (res) {
        if (res.error) {
          showMessage('Comments are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        buildThreads(res.data || []);
        renderAll();
      });
      return;
    }

    db.from('comments').select('*').eq('author_id', currentUser.id).is('parent_id', null)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) {
          showMessage('Comments are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        var own = res.data || [];
        var ids = own.map(function (r) { return r.id; });
        if (!ids.length) {
          buildThreads([]);
          renderAll();
          return;
        }
        db.from('comments').select('*').in('parent_id', ids).then(function (repliesRes) {
          if (repliesRes.error) {
            showMessage('Comments are unavailable right now: ' + repliesRes.error.message, 'error');
            return;
          }
          buildThreads(own.concat(repliesRes.data || []));
          renderAll();
        });
      });
  }

  searchInput.addEventListener('input', function (e) {
    state.query = e.target.value.trim().toLowerCase();
    renderAll();
  });
  sortBtn.addEventListener('click', function () {
    state.sort = state.sort === 'newest' ? 'oldest' : 'newest';
    sortBtn.textContent = state.sort === 'newest' ? 'Newest first' : 'Oldest first';
    renderRows();
  });

  /* Compose (Gmail-style floating window) */
  var compose = document.getElementById('compose');
  var composePage = document.getElementById('composePage');
  var composeText = document.getElementById('composeText');
  var composeError = document.getElementById('composeError');
  var composeSubmit = document.getElementById('composeSubmit');

  composePage.innerHTML = '<option value="" disabled selected>Choose a page…</option>' +
    Object.keys(PAGE_LABELS).map(function (id) { return '<option value="' + id + '">' + PAGE_LABELS[id] + '</option>'; }).join('');

  function showComposeError(msg) {
    composeError.textContent = msg;
    composeError.classList.remove('hidden');
  }
  function resetComposeError() {
    composeError.classList.add('hidden');
  }

  document.getElementById('newBtn').addEventListener('click', function () {
    compose.classList.remove('hidden');
    compose.classList.remove('minimized');
    resetComposeError();
  });
  document.getElementById('composeClose').addEventListener('click', function (e) {
    e.stopPropagation();
    compose.classList.add('hidden');
    resetComposeError();
  });
  document.getElementById('composeHead').addEventListener('click', function () {
    compose.classList.toggle('minimized');
  });
  document.getElementById('composeMin').addEventListener('click', function (e) {
    e.stopPropagation();
    compose.classList.toggle('minimized');
  });
  composeSubmit.addEventListener('click', function (e) {
    e.stopPropagation();
    var text = composeText.value.trim();
    if (!composePage.value) { showComposeError('Please choose which page this comment is about.'); return; }
    if (!text) { showComposeError('Please write the comment.'); return; }

    composeSubmit.disabled = true;
    composeSubmit.textContent = 'Posting…';

    db.from('comments').insert({
      page_id: composePage.value,
      page_title: PAGE_LABELS[composePage.value],
      author_id: currentUser.id,
      author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      author_email: currentUser.email,
      body: text
    }).then(function (res) {
      composeSubmit.disabled = false;
      composeSubmit.textContent = 'Post';
      if (res.error) {
        showComposeError('Could not post: ' + res.error.message);
        return;
      }
      composeText.value = '';
      composePage.selectedIndex = 0;
      resetComposeError();
      compose.classList.add('hidden');
      loadComments();
    });
  });

  /* Drag-to-resize dividers — widths stay fixed across clicks/filters until dragged.
     Max is recomputed at drag-start from the ACTUAL available width, so the detail
     pane (DETAIL_MIN floor) can never get crushed regardless of window size or how
     far the other divider was previously dragged. */
  var DETAIL_MIN = 320;
  var HANDLES_AND_GAPS = 10 + 10 + 18 * 4;
  var mainEl = document.querySelector('.main');

  function makeResizable(handle, targetEl, otherEl, min, staticMax) {
    var dragging = false, startX = 0, startWidth = 0, dynamicMax = staticMax;
    handle.addEventListener('mousedown', function (e) {
      dragging = true;
      startX = e.clientX;
      startWidth = targetEl.getBoundingClientRect().width;
      var reserved = otherEl.getBoundingClientRect().width + HANDLES_AND_GAPS + DETAIL_MIN;
      dynamicMax = Math.max(min, Math.min(staticMax, mainEl.getBoundingClientRect().width - reserved));
      handle.classList.add('dragging');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var newWidth = Math.max(min, Math.min(dynamicMax, startWidth + (e.clientX - startX)));
      targetEl.style.flex = '0 0 ' + newWidth + 'px';
    });
    window.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.userSelect = '';
    });
  }
  makeResizable(document.getElementById('handleRailList'), document.getElementById('rail'), document.getElementById('listPane'), 180, 360);
  makeResizable(document.getElementById('handleListDetail'), document.getElementById('listPane'), document.getElementById('rail'), 300, 640);

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
