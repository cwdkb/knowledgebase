(function () {
  var ANIM_MS = 220;

  function setupDetail(detail) {
    var summary = detail.querySelector(':scope > summary');
    var body = detail.querySelector(':scope > .detail-body');
    if (!summary || !body) return null;
    var animation = null;
    var token = 0;

    function animateTo(open) {
      var my = ++token;
      if (animation) animation.cancel();
      var startHeight = detail.offsetHeight;
      if (open) detail.open = true;
      var endHeight = open ? summary.offsetHeight + body.offsetHeight : summary.offsetHeight;
      animation = detail.animate(
        { height: [startHeight + 'px', endHeight + 'px'] },
        { duration: ANIM_MS, easing: 'ease' }
      );

      function settle() {
        if (my !== token) return;
        detail.open = open;
        detail.style.height = '';
        animation = null;
      }
      animation.onfinish = settle;
      // Fallback in case the animation's finish event never fires (e.g. a backgrounded tab).
      setTimeout(settle, ANIM_MS + 50);
    }

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      animateTo(!detail.open);
    });

    return {
      open: function () { if (!detail.open) animateTo(true); },
      close: function () { if (detail.open) animateTo(false); }
    };
  }

  document.querySelectorAll('.tab-panel').forEach(function (panel) {
    var details = Array.from(panel.querySelectorAll(':scope > details.stage-detail'));
    if (!details.length) return;
    var controllers = details.map(setupDetail).filter(Boolean);

    if (details.length > 1) {
      var toolbar = document.createElement('div');
      toolbar.className = 'accordion-toolbar';

      var expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'accordion-toolbar-btn';
      expandBtn.textContent = 'Expand All';
      expandBtn.addEventListener('click', function () {
        controllers.forEach(function (c) { c.open(); });
      });

      var collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'accordion-toolbar-btn';
      collapseBtn.textContent = 'Collapse All';
      collapseBtn.addEventListener('click', function () {
        controllers.forEach(function (c) { c.close(); });
      });

      toolbar.appendChild(expandBtn);
      toolbar.appendChild(collapseBtn);
      details[0].parentNode.insertBefore(toolbar, details[0]);
    }
  });
})();

(function () {
  var links = document.querySelectorAll('.side-nav-link');
  var panels = Array.from(links).map(function (link) {
    return document.querySelector(link.getAttribute('href'));
  });

  function activate(id) {
    panels.forEach(function (panel) {
      if (panel) panel.classList.toggle('active', '#' + panel.id === id);
    });
    links.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === id);
    });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (!document.querySelector('.tab-panel' + id)) return;
    e.preventDefault();
    activate(id);
    history.replaceState(null, '', id);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  });

  var initial = window.location.hash && document.querySelector(window.location.hash)
    ? window.location.hash
    : links[0].getAttribute('href');
  activate(initial);
})();
