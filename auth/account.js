(function () {
  var db = window.cwdAuth;

  var messageEl = document.getElementById('accountMessage');
  var signedInAsEl = document.getElementById('signedInAs');
  var displayNameInput = document.getElementById('displayName');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message show message-' + type;
  }
  function clearMessage() {
    messageEl.className = 'message';
    messageEl.textContent = '';
  }

  function loginUrl() {
    return new URL('index.html', window.location.href).href;
  }

  function loadUser(user) {
    signedInAsEl.innerHTML = 'Signed in as <strong>' + user.email + '</strong>';
    displayNameInput.value = (user.user_metadata && user.user_metadata.full_name) || '';
  }

  // Supabase redirects email-confirmation/reset links here with either a session
  // (success) or an #error=... hash (link already used, expired, or double-clicked —
  // common with Outlook Safe Links prefetching the link before the user does).
  // Strip that hash from the address bar right away so it never sits there looking broken.
  function parseHashParams() {
    var hash = window.location.hash.replace(/^#/, '');
    var params = {};
    hash.split('&').forEach(function (pair) {
      if (!pair) return;
      var idx = pair.indexOf('=');
      var key = idx === -1 ? pair : pair.slice(0, idx);
      var value = idx === -1 ? '' : pair.slice(idx + 1);
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    });
    return params;
  }
  var hashParams = parseHashParams();
  if (hashParams.error) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // A password-recovery link lands here with an active recovery session —
  // let them straight through to the Change Password section instead of bouncing to login.
  db.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      showMessage('Set your new password below.', 'info');
    }
  });

  db.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session) {
      if (hashParams.error) {
        showMessage(
          hashParams.error_code === 'otp_expired'
            ? 'That link already expired or was already used — taking you back to log in.'
            : 'That link is no longer valid (' + (hashParams.error_description || hashParams.error) + ') — taking you back to log in.',
          'error'
        );
        setTimeout(function () { window.location.href = loginUrl(); }, 3000);
        return;
      }
      window.location.href = loginUrl();
      return;
    }
    loadUser(session.user);
    if (hashParams.error) {
      showMessage('You were already signed in from an earlier link — this one was just a duplicate.', 'info');
    }
  });

  // Save name
  var nameForm = document.getElementById('nameForm');
  var nameSubmit = document.getElementById('nameSubmit');
  nameForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMessage();
    var name = displayNameInput.value.trim();
    if (!name) return;

    nameSubmit.disabled = true;
    nameSubmit.textContent = 'Saving…';

    db.auth.updateUser({ data: { full_name: name } }).then(function (res) {
      nameSubmit.disabled = false;
      nameSubmit.textContent = 'Save Name';
      if (res.error) {
        showMessage('Could not save name: ' + res.error.message, 'error');
        return;
      }
      showMessage('Name updated.', 'success');
    });
  });

  // Update password
  var passwordForm = document.getElementById('passwordForm');
  var passwordSubmit = document.getElementById('passwordSubmit');
  passwordForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMessage();
    var newPassword = document.getElementById('newPassword').value;
    var confirm = document.getElementById('newPasswordConfirm').value;

    if (newPassword !== confirm) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    passwordSubmit.disabled = true;
    passwordSubmit.textContent = 'Updating…';

    db.auth.updateUser({ password: newPassword }).then(function (res) {
      passwordSubmit.disabled = false;
      passwordSubmit.textContent = 'Update Password';
      if (res.error) {
        showMessage('Could not update password: ' + res.error.message, 'error');
        return;
      }
      passwordForm.reset();
      showMessage('Password updated.', 'success');
    });
  });

  // Sign out
  document.getElementById('signOutBtn').addEventListener('click', function () {
    db.auth.signOut().then(function () {
      window.location.href = loginUrl();
    });
  });
})();
