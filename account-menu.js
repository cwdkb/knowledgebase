// Knowledge Base — "My Account" pill dropdown, included on every gated KB page.
// Plain script (not type="module") on purpose — see search-widget.js for why.

(function () {
  var trigger = document.getElementById('accountMenuTrigger');
  var panel = document.getElementById('accountMenuPanel');
  if (!trigger || !panel) return;

  function closeMenu() {
    panel.hidden = true;
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    // No offset maths needed: the greeting/stats block is its own row in .sticky-head
    // rather than an absolute overlay hanging under the pill, so nothing sits between
    // the pill and the panel and the stylesheet's top: calc(100% + 10px) is correct.
    panel.hidden = false;
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    if (panel.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !trigger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  var signOutBtn = document.getElementById('accountMenuSignOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function () {
      if (!window.cwdKbAuth) return;
      signOutBtn.disabled = true;
      signOutBtn.textContent = 'Signing out…';
      window.cwdKbAuth.auth.signOut().then(function () {
        window.location.href = window.cwdKbResolveUrl('auth/index.html');
      });
    });
  }

  // Small avatar (photo, or navy/gold initials fallback) shown in the trigger pill
  // itself, left of "My Account" — reuses the same avatar_url metadata field that
  // auth/account.js writes on upload, so no separate storage lookup is needed here.
  function getInitials(user) {
    var name = ((user.user_metadata && user.user_metadata.full_name) || '').trim();
    if (name) {
      var parts = name.split(/\s+/);
      return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
    }
    return (user.email || '?').charAt(0).toUpperCase();
  }

  function renderAvatar(avatarEl, user) {
    var url = user.user_metadata && user.user_metadata.avatar_url;
    if (url) {
      avatarEl.innerHTML = '';
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = getInitials(user);
    }
  }

  // "Hello, Nickname" + a live clock under the My Account pill — shown on every gated
  // page since this script is included everywhere. Time respects the same Eastern/local
  // preference as everything else (see timezone.js).
  if (window.cwdKbAuth) {
    var avatarEl = document.createElement('span');
    avatarEl.className = 'account-avatar';
    trigger.insertBefore(avatarEl, trigger.firstChild);

    var style = document.createElement('style');
    style.textContent =
      // Its own row in .sticky-head (which is flex-direction: column), ordered after
      // .header — NOT inside .account-menu. Two earlier attempts were both wrong:
      // in-flow inside .account-menu made that flex item the tallest in the header row
      // and pushed the pill off the search bar's centerline; absolutely positioned under
      // the pill escaped .sticky-head's box and painted over the page content, and
      // reserving space for it by growing the header's padding on scroll fed layout
      // shifts back into scroll position, which oscillated at the threshold ("shaking").
      // As a sibling row it is in normal flow, so it can never overlap anything, and the
      // header row above it is unaffected.
      // Deliberately plain: static, in normal flow, no transition and nothing that
      // changes size in response to scrolling. Every animated/measured version of this
      // block caused a layout-feedback bug (see the placement comment further down).
      '.account-greeting { position: static; text-align: right; ' +
      'font-family: "Archivo", sans-serif; font-size: 11px; color: #8A8A8A; ' +
      'line-height: 1.4; margin: 8px 0 0; }' +
      '.account-greeting strong { color: #16224A; font-weight: 600; }' +
      '.account-greeting-role { text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; ' +
      'color: #B08D57; }' +
      // Collapsed to a single narrow pill by default — expanded, the two-column breakdown
      // was a wide block sitting under the header on every page for a number you glance at
      // occasionally. The pill shows the totals; open it for the per-status split.
      '.account-stats-wrap { display: inline-block; margin-top: 8px; text-align: left; }' +
      '.account-stats-toggle { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; ' +
      'font-family: "Archivo", sans-serif; font-size: 10.5px; font-weight: 600; color: #5b5748; ' +
      'background: #ffffff; border: 1px solid #eee0c8; border-radius: 999px; padding: 4px 11px; ' +
      'white-space: nowrap; list-style: none; box-shadow: 0 1px 4px rgba(22,34,74,0.05); }' +
      '.account-stats-toggle::-webkit-details-marker { display: none; }' +
      '.account-stats-toggle:hover { border-color: #C9AF7D; color: #16224A; }' +
      '.account-stats-toggle .stats-caret { font-size: 8px; color: #B08D57; transition: transform 0.15s ease; }' +
      '.account-stats-wrap[open] .account-stats-toggle .stats-caret { transform: rotate(180deg); }' +
      '.account-stats-count { font-weight: 700; color: #16224A; font-variant-numeric: tabular-nums; }' +
      '.account-stats { margin-top: 6px; display: flex; gap: 16px; justify-content: flex-end; ' +
      'font-family: "Archivo", sans-serif; background: #ffffff; border: 1px solid #eee0c8; ' +
      'border-radius: 10px; padding: 8px 12px 7px; box-shadow: 0 2px 8px rgba(22,34,74,0.05); }' +
      '.stats-col { display: flex; flex-direction: column; gap: 2px; min-width: 92px; }' +
      '.stats-col-label { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; ' +
      'color: #ADA99C; margin-bottom: 2px; white-space: nowrap; }' +
      '.stats-col-scope { font-weight: 500; text-transform: none; letter-spacing: 0; color: #C6C1B4; }' +
      '.stats-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 11px; }' +
      '.stats-line-name { display: inline-flex; align-items: baseline; gap: 5px; color: #5b5748; }' +
      '.stats-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; ' +
      'transform: translateY(-1px); }' +
      '.stats-line-count { font-weight: 700; color: #16224A; font-variant-numeric: tabular-nums; }' +
      '.stats-total { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; font-weight: 700; ' +
      'color: #16224A; border-top: 1px solid #e7e3d8; margin-top: 3px; padding-top: 3px; }' +
      '.stats-dot.stat-actioned, .stats-dot.stat-approved { background: #57BB8A; }' +
      '.stats-dot.stat-open, .stats-dot.stat-pending { background: #F1C232; }' +
      '.stats-dot.stat-declined { background: #E06666; }' +
      '.stats-dot.stat-archived { background: #B4A7D6; }' +
      '@media (max-width: 680px) {' +
      '.account-stats { flex-direction: column; align-items: flex-end; gap: 8px; }' +
      '}';
    document.head.appendChild(style);

    var greeting = document.createElement('div');
    greeting.className = 'account-greeting';
    greeting.id = 'accountGreeting';
    // Placed AFTER .sticky-head, as its own block in the page's normal flow — not inside
    // the sticky header. Inside it, the block's height became part of what the .scrolled
    // class collapses, and on a short page that shortens the document enough to shrink the
    // scroll range back under sticky-header.js's threshold, which un-collapses, which
    // restores the range, which re-collapses: the header oscillates ("shaking"). Out here
    // the block simply scrolls off the top like any other content — no collapse needed, no
    // effect on the sticky header's height, nothing for the threshold to fight with.
    var stickyHead = document.querySelector('.sticky-head');
    if (stickyHead && stickyHead.parentNode) {
      stickyHead.parentNode.insertBefore(greeting, stickyHead.nextSibling);
    } else {
      trigger.parentNode.insertBefore(greeting, panel);
    }

    function formatTime() {
      var tz = window.cwdTimezone ? window.cwdTimezone.get() : 'America/New_York';
      var opts = { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' };
      if (tz) opts.timeZone = tz;
      return new Date().toLocaleTimeString('en-US', opts);
    }

    window.cwdKbAuth.auth.getSession().then(function (res) {
      var session = res.data.session;
      if (!session) return;
      var user = session.user;
      var fullName = (user.user_metadata && user.user_metadata.full_name) || '';
      var nickname = fullName ? fullName.trim().split(/\s+/)[0] : (user.email || '').split('@')[0];

      renderAvatar(avatarEl, user);

      var helloLine = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = nickname;
      helloLine.appendChild(document.createTextNode('Hello, '));
      helloLine.appendChild(strong);

      var roleLine = document.createElement('div');
      roleLine.className = 'account-greeting-role';

      var timeLine = document.createElement('div');

      greeting.appendChild(helloLine);
      greeting.appendChild(roleLine);
      greeting.appendChild(timeLine);

      function render() { timeLine.textContent = formatTime(); }
      render();
      setInterval(render, 30000);

      window.cwdKbAuth.from('profiles').select('role').eq('id', user.id).single().then(function (profileRes) {
        var role = profileRes.data && profileRes.data.role;
        if (!role) return;
        roleLine.textContent = role.charAt(0).toUpperCase() + role.slice(1);

        // Access model (2026-07-30): admin and editor see counts across every
        // account; commenter and member only see their own. Members can't read
        // comments at all (RLS can_comment() excludes them — see Comments
        // Widget/comments_setup.sql), so the Comments & Revisions group is
        // skipped entirely for that role.
        var seesAll = role === 'admin' || role === 'editor';
        var canSeeComments = role !== 'member';

        var commentsQuery = canSeeComments
          ? (function () {
              // .eq('archived', false) applies to every role, not just admin/editor's
              // "see all" branch — an archived (test/dummy) comment shouldn't inflate
              // anyone's Open/Actioned count, including the commenter who left it.
              var q = window.cwdKbAuth.from('comments').select('resolved').is('parent_id', null).eq('archived', false);
              return seesAll ? q : q.eq('author_id', user.id);
            })()
          : Promise.resolve({ data: [] });

        var suggestionsQuery = (function () {
          var q = window.cwdKbAuth.from('suggestions').select('status');
          return seesAll ? q : q.eq('requester_id', user.id);
        })();

        Promise.all([commentsQuery, suggestionsQuery]).then(function (results) {
          var commentRows = (results[0] && results[0].data) || [];
          var suggestRows = (results[1] && results[1].data) || [];
          if (!commentRows.length && !suggestRows.length) return;

          var commentCounts = { open: 0, actioned: 0 };
          commentRows.forEach(function (r) {
            commentCounts[r.resolved ? 'actioned' : 'open']++;
          });

          var suggestCounts = { pending: 0, added: 0, declined: 0, archived: 0 };
          suggestRows.forEach(function (r) {
            if (suggestCounts.hasOwnProperty(r.status)) suggestCounts[r.status]++;
          });

          // Two mini-columns with a dot-marked status list and a total (2026-07-30
          // redesign, v3 — Kate's reference was a Sheets-style dot+label+count list
          // per section with an "All" total row). A column is dropped entirely if
          // every status in it is zero; each status line is dropped individually
          // if its own count is zero — same "only show what's non-empty" rule as
          // the original pills.
          function buildCol(label, items) {
            var visible = items.filter(function (i) { return i.count > 0; });
            if (!visible.length) return null;
            var total = visible.reduce(function (sum, i) { return sum + i.count; }, 0);
            return { label: label, items: visible, total: total };
          }

          // "(Yours)" qualifier: commenter/member only ever see their own rows here
          // (seesAll is false for them), so the label needs to say so — otherwise
          // a commenter reading "3 Actioned" has no way to tell it's just their own
          // submissions and not the site-wide count admins/editors see.
          var colSuffix = seesAll ? '' : ' <span class="stats-col-scope">(Yours)</span>';

          var cols = [
            canSeeComments && buildCol('Comments & Revisions' + colSuffix, [
              { cls: 'stat-actioned', label: 'Actioned', count: commentCounts.actioned },
              { cls: 'stat-open', label: 'Open', count: commentCounts.open }
            ]),
            buildCol('Suggestions' + colSuffix, [
              { cls: 'stat-approved', label: 'Added', count: suggestCounts.added },
              { cls: 'stat-pending', label: 'Pending', count: suggestCounts.pending },
              { cls: 'stat-declined', label: 'Declined', count: suggestCounts.declined },
              { cls: 'stat-archived', label: 'Archived', count: suggestCounts.archived }
            ])
          ].filter(Boolean);
          if (!cols.length) return;

          var colsHtml = cols.map(function (c) {
            var linesHtml = c.items.map(function (i) {
              return '<div class="stats-line"><span class="stats-line-name">' +
                '<span class="stats-dot ' + i.cls + '"></span>' + i.label + '</span>' +
                '<span class="stats-line-count">' + i.count + '</span></div>';
            }).join('');
            return '<div class="stats-col"><div class="stats-col-label">' + c.label + '</div>' + linesHtml +
              '<div class="stats-total"><span>All</span><span>' + c.total + '</span></div></div>';
          }).join('');

          // Collapsed summary: one pill with the per-column totals, e.g. "Comments 9 ·
          // Suggestions 1". Uses <details> so the disclosure is native and keyboard/AT
          // accessible with no extra JS.
          function shortLabel(label) {
            // Drop the "(Yours)" span markup and shorten the long column name so the pill
            // stays on one line.
            var text = label.replace(/<[^>]*>/g, '').replace(/\s*\(Yours\)\s*$/, '').trim();
            return text === 'Comments & Revisions' ? 'Comments' : text;
          }
          var pillParts = cols.map(function (c) {
            return shortLabel(c.label) +
              ' <span class="account-stats-count">' + c.total + '</span>';
          }).join(' <span style="color:#d8d2c4">·</span> ');

          var wrapEl = document.createElement('details');
          wrapEl.className = 'account-stats-wrap';
          wrapEl.innerHTML =
            '<summary class="account-stats-toggle">' + pillParts +
            ' <span class="stats-caret">▼</span></summary>' +
            '<div class="account-stats">' + colsHtml + '</div>';
          greeting.appendChild(wrapEl);
        });
      });
    });
  }
})();
