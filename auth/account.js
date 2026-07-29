(function () {
  var db = window.cwdAuth;

  var messageEl = document.getElementById('accountMessage');
  var signedInAsEl = document.getElementById('signedInAs');
  var displayNameInput = document.getElementById('displayName');
  var avatarPreviewEl = document.getElementById('avatarPreview');
  var avatarInput = document.getElementById('avatarInput');
  var avatarUploadLabel = document.getElementById('avatarUploadLabel');
  var currentUser = null;
  var MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  var AVATAR_DIMENSION = 256;

  // Tabs — same data-tab/auth-panel pattern as the Log In/Sign Up tabs on login.js,
  // plus hash routing so the "My Account" dropdown (My Account#profile, #settings)
  // opens straight to the right tab.
  var tabs = document.querySelectorAll('.auth-tab');
  var panels = {
    profile: document.getElementById('panel-profile'),
    settings: document.getElementById('panel-settings')
  };
  function setTab(name) {
    if (!panels[name]) name = 'profile';
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    Object.keys(panels).forEach(function (key) { panels[key].classList.toggle('active', key === name); });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { setTab(tab.dataset.tab); });
  });
  setTab(window.location.hash.replace('#', ''));

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

  function getInitials(user) {
    var name = ((user.user_metadata && user.user_metadata.full_name) || '').trim();
    if (name) {
      var parts = name.split(/\s+/);
      var initials = parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
      return initials.toUpperCase();
    }
    return (user.email || '?').charAt(0).toUpperCase();
  }

  function renderAvatar(user) {
    var url = user.user_metadata && user.user_metadata.avatar_url;
    avatarPreviewEl.innerHTML = url ? '<img src="' + url + '" alt="">' : '';
    if (!url) avatarPreviewEl.textContent = getInitials(user);
  }

  function loadUser(user) {
    signedInAsEl.innerHTML = 'Signed in as <strong>' + user.email + '</strong>';
    displayNameInput.value = (user.user_metadata && user.user_metadata.full_name) || '';
    renderAvatar(user);
  }

  // Downscales/crops to a square JPEG client-side before upload, so a 2MB original
  // photo doesn't actually cost 2MB of storage per person — a 256px avatar rarely
  // needs more than 50-150KB.
  function resizeAvatarFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var size = AVATAR_DIMENSION;
          var side = Math.min(img.width, img.height);
          var sx = (img.width - side) / 2;
          var sy = (img.height - side) / 2;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('Could not process that image.')); return; }
            resolve(blob);
          }, 'image/jpeg', 0.82);
        };
        img.onerror = function () { reject(new Error('Could not read that image.')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.readAsDataURL(file);
    });
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
    currentUser = session.user;
    loadUser(currentUser);
    if (hashParams.error) {
      showMessage('You were already signed in from an earlier link — this one was just a duplicate.', 'info');
    }

    db.from('profiles').select('role').eq('id', session.user.id).single().then(function (roleRes) {
      var role = !roleRes.error && roleRes.data && roleRes.data.role;
      if (role === 'admin') {
        document.getElementById('adminSection').style.display = 'block';
      }
    });
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

  // Timezone preference (local-only, no Supabase round-trip needed)
  var timezoneModeSelect = document.getElementById('timezoneMode');
  if (window.cwdTimezone) {
    timezoneModeSelect.value = window.cwdTimezone.getMode();
  }
  timezoneModeSelect.addEventListener('change', function () {
    if (!window.cwdTimezone) return;
    window.cwdTimezone.setMode(timezoneModeSelect.value);
    showMessage('Timestamp display updated.', 'success');
  });

  // Profile photo
  avatarInput.addEventListener('change', function () {
    clearMessage();
    var file = avatarInput.files && avatarInput.files[0];
    avatarInput.value = '';
    if (!file || !currentUser) return;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showMessage('Please choose a JPG, PNG, or WEBP image.', 'error');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showMessage('That photo is over 2MB — please choose a smaller file.', 'error');
      return;
    }

    avatarUploadLabel.textContent = 'Uploading…';
    avatarUploadLabel.classList.add('disabled');

    resizeAvatarFile(file).then(function (blob) {
      var path = currentUser.id + '/avatar.jpg';
      return db.storage.from('avatars').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      }).then(function (uploadRes) {
        if (uploadRes.error) throw uploadRes.error;
        // Cache-bust: the storage path never changes on re-upload, so without this
        // the browser/CDN would keep showing the old cached photo.
        var publicUrl = db.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
        return db.auth.updateUser({ data: { avatar_url: publicUrl } });
      });
    }).then(function (res) {
      if (res.error) throw res.error;
      currentUser = res.data.user;
      renderAvatar(currentUser);
      showMessage('Profile photo updated.', 'success');
    }).catch(function (err) {
      showMessage('Could not update photo: ' + ((err && err.message) || 'unknown error'), 'error');
    }).then(function () {
      avatarUploadLabel.textContent = 'Upload Photo';
      avatarUploadLabel.classList.remove('disabled');
    });
  });

  // Sign out
  document.getElementById('signOutBtn').addEventListener('click', function () {
    db.auth.signOut().then(function () {
      window.location.href = loginUrl();
    });
  });
})();
