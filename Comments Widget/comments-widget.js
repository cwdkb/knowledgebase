// Knowledge Base — shared comments widget (used on every KB page, incl. the hub).
// Plain script (not type="module") on purpose: these pages are often opened directly as
// local files (file://), and browsers block ES module cross-origin imports in that context.
// Loaded after the Supabase UMD script, which exposes a global `supabase.createClient`.
// Injects its own DOM (button + slide-in panel) — no markup needed on the page itself
// beyond the <link>/<script> includes and a `data-kb-page` id on <body>.
//
// Supports two kinds of comments:
//  - page-level (anchor_id null) — general notes about the whole page
//  - pinned (anchor_id set) — tied to a specific `.stage-detail` block (a checklist item,
//    SOP card, etc.), via a small pin button injected into that block's <summary>

(function () {
  if (typeof supabase === 'undefined') return;

  var SUPABASE_URL = 'https://eqhmgihlspqmcrnfgrrx.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1fFK3XlKY1EsdWyPpKEkeA_l5BAk4vz';
  var REMEMBER_FLAG = 'cwd-remember-me';

  function activeStorage() {
    return window.localStorage.getItem(REMEMBER_FLAG) === '0' ? window.sessionStorage : window.localStorage;
  }

  // Reuse auth-guard.js's client instead of creating a second one — multiple
  // GoTrueClient instances sharing the same storage key race each other and
  // cause intermittent auth/session bugs (Supabase warns about this directly).
  var db = window.cwdKbAuth || supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function truncate(str, maxLen) {
    var clean = String(str).replace(/\s+/g, ' ').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen).trim() + '…' : clean;
  }

  function getAnchorLabel(summaryEl) {
    var clone = summaryEl.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('.badge'), function (b) { b.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function computeAnchor(detailsEl) {
    var summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return null;
    var label = getAnchorLabel(summary);
    if (!label) return null;
    var section = detailsEl.closest('section[id]');
    var sectionId = section ? section.id : 'page';
    return { id: sectionId + '__' + slugify(label), label: label };
  }

  function buildDom() {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'kbCommentsToggle';
    toggle.className = 'kb-comments-toggle';
    toggle.hidden = true; // revealed once we confirm the signed-in user's role allows commenting
    toggle.setAttribute('aria-label', 'Open comments');
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
      '<span class="kb-comments-count" id="kbCommentsCount" hidden>0</span>';

    var overlay = document.createElement('div');
    overlay.id = 'kbCommentsOverlay';
    overlay.className = 'kb-comments-overlay';

    var panel = document.createElement('div');
    panel.id = 'kbCommentsPanel';
    panel.className = 'kb-comments-panel';
    panel.innerHTML =
      '<div class="kb-comments-header">' +
        '<div>' +
          '<span class="kb-comments-eyebrow">Comments</span>' +
          '<h3 id="kbCommentsPageTitle"></h3>' +
        '</div>' +
        '<button type="button" id="kbCommentsClose" class="kb-comments-close" aria-label="Close comments">&times;</button>' +
      '</div>' +
      '<div class="kb-comments-message" id="kbCommentsMessage"></div>' +
      '<div class="kb-comments-list" id="kbCommentsList"><div class="kb-comments-empty">Loading…</div></div>' +
      '<form class="kb-comments-form" id="kbCommentsForm">' +
        '<div class="kb-comments-chip" id="kbCommentsChip" hidden></div>' +
        '<textarea id="kbCommentsInput" placeholder="Leave a note or revision request for Kate…" required></textarea>' +
        '<button type="submit" id="kbCommentsSubmit">Add comment</button>' +
      '</form>';

    var hint = document.createElement('div');
    hint.id = 'kbCommentsHint';
    hint.className = 'kb-comments-hint';
    hint.innerHTML =
      '<span>Got revisions? Click this button.</span>' +
      '<button type="button" class="kb-hint-close" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(hint);

    return { toggle: toggle, overlay: overlay, panel: panel, hint: hint };
  }

  // Jumping here from a dashboard's clickable section link lands on `#sectionId__slug`
  // — that's a data-kb-anchor-id value, not a real element id, so the browser's own
  // hash-scroll does nothing on its own. Open the matching `.stage-detail` and scroll
  // to it manually. Only reachable once injectPins() has tagged the blocks (below),
  // which only happens once the signed-in user's role clears the EXCLUDED_ROLES check.
  function scrollToAnchorFromHash() {
    var raw = window.location.hash ? window.location.hash.slice(1) : '';
    if (!raw) return;
    var hash;
    try { hash = decodeURIComponent(raw); } catch (e) { hash = raw; }
    var target = document.querySelector('.stage-detail[data-kb-anchor-id="' + hash.replace(/"/g, '\\"') + '"]');
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.style.transition = 'box-shadow 0.3s ease';
    target.style.boxShadow = '0 0 0 3px rgba(47,74,156,0.35)';
    setTimeout(function () { target.style.boxShadow = ''; }, 2500);
  }

  function injectPins() {
    var blocks = document.querySelectorAll('.stage-detail');
    Array.prototype.forEach.call(blocks, function (block) {
      var anchor = computeAnchor(block);
      if (!anchor) return;
      block.dataset.kbAnchorId = anchor.id;

      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'kb-pin-btn';
      pin.title = 'Comment on this item';
      pin.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
        '<span class="kb-pin-count" hidden></span>';
      pin.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.__kbOpenCommentsForAnchor(anchor.id, anchor.label);
      });
      block.querySelector(':scope > summary').appendChild(pin);
    });
  }

  function init() {
    if (!PAGE_ID) return;

    var dom = buildDom();
    document.getElementById('kbCommentsPageTitle').textContent = PAGE_TITLE;
    // Pin buttons are only injected once we know the signed-in user's role isn't in
    // EXCLUDED_ROLES (see the auth/profile check below).

    var messageEl = document.getElementById('kbCommentsMessage');
    function showMessage(text, type) {
      messageEl.textContent = text;
      messageEl.className = 'kb-comments-message show kb-comments-message-' + type;
    }
    function clearMessage() {
      messageEl.className = 'kb-comments-message';
      messageEl.textContent = '';
    }

    var currentUser = null;
    var isAdmin = false;
    var comments = [];
    var activeAnchor = null;
    var openThreadIds = {}; // thread id -> true while expanded; collapsed by default, kept in sync via the <details> toggle event
    var pendingOpenAnchorId = null; // set when a pin button asks us to jump to + expand a specific thread

    function renderComposeChip() {
      var chip = document.getElementById('kbCommentsChip');
      if (activeAnchor) {
        chip.hidden = false;
        chip.innerHTML = '<span>📍 ' + escapeHtml(activeAnchor.label) + '</span><button type="button" id="kbCommentsChipClear">&times;</button>';
        document.getElementById('kbCommentsChipClear').addEventListener('click', function () {
          activeAnchor = null;
          renderComposeChip();
        });
      } else {
        chip.hidden = true;
        chip.innerHTML = '';
      }
    }

    function openPanel() {
      dom.panel.classList.add('open');
      dom.overlay.classList.add('open');
      loadComments();
    }
    function closePanel() {
      dom.panel.classList.remove('open');
      dom.overlay.classList.remove('open');
    }

    window.__kbOpenCommentsForAnchor = function (id, label) {
      activeAnchor = { id: id, label: label };
      pendingOpenAnchorId = id;
      renderComposeChip();
      openPanel();
    };

    // Keyed per signed-in user, not just per-browser — otherwise one account dismissing
    // it hides it forever for every other account that later logs into the same browser
    // (e.g. Kate testing her own account then Marie's on the same machine).
    function hintKey() {
      return 'cwd-comments-hint-dismissed:' + (currentUser ? currentUser.id : 'anon');
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
    document.getElementById('kbCommentsClose').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    function updateCount() {
      var unresolved = comments.filter(function (c) { return !c.parent_id && !c.resolved; }).length;
      var countEl = document.getElementById('kbCommentsCount');
      if (unresolved > 0) {
        countEl.textContent = unresolved;
        countEl.hidden = false;
      } else {
        countEl.hidden = true;
      }
    }

    function updatePinBadges() {
      var counts = {};
      comments.forEach(function (c) {
        if (c.anchor_id) counts[c.anchor_id] = (counts[c.anchor_id] || 0) + 1;
      });
      Array.prototype.forEach.call(document.querySelectorAll('.stage-detail[data-kb-anchor-id]'), function (block) {
        var countEl = block.querySelector('.kb-pin-count');
        if (!countEl) return;
        var n = counts[block.dataset.kbAnchorId];
        if (n) {
          countEl.textContent = n;
          countEl.hidden = false;
        } else {
          countEl.hidden = true;
        }
      });
    }

    // One level of threading: replies group under their parent comment via parent_id.
    // A reply's own parent_id is always null, enforced by only ever showing the Reply
    // control on top-level comments.
    function buildThreads(list) {
      var byId = {};
      var roots = [];
      list.forEach(function (c) { byId[c.id] = c; c.replies = []; });
      list.forEach(function (c) {
        if (c.parent_id && byId[c.parent_id]) {
          byId[c.parent_id].replies.push(c);
        } else if (!c.parent_id) {
          roots.push(c);
        }
      });
      roots.forEach(function (r) {
        r.replies.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
      });
      return roots;
    }

    // skipHeader: true for a root comment rendered inside a <details> thread — the
    // <summary> row already shows author/date/status, so repeating them here would
    // just double up the same info right below where it's already visible.
    function renderCommentCard(c, isReply, skipHeader) {
      var resolvedTag = (!isReply && !skipHeader)
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
      var editToggle = (currentUser && c.author_id === currentUser.id)
        ? '<button type="button" class="kb-edit-toggle" data-id="' + c.id + '">Edit</button>'
        : '';
      var anchorTag = (!isReply && c.anchor_label)
        ? '<div class="kb-comment-anchor">📍 ' + escapeHtml(c.anchor_label) + '</div>'
        : '';
      var metaHtml = skipHeader ? '' : (
        '<div class="kb-comment-meta">' +
          '<span class="kb-comment-author">' + escapeHtml(c.author_name) + '</span>' +
          '<span class="kb-comment-date">' + formatDate(c.created_at) + '</span>' +
        '</div>'
      );
      return (
        '<div class="kb-comment' + (!isReply && c.resolved ? ' resolved' : '') + (isReply ? ' kb-comment-reply' : '') + '">' +
          anchorTag +
          metaHtml +
          '<p class="kb-comment-body" data-id="' + c.id + '">' + escapeHtml(c.body).replace(/\n/g, '<br>') + '</p>' +
          '<form class="kb-edit-form" data-id="' + c.id + '" hidden>' +
            '<textarea required>' + escapeHtml(c.body) + '</textarea>' +
            '<div class="kb-edit-form-btns">' +
              '<button type="submit" class="kb-edit-submit">Save</button>' +
              '<button type="button" class="kb-edit-cancel">Cancel</button>' +
            '</div>' +
          '</form>' +
          '<div class="kb-comment-footer">' + resolvedTag + actionBtn + replyToggle + editToggle + '</div>' +
        '</div>'
      );
    }

    function renderThread(root) {
      var replyCount = root.replies.length;
      var repliesHtml = replyCount
        ? '<div class="kb-comment-replies">' + root.replies.map(function (r) { return renderCommentCard(r, true); }).join('') + '</div>'
        : '';
      var badge = root.resolved
        ? '<span class="badge badge-resolved">Actioned</span>'
        : '<span class="badge badge-audit">Open</span>';
      var isOpen = !!openThreadIds[root.id];
      return (
        '<details class="kb-comment-thread" data-thread-id="' + root.id + '"' + (isOpen ? ' open' : '') + '>' +
          '<summary class="kb-comment-summary">' +
            '<span class="kb-comment-summary-line">' +
              (root.anchor_label ? '<span class="kb-comment-summary-pin" title="' + escapeHtml(root.anchor_label) + '">📍</span>' : '') +
              '<span class="kb-comment-summary-author">' + escapeHtml(root.author_name) + '</span>' +
              '<span class="kb-comment-summary-snippet">' + escapeHtml(truncate(root.body, 60)) + '</span>' +
            '</span>' +
            '<span class="kb-comment-summary-meta">' +
              badge +
              (replyCount ? '<span class="kb-comment-reply-count">' + replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') + '</span>' : '') +
              '<span class="kb-comment-summary-date">' + formatDate(root.created_at) + '</span>' +
            '</span>' +
          '</summary>' +
          '<div class="kb-comment-thread-body">' +
            renderCommentCard(root, false, true) +
            repliesHtml +
            '<form class="kb-reply-form" data-parent-id="' + root.id + '" hidden>' +
              '<textarea placeholder="Write a reply…" required></textarea>' +
              '<button type="submit" class="kb-reply-submit">Post Reply</button>' +
            '</form>' +
          '</div>' +
        '</details>'
      );
    }

    function renderComments() {
      var listEl = document.getElementById('kbCommentsList');
      var threads = buildThreads(comments);
      if (!threads.length) {
        listEl.innerHTML = '<div class="kb-comments-empty">No comments yet on this page.</div>';
        return;
      }
      listEl.innerHTML = threads.map(renderThread).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-comment-thread'), function (details) {
        details.addEventListener('toggle', function () {
          if (details.open) {
            openThreadIds[details.dataset.threadId] = true;
          } else {
            delete openThreadIds[details.dataset.threadId];
          }
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-comments-resolve'), function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.dataset.id;
          var nowResolved = btn.dataset.resolved !== 'true';
          setResolved(id, nowResolved);
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

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-edit-toggle'), function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.kb-comment');
          card.querySelector('.kb-comment-body').hidden = true;
          var form = card.querySelector('.kb-edit-form');
          form.hidden = false;
          var textarea = form.querySelector('textarea');
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-edit-cancel'), function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.kb-comment');
          card.querySelector('.kb-edit-form').hidden = true;
          card.querySelector('.kb-comment-body').hidden = false;
        });
      });

      Array.prototype.forEach.call(listEl.querySelectorAll('.kb-edit-form'), function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var textarea = form.querySelector('textarea');
          var body = textarea.value.trim();
          if (!body) return;
          var submitBtn = form.querySelector('.kb-edit-submit');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
          db.from('comments').update({ body: body }).eq('id', form.dataset.id).then(function (res) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';
            if (res.error) {
              showMessage('Could not save your edit: ' + res.error.message, 'error');
              return;
            }
            loadComments();
          });
        });
      });
    }

    function postReply(parentId, body, done) {
      var parent = comments.filter(function (c) { return c.id === parentId; })[0];
      db.from('comments').insert({
        page_id: PAGE_ID,
        page_title: PAGE_TITLE,
        anchor_id: parent ? parent.anchor_id : null,
        anchor_label: parent ? parent.anchor_label : null,
        parent_id: parentId,
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
          showMessage('Could not update that comment: ' + res.error.message, 'error');
          return;
        }
        loadComments();
      });
    }

    function loadComments() {
      db.from('comments')
        .select('*')
        .eq('page_id', PAGE_ID)
        .order('created_at', { ascending: false })
        .then(function (res) {
          if (res.error) {
            document.getElementById('kbCommentsList').innerHTML =
              '<div class="kb-comments-empty">Comments are unavailable right now.</div>';
            return;
          }
          comments = res.data || [];
          if (pendingOpenAnchorId) {
            comments.forEach(function (c) {
              if (!c.parent_id && c.anchor_id === pendingOpenAnchorId) openThreadIds[c.id] = true;
            });
            pendingOpenAnchorId = null;
          }
          renderComments();
          updateCount();
          updatePinBadges();
        });
    }

    document.getElementById('kbCommentsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      clearMessage();
      var input = document.getElementById('kbCommentsInput');
      var body = input.value.trim();
      if (!body || !currentUser) return;

      var submitBtn = document.getElementById('kbCommentsSubmit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';

      db.from('comments').insert({
        page_id: PAGE_ID,
        page_title: PAGE_TITLE,
        anchor_id: activeAnchor ? activeAnchor.id : null,
        anchor_label: activeAnchor ? activeAnchor.label : null,
        author_id: currentUser.id,
        author_name: (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email,
        author_email: currentUser.email,
        body: body
      }).then(function (res) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add comment';
        if (res.error) {
          showMessage('Could not post your comment: ' + res.error.message, 'error');
          return;
        }
        input.value = '';
        loadComments();
      });
    });

    function revealCommentsUI() {
      dom.toggle.hidden = false;
      if (!window.localStorage.getItem(hintKey())) dom.hint.classList.add('show');
      injectPins();
      scrollToAnchorFromHash();
      loadComments(); // load once up front so the unresolved-count badge + pin counts are accurate before opening
    }

    db.auth.getSession().then(function (res) {
      var session = res.data.session;
      if (!session) return; // auth-guard already redirects logged-out visitors before this runs
      currentUser = session.user;

      db.from('profiles').select('role').eq('id', currentUser.id).single().then(function (profileRes) {
        var role = profileRes.data && profileRes.data.role;
        isAdmin = role === 'admin';
        var EXCLUDED_ROLES = []; // roles listed here never see the comments bubble; everyone else does
        if (EXCLUDED_ROLES.indexOf(role) !== -1) return;

        revealCommentsUI();
      }).catch(function () {
        // role lookup failed (network hiccup, cold session, etc.) — fail open so the
        // bubble still shows instead of silently staying hidden for the whole page load.
        revealCommentsUI();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
