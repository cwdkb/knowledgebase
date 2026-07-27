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
        var groupLabel = panel.querySelector(':scope > .group-label');
        var anchor = groupLabel || details[0];
        anchor.parentNode.insertBefore(toolbar, anchor.nextSibling);
      }
    });
  })();

  (function () {
    var svg = document.querySelector('#diagramZoomWrap svg');
    var label = document.getElementById('zoomLabel');
    var zoom = 100;
    function applyZoom() {
      svg.style.width = zoom + '%';
      label.textContent = zoom + '%';
    }
    document.getElementById('zoomInBtn').addEventListener('click', function () {
      zoom = Math.min(200, zoom + 20);
      applyZoom();
    });
    document.getElementById('zoomOutBtn').addEventListener('click', function () {
      zoom = Math.max(60, zoom - 20);
      applyZoom();
    });
    document.getElementById('zoomResetBtn').addEventListener('click', function () {
      zoom = 100;
      applyZoom();
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

  (function () {
    var RULES = [
      { test: /Flag for Serge/, cls: 'badge-flag', label: 'Flag' },
      { test: /Not yet audited/, cls: 'badge-audit', label: 'Not Audited' },
      { test: /Open question/, cls: 'badge-open', label: 'Open Q' },
      { test: /Confirmed(:|\s+—|\s+from\s)/, cls: 'badge-confirmed', label: 'Confirmed' }
    ];
    var scopes = document.querySelectorAll('#main-pipeline, #branch-exit');
    scopes.forEach(function (scope) {
      scope.querySelectorAll('details.stage-detail').forEach(function (detail) {
        var body = detail.querySelector('.detail-body');
        var summary = detail.querySelector('summary');
        if (!body || !summary) return;
        var text = body.textContent;
        var matched = RULES.filter(function (r) { return r.test.test(text); });
        if (!matched.length) return;
        var wrap = document.createElement('span');
        wrap.className = 'status-badges';
        matched.forEach(function (r) {
          var b = document.createElement('span');
          b.className = 'badge ' + r.cls;
          b.textContent = r.label;
          wrap.appendChild(b);
        });
        summary.appendChild(wrap);
      });
    });
  })();

  (function () {
  function normKey(s) { return s.replace(/\s+/g, '').toLowerCase(); }
  function titleText(summary) {
    var clone = summary.cloneNode(true);
    var badges = clone.querySelector('.status-badges');
    if (badges) badges.remove();
    return clone.textContent;
  }

  var details = Array.from(document.querySelectorAll('details.stage-detail'));

  var popover = document.createElement('div');
  popover.className = 'box-popover';
  popover.innerHTML = '<button type="button" class="box-popover-close" aria-label="Close">\u00d7</button><div class="box-popover-title"></div><div class="box-popover-body"></div>';
  document.body.appendChild(popover);
  var titleEl = popover.querySelector('.box-popover-title');
  var bodyEl = popover.querySelector('.box-popover-body');
  popover.querySelector('.box-popover-close').addEventListener('click', function () {
    popover.classList.remove('open');
  });

  function showPopover(box, detail) {
    var summary = detail.querySelector('summary');
    var body = detail.querySelector('.detail-body');
    titleEl.textContent = summary ? titleText(summary) : '';
    bodyEl.innerHTML = body ? body.innerHTML : '';
    popover.style.left = '-9999px';
    popover.classList.add('open');
    var rect = box.getBoundingClientRect();
    var pw = popover.offsetWidth || 280;
    var left = rect.right + 14;
    if (left + pw > window.innerWidth - 12) {
      left = rect.left - pw - 14;
    }
    popover.style.top = rect.top + 'px';
    popover.style.left = left + 'px';
  }

  document.querySelectorAll('.diagram-card .stage-box, .diagram-card .branch-box').forEach(function (box) {
    box.style.cursor = 'pointer';
    box.addEventListener('click', function (e) {
      e.stopPropagation();
      var texts = Array.from(box.querySelectorAll('text:not(.box-badge)')).map(function (t) { return t.textContent; }).join(' ');
      var key = normKey(texts);
      var match = details.find(function (d) {
        var s = d.querySelector('summary');
        return s && normKey(titleText(s)) === key;
      });
      if (match) showPopover(box, match);
    });
  });

  document.addEventListener('click', function (e) {
    if (!popover.contains(e.target)) popover.classList.remove('open');
  });
  window.addEventListener('scroll', function () { popover.classList.remove('open'); }, true);
})();

(function () {
  var svgNS = 'http://www.w3.org/2000/svg';
  function drawBadgePills() {
    document.querySelectorAll('.box-badge').forEach(function (t) {
      var existing = t.previousSibling;
      if (existing && existing.tagName === 'rect' && existing.classList && existing.classList.contains('badge-pill')) {
        existing.remove();
      }
      var bbox = t.getBBox();
      var padX = 13, padY = 6;
      var color = t.getAttribute('fill');
      var pill = document.createElementNS(svgNS, 'rect');
      pill.setAttribute('class', 'badge-pill');
      pill.setAttribute('x', bbox.x - padX);
      pill.setAttribute('y', bbox.y - padY);
      pill.setAttribute('width', bbox.width + padX * 2);
      pill.setAttribute('height', bbox.height + padY * 2);
      pill.setAttribute('rx', (bbox.height + padY * 2) / 2);
      pill.setAttribute('fill', color);
      pill.setAttribute('stroke', '#ffffff');
      pill.setAttribute('stroke-width', '1.5');
      t.parentNode.insertBefore(pill, t);
      t.setAttribute('fill', '#ffffff');
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(drawBadgePills);
  } else {
    drawBadgePills();
  }
})();