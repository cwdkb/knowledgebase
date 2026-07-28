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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
      '<div class="kb-comments-list" id="kbCommentsList"><div class="kb-comments-empty">Loading…</div></div>' +
      '<form class="kb-comments-form" id="kbCommentsForm">' +
        '<div class="kb-comments-chip" id="kbCommentsChip" hidden></div>' +
        '<textarea id="kbCommentsInput" placeholder="Leave a note or revision request for Kate…" required></textarea>' +
        '<button type="submit" id="kbCommentsSubmit">Add comment</button>' +
      '</form>';

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    return { toggle: toggle, overlay: overlay, panel: panel };
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
    injectPins();

    var currentUser = null;
    var isAdmin = false;
    var comments = [];
    var activeAnchor = null;

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
      renderComposeChip();
      openPanel();
    };

    dom.toggle.addEventListener('click', function () {
      openPanel();
    });
    dom.overlay.addEventListener('click', closePanel);
    document.getElementById('kbCommentsClose').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    function updateCount() {
      var unresolved = comments.filter(function (c) { return !c.resolved; }).length;
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

    function renderComments() {
      var listEl = document.getElementById('kbCommentsList');
      if (!comments.length) {
        listEl.innerHTML = '<div class="kb-comments-empty">No comments yet on this page.</div>';
        return;
      }
      listEl.innerHTML = comments.map(function (c) {
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
          var nowResolved = btn.dataset.resolved !== 'true';
          setResolved(id, nowResolved);
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
        if (res.error) return;
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
          renderComments();
          updateCount();
          updatePinBadges();
        });
    }

    document.getElementById('kbCommentsForm').addEventListener('submit', function (e) {
      e.preventDefault();
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
        if (res.error) return;
        input.value = '';
        loadComments();
      });
    });

    db.auth.getSession().then(function (res) {
      var session = res.data.session;
      if (!session) return; // auth-guard already redirects logged-out visitors before this runs
      currentUser = session.user;

      db.from('profiles').select('role').eq('id', currentUser.id).single().then(function (profileRes) {
        isAdmin = !!(profileRes.data && profileRes.data.role === 'admin');
        loadComments(); // load once up front so the unresolved-count badge + pin counts are accurate before opening
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
