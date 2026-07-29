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
      'color: #B08D57; }';
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
      });
    });
  }
})();
