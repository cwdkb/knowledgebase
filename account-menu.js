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
      '.account-greeting { margin-top: 6px; font-family: "Archivo", sans-serif; font-size: 11px; ' +
      'color: #8A8A8A; text-align: right; line-height: 1.4; }' +
      '.account-greeting strong { color: #16224A; font-weight: 600; }' +
      '.account-greeting-role { text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; ' +
      'color: #B08D57; }' +
      '.account-stats { margin-top: 8px; }' +
      '.account-stats-label { font-family: "Archivo", sans-serif; font-size: 9.5px; font-weight: 700; ' +
      'letter-spacing: 0.06em; text-transform: uppercase; color: #8A8A8A; margin-bottom: 4px; }' +
      '.account-stats-pills { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }' +
      '.stat-pill { font-family: "Archivo", sans-serif; font-size: 10.5px; font-weight: 700; ' +
      'padding: 3px 8px; border-radius: 20px; white-space: nowrap; }' +
      '.stat-pending { background: #fff4d6; color: #8a6d1f; border: 1px solid #f0dfa0; }' +
      '.stat-approved { background: #eaf6ec; color: #2f7a3d; border: 1px solid #c7e6cc; }' +
      '.stat-declined { background: #fdecea; color: #b3261e; border: 1px solid #f2c6c2; }' +
      '.stat-archived { background: #f1efe9; color: #8A8A8A; border: 1px solid #e4e0d5; }';
    document.head.appendChild(style);

    var greeting = document.createElement('div');
    greeting.className = 'account-greeting';
    greeting.id = 'accountGreeting';
    trigger.parentNode.insertBefore(greeting, panel);

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

        // Suggestion status counts: members see only their own requests; admins
        // (Kate) see every request in the system, not just her own.
        var isAdmin = role === 'admin';
        var query = window.cwdKbAuth.from('suggestions').select('status');
        if (!isAdmin) query = query.eq('requester_id', user.id);

        query.then(function (suggestRes) {
          var rows = suggestRes.data || [];
          if (!rows.length) return;

          var counts = { pending: 0, added: 0, declined: 0, archived: 0 };
          rows.forEach(function (r) {
            if (counts.hasOwnProperty(r.status)) counts[r.status]++;
          });

          var statsEl = document.createElement('div');
          statsEl.className = 'account-stats';

          if (isAdmin) {
            var label = document.createElement('div');
            label.className = 'account-stats-label';
            label.textContent = 'All requests';
            statsEl.appendChild(label);
          }

          var pillsWrap = document.createElement('div');
          pillsWrap.className = 'account-stats-pills';
          [
            { key: 'pending', label: 'Pending', cls: 'stat-pending' },
            { key: 'added', label: 'Approved', cls: 'stat-approved' },
            { key: 'declined', label: 'Declined', cls: 'stat-declined' },
            { key: 'archived', label: 'Archived', cls: 'stat-archived' }
          ].forEach(function (d) {
            if (!counts[d.key]) return;
            var pill = document.createElement('span');
            pill.className = 'stat-pill ' + d.cls;
            pill.textContent = counts[d.key] + ' ' + d.label;
            pillsWrap.appendChild(pill);
          });
          statsEl.appendChild(pillsWrap);
          greeting.appendChild(statsEl);
        });
      });
    });
  }
})();
