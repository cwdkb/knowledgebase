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
})();
