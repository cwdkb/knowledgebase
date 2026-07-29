// Knowledge Base — shared suggestions/requests widget (used on every KB page, incl. the hub).
// Open to every role, including 'member' — this is the request channel for staff who
// can't post comments (see Comments Widget), so they can still ask for a new section or
// topic to be added. Plain script (not type="module") — see Comments Widget/comments-widget.js
// for why. Injects its own DOM (button + slide-in panel), same self-injecting pattern.

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

  var PAGE_ID = document.body.dataset.kbPage;
  var PAGE_TITLE = document.title.split('—')[0].trim() || document.title;

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

  function statusBadge(status) {
    if (status === 'added') return '<span class="badge badge-resolved">Added</span>';
    if (status === 'declined') return '<span class="badge badge-declined">Declined</span>';
    return '<span class="badge badge-audit">Pending</span>';
  }

  function buildDom() {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'kbSuggestToggle';
    toggle.className = 'kb-suggest-toggle';
    toggle.setAttribute('aria-label', 'Open suggestions');
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"></path></svg>';

    var overlay = document.createElement('div');
    overlay.id = 'kbSuggestOverlay';
    overlay.className = 'kb-suggest-overlay';

    var panel = document.createElement('div');
    panel.id = 'kbSuggestPanel';
    panel.className = 'kb-suggest-panel';
    panel.innerHTML =
      '<div class="kb-suggest-header">' +
        '<div>' +
          '<span class="kb-suggest-eyebrow">Suggestions</span>' +
          '<h3>Request a new section or topic</h3>' +
        '</div>' +
        '<button type="button" id="kbSuggestClose" class="kb-suggest-close" aria-label="Close suggestions">&times;</button>' +
      '</div>' +
      '<div class="kb-suggest-message" id="kbSuggestMessage"></div>' +
      '<form class="kb-suggest-form" id="kbSuggestForm">' +
        '<input type="text" id="kbSuggestTitle" placeholder="What should we add? (short title)" required maxlength="120">' +
        '<textarea id="kbSuggestDesc" placeholder="Any more detail? (optional)"></textarea>' +
        '<button type="submit" id="kbSuggestSubmit">Submit suggestion</button>' +
      '</form>' +
      '<div class="kb-suggest-list" id="kbSuggestList"><div class="kb-suggest-empty">Loading…</div></div>';

    var hint = document.createElement('div');
    hint.id = 'kbSuggestHint';
    hint.className = 'kb-suggest-hint';
    hint.innerHTML =
      '<span>Have suggestions? Click this button.</span>' +
      '<button type="button" class="kb-hint-close" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(hint);

    return { toggle: toggle, overlay: overlay, panel: panel, hint: hint };
  }

  function init() {
    var dom = buildDom();

    var messageEl = document.getElementById('kbSuggestMessage');
    function showMessage(text, type) {
      messageEl.textContent = text;
      messageEl.className = 'kb-suggest-message show kb-suggest-message-' + type;
    }
    function clearMessage() {
      messageEl.className = 'kb-suggest-message';
      messageEl.textContent = '';
    }

    var currentUser = null;
    var isAdmin = false;
    var suggestions = [];
    var repliesBySuggestion = {};

    function openPanel() {
      dom.panel.classList.add('open');
      dom.overlay.classList.add('open');
      loadSuggestions();
    }
    function closePanel() {
      dom.panel.classList.remove('open');
      dom.overlay.classList.remove('open');
    }

    // Keyed per signed-in user, not just per-browser — otherwise one account dismissing
    // it hides it forever for every other account that later logs into the same browser
    // (e.g. Kate testing her own account then Marie's on the same machine).
    function hintKey() {
      return 'cwd-suggest-hint-dismissed:' + (currentUser ? currentUser.id : 'anon');
    }
    function dismissHint() {
      dom.hint.classList.remove('show');
      window.localStorage.setItem(hintKey(), '1');
    }
    dom.hint.querySelector('.kb-hint-close').addEventListener('click', dismissHint);

    dom.toggle.addEventListener('click', function () {
      dismissHint();
      openPanel();
    });
    dom.overlay.addEventListener('click', closePanel);
    document.getElementById('kbSuggestClose').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    function renderReply(c) {
      var editBtn = (currentUser && c.author_id === currentUser.id)
        ? '<button type="button" class="kb-note-edit-toggle" data-id="' + c.id + '">Edit</button>'
        : '';
      return (
        '<div class="kb-suggest-reply">' +
          '<div class="kb-suggest-reply-meta">' +
            '<span class="kb-suggest-reply-author">' + escapeHtml(c.author_name) + '</span>' +
            '<span class="kb-suggest-reply-date">' + formatDate(c.created_at) + '</span>' +
          '</div>' +
          '<p class="kb-suggest-reply-body" data-id="' + c.id + '">' + escapeHtml(c.body).replace(/\n/g, '<br>') + '</p>' +
          '<form class="kb-note-edit-form" data-id="' + c.id + '" hidden>' +
            '<textarea required>' + escapeHtml(c.body) + '</textarea>' +
            '<div class="kb-note-edit-form-btns">' +
              '<button type="submit" class="kb-note-edit-submit">Save</button>' +
              '<button type="button" class="kb-note-edit-cancel">Cancel</button>' +
            '</div>' +
          '</form>' +
          '<div class="kb-suggest-reply-footer">' + editBtn + '</div>' +
        '</div>'
      );
    }

    function renderList() {
      var listEl = document.getElementById('kbSuggestList');
      if (!suggestions.length) {
        listEl.innerHTML = '<div class="kb-suggest-empty">No suggestions yet — be the first!</div>';
        return;
      }
      listEl.innerHTML = suggestions.map(function (s) {
        var actions = '';
        if (isAdmin) {
          actions =
            '<div class="kb-suggest-actions">' +
              (s.status !== 'added' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="added">Mark added</button>' : '') +
              (s.status !== 'declined' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="declined">Decline</button>' : '') +
              (s.status !== 'pending' ? '<button type="button" class="kb-suggest-action" data-id="' + s.id + '" data-status="pending">Reopen</button>' : '') +
            '</div>';
        }
        var replies = repliesBySuggestion[s.id] || [];
        var repliesHtml = replies.length
          ? '<div class="kb-suggest-replies">' + replies.map(renderReply).join('') + '</div>'
          : '';
        var isOwn = currentUser && s.requester_id === currentUser.id;
        var editBtn = isOwn ? '<button type="button" class="kb-suggest-edit-toggle" data-id="' + s.id + '">Edit</button>' : '';
        return (
          '<div class="kb-suggest-item">' +
            '<div class="kb-suggest-meta">' +
              '<span class="kb-suggest-author">' + escapeHtml(s.requester_name) + '</span>' +
              '<span class="kb-suggest-date">' + formatDate(s.created_at) + '</span>' +
            '</div>' +
            '<p class="kb-suggest-body" data-id="' + s.id + '"><strong>' + escapeHtml(s.title) + '</strong>' +
              (s.description ? '<br>' + escapeHtml(s.description) : '') +
            '</p>' +
            '<form class="kb-suggest-edit-form" data-id="' + s.id + '" hidden>' +
              '<input type="text" class="kb-suggest-edit-title" value="' + escapeHtml(s.title) + '" required maxlength="120">' +
              '<textarea class="kb-suggest-edit-desc">' + escapeHtml(s.description || '') + '</textarea>' +
              '<div class="kb-suggest-edit-form-btns">' +
                '<button type="submit" class="kb-suggest-edit-submit">Save</button>' +
                '<button type="button" class="kb-suggest-edit-cancel">Cancel</button>' +
              '</div>' +
            '</form>' +
            '<div class="kb-suggest-footer">' + statusBadge(s.status) + '<button type="button" class="kb-reply-toggle" data-id="' + s.id + '">Reply</button>' + editBtn + '</div>' +
            actions +
            repliesHtml +
            '<form class="kb-reply-form" data-id="' + s.id + '" hidden>' +
              '<textarea placeholder="Write a reply…" required></textarea>' +
              '<button type="submit" class="kb-reply-submit">Post Reply</button>' +
            '</form>' +
          '</div>'
        );
      }).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-suggest-action'), function (btn) {
        btn.addEventListener('click', function () {
          setStatus(btn.dataset.id, btn.dataset.status);
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-reply-toggle'), function (btn) {
        btn.addEventListener('click', function () {
          var form = btn.closest('.kb-suggest-item').querySelector('.kb-reply-form');
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
          postSuggestionReply(form.dataset.id, body, function () {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Reply';
          });
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-suggest-edit-toggle'), function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.kb-suggest-item');
          item.querySelector('.kb-suggest-body').hidden = true;
          var form = item.querySelector('.kb-suggest-edit-form');
          form.hidden = false;
          form.querySelector('.kb-suggest-edit-title').focus();
        });
      });
      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-suggest-edit-cancel'), function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.kb-suggest-item');
          item.querySelector('.kb-suggest-edit-form').hidden = true;
          item.querySelector('.kb-suggest-body').hidden = false;
        });
      });
      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-suggest-edit-form'), function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var title = form.querySelector('.kb-suggest-edit-title').value.trim();
          if (!title) return;
          var description = form.querySelector('.kb-suggest-edit-desc').value.trim();
          var submitBtn = form.querySelector('.kb-suggest-edit-submit');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
          db.from('suggestions').update({ title: title, description: description || null })
            .eq('id', form.dataset.id).then(function (res) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Save';
              if (res.error) {
                showMessage('Could not save your edit: ' + res.error.message, 'error');
                return;
              }
              clearMessage();
              loadSuggestions();
            });
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-note-edit-toggle'), function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.kb-suggest-reply');
          card.querySelector('.kb-suggest-reply-body').hidden = true;
          var form = card.querySelector('.kb-note-edit-form');
          form.hidden = false;
          form.querySelector('textarea').focus();
        });
      });
      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-note-edit-cancel'), function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.kb-suggest-reply');
          card.querySelector('.kb-note-edit-form').hidden = true;
          card.querySelector('.kb-suggest-reply-body').hidden = false;
        });
      });
      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-note-edit-form'), function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var textarea = form.querySelector('textarea');
          var body = textarea.value.trim();
          if (!body) return;
          var submitBtn = form.querySelector('.kb-note-edit-submit');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
          db.from('suggestion_comments').update({ body: body }).eq('id', form.dataset.id).then(function (res) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';
            if (res.error) {
              showMessage('Could not save your edit: ' + res.error.message, 'error');
              return;
            }
            clearMessage();
            loadSuggestionComments();
          });
        });
      });
    }

    function postSuggestionReply(suggestionId, body, done) {
      db.from('suggestion_comments').insert({
        suggestion_id: suggestionId,
        author_id: currentUser.id,
        author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
        author_email: currentUser.email,
        body: body
      }).then(function (res) {
        done();
        if (res.error) {
          showMessage('Could not post your reply: ' + res.error.message, 'error');
          return;
        }
        loadSuggestionComments();
      });
    }

    function loadSuggestionComments() {
      var ids = suggestions.map(function (s) { return s.id; });
      if (!ids.length) {
        repliesBySuggestion = {};
        renderList();
        return;
      }
      db.from('suggestion_comments').select('*').in('suggestion_id', ids)
        .order('created_at', { ascending: true })
        .then(function (res) {
          repliesBySuggestion = {};
          (res.data || []).forEach(function (c) {
            (repliesBySuggestion[c.suggestion_id] = repliesBySuggestion[c.suggestion_id] || []).push(c);
          });
          renderList();
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
          showMessage('Could not update that suggestion: ' + res.error.message, 'error');
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
          if (res.error) {
            document.getElementById('kbSuggestList').innerHTML =
              '<div class="kb-suggest-empty">Suggestions are unavailable right now.</div>';
            return;
          }
          suggestions = res.data || [];
          loadSuggestionComments();
        });
    }

    document.getElementById('kbSuggestForm').addEventListener('submit', function (e) {
      e.preventDefault();
      clearMessage();
      var titleInput = document.getElementById('kbSuggestTitle');
      var descInput = document.getElementById('kbSuggestDesc');
      var title = titleInput.value.trim();
      if (!title || !currentUser) return;

      var submitBtn = document.getElementById('kbSuggestSubmit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      db.from('suggestions').insert({
        requester_id: currentUser.id,
        requester_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
        requester_email: currentUser.email,
        page_context: PAGE_ID ? PAGE_TITLE : null,
        title: title,
        description: descInput.value.trim() || null
      }).then(function (res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit suggestion';
        if (res.error) {
          showMessage('Could not submit your suggestion: ' + res.error.message, 'error');
          return;
        }
        titleInput.value = '';
        descInput.value = '';
        loadSuggestions();
      });
    });

    db.auth.getSession().then(function (res) {
      var session = res.data.session;
      if (!session) return; // auth-guard already redirects logged-out visitors before this runs
      currentUser = session.user;

      if (!window.localStorage.getItem(hintKey())) dom.hint.classList.add('show');

      db.from('profiles').select('role').eq('id', currentUser.id).single().then(function (profileRes) {
        isAdmin = !!(profileRes.data && profileRes.data.role === 'admin');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
