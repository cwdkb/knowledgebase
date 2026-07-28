(function () {
  var db = window.cwdAuth;

  var messageEl = document.getElementById('adminMessage');
  var tableBody = document.getElementById('userTableBody');
  var loadingEl = document.getElementById('userTableLoading');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message show message-' + type;
  }

  function loginUrl() {
    return new URL('index.html', window.location.href).href;
  }
  function accountUrl() {
    return new URL('account.html', window.location.href).href;
  }

  var ROLES = ['member', 'editor', 'admin'];

  function renderUsers(users, currentUserId) {
    tableBody.innerHTML = '';
    users.forEach(function (u) {
      var tr = document.createElement('tr');

      var emailTd = document.createElement('td');
      emailTd.className = 'user-email';
      emailTd.textContent = u.email;
      if (u.id === currentUserId) {
        var tag = document.createElement('span');
        tag.className = 'you-tag';
        tag.textContent = '(you)';
        emailTd.appendChild(tag);
      }
      tr.appendChild(emailTd);

      var roleTd = document.createElement('td');
      var select = document.createElement('select');
      select.className = 'role-select';
      ROLES.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
        if (r === u.role) opt.selected = true;
        select.appendChild(opt);
      });
      // Disabled on your own row — prevents accidentally demoting yourself and
      // losing access to this page with no other admin around to undo it.
      if (u.id === currentUserId) select.disabled = true;
      select.addEventListener('change', function () {
        var newRole = select.value;
        var previousRole = u.role;
        select.disabled = true;
        db.from('profiles').update({ role: newRole }).eq('id', u.id).then(function (res) {
          select.disabled = false;
          if (res.error) {
            showMessage('Could not update ' + u.email + ': ' + res.error.message, 'error');
            select.value = previousRole;
            return;
          }
          u.role = newRole;
          showMessage(u.email + ' is now ' + newRole + '.', 'success');
        });
      });
      roleTd.appendChild(select);
      tr.appendChild(roleTd);

      tableBody.appendChild(tr);
    });
  }

  db.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session) {
      window.location.href = loginUrl();
      return;
    }
    var uid = session.user.id;

    db.from('profiles').select('role').eq('id', uid).single().then(function (roleRes) {
      if (roleRes.error || !roleRes.data || roleRes.data.role !== 'admin') {
        showMessage('This page is admin-only — taking you back to your account.', 'error');
        setTimeout(function () { window.location.href = accountUrl(); }, 2000);
        return;
      }
      loadingEl.style.display = 'none';
      db.from('profiles').select('id, email, role').order('email').then(function (listRes) {
        if (listRes.error) {
          showMessage('Could not load users: ' + listRes.error.message, 'error');
          return;
        }
        renderUsers(listRes.data, uid);
      });
    });
  });
})();
