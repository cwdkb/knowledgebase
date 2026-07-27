(function () {
  var db = window.cwdAuth;
  var COMPANY_DOMAIN = 'completewd.com';

  var tabs = document.querySelectorAll('.auth-tab');
  var panels = {
    login: document.getElementById('panel-login'),
    signup: document.getElementById('panel-signup')
  };
  var messageEl = document.getElementById('authMessage');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message show message-' + type;
  }
  function clearMessage() {
    messageEl.className = 'message';
    messageEl.textContent = '';
  }

  function setTab(name) {
    clearMessage();
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    Object.keys(panels).forEach(function (key) { panels[key].classList.toggle('active', key === name); });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { setTab(tab.dataset.tab); });
  });

  function isCompanyEmail(email) {
    return new RegExp('@' + COMPANY_DOMAIN.replace('.', '\\.') + '$', 'i').test(email);
  }

  function accountUrl() {
    return new URL('account.html', window.location.href).href;
  }

  function kbHomeUrl() {
    return new URL('../index.html', window.location.href).href;
  }

  // Where to send the user after a successful login: back to whatever KB page they were
  // trying to reach (auth-guard.js redirects here with ?returnTo=...), or the KB hub otherwise.
  // Same-origin check guards against an open-redirect via a tampered returnTo value.
  function postLoginRedirect() {
    var returnTo = new URLSearchParams(window.location.search).get('returnTo');
    if (!returnTo) return kbHomeUrl();
    try {
      var target = new URL(returnTo, window.location.href);
      return target.origin === window.location.origin ? target.href : kbHomeUrl();
    } catch (e) {
      return kbHomeUrl();
    }
  }

  // Log In
  var loginForm = document.getElementById('loginForm');
  var loginSubmit = document.getElementById('loginSubmit');
  var rememberMeInput = document.getElementById('rememberMe');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMessage();
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;

    if (window.cwdSetRememberMe) window.cwdSetRememberMe(rememberMeInput.checked);

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Logging In…';

    db.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Log In';
      if (res.error) {
        showMessage(res.error.message === 'Email not confirmed'
          ? 'Please confirm your email first — check your completewd.com inbox for the confirmation link.'
          : 'Could not log in: ' + res.error.message, 'error');
        return;
      }
      window.location.href = postLoginRedirect();
    }).catch(function () {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Log In';
      showMessage('Something went wrong logging in. Please try again.', 'error');
    });
  });

  // Forgot password
  document.getElementById('forgotPasswordBtn').addEventListener('click', function () {
    clearMessage();
    var email = document.getElementById('loginEmail').value.trim();
    if (!email) {
      showMessage('Enter your email above first, then click "Forgot your password?" again.', 'info');
      return;
    }
    db.auth.resetPasswordForEmail(email, { redirectTo: accountUrl() }).then(function (res) {
      if (res.error) {
        showMessage('Could not send reset email: ' + res.error.message, 'error');
        return;
      }
      showMessage('Password reset link sent — check your completewd.com inbox.', 'success');
    });
  });

  // Sign Up
  var signupForm = document.getElementById('signupForm');
  var signupSubmit = document.getElementById('signupSubmit');
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMessage();
    var name = document.getElementById('signupName').value.trim();
    var email = document.getElementById('signupEmail').value.trim();
    var password = document.getElementById('signupPassword').value;
    var passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!isCompanyEmail(email)) {
      showMessage('Sign up is restricted to @' + COMPANY_DOMAIN + ' email addresses.', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    signupSubmit.disabled = true;
    signupSubmit.textContent = 'Creating Account…';

    db.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: name },
        emailRedirectTo: accountUrl()
      }
    }).then(function (res) {
      signupSubmit.disabled = false;
      signupSubmit.textContent = 'Create Account';
      if (res.error) {
        showMessage('Could not create account: ' + res.error.message, 'error');
        return;
      }
      if (res.data.user && !res.data.session) {
        showMessage('Check your completewd.com inbox for a confirmation link to finish signing up.', 'success');
        signupForm.reset();
      } else if (res.data.session) {
        window.location.href = accountUrl();
      }
    }).catch(function () {
      signupSubmit.disabled = false;
      signupSubmit.textContent = 'Create Account';
      showMessage('Something went wrong creating your account. Please try again.', 'error');
    });
  });
})();
