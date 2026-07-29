// Knowledge Base — Suggestions dashboard.
// Gmail/HubSpot-style three-pane rework: left rail (status + page filters), center
// row-list, right detail pane with the description + notes + status actions.
// Open to every role, including 'member' — everyone sees every suggestion (a public
// wishlist, not a private inbox), so people don't submit duplicates and can see what's
// already been requested/added/declined. Only admins change status.
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
  // page_context is a free-text label (not a slug id), so the clickable breadcrumb
  // needs its own label->path lookup rather than reusing Comments' PAGE_PATHS.
  var LABEL_PATHS = {
    'Knowledge Base': '../index.html',
    'Builder Prime CRM Playbook': '../001-crm-playbook/index.html',
    'Org Chart': '../002-org-chart/org-chart.html',
    'Marketing & Lead Source': '../003-marketing-lead-source/index.html',
    'Admin & Finance': '../004-admin-finance/index.html',
    'Sales': '../005-sales/index.html',
    'Scripts & Talk Tracks': '../006-scripts-talk-tracks/index.html',
    'Production & Installation': '../007-production-installation/index.html',
    'Service': '../008-service/index.html',
    'Ordering & Vendor': '../009-ordering-vendor/index.html',
    'HR & Onboarding': '../010-hr/index.html'
  };

  var STATUS_LABELS = { pending: 'Pending', added: 'Added', declined: 'Declined', archived: 'Archived' };
  var STATUS_BADGE_CLASS = { pending: 'badge-audit', added: 'badge-resolved', declined: 'badge-declined', archived: 'badge-archived' };
  var STATUS_TRANSITIONS = [
    { status: 'added', label: 'Mark added', cls: 'primary' },
    { status: 'declined', label: 'Decline', cls: 'danger' },
    { status: 'pending', label: 'Reset to pending', cls: '' },
    { status: 'archived', label: 'Archive', cls: '' }
  ];

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
  function hideMessage() { messageEl.className = 'dash-message'; }

  var railEl = document.getElementById('rail');
  var rowsEl = document.getElementById('rows');
  var listCountEl = document.getElementById('listCount');
  var detailEl = document.getElementById('detailPane');
  var searchInput = document.getElementById('searchInput');
  var sortBtn = document.getElementById('sortBtn');

  var currentUser = null;
  var isAdmin = false;
  var suggestions = [];
  var notesBySuggestion = {};

  var state = { statusFilter: 'all', pageFilter: 'all', sort: 'newest', query: '', selectedId: null };

  function matchesQuery(item) {
    if (!state.query) return true;
    var haystack = [item.requester_name, item.title, item.description || '', item.page_context || '']
      .join(' ').toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  function filteredSorted() {
    var data = suggestions.filter(function (s) {
      if (state.statusFilter !== 'all' && s.status !== state.statusFilter) return false;
      if (state.pageFilter !== 'all' && s.page_context !== state.pageFilter) return false;
      return matchesQuery(s);
    });
    data.sort(function (a, b) {
      var diff = new Date(a.created_at) - new Date(b.created_at);
      return state.sort === 'oldest' ? diff : -diff;
    });
    return data;
  }

  function pruneSelection() {
    if (!state.selectedId) return;
    var stillVisible = filteredSorted().some(function (s) { return s.id === state.selectedId; });
    if (!stillVisible) state.selectedId = null;
  }

  function statusDotColor(status) {
    return { pending: 'var(--gold-dark)', added: 'var(--green)', declined: 'var(--red)', archived: 'var(--grey)' }[status];
  }
  function statusBadge(s) {
    var label = STATUS_LABELS[s.status];
    if (s.status !== 'pending' && s.actioned_by_name) label += ' by ' + escapeHtml(s.actioned_by_name);
    return '<span class="badge ' + STATUS_BADGE_CLASS[s.status] + '">' + label + '</span>';
  }

  function pageCounts(data) {
    var counts = {};
    data.forEach(function (s) { if (s.page_context) counts[s.page_context] = (counts[s.page_context] || 0) + 1; });
    return counts;
  }
  function statusCounts(data) {
    var counts = { pending: 0, added: 0, declined: 0, archived: 0 };
    data.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }

  function renderRail() {
    var searched = suggestions.filter(matchesQuery);
    var sCounts = statusCounts(searched);
    var pCounts = pageCounts(searched);

    var html = '<div class="rail-section-label">Status</div>';
    [['all', 'All', null]].concat(Object.keys(STATUS_LABELS).map(function (k) { return [k, STATUS_LABELS[k], statusDotColor(k)]; }))
      .forEach(function (s) {
        var count = s[0] === 'all' ? searched.length : sCounts[s[0]];
        var dot = s[2] ? '<span class="rail-dot" style="background:' + s[2] + '"></span>' : '';
        html += '<button class="rail-item' + (state.statusFilter === s[0] ? ' active' : '') + '" data-status="' + s[0] + '">' +
          '<span class="rail-item-label">' + dot + s[1] + '</span><span class="rail-count">' + count + '</span></button>';
      });

    html += '<div class="rail-divider"></div><div class="rail-section-label">Pages</div>';
    html += '<button class="rail-item' + (state.pageFilter === 'all' ? ' active' : '') + '" data-page="all">' +
      '<span class="rail-item-label">All pages</span><span class="rail-count">' + searched.length + '</span></button>';
    Object.keys(pCounts).sort().forEach(function (label) {
      html += '<button class="rail-item' + (state.pageFilter === label ? ' active' : '') + '" data-page="' + escapeHtml(label) + '">' +
        '<span class="rail-item-label">' + escapeHtml(label) + '</span><span class="rail-count">' + pCounts[label] + '</span></button>';
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
    listCountEl.textContent = data.length + ' suggestion' + (data.length === 1 ? '' : 's');

    if (!data.length) {
      rowsEl.innerHTML = '<div class="empty-list">Nothing matches these filters.</div>';
      return;
    }

    rowsEl.innerHTML = data.map(function (s) {
      var pageLabel = s.page_context || 'General';
      var selected = state.selectedId === s.id;
      return '<div class="row' + (selected ? ' selected' : '') + '" data-id="' + s.id + '" role="button" tabindex="0" aria-pressed="' + selected + '">' +
        '<span class="row-status-dot" style="background:' + statusDotColor(s.status) + '"></span>' +
        '<div class="row-main">' +
          '<div class="row-top"><span class="row-author">' + escapeHtml(s.requester_name) + '</span><span class="row-date">' + formatDate(s.created_at) + '</span></div>' +
          '<span class="row-page">' + escapeHtml(pageLabel) + '</span>' +
          '<div class="row-title">' + escapeHtml(s.title) + '</div>' +
          '<p class="row-snippet">' + escapeHtml(s.description || '') + '</p>' +
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
    var item = suggestions.filter(function (s) { return s.id === state.selectedId; })[0];

    if (!item) {
      detailEl.innerHTML = '<div class="detail-empty"><div class="detail-empty-icon">&#128161;</div>' +
        '<div class="detail-empty-text">Select a suggestion to view it here.</div></div>';
      return;
    }

    var pageLabel = item.page_context || 'General suggestion';
    var path = item.page_context ? LABEL_PATHS[item.page_context] : null;
    var crumb = path
      ? '<a class="detail-crumb" href="' + path + '" target="_blank" rel="noopener" title="Open this page in the Knowledge Base (new tab)">' +
          escapeHtml(pageLabel) + ' <span class="crumb-ext" aria-hidden="true">&#8599;</span>' +
          '<span class="sr-only"> (opens in a new tab)</span></a>'
      : '<span class="detail-crumb detail-crumb-plain">' + escapeHtml(pageLabel) + '</span>';

    var actions = isAdmin
      ? STATUS_TRANSITIONS.filter(function (t) { return t.status !== item.status; })
          .map(function (t) { return '<button class="action-btn ' + t.cls + '" data-set-status="' + t.status + '">' + t.label + '</button>'; })
          .join('')
      : '';
    var isOwnSuggestion = currentUser && item.requester_id === currentUser.id;
    var suggestEditBtn = isOwnSuggestion ? '<button class="action-btn suggest-edit-toggle" data-id="' + item.id + '">Edit</button>' : '';

    var headHtml = '<div>' + crumb + '<div class="detail-title">' + escapeHtml(item.title) + '</div></div>' +
      '<div class="detail-actions">' + statusBadge(item) + actions + suggestEditBtn + '</div>';

    var bodyHtml = '<div class="thread-item"><div class="thread-meta"><span class="thread-author">' + escapeHtml(item.requester_name) +
      '</span><span class="thread-date">' + formatDate(item.created_at) + '</span></div>' +
      '<p class="thread-text">' + escapeHtml(item.description || 'No further detail provided.') + '</p>' +
      '<form class="suggest-edit-form" data-id="' + item.id + '" hidden>' +
        '<input type="text" class="suggest-edit-title" value="' + escapeHtml(item.title) + '" required maxlength="120">' +
        '<textarea class="suggest-edit-desc">' + escapeHtml(item.description || '') + '</textarea>' +
        '<div class="thread-edit-form-btns">' +
          '<button type="submit" class="action-btn primary suggest-edit-submit">Save</button>' +
          '<button type="button" class="action-btn suggest-edit-cancel">Cancel</button>' +
        '</div>' +
      '</form>' +
    '</div>';

    function renderNote(n) {
      var isOwnNote = currentUser && n.author_id === currentUser.id;
      var noteEditBtn = isOwnNote ? '<button type="button" class="thread-edit-toggle" data-id="' + n.id + '">Edit</button>' : '';
      return '<div class="thread-item thread-reply" data-thread-id="' + n.id + '">' +
        '<div class="thread-meta"><span class="thread-author">' + escapeHtml(n.author_name) +
        '</span><span class="thread-date">' + formatDate(n.created_at) + '</span></div>' +
        '<p class="thread-text">' + escapeHtml(n.body) + '</p>' +
        '<form class="thread-edit-form" data-id="' + n.id + '" hidden>' +
          '<textarea required>' + escapeHtml(n.body) + '</textarea>' +
          '<div class="thread-edit-form-btns">' +
            '<button type="submit" class="action-btn primary thread-edit-submit">Save</button>' +
            '<button type="button" class="action-btn thread-edit-cancel">Cancel</button>' +
          '</div>' +
        '</form>' +
        '<div class="thread-item-footer">' + noteEditBtn + '</div>' +
      '</div>';
    }

    var notes = notesBySuggestion[item.id] || [];
    if (notes.length) {
      bodyHtml += '<div class="thread-divider"></div><div class="notes-label">Notes</div>';
      notes.forEach(function (n) { bodyHtml += renderNote(n); });
    }

    var replyBoxHtml;
    if (item.status !== 'pending') {
      replyBoxHtml = '<div class="reply-box reply-box-locked">&#128274; This suggestion is ' + STATUS_LABELS[item.status] +
        (isAdmin ? ' — Reset to Pending above to add a new note.' : ' — an admin needs to reset it to Pending before anyone can add a new note.') + '</div>';
    } else {
      replyBoxHtml = '<div class="reply-box"><textarea id="replyText" placeholder="Add a note or reply…"></textarea>' +
        '<div class="form-error hidden" id="replyError"></div>' +
        '<div class="reply-box-footer"><button type="button" class="action-btn primary" id="postReplyBtn">Add Note</button></div></div>';
    }

    detailEl.innerHTML = '<div class="detail-head">' + headHtml + '</div>' +
      '<div class="detail-body">' + bodyHtml + '</div>' + replyBoxHtml;

    Array.prototype.forEach.call(detailEl.querySelectorAll('[data-set-status]'), function (btn) {
      btn.addEventListener('click', function () { setStatus(item.id, btn.dataset.setStatus, btn); });
    });

    var postReplyBtn = document.getElementById('postReplyBtn');
    if (postReplyBtn) {
      postReplyBtn.addEventListener('click', function () {
        var ta = document.getElementById('replyText');
        var val = ta.value.trim();
        var errEl = document.getElementById('replyError');
        if (!val) {
          errEl.textContent = 'Please write a note before adding it.';
          errEl.classList.remove('hidden');
          ta.focus();
          return;
        }
        postReplyBtn.disabled = true;
        postReplyBtn.textContent = 'Posting…';
        postNote(item.id, val, function () {
          postReplyBtn.disabled = false;
          postReplyBtn.textContent = 'Add Note';
        });
      });
    }

    var suggestEditToggle = detailEl.querySelector('.suggest-edit-toggle');
    if (suggestEditToggle) {
      suggestEditToggle.addEventListener('click', function () {
        var card = detailEl.querySelector('.detail-body .thread-item');
        card.querySelector('.thread-text').hidden = true;
        var form = card.querySelector('.suggest-edit-form');
        form.hidden = false;
        form.querySelector('.suggest-edit-title').focus();
      });
    }
    var suggestEditCancel = detailEl.querySelector('.suggest-edit-cancel');
    if (suggestEditCancel) {
      suggestEditCancel.addEventListener('click', function () {
        var form = suggestEditCancel.closest('.suggest-edit-form');
        form.hidden = true;
        form.closest('.thread-item').querySelector('.thread-text').hidden = false;
      });
    }
    var suggestEditForm = detailEl.querySelector('.suggest-edit-form');
    if (suggestEditForm) {
      suggestEditForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var title = suggestEditForm.querySelector('.suggest-edit-title').value.trim();
        if (!title) return;
        var description = suggestEditForm.querySelector('.suggest-edit-desc').value.trim();
        var submitBtn = suggestEditForm.querySelector('.suggest-edit-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
        db.from('suggestions').update({ title: title, description: description || null })
          .eq('id', suggestEditForm.dataset.id).then(function (res) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';
            if (res.error) {
              showMessage('Could not save your edit: ' + res.error.message, 'error');
              return;
            }
            hideMessage();
            loadSuggestions();
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
        db.from('suggestion_comments').update({ body: body }).eq('id', form.dataset.id).then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save';
          if (res.error) {
            showMessage('Could not save your edit: ' + res.error.message, 'error');
            return;
          }
          hideMessage();
          loadSuggestionComments();
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

  function postNote(suggestionId, body, done) {
    db.from('suggestion_comments').insert({
      suggestion_id: suggestionId,
      author_id: currentUser.id,
      author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      author_email: currentUser.email,
      body: body
    }).then(function (res) {
      done();
      if (res.error) {
        showMessage('Could not post note: ' + res.error.message, 'error');
        return;
      }
      hideMessage();
      loadSuggestionNotes();
    });
  }

  function setStatus(id, status, btn) {
    btn.disabled = true;
    db.from('suggestions').update({
      status: status,
      actioned_by_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      actioned_by_email: currentUser.email,
      actioned_at: new Date().toISOString()
    }).eq('id', id).then(function (res) {
      if (res.error) {
        btn.disabled = false;
        showMessage('Could not update: ' + res.error.message, 'error');
        return;
      }
      hideMessage();
      loadSuggestions();
    });
  }

  function loadSuggestionNotes() {
    var ids = suggestions.map(function (s) { return s.id; });
    if (!ids.length) {
      notesBySuggestion = {};
      renderAll();
      return;
    }
    db.from('suggestion_comments').select('*').in('suggestion_id', ids)
      .order('created_at', { ascending: true })
      .then(function (res) {
        if (res.error) {
          showMessage('Notes are unavailable right now: ' + res.error.message, 'error');
          return;
        }
        notesBySuggestion = {};
        (res.data || []).forEach(function (n) {
          (notesBySuggestion[n.suggestion_id] = notesBySuggestion[n.suggestion_id] || []).push(n);
        });
        renderAll();
      });
  }

  function loadSuggestions() {
    // Everyone sees every suggestion — a public wishlist, not a private inbox
    // (matches suggestions_setup.sql's RLS: select using (true) for any signed-in role).
    db.from('suggestions').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        showMessage('Suggestions are unavailable right now: ' + res.error.message, 'error');
        return;
      }
      suggestions = res.data || [];
      loadSuggestionNotes();
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
  var composeTitleInput = document.getElementById('composeTitleInput');
  var composeText = document.getElementById('composeText');
  var composeError = document.getElementById('composeError');
  var composeSubmit = document.getElementById('composeSubmit');

  composePage.innerHTML = '<option value="">General (not tied to a page)</option>' +
    PAGE_LABELS.map(function (label) { return '<option value="' + escapeHtml(label) + '">' + escapeHtml(label) + '</option>'; }).join('');

  function showComposeError(msg) {
    composeError.textContent = msg;
    composeError.classList.remove('hidden');
  }
  function resetComposeError() { composeError.classList.add('hidden'); }

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
    var title = composeTitleInput.value.trim();
    if (!title) { showComposeError('Please enter a short title.'); return; }

    composeSubmit.disabled = true;
    composeSubmit.textContent = 'Submitting…';

    db.from('suggestions').insert({
      requester_id: currentUser.id,
      requester_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
      requester_email: currentUser.email,
      page_context: composePage.value || null,
      title: title,
      description: composeText.value.trim() || null
    }).then(function (res) {
      composeSubmit.disabled = false;
      composeSubmit.textContent = 'Submit';
      if (res.error) {
        showComposeError('Could not submit: ' + res.error.message);
        return;
      }
      composeTitleInput.value = '';
      composeText.value = '';
      composePage.selectedIndex = 0;
      resetComposeError();
      compose.classList.add('hidden');
      loadSuggestions();
    });
  });

  /* Drag-to-resize dividers — see Comments Widget/dashboard.js for the reasoning. */
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
      isAdmin = role === 'admin';
      var canComment = role === 'admin' || role === 'editor' || role === 'commenter';
      var commentsTab = document.getElementById('commentsTab');
      if (commentsTab && !canComment) commentsTab.style.display = 'none';
      loadSuggestions(); // open to every role — no redirect gate here
    });
  });
})();
